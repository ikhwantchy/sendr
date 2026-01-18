# Multi-Select Target Groups - Implementation Guide

## Problem
User wants to select multiple groups for one AI configuration, with:
- Plus icon (+) for unselected groups
- Checkmark (✓) for selected groups  
- Selected groups shown as chips/tags above dropdown
- Ability to remove selected groups

## Current Issue
The form structure uses single target (`target_jid`, `target_name`), but we need to support multiple targets.

## Solution Approach

### Option 1: Frontend Multi-Select → Backend Multiple Configs (RECOMMENDED)
Keep backend as-is (one config per target), but allow UI to select multiple groups and create multiple configurations in one action.

**Pros:**
- No backend changes needed
- Database structure unchanged
- Each group gets its own independent configuration

**Implementation:**
1. Change `formData` to have `selected_targets: Array<{jid, name, type}>`
2. On submit, loop through `selected_targets` and create one config per target
3. UI shows chips for selected groups
4. Dropdown shows + for unselected, ✓ for selected

### Option 2: Backend Support for Multiple Targets
Change database to support one config → many targets relationship.

**Pros:**
- True multi-target configuration
- Easier to manage shared settings

**Cons:**
- Requires database migration
- Backend API changes
- More complex queries

## Recommended: Option 1

### Changes Needed:

#### 1. Form Data Structure
```typescript
const [formData, setFormData] = useState({
    config_name: '',
    selected_targets: [] as Array<{jid: string, name: string, type: 'group' | 'contact'}>,
    provider: 'gemini',
    api_key: '',
    model: 'gemini-2.0-flash',
    system_prompt: '',
    conversation_model: true,
    silent_collection: false,
    hybrid_mode: false
})
```

#### 2. Handle Create Function
```typescript
const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.selected_targets.length === 0) {
        toast.error('Please select at least one target group')
        return
    }

    try {
        const llm_config = JSON.stringify({
            provider: formData.provider,
            apiKey: formData.api_key,
            model: formData.model,
            systemPrompt: formData.system_prompt,
            behavior: {
                conversationModel: formData.conversation_model,
                silentCollection: formData.silent_collection,
                hybridMode: formData.hybrid_mode
            }
        })

        // Create one configuration per selected target
        for (const target of formData.selected_targets) {
            await api.bots.llmTargets.add(botId, {
                config_name: `${formData.config_name} - ${target.name}`,
                target_type: target.type,
                target_jid: target.jid,
                target_name: target.name,
                is_enabled: 1,
                llm_config
            })
        }

        toast.success(`Created ${formData.selected_targets.length} configuration(s)`)
        refetch()
        setShowModal(false)
        resetForm()
    } catch (error) {
        toast.error('Failed to create configurations')
    }
}
```

#### 3. UI - Selected Chips
```tsx
{formData.selected_targets.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded-md">
        {formData.selected_targets.map((target) => (
            <div key={target.jid} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm">
                <span className="text-blue-400">{target.name}</span>
                <button
                    type="button"
                    onClick={() => {
                        setFormData({
                            ...formData,
                            selected_targets: formData.selected_targets.filter(t => t.jid !== target.jid)
                        })
                    }}
                    className="text-blue-400 hover:text-blue-300"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        ))}
    </div>
)}
```

#### 4. UI - Dropdown with +/✓ Icons
```tsx
{groups.map((g: any) => {
    const isSelected = formData.selected_targets.some(t => t.jid === g.id)
    return (
        <button
            key={g.id}
            type="button"
            onClick={() => {
                if (isSelected) {
                    // Remove
                    setFormData({
                        ...formData,
                        selected_targets: formData.selected_targets.filter(t => t.jid !== g.id)
                    })
                } else {
                    // Add
                    setFormData({
                        ...formData,
                        selected_targets: [
                            ...formData.selected_targets,
                            {
                                jid: g.id,
                                name: g.subject || g.name || g.id,
                                type: 'group'
                            }
                        ]
                    })
                }
            }}
            className="w-full px-3 py-2.5 hover:bg-zinc-800 transition-colors flex items-center gap-3 text-left"
        >
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <Users className="w-5 h-5 text-zinc-400" />
            </div>
            {/* Group Info */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                    {g.subject || g.name || 'Unnamed Group'}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                    {g.id}
                </div>
            </div>
            {/* Icon: Plus or Checkmark */}
            {isSelected ? (
                <Check className="w-5 h-5 text-blue-500" />
            ) : (
                <Plus className="w-5 h-5 text-zinc-500" />
            )}
        </button>
    )
})}
```

## Status
Need to implement these changes step by step to avoid TypeScript errors.

## Next Steps
1. Fix handleCreate to loop through selected_targets
2. Update UI to show chips
3. Update dropdown to show +/✓ icons
4. Test creating multiple configurations
