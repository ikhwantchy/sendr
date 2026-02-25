# 📚 TECH STACK & SYSTEM SPECIFICATIONS

## 🎯 **WhatsApp Automation Platform**

### **Project Name:** WA Automation Platform
### **Version:** 1.0.0
### **Type:** Full-Stack Web Application

---

## 🖥️ **FRONTEND**

### **Framework & Libraries:**
- **Next.js 14** (App Router) - React Framework
- **React 18** - UI Library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS Framework

### **State Management & Data Fetching:**
- **TanStack Query (React Query)** - Server state management
- **React Context API** - Global state (Admin Mode, Auth)

### **UI Components:**
- **Custom Components** - Glassmorphism design
- **Headless UI** - Accessible components
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

### **Form & Validation:**
- **React Hook Form** - Form management
- **Zod** - Schema validation

### **Rich Text:**
- **Custom Rich Text Editor** - Markdown-style formatting
- **Emoji Picker** - Emoji support

### **HTTP Client:**
- **Axios** - API requests
- **Fetch API** - Google Sheets import

### **Development Tools:**
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Type checking

---

## ⚙️ **BACKEND**

### **Runtime & Framework:**
- **Node.js** (v18+) - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe development

### **WhatsApp Integration:**
- **whatsapp-web.js** - WhatsApp Web API wrapper
- **Puppeteer** - Browser automation for WhatsApp
- **QRCode** - QR code generation

### **Database:**
- **MySQL** - Primary database (production)
- **SQLite** - Alternative database (development)
- **Sequelize** - ORM (Object-Relational Mapping)

### **Authentication:**
- **JWT (JSON Web Tokens)** - Token-based auth
- **bcrypt** - Password hashing
- **express-session** - Session management

### **Job Queue:**
- **Bull** - Redis-based queue for campaigns
- **Redis** - In-memory data store

### **File Processing:**
- **Multer** - File upload handling
- **CSV Parser** - CSV file parsing
- **XLSX** - Excel file parsing

### **Real-time Communication:**
- **Socket.IO** - WebSocket for real-time updates
- **Server-Sent Events** - QR code streaming

### **Utilities:**
- **dotenv** - Environment variables
- **cors** - Cross-Origin Resource Sharing
- **morgan** - HTTP request logger
- **winston** - Application logging

---

## 🗄️ **DATABASE SCHEMA**

### **Tables:**

#### **1. users**
```sql
- id (UUID, Primary Key)
- username (VARCHAR, Unique)
- email (VARCHAR, Unique)
- password (VARCHAR, Hashed)
- role (ENUM: 'admin', 'user')
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **2. bots**
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users.id)
- name (VARCHAR)
- phone_number (VARCHAR)
- status (ENUM: 'connected', 'disconnected', 'connecting')
- qr_code (TEXT)
- session_data (JSON)
- is_active (BOOLEAN)
- last_seen (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **3. rules (Auto-Reply)**
```sql
- id (UUID, Primary Key)
- bot_id (UUID, Foreign Key → bots.id)
- trigger (VARCHAR) - Keyword
- reply (TEXT) - Response message
- match_type (ENUM: 'exact', 'contains', 'starts_with', 'ends_with')
- is_active (BOOLEAN)
- priority (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **4. campaigns (Broadcast)**
```sql
- id (UUID, Primary Key)
- bot_id (UUID, Foreign Key → bots.id)
- name (VARCHAR)
- message (TEXT)
- image_url (VARCHAR, Nullable)
- recipient_type (ENUM: 'contacts', 'groups')
- schedule_type (ENUM: 'immediate', 'scheduled')
- scheduled_at (TIMESTAMP, Nullable)
- status (ENUM: 'pending', 'processing', 'completed', 'failed')
- total_recipients (INTEGER)
- sent_count (INTEGER)
- failed_count (INTEGER)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **5. campaign_recipients**
```sql
- id (UUID, Primary Key)
- campaign_id (UUID, Foreign Key → campaigns.id)
- phone (VARCHAR)
- name (VARCHAR)
- status (ENUM: 'pending', 'sent', 'failed')
- sent_at (TIMESTAMP, Nullable)
- error_message (TEXT, Nullable)
- created_at (TIMESTAMP)
```

#### **6. reminders (Group Reminders)**
```sql
- id (UUID, Primary Key)
- bot_id (UUID, Foreign Key → bots.id)
- group_id (VARCHAR) - WhatsApp Group ID
- group_name (VARCHAR)
- message (TEXT)
- schedule_time (TIME) - Daily time
- schedule_days (JSON) - Array of days
- is_active (BOOLEAN)
- last_sent (TIMESTAMP, Nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### **7. wa_groups**
```sql
- id (UUID, Primary Key)
- bot_id (UUID, Foreign Key → bots.id)
- group_id (VARCHAR, Unique) - WhatsApp Group ID
- name (VARCHAR)
- participant_count (INTEGER)
- is_active (BOOLEAN)
- last_synced (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🏗️ **ARCHITECTURE**

### **Frontend Architecture:**
```
┌─────────────────────────────────────┐
│         Next.js App Router          │
├─────────────────────────────────────┤
│  Pages (App Directory)              │
│  ├── /dashboard                     │
│  ├── /dashboard/bots                │
│  ├── /dashboard/bots/[id]           │
│  └── /login                         │
├─────────────────────────────────────┤
│  Components                         │
│  ├── Modals (Create/Edit)           │
│  ├── Tables (Data Display)          │
│  ├── Forms (Input)                  │
│  └── Previews (WhatsApp)            │
├─────────────────────────────────────┤
│  State Management                   │
│  ├── React Query (Server State)     │
│  └── Context API (Global State)     │
├─────────────────────────────────────┤
│  API Layer (Axios)                  │
└─────────────────────────────────────┘
```

### **Backend Architecture:**
```
┌─────────────────────────────────────┐
│         Express.js Server           │
├─────────────────────────────────────┤
│  Routes                             │
│  ├── /api/auth                      │
│  ├── /api/bots                      │
│  ├── /api/rules                     │
│  ├── /api/campaigns                 │
│  └── /api/reminders                 │
├─────────────────────────────────────┤
│  Controllers (Business Logic)       │
├─────────────────────────────────────┤
│  Services                           │
│  ├── WhatsApp Service               │
│  ├── Campaign Service               │
│  └── Reminder Service               │
├─────────────────────────────────────┤
│  Middleware                         │
│  ├── Auth (JWT)                     │
│  ├── Validation                     │
│  └── Error Handling                 │
├─────────────────────────────────────┤
│  Database (Sequelize ORM)           │
│  └── MySQL / SQLite                 │
├─────────────────────────────────────┤
│  Job Queue (Bull + Redis)           │
└─────────────────────────────────────┘
```

---

## 🚀 **DEPLOYMENT**

### **Development:**
- **Frontend:** `npm run dev` (Port 3000)
- **Backend:** `npm run dev` (Port 3001)
- **Database:** MySQL (Port 3306) / SQLite (File-based)
- **Redis:** Port 6379 (for Bull Queue)

### **Production:**
- **Frontend:** Vercel / Netlify / Self-hosted
- **Backend:** VPS / Cloud (AWS, DigitalOcean, etc.)
- **Database:** MySQL Server
- **Redis:** Redis Cloud / Self-hosted
- **Process Manager:** PM2

---

## 💻 **SYSTEM REQUIREMENTS**

### **Development:**
- **OS:** Windows 10/11, macOS, Linux
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MySQL:** v8.0 or higher (or SQLite)
- **Redis:** v6.0 or higher (optional, for campaigns)
- **RAM:** Minimum 4GB (8GB recommended)
- **Storage:** Minimum 2GB free space

### **Production:**
- **Server:** VPS with 2GB+ RAM
- **Node.js:** v18.0.0 LTS
- **MySQL:** v8.0 or higher
- **Redis:** v6.0 or higher
- **SSL Certificate:** For HTTPS
- **Domain:** Custom domain (optional)

---

## 📦 **DEPENDENCIES**

### **Frontend (package.json):**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "sonner": "^1.0.0",
    "lucide-react": "^0.300.0"
  }
}
```

### **Backend (package.json):**
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "whatsapp-web.js": "^1.23.0",
    "puppeteer": "^21.0.0",
    "sequelize": "^6.35.0",
    "mysql2": "^3.6.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "bull": "^4.11.0",
    "redis": "^4.6.0",
    "socket.io": "^4.6.0",
    "multer": "^1.4.5",
    "dotenv": "^16.3.0",
    "cors": "^2.8.5"
  }
}
```

---

## 🎨 **DESIGN SYSTEM**

### **Colors:**
- **Primary:** Cyan (#06B6D4)
- **Secondary:** Blue (#3B82F6)
- **Success:** Green (#10B981)
- **Warning:** Yellow (#F59E0B)
- **Error:** Red (#EF4444)
- **Background:** Dark (#0F172A, #1E293B)

### **Typography:**
- **Font:** Inter (Google Fonts)
- **Sizes:** 12px - 48px
- **Weights:** 400, 500, 600, 700

### **Effects:**
- **Glassmorphism:** backdrop-blur + transparency
- **Gradients:** Linear gradients (cyan → blue)
- **Shadows:** Soft shadows with color tints
- **Animations:** Smooth transitions (200-300ms)

---

## 🔒 **SECURITY**

### **Authentication:**
- JWT tokens (HTTP-only cookies)
- Password hashing (bcrypt, 10 rounds)
- Session management

### **API Security:**
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention (Sequelize ORM)
- XSS protection

### **WhatsApp Security:**
- Session encryption
- Secure QR code transmission
- Session timeout

---

## 📊 **PERFORMANCE**

### **Frontend:**
- **Code Splitting:** Next.js automatic
- **Image Optimization:** Next.js Image component
- **Caching:** React Query cache
- **Bundle Size:** ~500KB (gzipped)

### **Backend:**
- **Database Indexing:** Primary keys, foreign keys
- **Query Optimization:** Sequelize eager loading
- **Caching:** Redis for sessions
- **Job Queue:** Bull for async tasks

---

## 🧪 **TESTING**

### **Tools:**
- **Jest** - Unit testing
- **React Testing Library** - Component testing
- **Supertest** - API testing
- **Postman** - Manual API testing

---

## 📝 **DOCUMENTATION**

### **Code Documentation:**
- **JSDoc** - Function documentation
- **TypeScript** - Type definitions
- **README.md** - Setup instructions

### **API Documentation:**
- **Swagger/OpenAPI** - API endpoints
- **Postman Collection** - API examples

---

## 🔄 **VERSION CONTROL**

- **Git** - Version control
- **GitHub/GitLab** - Repository hosting
- **Branching Strategy:** Git Flow
  - `main` - Production
  - `develop` - Development
  - `feature/*` - Features
  - `hotfix/*` - Urgent fixes

---

## 📈 **SCALABILITY**

### **Horizontal Scaling:**
- Load balancer (Nginx)
- Multiple backend instances
- Redis cluster
- Database replication

### **Vertical Scaling:**
- Increase server resources
- Database optimization
- Caching strategies

---

## 🎯 **KEY FEATURES**

1. **Multi-Bot Management** - Manage multiple WhatsApp bots
2. **Auto-Reply Rules** - Keyword-based responses
3. **Broadcast Campaigns** - Mass messaging to contacts/groups
4. **Group Reminders** - Scheduled messages to groups
5. **Contact Import** - CSV, Excel, Google Sheets
6. **Real-time Updates** - Socket.IO for live data
7. **Rich Text Editor** - Formatting, emojis
8. **WhatsApp Preview** - Message preview before send
9. **Analytics** - Message stats, campaign tracking
10. **Role-Based Access** - Admin/User permissions

---

## 📞 **SUPPORT & MAINTENANCE**

### **Monitoring:**
- Application logs (Winston)
- Error tracking
- Performance monitoring

### **Backup:**
- Database backups (daily)
- Session backups
- Configuration backups

---

## 🎊 **SUMMARY**

**Tech Stack:**
- ✅ **Frontend:** Next.js 14 + React 18 + TypeScript + Tailwind CSS
- ✅ **Backend:** Node.js + Express + TypeScript
- ✅ **Database:** MySQL (or SQLite)
- ✅ **WhatsApp:** whatsapp-web.js + Puppeteer
- ✅ **Queue:** Bull + Redis
- ✅ **Real-time:** Socket.IO

**Modern, Scalable, Production-Ready!** 🚀
