# 📋 Technical Audit: Sendr Existing System — CRM Readiness Assessment

> **Tanggal:** 12 Februari 2026  
> **Tujuan:** Menentukan apakah modul Lean AI CRM (contact management, pipeline, automation engine, AI scoring) bisa **extend schema existing** atau perlu **microservice terpisah**.  
> **Hasil:** ✅ Rekomendasi **Extend Schema Existing** (lihat bagian akhir)

---

## Daftar Isi

1. [Data Structure Existing](#1️⃣-data-structure-existing)
2. [Automation Logic](#2️⃣-automation-logic)
3. [Event Flow](#3️⃣-event-flow)
4. [Role & Permission](#4️⃣-role--permission)
5. [Scalability & Infra](#5️⃣-scalability--infra)
6. [Reporting](#6️⃣-reporting)
7. [Assessment Summary](#📊-assessment-summary)
8. [Rekomendasi Final](#🎯-rekomendasi-extend-schema-existing)

---

## 1️⃣ Data Structure Existing

### ✅ Contact Entity — SUDAH ADA

Tabel `contacts` di `backend/src/database/schema.sql`:

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,        -- Multi-tenant isolation
    bot_id UUID NOT NULL,           -- Tied to specific bot
    wa_id VARCHAR(255) NOT NULL,    -- WhatsApp JID (phone@c.us)
    phone_number VARCHAR(50),
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT false,
    group_name VARCHAR(255),
    metadata JSONB DEFAULT '{}',    -- Flexible field (bisa extend)
    last_message_at TIMESTAMP,
    UNIQUE(tenant_id, bot_id, wa_id)
);
```

**⚠️ Limitasi untuk CRM:**

| Issue | Detail |
|-------|--------|
| Per-bot scoping | Contact di-scope per `bot_id` (unique constraint `tenant_id, bot_id, wa_id`). 1 orang chat ke 2 bot = 2 record. **Belum ada unified contact.** |
| No CRM fields | Belum ada: `company`, `deal_value`, `pipeline_stage`, `assigned_to`, `tags`, `lead_score`, `source`, dll. |
| metadata JSONB | Bisa dipakai sementara tapi bukan solusi long-term untuk structured CRM data. |

### ✅ Messages — SUDAH ADA (tapi bukan Conversation Model)

Tabel `messages` di `schema.sql`:

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    bot_id UUID NOT NULL,
    contact_id UUID NOT NULL,        -- FK ke contacts
    wa_message_id VARCHAR(255),
    direction VARCHAR(10),           -- 'inbound' / 'outbound'
    message_type VARCHAR(20),
    content TEXT,
    media_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP
);
```

**⚠️ Limitasi:**

- **Flat log model** — setiap pesan disimpan sebagai row individual.
- **Belum ada `conversation_id`** atau grouping thread.
- Ada tabel `ai_conversations` (migration `007_add_ai_config.sql`) yang track AI chat sessions:
  ```sql
  CREATE TABLE ai_conversations (
      id TEXT PRIMARY KEY,
      bot_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      contact_name TEXT,
      status TEXT DEFAULT 'active',  -- 'active', 'completed', 'abandoned'
      mode TEXT,                     -- 'chat', 'data_collection', 'hybrid'
      extracted_data TEXT DEFAULT '{}',
      messages TEXT DEFAULT '[]',
      ...
  );
  ```
  Tapi ini **khusus AI session saja**, bukan general conversation model.

### 🔗 Relasi User → Bot → Message

```
tenant
  └── users (OWNER / OPERATOR / VIEWER)
  └── bots
       └── contacts (per bot)
       └── messages (per bot + contact)
       └── keyword_rules (per bot)
       └── campaigns (per bot)
       └── reminders (per bot)
```

- **User ≠ Contact.** User = login account (dashboard). Contact = WhatsApp entity yang chat ke bot.
- **Belum ada `assigned_to`** — tidak ada relasi user ↔ contact (ownership/sales assignment).
- Bot punya `created_by` FK ke `users`, tapi messages/contacts tidak punya assignment ke user.

### ❌ Tagging System — BELUM ADA

- Tidak ada tabel `tags`, `contact_tags`, atau mekanisme labeling apapun.
- Yang paling dekat: `contacts.metadata JSONB` — bisa dipakai ad-hoc tapi belum terstruktur.

---

## 2️⃣ Automation Logic

### ✅ Rule-Based Automation — Config-Driven (BUKAN Hardcoded)

System menggunakan **Condition Engine** yang sepenuhnya config-driven dari database.

#### Rule Engine (`core/engine/ruleEngine.ts`)

- Subscribe ke `MESSAGE_RECEIVED` event
- Load rules dari database (tabel `keyword_rules`)
- Match type: `equals`, `contains`, `regex`
- Scope filter: `global`, `group`, `contact`
- Priority-based matching (higher priority first)
- Emit `KEYWORD_MATCHED` → Action Engine takes over

#### Action Engine (`core/engine/actionEngine.ts`)

- Subscribe ke `KEYWORD_MATCHED` event
- Execute actions yang tersedia:
  - `SEND_TEXT` — Kirim pesan teks
  - `SEND_IMAGE` — Kirim gambar + caption
  - `FETCH_SPREADSHEET` — Ambil data dari data source
  - `COMPOSE_MESSAGE` — Render template + data
  - `TRIGGER_REMINDER` — Schedule reminder
- Template variable substitution
- Emit `ACTION_EXECUTED` / `ACTION_FAILED`

#### AI Engine (`core/engine/aiEngine.ts`)

- Subscribe ke `MESSAGE_RECEIVED` (silent data extraction mode)
- Subscribe ke `KEYWORD_NO_MATCH` (fallback AI conversation)
- Features:
  - AI Sheet Updater — otomatis update spreadsheet berdasarkan AI classification
  - Mention detection — AI aktif hanya saat bot di-mention
  - Target-level AI permissions (`llm_allowed_targets` table)
- Multi-LLM provider: OpenAI (GPT), Google Gemini, Groq

```
Flow:  MESSAGE_RECEIVED
         ├──→ Rule Engine → (match?) → KEYWORD_MATCHED → Action Engine
         │                  (no match?) → KEYWORD_NO_MATCH → AI Engine
         └──→ AI Engine (Silent Mode → Data Extraction / Sheet Update)
```

### ✅ Scheduler / Background Workers — AKTIF

| Worker | Teknologi | Frekuensi | Fungsi |
|--------|-----------|-----------|--------|
| **ReminderScheduler** | `node-cron` | Setiap menit | Cek reminder `next_run_at <= now`, kirim pesan langsung via WA adapter |
| **CampaignScheduler** | Bull Queue + Redis | On-demand | Process campaign messages per recipient |
| **BotExpirationScheduler** | Cron job | Periodik | Check & expire bots melewati `expires_at` |
| **Campaign Queue** | Bull Queue (Redis) | Continuous | Isolated queue untuk campaign broadcast, 3 attempts, exponential backoff |
| **Message Queue** | Bull Queue (Redis) | Continuous | Queue untuk reminder messages |

Semua scheduler diinisialisasi saat server start di `index.ts`.

---

## 3️⃣ Event Flow

### Message Flow: Webhook → Processing → Response

```
1. WhatsApp Message masuk
      ↓
2. Baileys Adapter (whatsappAdapter.baileys.ts) menerima
      ↓
3. Emit EVENT: MESSAGE_RECEIVED (via Anti-Gravity Event Bus)
      ↓ (async, parallel handlers)
   ┌──────────────────────────────────────────────┐
   │ Handler 1: Rule Engine                        │
   │   → Load rules from DB (cached)              │
   │   → Match keyword?                           │
   │     YES → Emit KEYWORD_MATCHED               │
   │           → Action Engine executes action     │
   │           → Emit ACTION_EXECUTED              │
   │     NO  → Emit KEYWORD_NO_MATCH              │
   │           → AI Engine handles fallback        │
   ├──────────────────────────────────────────────┤
   │ Handler 2: AI Engine (Silent Mode)            │
   │   → Check AI Sheet Updater configs           │
   │   → Extract data from message if applicable  │
   │   → Update Google Sheets automatically       │
   ├──────────────────────────────────────────────┤
   │ Handler 3: Event Persistence                  │
   │   → Log event to event_logs table            │
   └──────────────────────────────────────────────┘
```

### Event-Driven: YA, tapi IN-PROCESS

**Anti-Gravity Event Bus** (`core/events/eventBus.ts`):

- Extends Node.js `EventEmitter` (singleton)
- Handlers dijalankan async (`Promise`), fire-and-forget
- Setiap event WAJIB punya `EventContext` (tenant isolation)
- Semua events di-persist ke `event_logs` table (audit trail)

**Event Types yang tersedia** (dari `core/events/types.ts`):

```typescript
enum EventType {
    // Message
    MESSAGE_RECEIVED, MESSAGE_SENT, MESSAGE_FAILED,

    // Rule Engine
    KEYWORD_MATCHED, KEYWORD_NO_MATCH,

    // Action
    ACTION_EXECUTED, ACTION_FAILED,

    // Reminder
    REMINDER_TRIGGERED, REMINDER_SENT, REMINDER_FAILED,

    // Campaign
    BLAST_CREATED, BLAST_STARTED, BLAST_MESSAGE_SENT,
    BLAST_MESSAGE_FAILED, BLAST_FINISHED, BLAST_CANCELLED,

    // WhatsApp Connection
    WA_QR_GENERATED, WA_CONNECTED, WA_DISCONNECTED, WA_ERROR,

    // Data Source
    DATA_SOURCE_FETCHED, DATA_SOURCE_ERROR,

    // System
    BOT_CREATED, BOT_DELETED, RULE_CREATED, RULE_UPDATED, RULE_DELETED,
}
```

**⚠️ Catatan penting:**

- Event bus berjalan **in-process** (bukan distributed message queue seperti RabbitMQ/Kafka)
- Bull Queue digunakan **hanya untuk campaign & reminder** (background job processing), bukan untuk event routing inti
- **Implikasi CRM:** Module CRM tinggal `subscribe(MESSAGE_RECEIVED)` untuk enrich contact data, trigger pipeline updates, dll — **zero modification ke existing code**

---

## 4️⃣ Role & Permission

### ✅ Role System — SUDAH ADA (3-Tier RBAC)

| Role | Level | Permissions |
|------|-------|-------------|
| **OWNER** | Tertinggi | Full access, user management, system settings |
| **OPERATOR** | Menengah | Manage bots, rules, campaigns, reminders |
| **VIEWER** | Terendah | Read-only access |

- **JWT-based authentication** (`api/middleware/auth.ts`)
- Role check di middleware level: `requireRole(['OWNER', 'OPERATOR'])`
- Multi-tenant: setiap query di-filter `tenant_id`
- Session tracking (`user_sessions` table dari migration 012)
- Security logs, login attempt tracking, account lockout

### ❌ Contact Ownership / Assignment — BELUM ADA

- **Tidak ada field `assigned_to`** pada tabel `contacts`
- **Tidak ada konsep "Sales Rep"** — semua user dalam 1 tenant bisa lihat semua contacts
- Ada fitur **Bot Management System** (advanced, backend 100% selesai tapi belum terintegrasi):
  - Tabel `bot_users` untuk assign user ke specific bot
  - Feature permissions per user per bot
  - Audit logging
  - **Tapi ini bot-level assignment, bukan contact-level**

### ⚠️ Untuk CRM perlu:

- Role tambahan: `SALES`, `MANAGER`
- Field `assigned_to` pada contacts/deals
- Permission granular: siapa bisa lihat/edit contact siapa

---

## 5️⃣ Scalability & Infra

### Backend Stack

| Layer | Teknologi | Detail |
|-------|-----------|--------|
| **Runtime** | Node.js + TypeScript | ES Modules |
| **Framework** | Express.js | REST API |
| **Database** | Dual-driver: SQLite (dev) + PostgreSQL (prod) | Controlled by `DATABASE_TYPE` env var |
| **Cache/Queue** | Redis 7 + Bull Queue | Campaign & reminder processing |
| **WhatsApp** | Baileys adapter | WA Web protocol, replaceable via `IWhatsAppAdapter` interface |
| **AI/LLM** | OpenAI, Google Gemini, Groq | Multi-provider, configurable per bot |
| **Logging** | Winston | File rotation |
| **Process Manager** | PM2 | Production |
| **Containerization** | Docker + docker-compose | 4 containers (DB, Redis, Backend, Frontend) |

### Database Detail

| Aspect | Status |
|--------|--------|
| **Production schema** | PostgreSQL 14 (UUID PKs, JSONB, proper indexes) |
| **Development** | SQLite (default, running saat ini) |
| **Migrations** | 15 migration files |
| **Connection pooling** | `pg` pool (max 20 connections) |
| **Transaction support** | ✅ Ya |
| **Trigger functions** | ✅ `update_updated_at_column()` pada semua tabel |

### Database Tables (Existing)

**Core tables (schema.sql):**
| # | Table | Purpose |
|---|-------|---------|
| 1 | `tenants` | Multi-tenant organizations |
| 2 | `users` | Login accounts with RBAC |
| 3 | `bots` | WhatsApp bot instances |
| 4 | `keyword_rules` | Automation rules |
| 5 | `data_sources` | External data (spreadsheets) |
| 6 | `reminders` | Scheduled messages |
| 7 | `contacts` | WhatsApp contacts & groups |
| 8 | `campaigns` | Broadcast campaigns |
| 9 | `campaign_logs` | Campaign message tracking |
| 10 | `event_logs` | System event audit |
| 11 | `messages` | Message history |

**Migration-added tables:**
| # | Table | Source | Purpose |
|---|-------|--------|---------|
| 12 | `api_keys` | 007 | API key management |
| 13 | `audit_logs` | 007 | User action audit |
| 14 | `user_invites` | 007 | User invitation system |
| 15 | `system_settings` | 007 | Key-value system config |
| 16 | `system_backups` | 007 | Backup tracking |
| 17 | `message_analytics` | 007 | Aggregated message stats |
| 18 | `ai_conversations` | 007_ai | AI chat sessions |
| 19 | `ai_usage` | 007_ai | LLM API usage tracking |
| 20 | `llm_allowed_targets` | 009 | AI-enabled groups/contacts |
| 21 | `user_sessions` | 012 | Active session tracking |
| 22 | `security_logs` | 012 | Security event logs |
| 23 | `ai_sheet_updaters` | 014 | AI sheet update configs |
| 24 | `ai_sheet_update_logs` | 014 | Sheet update audit trail |

### ✅ Queue System — Redis + Bull

```
Redis (port 6379)
  ├── campaign-messages queue (Bull)
  │   → 3 attempts, exponential backoff (5s base)
  │   → Separate worker: campaignWorker.ts
  │   → removeOnComplete: true
  └── message-queue (Bull)
      → For reminder messages
      → Separate worker: messageWorker.ts
```

---

## 6️⃣ Reporting

### ✅ Dashboard Metrics — SUDAH ADA

**Analytics Controller** (`api/controllers/analyticsController.ts`) provides:

| Metric | Source |
|--------|--------|
| Total bots | `bots` table |
| Active rules | `keyword_rules` table (is_active) |
| Campaigns count | `campaigns` table |
| Messages sent | `messages` table |
| Total users | `users` table |
| Active users | `users` table (recent login) |
| Active reminders | `reminders` table (is_active) |
| Message volume chart | `messages` (grouped by hour/day) |
| Campaign success rate | `campaigns` (sent vs failed) |
| Trend calculation | Current vs previous period comparison |

**Data source:**
- Langsung query dari database tables (runtime aggregation)
- Tabel `message_analytics` tersedia untuk pre-computed stats (per date, per bot, per user) tapi belum intensif dipakai
- `event_logs` table berisi semua system events

**Frontend dashboard** (`frontend/src/app/dashboard/page.tsx`):
- Stat cards (7 metrics)
- Recent activity list
- System metrics (CPU, memory, latency)
- Quick access feature cards
- Service status indicators

**⚠️ Untuk CRM perlu extend:**
- Pipeline metrics (deals per stage, conversion rate)
- Revenue forecasting
- Contact engagement scoring
- Sales team performance

---

## 📊 Assessment Summary

| Area | Status | CRM Readiness | Action Required |
|------|--------|---------------|-----------------|
| Contact Entity | ✅ Ada | ⚠️ Partial | Extend: tambah CRM fields, unified contact |
| Conversation Model | ⚠️ Flat Messages | ❌ Tidak siap | Perlu `conversation_id` / threading |
| Tagging System | ❌ Tidak ada | ❌ Tidak siap | Buat tabel `tags` + `contact_tags` |
| Rule Engine | ✅ Config-driven | ✅ Bisa reuse | Pattern bisa di-extend untuk CRM triggers |
| Scheduler/Worker | ✅ Bull + Cron | ✅ Siap | Tambah CRM automation jobs |
| Event Bus | ✅ Async, extensible | ✅ Siap | Subscribe CRM handlers langsung |
| Role System | ✅ RBAC 3-tier | ⚠️ Partial | Perlu tambah `SALES`, `MANAGER` roles |
| Contact Ownership | ❌ Tidak ada | ❌ Tidak siap | Perlu `assigned_to` field |
| Pipeline/Deals | ❌ Tidak ada | ❌ Tidak siap | Perlu tabel baru |
| AI/Scoring | ✅ LLM infrastructure | ✅ Siap | Reuse untuk lead scoring |
| Queue System | ✅ Redis + Bull | ✅ Siap | Reuse untuk CRM automation |
| Analytics | ✅ Basic metrics | ⚠️ Partial | Extend untuk CRM metrics |

---

## 🎯 Rekomendasi: Extend Schema Existing

### Mengapa BUKAN Microservice Terpisah

1. **Event Bus sudah extensible** — CRM module tinggal `subscribe(MESSAGE_RECEIVED)` untuk enrich contact data, trigger pipeline updates. Zero modification ke existing code.

2. **Infrastructure sudah lengkap** — Redis, Bull Queue, Multi-LLM, PostgreSQL dengan JSONB — semua building blocks CRM sudah tersedia.

3. **Tenant isolation sudah enforce** — Semua query filter by `tenant_id`. CRM tables tinggal ikut pattern yang sama.

4. **Single database = simpler transactions** — Deal creation + contact update + activity log bisa dalam 1 transaction. Cross-service transactions jauh lebih kompleks.

5. **Premature splitting** — Volume data masih bisa di-handle single PostgreSQL. Communication overhead microservice tidak justified.

6. **Shared session/auth** — User authentication sudah ada. Microservice perlu auth gateway tambahan.

### Apa yang Perlu Dibuat

#### A. Database Migration (New Tables)

```sql
-- CRM Core
CREATE TABLE pipelines (...)           -- Sales pipelines
CREATE TABLE pipeline_stages (...)     -- Stages per pipeline
CREATE TABLE deals (...)               -- Individual deals
CREATE TABLE deal_activities (...)     -- Activity timeline per deal

-- Contact Enrichment
CREATE TABLE tags (...)                -- Tag definitions
CREATE TABLE contact_tags (...)        -- Many-to-many
CREATE TABLE contact_notes (...)       -- Notes per contact

-- Extend Existing
ALTER TABLE contacts ADD COLUMN assigned_to UUID REFERENCES users(id);
ALTER TABLE contacts ADD COLUMN company VARCHAR(255);
ALTER TABLE contacts ADD COLUMN lead_score INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN pipeline_stage_id UUID;
ALTER TABLE contacts ADD COLUMN source VARCHAR(50);  -- 'whatsapp', 'import', 'manual'
```

#### B. New Module Structure

```
backend/src/
  └── modules/crm/                    # New CRM module
      ├── crmEventHandler.ts          # Subscribe ke MESSAGE_RECEIVED
      ├── pipelineService.ts          # Pipeline & deal management
      ├── scoringService.ts           # AI lead scoring (reuse llmService)
      ├── contactEnrichmentService.ts # Auto-enrich contact data
      └── crmAutomationEngine.ts      # CRM-specific automation rules
  └── api/routes/
      └── crmRoutes.ts                # CRM API endpoints
  └── database/
      └── repositories/
          ├── pipelineRepository.ts
          ├── dealRepository.ts
          └── tagRepository.ts
      └── migrations/
          └── 016_crm_module.sql      # CRM tables
```

#### C. New Event Types

```typescript
// Add to EventType enum
CRM_CONTACT_ENRICHED = 'CRM_CONTACT_ENRICHED',
CRM_DEAL_CREATED = 'CRM_DEAL_CREATED',
CRM_DEAL_STAGE_CHANGED = 'CRM_DEAL_STAGE_CHANGED',
CRM_LEAD_SCORED = 'CRM_LEAD_SCORED',
CRM_CONTACT_TAGGED = 'CRM_CONTACT_TAGGED',
```

#### D. CRM Event Flow (Integrated)

```
MESSAGE_RECEIVED
    ├──→ [EXISTING] Rule Engine → Action Engine
    ├──→ [EXISTING] AI Engine (Silent Mode)
    └──→ [NEW] CRM Event Handler
              ├── Enrich contact (name, company, etc.)
              ├── Update lead score (via LLM)
              ├── Auto-tag based on message content
              ├── Update deal activity timeline
              └── Trigger CRM automation rules
```

---

## 📝 Next Steps

1. **Finalize CRM data model** — Define exact fields for contacts, deals, pipeline stages
2. **Create migration 016** — CRM tables + existing table extensions
3. **Build CRM module** — Event handler + services + API routes
4. **Extend frontend** — Pipeline view, contact detail, deal board
5. **AI Scoring integration** — Reuse existing LLM infrastructure
6. **Testing** — End-to-end flow: message → contact enrichment → pipeline update

---

*Document generated: 12 Feb 2026*  
*System: Sendr WhatsApp Automation Platform*
