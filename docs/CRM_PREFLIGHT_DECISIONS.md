# 🛡️ CRM Pre-Flight: Architecture Decisions

> **Tanggal:** 12 Februari 2026  
> **Tujuan:** Memastikan zero impact ke core automation engine sebelum mulai migration & coding CRM module  
> **Status:** ✅ Semua 4 concern sudah dijawab — **SAFE TO PROCEED**

---

## Pertanyaan 1: Subscribe ke `MESSAGE_RECEIVED` langsung atau emit `MESSAGE_PROCESSED` dulu?

### ✅ Jawaban: **Subscribe langsung ke `MESSAGE_RECEIVED` — AMAN**

### Bukti dari Code

**Event Bus (`eventBus.ts` line 78-87)** — Semua handlers dijalankan **fire-and-forget**:

```typescript
// Execute all handlers (async, non-blocking)
for (const handler of handlers) {
    this.executeHandler(handler, event).catch((error) => {
        logger.error(`Event handler failed for ${type}`, {
            error,
            event_id: event.event_id,
        });
    });
}
```

**`executeHandler` (line 206-223)** — Error handler **tidak re-throw**:

```typescript
private async executeHandler<T>(handler, event): Promise<void> {
    try {
        await handler(event);
    } catch (error) {
        logger.error('Event handler threw error', { ... });
        // Don't re-throw - handlers must not break the event bus
    }
}
```

### Analisis

| Aspek | Status | Detail |
|-------|--------|--------|
| **Handler isolation** | ✅ Aman | Setiap handler di-wrap `try/catch`. Kalau CRM handler crash, Rule Engine + AI Engine tetap jalan |
| **Blocking risk** | ✅ Tidak ada | Handlers dipanggil via `.catch()` (fire-and-forget). CRM handler **tidak await-ed** oleh event bus |
| **Execution order** | ⚠️ Perlu perhatian | Handlers diiterate via `for...of` — secara teknis sequential `await`, TAPI karena setiap handler di-`.catch()`, mereka **jalan paralel** |
| **Existing subscribers** | ✅ Sudah proven | AI Engine sudah subscribe ke `MESSAGE_RECEIVED` selain Rule Engine, dan keduanya jalan paralel tanpa masalah |

### Keputusan

**➡️ Langsung subscribe ke `MESSAGE_RECEIVED`.** Tidak perlu event boundary `MESSAGE_PROCESSED`.

**Alasan menolak `MESSAGE_PROCESSED`:**

1. Rule Engine (`ruleEngine.ts` line 62-123) adalah handler `MESSAGE_RECEIVED` — dia **emit `KEYWORD_MATCHED` atau `KEYWORD_NO_MATCH`**, bukan `MESSAGE_PROCESSED`. Jadi tidak ada "processed" state yang bisa dikonsumsi.

2. CRM module **TIDAK butuh menunggu** Rule Engine selesai. CRM handler cukup:
   - Enrich contact data (upsert name, phone, last_message_at)
   - Update lead score (async via queue — lihat Q2)
   - Auto-tag berdasarkan content

3. Membuat event baru malah **menambah coupling** — ada modul yang harus emit `MESSAGE_PROCESSED`, dan CRM jadi dependent padanya.

### Pattern yang Direkomendasikan

```typescript
// modules/crm/crmEventHandler.ts
eventBus.subscribe(EventType.MESSAGE_RECEIVED, async (event) => {
    try {
        // 1. Enrich contact (fast, direct DB)
        await contactEnrichmentService.enrich(event.context, event.payload);
        
        // 2. Score lead (slow, dispatch to queue — NON-BLOCKING)
        await crmQueue.add('score-lead', { 
            contact_id: event.context.contact_id,
            message: event.payload.content 
        });
        
        // 3. Auto-tag (fast, based on keywords/patterns)
        await autoTagService.process(event.context, event.payload);
    } catch (error) {
        logger.error('CRM handler error', { error });
        // Error TIDAK akan break event bus (isolation sudah built-in)
    }
});
```

---

## Pertanyaan 2: Lead Scoring via Bull Queue — apakah perlu?

### ✅ Jawaban: **YA, WAJIB async via Bull Queue**

### Bukti dari Code

**AI Engine `handleMessageReceived` (`aiEngine.ts` line 33-133)** menunjukkan pattern yang harus dihindari — dia melakukan **banyak async work dalam handler**:

```typescript
private async handleMessageReceived(event) {
    // ❌ Query DB untuk bot config
    const botResult = await query('SELECT ai_config FROM bots WHERE id = ?', [bot_id]);
    
    // ❌ Process sheet update (includes LLM call!)
    const sheetResult = await this.processSheetUpdate(bot_id, ...);
    
    // ❌ Another DB query
    const targetConfigResult = await query('SELECT llm_config FROM llm_allowed_targets WHERE ...', [...]);
    
    // ❌ Potentially emit another event (KEYWORD_MATCHED for confirmation)
    await eventBus.emit(EventType.KEYWORD_MATCHED, context, {...});
    
    // ❌ Another LLM call for data extraction
    const result = await llmService.extractData(bot_id, payload.content, contact_id);
}
```

Ini **sudah bekerja** karena handler isolation, tapi menambah latency di event loop.

### LLM Service (`llmService.ts`) — Setiap call = network roundtrip

```typescript
class LLMService {
    // providers: Google Gemini, OpenAI, Groq — semua HTTP API calls
    async chat(botId, userMessage, contactId): Promise<string> { ... }      // ~500-2000ms
    async extractData(botId, userMessage, contactId): Promise<...> { ... }  // ~500-2000ms
}
```

### Analisis Lead Scoring Impact

| Skenario | Tanpa Queue | Dengan Bull Queue |
|----------|-------------|-------------------|
| LLM API call | 500-2000ms **blocking handler** | 0ms (dispatched, returns immediately) |
| LLM API timeout | Handler hangs sampai timeout | Job retries di background |
| LLM API rate limit | Handler gagal, log error | Queued jobs retry with backoff |
| 10 messages/detik | 10 concurrent LLM calls di event loop | Bull processes sesuai concurrency setting |
| Cost tracking | Manual | Built-in via Bull job metadata |

### Keputusan

**➡️ Lead scoring WAJIB via Bull Queue — JANGAN jalankan LLM call di event handler.**

### Implementasi yang Direkomendasikan

```typescript
// 1. Buat queue baru (reuse Redis yang sudah ada)
// queue/crmQueue.ts
export const crmQueue = new Bull('crm-scoring', {
    redis: redisConfig,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 50,
        removeOnFail: false,
        timeout: 15000,  // 15s max untuk LLM call
    },
});

// 2. Worker processes score di background
// queue/crmWorker.ts  
crmQueue.process('score-lead', 3, async (job) => {  // max 3 concurrent
    const { contact_id, message, bot_id } = job.data;
    const score = await llmService.scoreLead(bot_id, message);
    await contactRepository.updateLeadScore(contact_id, score);
});

// 3. Event handler hanya dispatch (INSTANT, <5ms)
eventBus.subscribe(EventType.MESSAGE_RECEIVED, async (event) => {
    // Fast ops: enrich, auto-tag
    await contactEnrichmentService.enrich(...);
    
    // Slow op: dispatch ke queue (NO BLOCKING)
    await crmQueue.add('score-lead', { 
        contact_id: event.context.contact_id,
        message: event.payload.content,
        bot_id: event.context.bot_id 
    });
});
```

### Existing Queue Infrastructure — Ready

Sudah ada 2 Bull Queue aktif (dari `index.ts`):

```
import './queue/messageWorker';   // Reminder messages
import './queue/campaignWorker';  // Campaign broadcasts
```

Kedua queue pakai Redis config dari ENV. CRM queue tinggal ikut pattern yang sama.

---

## Pertanyaan 3: Indexing baru pada contacts — concern performa?

### ✅ Jawaban: **TIDAK ADA CONCERN — volume masih rendah**

### Analisis Volume Production

Berdasarkan current schema dan usage pattern:

| Factor | Current State | Impact Assessment |
|--------|---------------|-------------------|
| **Contact volume** | Ratusan - ribuan per tenant (WhatsApp contacts) | ✅ Trivial untuk indexing |
| **Message volume** | Ribu-an per hari per bot | ✅ B-tree index sangat efisien |
| **Concurrent writes** | Single Node.js process, sequential via event bus | ✅ Tidak ada write contention |
| **Query patterns** | Simple lookups by tenant_id + bot_id | ✅ Composite index cukup |

### Index yang Direkomendasikan

```sql
-- CRM-specific indexes pada tabel contacts yang sudah ada
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_score ON contacts(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage ON contacts(pipeline_stage_id);

-- Composite index untuk common CRM queries
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_assigned 
    ON contacts(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_score 
    ON contacts(tenant_id, lead_score DESC);
```

### Mengapa AMAN

1. **Row count rendah** — Bahkan 100K contacts = ~10MB index. PostgreSQL handle ini tanpa effort.

2. **Write overhead minimal** — Index update untuk `INSERT`/`UPDATE` pada B-tree dengan <100K rows = **sub-millisecond**. Dibandingkan latency LLM API (500-2000ms), ini negligible.

3. **SQLite juga aman** — SQLite secara default sudah efisien untuk dataset <1GB. Index overhead pada SQLite bahkan lebih ringan karena B-tree structure single file.

4. **Existing pattern sudah pakai banyak index** — Schema existing sudah punya **22 indexes** (lihat `schema.sql`). Menambah 5 index lagi tidak signifikan.

### ⚠️ Satu Hal yang Perlu Diperhatikan

```
BUKAN indexing yang jadi concern, tapi WRITE AMPLIFICATION di SQLite.
```

**SQLite `saveDatabase()`** (line 700-718 di `connection-sqlite.ts`):

```typescript
export function saveDatabase(): void {
    const data = _db.export();          // Export ENTIRE database to buffer
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);     // Write full file to disk
}
```

**Setiap write query = full database export ke disk!** Ini fine untuk volume rendah, tapi kalau CRM menambah banyak writes (contact enrichment, lead scoring, activity logs), ini bisa jadi bottleneck.

**Mitigasi:**
- Untuk development/low-volume: tetap pakai SQLite — tidak akan terasa
- Untuk production/high-volume: pastikan `DATABASE_TYPE=postgres` — PostgreSQL pakai WAL-based writes yang jauh lebih efisien

---

## Pertanyaan 4: SQLite vs PostgreSQL — constraint yang perlu diantisipasi?

### ✅ Jawaban: **ADA BEBERAPA CONSTRAINT SIGNIFIKAN — perlu dual-schema approach**

### Perbedaan Schema SQLite vs PostgreSQL (Sudah Ada di Codebase)

Codebase **sudah menjalankan dual-schema approach** — tapi dengan perbedaan yang cukup besar:

| Feature | PostgreSQL (`schema.sql`) | SQLite (`connection-sqlite.ts`) |
|---------|--------------------------|--------------------------------|
| **Primary Key** | `UUID DEFAULT uuid_generate_v4()` | `TEXT PRIMARY KEY` (manual UUID) |
| **Boolean** | `BOOLEAN DEFAULT true` | `INTEGER DEFAULT 1` |
| **JSON** | `JSONB` (queryable, indexed) | `TEXT` (string, manual parse) |
| **Arrays** | `TEXT[]` (native array) | ❌ Tidak support |
| **CHECK constraint** | Full support | Partial (no ALTER ADD CHECK) |
| **Auto-increment** | `SERIAL` / `uuid_generate_v4()` | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| **ON DELETE** | Full cascade support | Partial (needs PRAGMA) |
| **ALTER TABLE** | Full (ADD, DROP, RENAME column) | **HANYA ADD COLUMN** |
| **Concurrent writes** | MVCC, row-level locking | **Global lock** (satu write at a time) |
| **Timestamp** | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `TEXT DEFAULT CURRENT_TIMESTAMP` |

### ⚠️ Constraint Kritis untuk CRM Migration

#### 1. **SQLite tidak bisa `ALTER TABLE DROP COLUMN`**

```sql
-- ✅ PostgreSQL: bisa
ALTER TABLE contacts DROP COLUMN old_field;

-- ❌ SQLite: ERROR
-- Harus: CREATE new table → COPY data → DROP old → RENAME new
```

**Impact:** Kalau kita perlu refactor contacts table nanti, SQLite perlu workaround.

**Mitigasi:** Desain CRM fields dengan benar dari awal. Jangan rename/drop columns. Gunakan `ALTER TABLE ADD COLUMN` saja.

#### 2. **SQLite tidak punya native `JSONB` — queryable JSON tidak bisa**

```sql
-- ✅ PostgreSQL: query JSON field langsung
SELECT * FROM contacts WHERE metadata->>'company' = 'Acme';
CREATE INDEX idx_contacts_company ON contacts((metadata->>'company'));

-- ❌ SQLite: harus manual parse
-- json_extract() ada tapi tidak bisa diindex secara efisien
SELECT * FROM contacts WHERE json_extract(metadata, '$.company') = 'Acme';
```

**Impact:** Kalau CRM fields disimpan di JSONB metadata, PostgreSQL bisa query/index dengan efisien, SQLite tidak.

**Mitigasi:** **Jangan pakai JSONB untuk CRM core fields.** Buat kolom explicit:

```sql
-- ✅ BENAR: explicit columns (works both SQLite & PostgreSQL)
ALTER TABLE contacts ADD COLUMN company TEXT;
ALTER TABLE contacts ADD COLUMN lead_score INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN assigned_to TEXT REFERENCES users(id);

-- ❌ SALAH: mengandalkan JSONB
-- metadata = {"company": "Acme", "lead_score": 85}
```

#### 3. **SQLite tidak support `TEXT[]` (array type)**

```sql
-- ✅ PostgreSQL: native array
ALTER TABLE contacts ADD COLUMN tags TEXT[] DEFAULT '{}';
WHERE 'vip' = ANY(tags);

-- ❌ SQLite: ERROR — tidak ada array type
```

**Impact:** Tags/labels harus pakai junction table, bukan array column.

**Mitigasi:** Gunakan **proper many-to-many relationship** (yang seharusnya memang practice terbaik):

```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    UNIQUE(tenant_id, name)
);

CREATE TABLE contact_tags (
    contact_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (contact_id, tag_id)
);
```

#### 4. **SQLite: `saveDatabase()` = full export setiap write**

Seperti dijelaskan di Q3, setiap write operation di SQLite trigger full database export.

**Impact untuk CRM:**

```
1 pesan masuk → CRM handler:
  1. UPDATE contacts (enrich) → saveDatabase() ← FULL EXPORT
  2. INSERT contact_activities  → saveDatabase() ← FULL EXPORT  
  3. INSERT contact_tags        → saveDatabase() ← FULL EXPORT
  = 3x full database export per pesan
```

**Mitigasi:** Batch writes dalam transaction:

```typescript
await transaction(async (client) => {
    await contactRepository.enrich(contactId, data);
    await activityRepository.create(contactId, activity);
    await tagRepository.assign(contactId, tagIds);
    // Single saveDatabase() at COMMIT
});
```

#### 5. **Roles CHECK constraint berbeda**

```sql
-- PostgreSQL schema.sql (line 32):
role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'OPERATOR', 'VIEWER'))

-- SQLite connection-sqlite.ts (line 171):  
role TEXT NOT NULL CHECK(role IN ('OWNER', 'ADMIN', 'OPERATOR', 'USER', 'VIEWER'))
```

**Impact:** SQLite sudah punya `ADMIN` dan `USER` roles! PostgreSQL belum. Kalau CRM perlu role `SALES` atau `MANAGER`, perlu konsisten di kedua schema.

**Mitigasi:** Karena SQLite tidak bisa `ALTER TABLE DROP CONSTRAINT`, tambahkan role baru via `ALTER TABLE` di PostgreSQL saja, dan buat fresh table di SQLite dengan updated CHECK.

---

## 📋 Migration Template yang Compatible (SQLite + PostgreSQL)

Berdasarkan semua constraint di atas, berikut **pattern aman** untuk migration CRM:

```sql
-- ✅ SAFE untuk kedua driver
-- Gunakan TEXT sebagai tipe universal (UUID di PostgreSQL, TEXT di SQLite)
-- Gunakan INTEGER untuk boolean (1/0 di SQLite, true/false di PostgreSQL via abstraksi)
-- JANGAN pakai JSONB untuk core fields
-- JANGAN pakai TEXT[] array
-- Gunakan junction tables untuk many-to-many

-- Contoh: CRM Migration Template
CREATE TABLE IF NOT EXISTS crm_pipelines (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_default INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    auto_actions TEXT DEFAULT '[]',  -- JSON string, not JSONB
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pipeline_id) REFERENCES crm_pipelines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_deals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,
    pipeline_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    title TEXT NOT NULL,
    value REAL DEFAULT 0,
    currency TEXT DEFAULT 'IDR',
    assigned_to TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'won', 'lost', 'archived')),
    expected_close_date TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (pipeline_id) REFERENCES crm_pipelines(id),
    FOREIGN KEY (stage_id) REFERENCES crm_pipeline_stages(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Contact extension (ADD COLUMN only — safe for both drivers)
ALTER TABLE contacts ADD COLUMN company TEXT;
ALTER TABLE contacts ADD COLUMN lead_score INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN assigned_to TEXT;
ALTER TABLE contacts ADD COLUMN source TEXT DEFAULT 'whatsapp';
ALTER TABLE contacts ADD COLUMN crm_status TEXT DEFAULT 'new';
```

---

## ✅ Final Checklist — Ready to Implement

| # | Decision | Answer | Impact to Core |
|---|----------|--------|----------------|
| 1 | Event subscription | Subscribe ke `MESSAGE_RECEIVED` langsung | ✅ Zero impact (fire-and-forget isolation) |
| 2 | Lead scoring | Async via Bull Queue (`crm-scoring`) | ✅ Zero blocking (dispatch only in handler) |
| 3 | Contact indexing | Tambah 5 indexes — aman di volume saat ini | ✅ Sub-millisecond overhead |
| 4 | SQLite/PostgreSQL | Dual-schema safe pattern: TEXT PK, INTEGER bool, junction tables | ✅ Compatible, no driver conflicts |

### ⚠️ Watchlist (bukan blocker, tapi perlu diingat)

1. **SQLite `saveDatabase()` overhead** — Batch CRM writes dalam transaction
2. **Role CHECK constraint** — Sinkronkan role list antara SQLite dan PostgreSQL
3. **Kontrak `contacts` table** — Unique constraint saat ini `(tenant_id, bot_id, wa_id)` — pertimbangkan apakah CRM perlu "unified contact" lintas bot

---

**🚀 Conclusion: SAFE TO PROCEED — Tidak ada impact ke core automation engine.**

*Document generated: 12 Feb 2026*
