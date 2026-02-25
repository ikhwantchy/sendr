# 🎯 Reminder System - Complete Implementation Plan

## Status: 🚧 In Progress
**Created**: 2025-12-27  
**Target**: Generic Reminder Framework with Daily Digest Use Case

---

## 📋 Overview

Building a **flexible, template-based reminder system** that can handle:
- ✅ Daily Digest (Jadwal Kuliah + Tugas Deadline)
- ✅ Weekly Digest
- ✅ Custom reminders for any use case
- ✅ Multiple data sources (Google Sheets, CSV, etc)
- ✅ Real-time preview chat in UI

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     REMINDER SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Data Sources │───▶│ Data Pipeline│───▶│   Template   │  │
│  │              │    │              │    │    Engine    │  │
│  │ • Sheets     │    │ • Filter     │    │              │  │
│  │ • CSV        │    │ • Sort       │    │ • Variables  │  │
│  │ • API        │    │ • Group      │    │ • Formatting │  │
│  └──────────────┘    │ • Aggregate  │    └──────────────┘  │
│                      └──────────────┘            │          │
│                                                   ▼          │
│                      ┌──────────────┐    ┌──────────────┐  │
│                      │  Scheduler   │───▶│  WhatsApp    │  │
│                      │  (Cron)      │    │   Adapter    │  │
│                      └──────────────┘    └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### ✅ DONE
- `data_sources` - Google Sheets, CSV, API connections
- `reminders` - Reminder configurations
- `reminder_logs` - Execution history
- `wa_groups` - WhatsApp group list for targeting

---

## 🔧 Backend Implementation

### Phase 1: Core Services (Priority: HIGH)

#### 1. Google Sheets Service
**File**: `backend/src/services/googleSheetsService.ts`

```typescript
Features:
- ✅ Connect to Google Sheets API
- ✅ Fetch sheet data by spreadsheet ID
- ✅ Parse columns and rows
- ✅ Cache data (TTL: 5 minutes)
- ✅ Handle authentication (Service Account or OAuth)

Methods:
- fetchSheetData(spreadsheetId, sheetName)
- getSheetColumns(spreadsheetId, sheetName)
- validateConnection(spreadsheetId)
```

#### 2. Data Pipeline Service
**File**: `backend/src/services/dataPipelineService.ts`

```typescript
Features:
- ✅ Apply filters to data
- ✅ Sort data
- ✅ Group data
- ✅ Aggregate data (sum, count, avg)
- ✅ Transform data based on config

Operators:
- equals, not_equals
- contains, not_contains
- greater_than, less_than
- date_equals, date_before, date_after
- date_diff_days (for deadline checking)
- is_empty, is_not_empty

Methods:
- applyFilters(data, filters)
- sortData(data, sortConfig)
- groupData(data, groupBy)
- aggregateData(data, aggregations)
- executePipeline(data, pipelineConfig)
```

#### 3. Template Engine Service
**File**: `backend/src/services/templateEngineService.ts`

```typescript
Features:
- ✅ Replace variables in template
- ✅ Format dates (TODAY, TOMORROW, etc)
- ✅ Format numbers
- ✅ Handle empty data sections
- ✅ Generate final message

Variables:
- {TODAY}, {TOMORROW}, {YESTERDAY}
- {TODAY_NAME} (Senin, Selasa, etc)
- {TODAY_DATE} (10/12/2025)
- {column_name} - from data
- {index} - numbering
- {count} - total items

Methods:
- renderTemplate(templateConfig, data)
- formatDate(date, format)
- replaceVariables(template, variables)
```

#### 4. Reminder Scheduler Service
**File**: `backend/src/services/reminderSchedulerService.ts`

```typescript
Features:
- ✅ Load active reminders from database
- ✅ Schedule using node-cron
- ✅ Execute reminder at scheduled time
- ✅ Fetch data from data source
- ✅ Apply pipeline transformations
- ✅ Render template
- ✅ Send via WhatsApp adapter
- ✅ Log execution results

Methods:
- initScheduler()
- scheduleReminder(reminder)
- executeReminder(reminderId)
- calculateNextRun(cronExpression)
```

---

### Phase 2: API Endpoints (Priority: HIGH)

#### Data Sources API
**File**: `backend/src/api/routes/dataSourceRoutes.ts`

```
GET    /api/data-sources              - List all data sources
GET    /api/data-sources/:id          - Get data source details
POST   /api/data-sources              - Create new data source
PUT    /api/data-sources/:id          - Update data source
DELETE /api/data-sources/:id          - Delete data source
GET    /api/data-sources/:id/preview  - Preview data from source
GET    /api/data-sources/:id/sheets   - List sheets (for Google Sheets)
GET    /api/data-sources/:id/columns  - Get columns from sheet
```

#### Reminders API
**File**: `backend/src/api/routes/reminderRoutes.ts`

```
GET    /api/reminders                 - List all reminders
GET    /api/reminders/:id             - Get reminder details
POST   /api/reminders                 - Create new reminder
PUT    /api/reminders/:id             - Update reminder
DELETE /api/reminders/:id             - Delete reminder
POST   /api/reminders/:id/test        - Send test message
POST   /api/reminders/:id/preview     - Generate preview message
GET    /api/reminders/:id/logs        - Get execution logs
POST   /api/reminders/:id/toggle      - Activate/Deactivate
```

#### WhatsApp Groups API
**File**: `backend/src/api/routes/groupRoutes.ts`

```
GET    /api/bots/:botId/groups        - List groups for bot
POST   /api/bots/:botId/groups/sync   - Sync groups from WhatsApp
```

---

## 🎨 Frontend Implementation

### Phase 1: Data Sources Management (Priority: HIGH)

#### Page: Data Sources List
**File**: `frontend/src/app/dashboard/datasources/page.tsx`

```
Features:
- ✅ List all data sources
- ✅ Create new data source (Google Sheets)
- ✅ Edit data source
- ✅ Delete data source
- ✅ Test connection
- ✅ Preview data

UI Components:
- Data source cards with status indicators
- Create modal with Google Sheets setup
- Preview modal showing sheet data
```

---

### Phase 2: Reminder Management (Priority: HIGH)

#### Page: Reminders List
**File**: `frontend/src/app/dashboard/reminders/page.tsx`

```
Features:
- ✅ List all reminders
- ✅ Show status (active/inactive)
- ✅ Show last run time
- ✅ Show next run time
- ✅ Quick toggle active/inactive
- ✅ View execution logs
- ✅ Create new reminder button

UI Components:
- Reminder cards with schedule info
- Status badges
- Quick actions (toggle, edit, delete, test)
```

#### Page: Create/Edit Reminder
**File**: `frontend/src/app/dashboard/reminders/create/page.tsx`
**File**: `frontend/src/app/dashboard/reminders/[id]/edit/page.tsx`

```
Features:
- ✅ Multi-step wizard (5 steps)
- ✅ Real-time preview chat (CRITICAL!)
- ✅ Validation at each step
- ✅ Save draft functionality

Steps:
1. Basic Info (Name, Bot, Target)
2. Schedule (Cron, Timezone)
3. Data Source (Select & Configure)
4. Data Pipeline (Filters, Sort, etc)
5. Message Template (Header, Sections, Footer)

UI Components:
- Step indicator
- Form sections for each step
- **Live Preview Chat** (WhatsApp-style)
- Test send button
- Save & Activate button
```

---

### Phase 3: Live Preview Chat Component (Priority: CRITICAL!)

#### Component: ChatPreview
**File**: `frontend/src/components/ChatPreview.tsx`

```typescript
Features:
- ✅ WhatsApp-style chat bubble
- ✅ Real-time update as user types
- ✅ Show formatted message
- ✅ Handle long messages
- ✅ Show timestamp
- ✅ Show sender name
- ✅ Responsive design

Props:
- message: string
- timestamp?: Date
- senderName?: string
- isLoading?: boolean

Design:
- Green bubble (WhatsApp style)
- White text
- Rounded corners
- Shadow effect
- Timestamp in bottom right
- Loading skeleton when generating
```

---

## 🎯 Daily Digest Use Case Implementation

### Configuration Example

```json
{
  "name": "Daily Digest Kuliah",
  "bot_id": "bot-123",
  "schedule": "0 8 * * *",
  "timezone": "Asia/Jakarta",
  "target_type": "group",
  "target_id": "120363xxxxx@g.us",
  
  "data_source_id": "ds-jadwal-kuliah",
  
  "pipeline_config": {
    "sections": [
      {
        "id": "schedule_today",
        "source_sheet": "day",
        "filters": [
          {
            "column": "day",
            "operator": "equals",
            "value": "{TODAY_NAME}"
          }
        ],
        "sort": [
          { "column": "start", "order": "asc" }
        ]
      },
      {
        "id": "tasks_urgent",
        "source_sheet": "mk",
        "filters": [
          {
            "column": "done",
            "operator": "equals",
            "value": "FALSE"
          },
          {
            "column": "waktu",
            "operator": "date_diff_days",
            "value": "{TODAY}",
            "max_days": 3
          }
        ],
        "sort": [
          { "column": "waktu", "order": "asc" }
        ]
      }
    ]
  },
  
  "template_config": {
    "header": "📰 DAILY DIGEST ({TODAY_DATE})\n\n",
    "sections": [
      {
        "title": "📅 Jadwal Hari Ini ({TODAY_NAME}):",
        "data_source": "schedule_today",
        "item_template": "{index}. {mk}\n   {start}-{end}\n   {lokasi}\n\n",
        "empty_message": "Tidak ada jadwal hari ini",
        "show_count": true
      },
      {
        "title": "\n📝 Deadline ≤ 3 Hari",
        "data_source": "tasks_urgent",
        "item_template": "{index}. {mk} — {judul}\n   {waktu_formatted}\n   {catatan}\n\n",
        "empty_message": "Tidak ada tugas mendesak",
        "show_count": true
      }
    ],
    "footer": ""
  }
}
```

---

## 📦 NPM Packages Required

### Backend
```json
{
  "googleapis": "^128.0.0",      // Google Sheets API
  "node-cron": "^3.0.3",         // Cron scheduler
  "cron-parser": "^4.9.0",       // Parse cron expressions
  "date-fns": "^3.0.0",          // Date manipulation
  "date-fns-tz": "^2.0.0"        // Timezone support
}
```

### Frontend
```json
{
  "date-fns": "^3.0.0",          // Date formatting
  "react-syntax-highlighter": "^15.5.0"  // Code preview (optional)
}
```

---

## 🧪 Testing Plan

### Unit Tests
- ✅ Data pipeline filters
- ✅ Template engine variable replacement
- ✅ Date formatting functions
- ✅ Cron expression parsing

### Integration Tests
- ✅ Google Sheets connection
- ✅ End-to-end reminder execution
- ✅ Message sending via WhatsApp

### Manual Testing
- ✅ Create Daily Digest reminder
- ✅ Preview message matches expected output
- ✅ Test send to personal chat
- ✅ Verify scheduled execution
- ✅ Check execution logs

---

## 📅 Timeline

### Week 1: Backend Foundation
- Day 1-2: Google Sheets Service + Data Pipeline Service
- Day 3: Template Engine Service
- Day 4: Reminder Scheduler Service
- Day 5: API Endpoints

### Week 2: Frontend Implementation
- Day 1-2: Data Sources Management UI
- Day 3-4: Reminder Create/Edit UI with Steps
- Day 5: **Live Preview Chat Component**

### Week 3: Testing & Polish
- Day 1-2: End-to-end testing
- Day 3: Bug fixes
- Day 4: UI/UX improvements
- Day 5: Documentation

---

## 🚨 Critical Success Factors

1. ✅ **Live Preview Chat** - Must work perfectly
2. ✅ **Google Sheets Integration** - Reliable data fetching
3. ✅ **Scheduler Reliability** - Never miss a scheduled reminder
4. ✅ **Template Flexibility** - Easy to customize
5. ✅ **Error Handling** - Graceful failures with logs

---

## 🎨 UI/UX Requirements

### Design Consistency
- ✅ Match existing dashboard design system
- ✅ Use same color scheme (cyan, purple gradients)
- ✅ Glass morphism effects
- ✅ Smooth animations
- ✅ Responsive design

### Preview Chat Requirements
- ✅ WhatsApp-style green bubble
- ✅ Real-time updates (debounced 500ms)
- ✅ Show actual formatted message
- ✅ Handle line breaks correctly
- ✅ Show emoji properly
- ✅ Loading state while generating

---

## 📝 Next Steps

1. ✅ Database schema - DONE
2. ⏳ Install NPM packages
3. ⏳ Implement Google Sheets Service
4. ⏳ Implement Data Pipeline Service
5. ⏳ Implement Template Engine Service
6. ⏳ Create API endpoints
7. ⏳ Build frontend UI
8. ⏳ **Build Live Preview Chat**
9. ⏳ End-to-end testing

---

## 🔗 Related Documents

- `CRITICAL_AUTO_REPLY_COMPONENTS.md` - Protected components
- `ARCHITECTURE.md` - System architecture
- `TECH_STACK.md` - Technology stack

---

**Last Updated**: 2025-12-27 22:05  
**Status**: Schema Ready, Starting Implementation
