# WhatsApp Automation Platform - Architecture Documentation

## 🏗️ System Architecture

### Overview

This is a **production-ready, multi-tenant WhatsApp automation platform** built with event-driven architecture. The system is designed to scale horizontally and maintain complete tenant isolation.

### Core Principles

1. **Event-Driven**: All modules communicate via events only
2. **Multi-Tenant**: Complete data isolation per tenant
3. **Config-Driven**: All behavior from database, no hardcoded logic
4. **Replaceable Adapters**: WhatsApp provider can be swapped
5. **RBAC**: Role-based access control (OWNER, OPERATOR, VIEWER)

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  Bots    │  │ Rules    │  │Campaigns │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js + Express)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              API Layer (REST Endpoints)                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Anti-Gravity Event Bus (Core)                  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  MESSAGE_RECEIVED → KEYWORD_MATCHED → ACTION_*   │  │ │
│  │  │  BLAST_* → REMINDER_* → WA_* Events              │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Rule Engine  │  │Action Engine │  │ Blast Scheduler  │  │
│  │(Match Rules) │  │(Execute Acts)│  │(Campaigns/Remind)│  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                            │                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          WhatsApp Adapter (Replaceable)                 │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  QR Generation → Session Management → Messaging  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (Multi-Tenant)                  │
│  tenants │ users │ bots │ rules │ campaigns │ contacts      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   Redis (Cache & Queue)                      │
│  Session Cache │ Data Source Cache │ Job Queue              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Event Flow

### 1. Message Received Flow

```
WhatsApp Message
    ↓
WhatsApp Adapter
    ↓ (emit)
MESSAGE_RECEIVED Event
    ↓ (subscribe)
Rule Engine
    ↓ (match keyword)
KEYWORD_MATCHED Event
    ↓ (subscribe)
Action Engine
    ↓ (execute actions)
ACTION_EXECUTED Event
```

### 2. Blast Campaign Flow

```
User Creates Campaign
    ↓
BLAST_CREATED Event
    ↓
Blast Scheduler
    ↓ (for each contact)
BLAST_MESSAGE_SENT Event
    ↓
WhatsApp Adapter
    ↓
Message Sent to Contact
```

### 3. QR Login Flow

```
User Clicks "Connect Bot"
    ↓
API: POST /api/bots/:id/connect
    ↓
WhatsApp Adapter.requestQRCode()
    ↓ (emit)
WA_QR_GENERATED Event
    ↓
Frontend polls /api/bots/:id/status
    ↓
QR displayed to user
    ↓
User scans QR
    ↓ (emit)
WA_CONNECTED Event
    ↓
Bot status updated to "connected"
```

---

## 🗄️ Database Schema

### Multi-Tenant Model

Every table (except `tenants`) has `tenant_id` for isolation.

**Key Tables:**

- `tenants` - Organizations
- `users` - Login accounts with roles
- `bots` - WhatsApp bot instances
- `keyword_rules` - Automation rules
- `data_sources` - External data (spreadsheets)
- `reminders` - Scheduled messages
- `contacts` - WhatsApp contacts/groups
- `campaigns` - Broadcast campaigns
- `campaign_logs` - Message tracking
- `event_logs` - System events audit

### Indexes

All tables have indexes on:
- `tenant_id` (for isolation)
- `status` fields (for filtering)
- `created_at` (for sorting)

---

## 🎯 Core Modules

### 1. Rule Engine (`core/engine/ruleEngine.ts`)

**Responsibilities:**
- Subscribe to `MESSAGE_RECEIVED`
- Load rules from database (cached)
- Match keywords (equals/contains/regex)
- Apply scope (global/group/contact)
- Emit `KEYWORD_MATCHED`

**Restrictions:**
- ❌ MUST NOT send messages
- ❌ MUST NOT fetch data
- ✅ ONLY match and emit

### 2. Action Engine (`core/engine/actionEngine.ts`)

**Responsibilities:**
- Subscribe to `KEYWORD_MATCHED`
- Execute configured actions
- Support template variables
- Emit `ACTION_EXECUTED` / `ACTION_FAILED`

**Supported Actions:**
- `SEND_TEXT` - Send text message
- `SEND_IMAGE` - Send image with caption
- `FETCH_SPREADSHEET` - Fetch data from source
- `COMPOSE_MESSAGE` - Render template + data
- `TRIGGER_REMINDER` - Schedule reminder

### 3. WhatsApp Adapter (`adapters/whatsapp/`)

**Responsibilities:**
- Manage WhatsApp sessions
- Generate QR codes
- Send/receive messages
- Emit connection events

**Interface (`IWhatsAppAdapter`):**
```typescript
interface IWhatsAppAdapter {
  initializeBot(botId: string): Promise<void>
  requestQRCode(botId: string): Promise<QRData>
  getConnectionStatus(botId: string): Promise<Status>
  sendMessage(botId: string, recipient: string, message: Message): Promise<Result>
  disconnect(botId: string): Promise<void>
  destroySession(botId: string): Promise<void>
}
```

**Current Implementation:**
- `whatsapp-web.js` (can be replaced with official API, Baileys, etc.)

### 4. Data Source Service (`modules/datasource/`)

**Responsibilities:**
- Fetch data from external sources
- Support Google Sheets, CSV, API
- Apply column mapping
- Cache results

**Example Config:**
```json
{
  "type": "google_sheets",
  "connection_config": {
    "spreadsheet_id": "abc123",
    "sheet_name": "Sheet1",
    "range": "A:Z"
  },
  "column_mapping": {
    "nama": "Name",
    "email": "Email"
  },
  "cache_ttl": 300
}
```

---

## 🔐 Authentication & Authorization

### JWT-Based Auth

**Token Payload:**
```json
{
  "id": "user-uuid",
  "tenant_id": "tenant-uuid",
  "email": "user@example.com",
  "role": "OWNER"
}
```

### Roles

| Role | Permissions |
|------|-------------|
| **OWNER** | Full access, user management |
| **OPERATOR** | Manage bots, rules, campaigns |
| **VIEWER** | Read-only access |

### Middleware

```typescript
// Require authentication
router.use(authenticate)

// Require specific role
router.post('/bots', requireRole(['OWNER', 'OPERATOR']), handler)
```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register tenant + user

### Bots
- `GET /api/bots` - List bots
- `POST /api/bots` - Create bot
- `POST /api/bots/:id/connect` - Request QR code
- `GET /api/bots/:id/status` - Get connection status
- `POST /api/bots/:id/disconnect` - Disconnect bot
- `DELETE /api/bots/:id` - Delete bot

### Rules
- `GET /api/rules` - List rules
- `POST /api/rules` - Create rule
- `PUT /api/rules/:id` - Update rule
- `DELETE /api/rules/:id` - Delete rule

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign

### Data Sources
- `GET /api/datasources` - List data sources

### Analytics
- `GET /api/analytics` - Get metrics

---

## 🚀 Deployment

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

### Manual Setup

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your config
npm run migrate
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Environment Variables

**Backend (.env):**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`
- `GOOGLE_SHEETS_API_KEY` (optional)

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL`

---

## 📈 Scaling Considerations

### Horizontal Scaling

- **Stateless API**: Multiple backend instances behind load balancer
- **Session Storage**: WhatsApp sessions in shared volume or S3
- **Queue-Based**: Bull queues for async processing
- **Redis Pub/Sub**: For real-time updates across instances

### Performance

- **Database Indexing**: All queries use indexed columns
- **Caching**: Redis for rules, data sources, sessions
- **Connection Pooling**: PostgreSQL pool (max 20)
- **Rate Limiting**: Per-tenant API limits

### Monitoring

- **Logs**: Winston logger with file rotation
- **Events**: All events logged to `event_logs` table
- **Health Check**: `GET /health` endpoint
- **Metrics**: Campaign success rates, message counts

---

## 🧪 Testing

### Unit Tests

```bash
cd backend
npm test
```

### Integration Tests

Test event flow:
```typescript
// Emit MESSAGE_RECEIVED
await eventBus.emit(EventType.MESSAGE_RECEIVED, context, payload)

// Wait for KEYWORD_MATCHED
const event = await eventBus.waitFor(EventType.KEYWORD_MATCHED, 5000)

// Assert
expect(event.payload.rule_id).toBe('expected-rule-id')
```

---

## 🔧 Extending the Platform

### Adding a New Action Type

1. Add type to `ActionConfig` in `core/events/types.ts`
2. Implement handler in `actionEngine.ts`
3. Update frontend UI for action builder

### Replacing WhatsApp Adapter

1. Implement `IWhatsAppAdapter` interface
2. Replace import in `index.ts`
3. No other code changes needed!

### Adding a New Event

1. Add to `EventType` enum
2. Define payload interface
3. Emit from appropriate module
4. Subscribe in handler module

---

## 📝 Example Configurations

### Keyword Rule

```json
{
  "name": "Price Inquiry",
  "keyword": "harga",
  "match_type": "contains",
  "scope": "global",
  "priority": 10,
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "Harga mulai dari Rp 50.000. Silakan hubungi admin untuk info lebih lanjut."
      }
    }
  ]
}
```

### Reminder

```json
{
  "name": "Daily Report",
  "cron_expression": "0 9 * * *",
  "scope": "group",
  "scope_target": "group-id@g.us",
  "message_template": "Selamat pagi! Laporan harian: {{list}}",
  "data_source_id": "spreadsheet-uuid"
}
```

### Campaign

```json
{
  "name": "Product Launch",
  "message_type": "text",
  "message_template": "Hi {{nama}}, kami launching produk baru!",
  "target_type": "custom",
  "target_list": ["contact1@c.us", "contact2@c.us"],
  "data_source_id": "customer-list-uuid",
  "throttle_config": {
    "delay_min": 2000,
    "delay_max": 5000,
    "batch_size": 10
  }
}
```

---

## 🎓 Best Practices

1. **Always use events** for inter-module communication
2. **Never bypass tenant_id** in queries
3. **Cache aggressively** but invalidate properly
4. **Log everything** for debugging
5. **Validate input** at API layer
6. **Handle errors gracefully** in event handlers
7. **Test event flows** end-to-end

---

## 📞 Support & Contribution

This is a production platform. When extending:

- Follow event-driven architecture
- Maintain tenant isolation
- Keep adapters logic-free
- Update this documentation

---

**Built with ❤️ by Anti-Gravity**
