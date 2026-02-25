# Campaign Modal - Implementation Guide

## Issue
The CreateCampaignModal needs to be updated with:
1. **Recipient Type Selection**: Individual Contacts OR WhatsApp Groups
2. **Google Sheets Import**: Working link-based import
3. **CSV Upload**: Existing functionality
4. **Manual Entry**: Existing functionality
5. **Group Selection**: For WhatsApp groups

## Current Problems
- Step 2 (recipients) not showing properly
- Google Sheets marked as "coming soon"
- No option to send to WhatsApp groups

## Solution Approach

### 1. Add Recipient Type State
```typescript
const [recipientType, setRecipientType] = useState<'contacts' | 'groups'>('contacts')
const [selectedGroups, setSelectedGroups] = useState<string[]>([])
const [sheetsUrl, setSheetsUrl] = useState('')
```

### 2. Update Step Names
Change from `'contacts'` to `'recipients'` to be more generic

### 3. Recipient Type Selection (First in Step 2)
Show two options:
- **Individual Contacts** → Shows import methods (Sheets/CSV/Manual)
- **WhatsApp Groups** → Shows list of bot's groups with checkboxes

### 4. Import Methods (for Individual Contacts)
Order: Google Sheets → CSV → Manual
- **Google Sheets**: Input field for spreadsheet URL + Import button
- **CSV**: File upload
- **Manual**: Phone + Name entry

### 5. Group Selection (for WhatsApp Groups)
- Fetch bot's groups from backend
- Show list with checkboxes
- Display group name, member count
- Allow multiple selection

## Files to Modify
1. `CreateCampaignModal.tsx` - Main modal component
2. Backend API - Add endpoint to fetch bot groups

## Next Steps
Due to complexity, recommend creating a fresh version of CreateCampaignModal with all features properly integrated.
