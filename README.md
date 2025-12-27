# WhatsApp Automation Platform

## 🚀 Production-Ready Multi-Tenant WhatsApp Automation Platform

A scalable, event-driven platform for managing WhatsApp bots, automation rules, reminders, and broadcast campaigns.

### ✨ Key Features

- **Multi-Tenant Architecture**: Complete tenant isolation with RBAC
- **Event-Driven Design**: Decoupled modules communicating via event bus
- **WhatsApp Integration**: QR-based login with replaceable adapter pattern
- **Bot Automation**: Keyword-based rules with regex support
- **Reminders & Scheduling**: Cron-based reminder system
- **Broadcast Campaigns**: Throttled, personalized mass messaging
- **Data Sources**: Google Spreadsheet integration with column mapping
- **Real-time Dashboard**: Next.js dashboard with live status updates
- **Role-Based Access**: OWNER, OPERATOR, VIEWER roles

### 🛠️ Tech Stack

**Backend:**
- Node.js + TypeScript
- Express.js
- PostgreSQL
- Redis (cache & queue)
- Bull (job queue)
- Anti-Gravity Event Bus

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query
- JWT Authentication

**WhatsApp:**
- whatsapp-web.js (replaceable adapter)
- QR Code authentication
- Session management

### 📁 Project Structure

```
wa-automation-platform/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── core/           # Core engine (rules, actions, events)
│   │   ├── adapters/       # WhatsApp & external adapters
│   │   ├── modules/        # Feature modules
│   │   ├── database/       # Database models & migrations
│   │   └── api/            # REST API routes
│   └── package.json
├── frontend/               # Next.js dashboard
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # UI components
│   │   └── lib/           # Utilities & API client
│   └── package.json
├── docker-compose.yml
└── README.md
```

### 🚦 Quick Start

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker (optional)

#### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file
npm run migrate
npm run dev
```

#### Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Configure your .env.local file
npm run dev
```

#### Docker Setup

```bash
docker-compose up -d
```

### 🎯 Core Concepts

#### Event-Driven Architecture

All modules communicate via events:
- `MESSAGE_RECEIVED` → Bot receives a message
- `KEYWORD_MATCHED` → Rule engine matches keyword
- `ACTION_EXECUTED` → Action completes successfully
- `REMINDER_TRIGGERED` → Scheduled reminder fires
- `BLAST_MESSAGE_SENT` → Broadcast message sent

#### Multi-Tenancy

Every resource is isolated by `tenant_id`:
- Users belong to one tenant
- All queries filtered by tenant
- No cross-tenant data access

#### Replaceable WhatsApp Adapter

The WhatsApp adapter is completely abstracted:
- Implements standard interface
- No business logic inside
- Can be swapped for any provider
- Supports QR authentication

### 📊 Database Schema

See `backend/src/database/schema.sql` for complete schema.

Key tables:
- `tenants` - Organization/user accounts
- `users` - Login accounts with roles
- `bots` - WhatsApp bot instances
- `keyword_rules` - Automation rules
- `data_sources` - Spreadsheet configurations
- `reminders` - Scheduled messages
- `campaigns` - Broadcast campaigns

### 🔐 Authentication & Authorization

**Roles:**
- **OWNER**: Full access, user management
- **OPERATOR**: Manage bots, run campaigns
- **VIEWER**: Read-only access

JWT-based authentication with role enforcement at API level.

### 📡 API Documentation

API runs on `http://localhost:3001`

Key endpoints:
- `POST /api/auth/login` - User authentication
- `GET /api/bots` - List tenant bots
- `POST /api/bots/:id/connect` - Initiate QR login
- `GET /api/bots/:id/qr` - Get QR code (SSE)
- `POST /api/campaigns` - Create broadcast
- `GET /api/analytics` - Dashboard metrics

### 🎨 Dashboard Features

- **Bot Management**: Create, connect, monitor bots
- **QR Login**: Real-time QR code display
- **Rule Builder**: Visual keyword rule creator
- **Campaign Manager**: Schedule & track broadcasts
- **Analytics**: Message metrics & reports
- **User Management**: Invite & manage team members

### 🔧 Configuration

All behavior is database-driven. No hardcoded logic.

Example keyword rule:
```json
{
  "keyword": "HARGA",
  "match_type": "contains",
  "scope": "global",
  "actions": [
    {
      "type": "SEND_TEXT",
      "config": {
        "message": "Harga mulai dari Rp 50.000"
      }
    }
  ]
}
```

### 📈 Scaling Considerations

- **Horizontal Scaling**: Stateless API servers
- **Queue-Based Processing**: Bull queues for async tasks
- **Redis Caching**: Session & frequently accessed data
- **Database Indexing**: Optimized queries with proper indexes
- **Rate Limiting**: Per-tenant API limits

### 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### 📝 License

MIT

### 🤝 Contributing

This is a production platform. Follow the architecture rules:
1. NO business logic in adapters
2. ALL behavior from database
3. ALL modules via events only
4. Tenant isolation ALWAYS enforced

---

Built with ❤️ by Anti-Gravity
