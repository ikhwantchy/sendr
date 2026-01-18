# Enhanced Sheets System - Quick Reference

## API Endpoints

### 1. Get Filter Presets
```
GET /api/sheets/filter-presets
```
Returns available filter operators, presets, and formatters.

### 2. Test Filter
```
POST /api/sheets/test-filter
{
  "url": "https://docs.google.com/spreadsheets/d/...",
  "sheetName": "Sheet1",
  "filters": [
    {
      "column": "Status",
      "operator": "equals",
      "value": "Active"
    }
  ],
  "sort": {
    "column": "Date",
    "order": "desc"
  },
  "limit": 10
}
```

### 3. Test Template
```
POST /api/sheets/test-template
{
  "template": "{{#each items}}\n{{@index}}. {{Name}}\n{{/each}}",
  "sampleData": [
    { "Name": "Item 1" },
    { "Name": "Item 2" }
  ],
  "globalVars": {
    "CUSTOM": "value"
  }
}
```

### 4. Enhanced Preview
```
POST /api/sheets/preview-enhanced
{
  "url": "https://docs.google.com/spreadsheets/d/...",
  "sheetName": "Schedule",
  "filters": [
    {
      "column": "Hari",
      "operator": "equals",
      "value": "Senin"
    }
  ],
  "template": "{{#each items}}\n{{@index}}. {{Mata Kuliah}}\n{{/each}}"
}
```

### 5. Legacy Preview (Backward Compatible)
```
POST /api/sheets/preview-digest
{
  "url": "https://docs.google.com/spreadsheets/d/...",
  "selectedSheets": ["Sheet1"],
  "template": "{{#LOOP}}\n{{index}}. {{Name}}\n{{/LOOP}}",
  "triggerColumn": "Status",
  "triggerValue": "Active",
  "useEnhancedRenderer": true,
  "filters": [...],  // Optional: use new filters
  "sort": {...}      // Optional: use new sorting
}
```

---

## Template Syntax

### Loops
```
{{#each items}}
{{@index}}. {{Name}} - {{Status}}
{{/each}}
```

### Conditionals
```
{{#if @length > 0}}
Ada {{@length}} items
{{/if}}

{{#if @length == 0}}
Tidak ada data
{{/if}}
```

### Grouping
```
{{#group by="Category"}}
*{{@groupName}}* ({{@groupCount}} items)

{{#items}}
• {{Name}}
{{/items}}
{{/group}}
```

### Formatters
```
{{Name | uppercase}}
{{Price | currency}}
{{Date | date:dd/MM/yyyy}}
{{Description | truncate:50}}
{{Value | default:N/A}}
```

### Built-in Variables
```
{{@today}}          // 17/01/2026
{{@today_name}}     // Jumat
{{@now}}            // 14:30
{{@index}}          // 1, 2, 3...
{{@length}}         // Total items
{{@groupName}}      // Group name (in group context)
```

---

## Filter Examples

### String Filters
```json
{ "column": "Name", "operator": "equals", "value": "John" }
{ "column": "Name", "operator": "contains", "value": "john", "caseInsensitive": true }
{ "column": "Email", "operator": "ends_with", "value": "@gmail.com" }
{ "column": "Description", "operator": "not_empty" }
```

### Number Filters
```json
{ "column": "Age", "operator": "greater_than", "value": 18 }
{ "column": "Score", "operator": "between", "value": 70, "value2": 100 }
```

### Date Filters
```json
{ "column": "Deadline", "operator": "date_within_days", "value": 3 }
{ "column": "Date", "operator": "date_today" }
{ "column": "StartDate", "operator": "date_after", "value": "2026-01-01" }
```

---

## Reminder Configuration

### Basic Reminder with Filters
```json
{
  "name": "Daily Schedule",
  "bot_id": "...",
  "target_id": "group@g.us",
  "target_type": "group",
  "schedule": "0 7 * * *",
  "template_config": {
    "googleSheetsUrl": "https://docs.google.com/spreadsheets/d/...",
    "sheetName": "Schedule",
    "isDigestMode": true,
    "filters": [
      {
        "column": "Hari",
        "operator": "equals",
        "value": "{{@today_name}}"
      }
    ],
    "sort": {
      "column": "Waktu",
      "order": "asc"
    },
    "body": "🗓️ Jadwal {{@today_name}}\n\n{{#each items}}\n{{@index}}. {{Mata Kuliah}}\n⏰ {{Waktu}}\n{{/each}}"
  }
}
```

### Advanced Reminder with Multiple Filters
```json
{
  "template_config": {
    "filters": [
      {
        "column": "Status",
        "operator": "not_equals",
        "value": "Done"
      },
      {
        "column": "Deadline",
        "operator": "date_within_days",
        "value": 3
      },
      {
        "column": "Priority",
        "operator": "in_list",
        "value": ["High", "Critical"]
      }
    ],
    "sort": {
      "column": "Deadline",
      "order": "asc"
    },
    "limit": 10,
    "body": "⚠️ Urgent Tasks\n\n{{#each items}}\n{{@index}}. {{Task}}\n📅 {{Deadline | date:dd/MM/yyyy}}\n🎯 {{Priority | uppercase}}\n{{/each}}"
  }
}
```

---

## Migration from Legacy System

### Old Format (Still Supported)
```json
{
  "triggerColumn": "Hari",
  "triggerValue": "Senin",
  "body": "{{#LOOP}}\n{{index}}. {{Mata Kuliah}}\n{{/LOOP}}"
}
```

### New Format (Recommended)
```json
{
  "filters": [
    { "column": "Hari", "operator": "equals", "value": "Senin" }
  ],
  "body": "{{#each items}}\n{{@index}}. {{Mata Kuliah}}\n{{/each}}"
}
```

---

## Testing Workflow

1. **Get Available Presets**
   ```
   GET /api/sheets/filter-presets
   ```

2. **Test Your Filter**
   ```
   POST /api/sheets/test-filter
   ```

3. **Test Your Template**
   ```
   POST /api/sheets/test-template
   ```

4. **Preview Complete Message**
   ```
   POST /api/sheets/preview-enhanced
   ```

5. **Create/Update Reminder**
   ```
   POST /api/reminders
   ```

---

## Common Use Cases

### 1. Daily Schedule
- Filter: `date_today` or `equals` with day name
- Template: Loop with time and subject
- Sort: By time ascending

### 2. Urgent Deadlines
- Filter: `date_within_days` with value 3
- Filter: `not_equals` status "Done"
- Sort: By deadline ascending

### 3. Inventory Alert
- Filter: Stock `less_than` minimum
- Template: Show item, stock, and supplier
- Sort: By stock ascending

### 4. Attendance Report
- Filter: Status `not_equals` "Hadir"
- Template: Group by status
- Show names with reasons

### 5. Event Reminder
- Filter: Date `date_today`
- Template: Group by category
- Show time and location

---

## Performance Tips

1. **Use Specific Filters**: More specific filters = faster processing
2. **Limit Results**: Use `limit` to cap number of rows
3. **Smart Column Names**: Use common names for auto-detection
4. **Test First**: Always test filters before scheduling
5. **Cache-Friendly**: Filters are applied server-side for efficiency

---

## Troubleshooting

**Q: Filters not working**
- Check column names (case-insensitive but must match)
- Verify operator is correct for data type
- Test with `/test-filter` endpoint

**Q: Template shows raw variables**
- Ensure column names match sheet headers
- Check for typos in variable names
- Use `/test-template` to debug

**Q: Date filters not working**
- Ensure date format is DD/MM/YYYY or DD-MM-YYYY
- Use `date_within_days` for relative dates
- Check timezone settings

**Q: No data returned**
- Verify filters aren't too restrictive
- Check if sheet has data
- Test without filters first
