# 📚 Documentation Index

Welcome to the WhatsApp Automation Platform documentation! This guide will help you navigate all available resources.

---

## 🚀 Getting Started

**New to the platform? Start here:**

1. **[README.md](./README.md)** - Project overview and features
2. **[QUICK_START.md](./QUICK_START.md)** - Quick reference guide
3. **[SETUP.md](./SETUP.md)** - Detailed installation instructions

**Recommended path:**
```
README.md → SETUP.md → QUICK_START.md → Start building!
```

---

## 📖 Core Documentation

### 1. [README.md](./README.md)
**What it covers:**
- Platform overview
- Key features
- Tech stack
- Project structure
- Quick start commands

**Read this if:**
- You're new to the project
- You want a high-level overview
- You need to understand what the platform does

---

### 2. [ARCHITECTURE.md](./ARCHITECTURE.md)
**What it covers:**
- System architecture diagrams
- Event-driven design
- Multi-tenant model
- Database schema
- Module responsibilities
- API documentation
- Scaling considerations
- Best practices

**Read this if:**
- You want to understand how it works
- You're extending the platform
- You're debugging issues
- You want to learn event-driven architecture

---

### 3. [SETUP.md](./SETUP.md)
**What it covers:**
- Prerequisites
- Step-by-step installation
- Database setup
- Environment configuration
- Docker deployment
- Production deployment
- Troubleshooting
- Security checklist

**Read this if:**
- You're setting up for the first time
- You're deploying to production
- You're having installation issues
- You need deployment instructions

---

### 4. [QUICK_START.md](./QUICK_START.md)
**What it covers:**
- Quick installation commands
- Running the platform
- Default credentials
- Common tasks
- Troubleshooting tips
- Database commands
- Testing commands

**Read this if:**
- You need quick reference
- You forgot a command
- You're doing routine tasks
- You need troubleshooting tips

---

### 5. [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
**What it covers:**
- Complete feature list
- What was implemented
- File structure
- Design patterns used
- Achievement summary

**Read this if:**
- You want to know what's included
- You're reviewing the codebase
- You want to see all features
- You're planning extensions

---

### 6. [EXAMPLES.md](./EXAMPLES.md)
**What it covers:**
- Real-world configuration examples
- Keyword rule examples
- Data source configurations
- Campaign templates
- Reminder setups
- Template variables
- Complete use cases

**Read this if:**
- You're creating your first bot
- You need configuration examples
- You want to see best practices
- You're learning the platform

---

## 🎯 Quick Navigation

### I want to...

#### **Install the platform**
→ [SETUP.md](./SETUP.md) - Section: "Quick Start (5 Minutes)"

#### **Understand the architecture**
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - Section: "System Architecture"

#### **Create my first bot**
→ [QUICK_START.md](./QUICK_START.md) - Section: "Create a New Bot"

#### **Add automation rules**
→ [EXAMPLES.md](./EXAMPLES.md) - Section: "Keyword Rule Examples"

#### **Setup Google Sheets**
→ [SETUP.md](./SETUP.md) - Section: "Google Sheets Integration"
→ [EXAMPLES.md](./EXAMPLES.md) - Section: "Data Source Examples"

#### **Run a broadcast campaign**
→ [EXAMPLES.md](./EXAMPLES.md) - Section: "Campaign/Blast Examples"

#### **Deploy to production**
→ [SETUP.md](./SETUP.md) - Section: "Production Deployment"

#### **Troubleshoot issues**
→ [QUICK_START.md](./QUICK_START.md) - Section: "Troubleshooting"
→ [SETUP.md](./SETUP.md) - Section: "Troubleshooting"

#### **Understand events**
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - Section: "Event Flow"
→ [QUICK_START.md](./QUICK_START.md) - Section: "Event Types Reference"

#### **Extend the platform**
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - Section: "Extending the Platform"

#### **See what's built**
→ [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

---

## 📁 Code Navigation

### Backend Structure

```
backend/src/
├── core/                    # Core engine
│   ├── events/             # Event system
│   │   ├── types.ts        # Event definitions
│   │   └── eventBus.ts     # Event bus
│   └── engine/             # Processing engines
│       ├── ruleEngine.ts   # Keyword matching
│       └── actionEngine.ts # Action execution
├── adapters/               # External adapters
│   └── whatsapp/          # WhatsApp integration
├── modules/               # Feature modules
│   └── datasource/        # Data sources
├── database/              # Database layer
│   ├── schema.sql         # Database schema
│   ├── connection.ts      # DB connection
│   └── repositories/      # Data access
├── api/                   # REST API
│   ├── routes/           # API endpoints
│   └── middleware/       # Auth middleware
└── utils/                # Utilities
    ├── logger.ts         # Logging
    └── templateEngine.ts # Templates
```

### Frontend Structure

```
frontend/src/
├── app/                   # Next.js pages
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/           # React components
│   └── providers.tsx     # Providers
└── lib/                  # Libraries
    └── api.ts            # API client
```

---

## 🔍 Search Guide

### Looking for...

**Event definitions?**
→ `backend/src/core/events/types.ts`

**How events work?**
→ `backend/src/core/events/eventBus.ts`
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - "Event Flow"

**Keyword matching logic?**
→ `backend/src/core/engine/ruleEngine.ts`

**Action execution?**
→ `backend/src/core/engine/actionEngine.ts`

**WhatsApp integration?**
→ `backend/src/adapters/whatsapp/whatsappAdapter.ts`

**Database schema?**
→ `backend/src/database/schema.sql`
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - "Database Schema"

**API endpoints?**
→ `backend/src/api/routes/`
→ [ARCHITECTURE.md](./ARCHITECTURE.md) - "API Endpoints"

**Authentication?**
→ `backend/src/api/middleware/auth.ts`

**Configuration examples?**
→ [EXAMPLES.md](./EXAMPLES.md)

---

## 📚 Learning Path

### Beginner Path

1. Read [README.md](./README.md) - Understand what it does
2. Follow [SETUP.md](./SETUP.md) - Install the platform
3. Use [QUICK_START.md](./QUICK_START.md) - Create first bot
4. Check [EXAMPLES.md](./EXAMPLES.md) - See real examples

### Intermediate Path

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand design
2. Review `backend/src/core/` - Study core engine
3. Review `backend/src/api/` - Study API layer
4. Experiment with configurations

### Advanced Path

1. Study event system (`core/events/`)
2. Understand adapters (`adapters/whatsapp/`)
3. Extend with new features
4. Contribute improvements

---

## 🎓 Tutorials

### Tutorial 1: Create Your First Bot
1. Install platform ([SETUP.md](./SETUP.md))
2. Login to dashboard
3. Create bot
4. Scan QR code
5. Add keyword rule ([EXAMPLES.md](./EXAMPLES.md))
6. Test with WhatsApp message

### Tutorial 2: Setup Auto-Reply
1. Create keyword rule
2. Set keyword: "halo"
3. Set match type: "equals"
4. Add SEND_TEXT action
5. Test the reply

### Tutorial 3: Connect Google Sheets
1. Get API key ([SETUP.md](./SETUP.md) - Google Sheets section)
2. Create data source
3. Configure column mapping
4. Use in rule action
5. Test with data

### Tutorial 4: Run a Campaign
1. Create contact list
2. Create campaign
3. Set message template
4. Configure throttling
5. Launch campaign

---

## 🔧 Reference

### Environment Variables
See: [SETUP.md](./SETUP.md) - "Configure Environment"

### API Endpoints
See: [ARCHITECTURE.md](./ARCHITECTURE.md) - "API Endpoints"

### Event Types
See: [QUICK_START.md](./QUICK_START.md) - "Event Types Reference"

### Database Schema
See: `backend/src/database/schema.sql`

### Cron Expressions
See: [EXAMPLES.md](./EXAMPLES.md) - "Cron Expression Examples"

---

## 💡 Tips

1. **Start with README.md** - Get the big picture
2. **Use QUICK_START.md** - For daily reference
3. **Read ARCHITECTURE.md** - To understand deeply
4. **Check EXAMPLES.md** - For real-world configs
5. **Refer to SETUP.md** - When deploying

---

## 🆘 Getting Help

### Installation Issues
→ [SETUP.md](./SETUP.md) - "Troubleshooting"
→ [QUICK_START.md](./QUICK_START.md) - "Troubleshooting"

### Understanding Concepts
→ [ARCHITECTURE.md](./ARCHITECTURE.md)

### Configuration Help
→ [EXAMPLES.md](./EXAMPLES.md)

### Quick Commands
→ [QUICK_START.md](./QUICK_START.md)

---

## 📝 Document Summary

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **README.md** | Overview | First time |
| **SETUP.md** | Installation | Setting up |
| **QUICK_START.md** | Quick reference | Daily use |
| **ARCHITECTURE.md** | System design | Understanding |
| **PROJECT_SUMMARY.md** | What's built | Reviewing |
| **EXAMPLES.md** | Real configs | Configuring |
| **INDEX.md** | This file | Navigation |

---

## 🎯 Common Workflows

### First Time Setup
```
README.md → SETUP.md → QUICK_START.md → Dashboard
```

### Daily Development
```
QUICK_START.md → Code → EXAMPLES.md → Test
```

### Debugging
```
QUICK_START.md (Troubleshooting) → Logs → ARCHITECTURE.md
```

### Production Deployment
```
SETUP.md (Production) → Docker → Monitor
```

### Learning
```
README.md → ARCHITECTURE.md → Code → EXAMPLES.md
```

---

## 📞 Quick Links

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health

---

**Happy Building! 🚀**

Built with ❤️ by Anti-Gravity
