# AI Assistant Tab - Table UI Redesign Plan

## 🎯 Objective
Redesign AI Assistant tab dengan table-based UI yang professional, matching reference design (OpenAI API tokens style).

## 📊 Current vs New Design

### Current Design:
```
- Two-column layout (LLM Config | Bot Behavior)
- API Key verification flow
- Provider/Model selection cards
- Simple list of allowed targets
```

### New Design (Table-Based):
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI Configurations                                        │
│ Manage LLM providers for different groups and contacts     │
├─────────────────────────────────────────────────────────────┤
│ [+ Create Configuration] [Delete Selected]    [Search 🔍]  │
│                                                             │
│ TABLE:                                                      │
│ ☐ | Name | Status | Target | Provider | Model | Actions   │
│ ──┼──────┼────────┼────────┼──────────┼───────┼──────────  │
│ ☐ | Cust | ● On   | Grp A  | OpenAI   | gpt-4 | [⋮][✏][🗑] │
│ ☐ | Team | ● On   | Grp B  | Groq     | llama | [⋮][✏][🗑] │
│ ☐ | VIP  | ⚫ Off  | John   | Gemini   | 2.0   | [⋮][✏][🗑] │
│                                                             │
│ Items 1-3 of 3                         [◀][1][▶] [10/page▼]│
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Table Columns

| Column | Description | Width | Sortable |
|--------|-------------|-------|----------|
| ☐ | Checkbox for bulk selection | 40px | No |
| Name | Custom config name | 150px | Yes |
| Status | ● Enabled / ⚫ Disabled | 80px | Yes |
| Target | Group/Contact name + type badge | 200px | Yes |
| Provider | OpenAI/Groq/Gemini badge | 100px | Yes |
| Model | Model name | 120px | Yes |
| Actions | Menu/Edit/Delete buttons | 100px | No |

## 🎨 UI Components

### 1. Header Section
```tsx
<div className="mb-6">
  <div className="flex items-center gap-2 mb-2">
    <Bot className="w-5 h-5 text-blue-400" />
    <h2 className="text-lg font-semibold text-white">AI Configurations</h2>
  </div>
  <p className="text-sm text-zinc-500">
    Configure LLM providers for different groups and contacts. 
    Only whitelisted targets can trigger AI responses.
  </p>
</div>
```

### 2. Action Bar
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex gap-2">
    <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600...">
      + Create Configuration
    </button>
    <button className="px-4 py-2 bg-zinc-800..." disabled={!selectedConfigs.length}>
      Delete Selected
    </button>
  </div>
  <div className="flex gap-2">
    <input 
      type="search" 
      placeholder="Search configurations..."
      className="px-3 py-2 bg-zinc-900..."
    />
  </div>
</div>
```

### 3. Table Component
```tsx
<div className="border border-zinc-800 rounded-lg overflow-hidden">
  <table className="w-full">
    <thead className="bg-zinc-900/50 border-b border-zinc-800">
      <tr>
        <th className="w-10 px-4 py-3">
          <input type="checkbox" onChange={handleSelectAll} />
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400">
          Name
        </th>
        {/* ... other headers */}
      </tr>
    </thead>
    <tbody>
      {configs.map(config => (
        <tr key={config.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
          <td className="px-4 py-3">
            <input type="checkbox" />
          </td>
          <td className="px-4 py-3 text-sm text-white">
            {config.config_name}
          </td>
          {/* ... other cells */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### 4. Status Badge
```tsx
<button 
  onClick={() => handleToggle(config.id)}
  className="flex items-center gap-2 px-2 py-1 rounded-full text-xs"
>
  <div className={`w-2 h-2 rounded-full ${
    config.is_enabled ? 'bg-green-500' : 'bg-zinc-600'
  }`} />
  {config.is_enabled ? 'Enabled' : 'Disabled'}
</button>
```

### 5. Provider Badge
```tsx
<span className={`px-2 py-1 rounded text-xs font-medium ${
  provider === 'openai' ? 'bg-green-500/10 text-green-400' :
  provider === 'groq' ? 'bg-orange-500/10 text-orange-400' :
  'bg-blue-500/10 text-blue-400'
}`}>
  {provider.toUpperCase()}
</span>
```

### 6. Create/Edit Modal
```tsx
<dialog className="fixed inset-0 z-50 bg-black/80">
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-2xl mx-auto mt-20">
    <h3 className="text-lg font-semibold text-white mb-4">
      {isEdit ? 'Edit' : 'Create'} AI Configuration
    </h3>
    
    <form onSubmit={handleSubmit}>
      {/* Configuration Name */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">
          Configuration Name
        </label>
        <input 
          type="text"
          placeholder="e.g., Customer Support, VIP Group"
          className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-800..."
        />
      </div>

      {/* Target Selection */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">
          Target Group/Contact
        </label>
        <select className="w-full px-3 py-2 bg-zinc-900/50...">
          <option value="">Select target...</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Provider Selection */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">
          LLM Provider
        </label>
        <div className="grid grid-cols-3 gap-2">
          {['gemini', 'openai', 'groq'].map(p => (
            <button
              type="button"
              key={p}
              onClick={() => setProvider(p)}
              className={`p-3 rounded-lg border ${
                provider === p 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-zinc-800 bg-zinc-900/50'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">
          API Key
        </label>
        <input 
          type="password"
          placeholder="sk-***********"
          className="w-full px-3 py-2 bg-zinc-900/50..."
        />
      </div>

      {/* Model Selection */}
      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">
          Model
        </label>
        <select className="w-full px-3 py-2 bg-zinc-900/50...">
          {models[provider].map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* System Prompt (Optional) */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">
          System Prompt (Optional)
        </label>
        <textarea 
          rows={4}
          placeholder="Custom instructions for this configuration..."
          className="w-full px-3 py-2 bg-zinc-900/50..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button 
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-zinc-800..."
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-4 py-2 bg-blue-500..."
        >
          {isEdit ? 'Save Changes' : 'Create Configuration'}
        </button>
      </div>
    </form>
  </div>
</dialog>
```

## 📦 State Management

```typescript
// Table states
const [configs, setConfigs] = useState<any[]>([])
const [selectedConfigs, setSelectedConfigs] = useState<string[]>([])
const [searchQuery, setSearchQuery] = useState('')
const [currentPage, setCurrentPage] = useState(1)
const [itemsPerPage, setItemsPerPage] = useState(10)

// Modal states
const [showModal, setShowModal] = useState(false)
const [editingConfig, setEditingConfig] = useState<any>(null)

// Form states
const [formData, setFormData] = useState({
  config_name: '',
  target_jid: '',
  target_name: '',
  provider: 'gemini',
  api_key: '',
  model: '',
  system_prompt: ''
})
```

## 🔄 Key Functions

```typescript
// Fetch configurations
const { data: configsData, refetch } = useQuery({
  queryKey: ['llmTargets', botId],
  queryFn: async () => {
    const res = await api.bots.llmTargets.list(botId)
    return res.data.data || []
  }
})

// Create configuration
const handleCreate = async () => {
  const llm_config = JSON.stringify({
    provider: formData.provider,
    apiKey: formData.api_key,
    model: formData.model,
    systemPrompt: formData.system_prompt
  })
  
  await api.bots.llmTargets.add(botId, {
    config_name: formData.config_name,
    target_type: 'group',
    target_jid: formData.target_jid,
    target_name: formData.target_name,
    is_enabled: 1,
    llm_config
  })
  
  refetch()
  setShowModal(false)
  toast.success('Configuration created!')
}

// Toggle status
const handleToggle = async (configId: string) => {
  await api.bots.llmTargets.toggle(botId, configId)
  refetch()
  toast.success('Status updated!')
}

// Delete configuration
const handleDelete = async (configId: string) => {
  if (!confirm('Delete this configuration?')) return
  await api.bots.llmTargets.remove(botId, configId)
  refetch()
  toast.success('Configuration deleted!')
}

// Bulk delete
const handleBulkDelete = async () => {
  if (!confirm(`Delete ${selectedConfigs.length} configurations?`)) return
  await Promise.all(
    selectedConfigs.map(id => api.bots.llmTargets.remove(botId, id))
  )
  refetch()
  setSelectedConfigs([])
  toast.success('Configurations deleted!')
}

// Search/Filter
const filteredConfigs = configs.filter(c =>
  c.config_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  c.target_name?.toLowerCase().includes(searchQuery.toLowerCase())
)

// Pagination
const paginatedConfigs = filteredConfigs.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
)
```

## 🎨 Styling Guidelines

### Colors:
- Background: `#09090b`, `#0e0e11`
- Borders: `#27272a` (zinc-800)
- Text: `#ffffff` (white), `#a1a1aa` (zinc-400), `#71717a` (zinc-500)
- Primary: `#3b82f6` (blue-500)
- Success: `#22c55e` (green-500)
- Warning: `#f97316` (orange-500)

### Typography:
- Headers: `font-semibold text-white`
- Body: `text-sm text-zinc-400`
- Labels: `text-xs text-zinc-500`

### Spacing:
- Section padding: `p-6`
- Element gaps: `gap-2`, `gap-4`
- Table padding: `px-4 py-3`

## 📋 Implementation Checklist

- [ ] Update database schema (migration 010)
- [ ] Update backend API routes
- [ ] Update frontend API client
- [ ] Create table component
- [ ] Create modal component
- [ ] Add state management
- [ ] Implement CRUD functions
- [ ] Add search/filter
- [ ] Add pagination
- [ ] Add bulk actions
- [ ] Style matching reference
- [ ] Test all features

## 🚀 Next Steps

1. Run migration: `npm run migrate`
2. Replace AI Assistant tab content with table UI
3. Test create/edit/delete flows
4. Verify styling matches reference
5. Test responsive design
