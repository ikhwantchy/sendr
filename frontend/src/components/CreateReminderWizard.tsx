'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Calendar, Users, Clock, Save, Plus, X, Upload,
    FileText, Check, AlertCircle, ChevronRight, CheckCircle2,
    Database, Wand2, ChevronDown, ChevronUp, RefreshCw, Type,
    Bold, Italic, Link, Image as ImageIcon, Smile, Globe,
    Strikethrough, Code, Search, ArrowRight, Lock, Eye, MessageSquare, Paperclip,
    Cat, Coffee, Dumbbell, Car, Lightbulb, Heart, Hand, ChevronLeft, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { EMOJI_CATEGORIES } from '@/lib/emojiList'
import AdvancedFilters from './AdvancedFilters'
import ContactTable, { ContactRow, ContactColumn, contactTableToParsedContacts, getContactTableVariables } from '@/components/ContactTable'

// --- Types ---
type TargetType = 'group' | 'contact'
type ContactMethod = 'manual' | 'csv' | 'sheet'
type Frequency = 'now' | 'once' | 'daily' | 'weekly' | 'monthly'

interface Group {
    id?: string
    jid: string
    name: string
    participant_count?: number
}

interface FormData {
    name: string
    targetType: TargetType
    contactMethod: ContactMethod
    selectedGroups: string[]
    manualContacts: string
    // New: Contact Table data
    tableContacts: ContactRow[]
    tableColumns: ContactColumn[]
    contactSheetUrl: string
    sheetName: string // Optional tab name
    csvFile: File | null
    csvPreview: string[] // Array of first few lines
    csvCount: number
    sheetContactCount: number
    triggerColumn: string
    triggerValue: string
    useAdvancedFilters: boolean // NEW: Toggle between legacy and advanced mode
    filters: Array<{
        column: string
        operator: string
        value: any
        value2?: any
        caseInsensitive?: boolean
    }> // NEW: Advanced filters
    sort: {
        column: string
        order: 'asc' | 'desc'
    } | null // NEW: Sorting
    isDigestMode: boolean // Logic for grouping messages
    frequency: Frequency
    startDate: string // YYYY-MM-DD
    hasEndDate: boolean
    endDate: string // YYYY-MM-DD
    time: string // HH:mm
    days: number[] // 0-6 for weekly
    dataSource: 'static' | 'google_sheets'
    message: string
    imageFile: File | null
    imagePreview: string | null
}

interface CreateReminderWizardProps {
    botId: string
    onClose: () => void
    reminderId?: string // Optional: if provided, component will load and edit existing reminder
}

// --- Constants ---
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const CONTACT_TABLE_STORAGE_KEY = 'reminder_contact_table_data'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Smileys': <Smile size={18} />,
    'Gestures & People': <Hand size={18} />,
    'Animals & Nature': <Cat size={18} />,
    'Food & Drink': <Coffee size={18} />,
    'Activity': <Dumbbell size={18} />,
    'Objects': <Lightbulb size={18} />,
    'Travel & Places': <Car size={18} />,
    'Symbols': <Heart size={18} />,
}

export default function CreateReminderWizard({ botId, onClose, reminderId }: CreateReminderWizardProps) {
    const queryClient = useQueryClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    const textareaRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isTypingRef = useRef(false)

    // Default Dates (Local Time)
    const today = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format

    // UI State
    const [isContactPreviewOpen, setIsContactPreviewOpen] = useState(false)
    const [isGroupSelectorOpen, setIsGroupSelectorOpen] = useState(false)
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [activeEmojiCategory, setActiveEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys')
    const [availableTabs, setAvailableTabs] = useState<Array<{ gid: string; name: string }>>([])
    const [isLoadingTabs, setIsLoadingTabs] = useState(false)
    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const emojiTriggerRef = useRef<HTMLButtonElement>(null)

    // Form State
    const [formData, setFormData] = useState<FormData>({
        name: '',
        targetType: 'group',
        contactMethod: 'manual',
        selectedGroups: [],
        manualContacts: '',
        // Initialize contact table with phone column
        tableContacts: [],
        tableColumns: [
            { id: 'phone', name: 'Phone', required: true },
            { id: 'name_col', name: 'Name' }
        ],
        contactSheetUrl: '',
        sheetName: '',
        csvFile: null,
        csvPreview: [],
        csvCount: 0,
        sheetContactCount: 0,
        triggerColumn: '',
        triggerValue: '',
        useAdvancedFilters: false,
        filters: [],
        sort: null,
        isDigestMode: false,

        frequency: 'once',
        startDate: today,
        hasEndDate: false,
        endDate: '',
        time: '09:00',
        days: [],
        dataSource: 'static',
        message: '',
        imageFile: null,
        imagePreview: null
    })

    // Search Params & State
    const [previewText, setPreviewText] = useState<string>('')
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)

    // Store botId from loaded reminder (for edit mode)
    const [loadedBotId, setLoadedBotId] = useState<string>(botId)

    // Fetch Groups (use loadedBotId for edit mode, botId for create mode)
    const effectiveBotId = loadedBotId || botId
    const { data: groupsData } = useQuery<Group[]>({
        queryKey: ['bot-groups', effectiveBotId],
        queryFn: async () => {
            if (!effectiveBotId) return []
            const res = await api.bots.getGroups(effectiveBotId)
            const list = res.data.data
            return Array.isArray(list) ? list : []
        },
        enabled: !!effectiveBotId
    })

    // Load existing reminder data if reminderId is provided (Edit Mode)
    useEffect(() => {
        if (!reminderId) return

        const loadReminderData = async () => {
            try {
                const token = localStorage.getItem('token')
                const response = await fetch(`http://localhost:3001/api/reminders/${reminderId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                const data = await response.json()

                if (data.success) {
                    const r = data.data
                    const templateConfig = JSON.parse(r.template_config || '{}')

                    // Parse schedule to extract frequency, date, time
                    let frequency: Frequency = 'once'
                    let time = '09:00'
                    let startDate = today

                    if (r.schedule && r.schedule !== 'now') {
                        const parts = r.schedule.split(' ')
                        if (parts.length === 5) {
                            const [minute, hour, dom, month, dow] = parts
                            time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`

                            if (dow !== '*') {
                                frequency = 'weekly'
                            } else if (dom === '*' && month === '*') {
                                frequency = 'daily'
                            } else {
                                frequency = 'once'
                            }
                        }
                    }

                    // Parse manualContacts if available (for ContactTable)
                    let loadedTableContacts: ContactRow[] = []
                    let loadedTableColumns: ContactColumn[] = [
                        { id: 'phone', name: 'Phone', required: true },
                        { id: 'name_col', name: 'Name' }
                    ]
                    
                    if (templateConfig.manualContacts && Array.isArray(templateConfig.manualContacts) && templateConfig.manualContacts.length > 0) {
                        // Build columns from first contact's keys
                        const firstContact = templateConfig.manualContacts[0]
                        const columnNames = Object.keys(firstContact).filter(k => !['phone', 'jid'].includes(k.toLowerCase()))
                        
                        loadedTableColumns = [
                            { id: 'phone', name: 'Phone', required: true },
                        ]
                        
                        // Track added columns to prevent duplicates (case-insensitive)
                        const addedColumns = new Set<string>(['phone'])
                        
                        columnNames.forEach((colName, idx) => {
                            const lowerName = colName.toLowerCase()
                            
                            // Skip if column already added (case-insensitive check)
                            if (addedColumns.has(lowerName)) return
                            addedColumns.add(lowerName)
                            
                            if (lowerName === 'name') {
                                loadedTableColumns.push({ id: 'name_col', name: 'Name' })
                            } else {
                                loadedTableColumns.push({ id: `col_${idx}`, name: colName })
                            }
                        })
                        
                        // Convert contacts to ContactRow format
                        loadedTableContacts = templateConfig.manualContacts.map((c: any, idx: number) => {
                            const row: ContactRow = { id: `row_${idx}`, phone: c.phone || '' }
                            loadedTableColumns.forEach((col, colIdx) => {
                                if (col.id !== 'phone') {
                                    // Find matching key in contact data
                                    const matchingKey = Object.keys(c).find(k => k.toLowerCase() === col.name.toLowerCase())
                                    row[col.id] = matchingKey ? c[matchingKey] : ''
                                }
                            })
                            return row
                        })
                    }

                    setFormData({
                        name: r.name || '',
                        targetType: r.target_type || 'group',
                        contactMethod: loadedTableContacts.length > 0 ? 'manual' : (templateConfig.googleSheetsUrl ? 'sheet' : 'manual'),
                        selectedGroups: r.target_type === 'group' && r.target_id ? r.target_id.split(',') : [],
                        manualContacts: '',
                        tableContacts: loadedTableContacts,
                        tableColumns: loadedTableColumns,
                        contactSheetUrl: templateConfig.googleSheetsUrl || '',
                        sheetName: templateConfig.sheetName || '',
                        csvFile: null,
                        csvPreview: [],
                        csvCount: 0,
                        sheetContactCount: 0,
                        triggerColumn: templateConfig.triggerColumn || '',
                        triggerValue: templateConfig.triggerValue || '',
                        useAdvancedFilters: !!(templateConfig.filters && templateConfig.filters.length > 0),
                        filters: templateConfig.filters || [],
                        sort: templateConfig.sort || null,
                        isDigestMode: templateConfig.isDigestMode || false,

                        frequency: frequency,
                        startDate: startDate,
                        hasEndDate: false,
                        endDate: '',
                        time: time,
                        days: [],
                        dataSource: templateConfig.googleSheetsUrl ? 'google_sheets' : 'static',
                        message: templateConfig.body || '',
                        imageFile: null,
                        imagePreview: templateConfig.image_url || null,
                    })

                    // Set botId for fetching groups
                    setLoadedBotId(r.bot_id)

                    toast.success('Reminder loaded for editing')
                }
            } catch (error) {
                console.error('Failed to load reminder:', error)
                toast.error('Failed to load reminder data')
            }
        }

        loadReminderData()
    }, [reminderId])

    // Load contact table data from localStorage (when returning from full-page contacts editor)
    useEffect(() => {
        const fromContacts = searchParams?.get('fromContacts')
        if (fromContacts === 'true') {
            try {
                const stored = localStorage.getItem(CONTACT_TABLE_STORAGE_KEY)
                if (stored) {
                    const data = JSON.parse(stored)
                    if (data.contacts && data.columns) {
                        setFormData(prev => ({
                            ...prev,
                            tableContacts: data.contacts,
                            tableColumns: data.columns,
                            contactMethod: 'manual'
                        }))
                        toast.success(`Loaded ${data.contacts.filter((c: ContactRow) => c.phone?.trim()).length} contacts`)
                    }
                    // Clear localStorage after loading
                    localStorage.removeItem(CONTACT_TABLE_STORAGE_KEY)
                }
            } catch (e) {
                console.error('Failed to load contacts from storage:', e)
            }
        }
    }, [searchParams])

    // Sync initial message to contentEditable on load (for edit mode)
    useEffect(() => {
        if (reminderId && textareaRef.current && formData.message && !isTypingRef.current) {
            // Only set if editor matches or is empty to avoid jumpy cursor
            if (textareaRef.current.innerHTML === '' || textareaRef.current.innerText === '') {
                textareaRef.current.innerHTML = markdownToHtml(formData.message)
            }
        }
    }, [formData.message, reminderId])

    // Auto-detect tabs when Sheet URL changes
    useEffect(() => {
        const detectTabs = async () => {
            const url = formData.contactSheetUrl

            // Only proceed if we have a valid URL and Google Sheets Monitor is enabled
            if (!url || formData.dataSource !== 'google_sheets') {
                setAvailableTabs([])
                return
            }

            // Validate URL format
            const match = url.match(/\/d\/([\w-]+)/)
            if (!match || !match[1]) {
                setAvailableTabs([])
                return
            }

            setIsLoadingTabs(true)

            try {
                // Use robust backend detection
                const response = await api.sheets.getTabs(url)
                const data = response.data

                if (data.success && data.tabs && data.tabs.length > 0) {
                    setAvailableTabs(data.tabs)
                    // Auto-select first tab if none selected
                    if (!formData.sheetName) {
                        setFormData(prev => ({ ...prev, sheetName: data.tabs[0].name }))
                    }
                } else {
                    setAvailableTabs([])
                }
            } catch (error) {
                console.error('Tab detection error:', error)
                setAvailableTabs([])
            } finally {
                setIsLoadingTabs(false)
            }
        }

        // Debounce to avoid excessive API calls
        const timeoutId = setTimeout(detectTabs, 800)
        return () => clearTimeout(timeoutId)
    }, [formData.contactSheetUrl, formData.dataSource])

    // Close emoji picker when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target as Node) &&
                emojiTriggerRef.current &&
                !emojiTriggerRef.current.contains(event.target as Node)
            ) {
                setIsEmojiPickerOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [])

    // Auto-render preview when message or sheet data changes
    useEffect(() => {
        const renderPreview = async () => {
            // Only render if we have Google Sheets data source and a message with Handlebars
            if (
                formData.dataSource !== 'google_sheets' ||
                !formData.message ||
                !formData.contactSheetUrl ||
                !formData.sheetName ||
                !formData.message.includes('{{')
            ) {
                return;
            }

            try {
                const response = await api.sheets.renderPreview({
                    url: formData.contactSheetUrl,
                    sheetName: formData.sheetName,
                    template: formData.message,
                    sampleSize: 3
                });

                if (response.data.success) {
                    // Store rendered preview in a ref or state if needed
                    console.log('[Preview] Rendered:', response.data.rendered);
                    // You can add state here if you want to display it
                }
            } catch (error) {
                console.error('[Preview] Render error:', error);
            }
        };

        // Debounce to avoid excessive API calls
        const timeoutId = setTimeout(renderPreview, 1000);
        return () => clearTimeout(timeoutId);
    }, [formData.message, formData.contactSheetUrl, formData.sheetName, formData.dataSource])

    // Sync markdown to contentEditable (only on external changes)
    useEffect(() => {
        if (textareaRef.current && !isTypingRef.current) {
            const currentMD = htmlToMarkdown(textareaRef.current);
            if (currentMD !== formData.message) {
                // Save cursor position
                const selection = window.getSelection();
                let cursorOffset = 0;
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    cursorOffset = range.startOffset;
                }

                // Update content
                textareaRef.current.innerHTML = markdownToHtml(formData.message);

                // Restore cursor position
                if (selection && textareaRef.current.firstChild) {
                    try {
                        const newRange = document.createRange();
                        const textNode = textareaRef.current.firstChild;
                        const offset = Math.min(cursorOffset, (textNode.textContent || '').length);
                        newRange.setStart(textNode, offset);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    } catch (e) {
                        // Cursor restoration failed, ignore
                    }
                }
            }
        }
    }, [formData.message])

    // Set initial content
    useEffect(() => {
        if (textareaRef.current && !textareaRef.current.innerHTML) {
            textareaRef.current.innerHTML = markdownToHtml(formData.message) || '<br>';
        }
    }, [])

    // Live Preview Fetcher
    useEffect(() => {
        const fetchPreview = async () => {
            if (!formData.isDigestMode || !formData.contactSheetUrl || !formData.sheetName || !formData.message) {
                setPreviewText('')
                return
            }

            setIsPreviewLoading(true)
            try {
                const response = await fetch('http://localhost:3001/api/sheets/preview-digest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: formData.contactSheetUrl,
                        selectedSheets: [formData.sheetName],
                        template: formData.message,
                        timezone: 'Asia/Jakarta',
                        triggerColumn: formData.triggerColumn,
                        triggerValue: formData.triggerValue
                    })
                })
                const data = await response.json()
                if (data.success) {
                    setPreviewText(data.preview)
                }
            } catch (error) {
                console.error('Preview fetch error:', error)
            } finally {
                setIsPreviewLoading(false)
            }
        }

        const timeoutId = setTimeout(fetchPreview, 1000)
        return () => clearTimeout(timeoutId)
    }, [formData.isDigestMode, formData.contactSheetUrl, formData.sheetName, formData.message])

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            // 1. Determine Target ID
            let targetId: string | null = null;

            // 2. Prepare Template Config (declare early so we can add manualContacts)
            const templateConfig: any = {
                body: formData.message,
            };

            if (formData.targetType === 'group') {
                // Join all selected groups with comma
                targetId = formData.selectedGroups.join(',') || null;
            } else {
                if (formData.contactMethod === 'sheet') {
                    targetId = formData.contactSheetUrl;
                } else {
                    // Format manual contacts to WhatsApp JID
                    const formatPhoneToJID = (phone: string): string => {
                        // Remove all non-digit characters
                        let cleaned = phone.replace(/\D/g, '');

                        // If starts with 0, replace with 62 (Indonesia)
                        if (cleaned.startsWith('0')) {
                            cleaned = '62' + cleaned.substring(1);
                        }

                        // If doesn't start with country code, add 62
                        if (!cleaned.startsWith('62')) {
                            cleaned = '62' + cleaned;
                        }

                        return cleaned + '@s.whatsapp.net';
                    };

                    // Get contacts with all fields (phone, name, custom columns)
                    const parsedContacts = contactTableToParsedContacts(formData.tableContacts, formData.tableColumns)
                    
                    // Store full contact data for template replacement
                    templateConfig.manualContacts = parsedContacts.map(c => ({
                        ...c,
                        jid: formatPhoneToJID(c.phone.trim())
                    }));
                    
                    // targetId is just the JIDs for backwards compatibility
                    targetId = parsedContacts
                        .map(c => formatPhoneToJID(c.phone.trim()))
                        .join(',');
                }
            }

            // 3. Generate Schedule (cron or 'now')
            const schedule = generateCron(formData.frequency, formData.time, formData.days, formData.startDate);

            // Add image if attached
            if (formData.imagePreview) {
                templateConfig.image_url = formData.imagePreview;
            }

            // Add Google Sheets config if enabled
            if (formData.dataSource === 'google_sheets') {
                templateConfig.isDigestMode = formData.isDigestMode;
                templateConfig.googleSheetsUrl = formData.contactSheetUrl;
                templateConfig.sheetName = formData.sheetName;
                templateConfig.triggerColumn = formData.triggerColumn;
                templateConfig.triggerValue = formData.triggerValue;

                // Add advanced filters if enabled
                if (formData.useAdvancedFilters && formData.filters.length > 0) {
                    templateConfig.filters = formData.filters;
                }

                // Add sort configuration if present
                if (formData.sort) {
                    templateConfig.sort = formData.sort;
                }
            }


            // 4. Prepare Payload (match backend API)
            const payload = {
                botId: effectiveBotId,
                name: formData.name,
                description: '',
                targetType: formData.targetType,
                targetId: targetId,
                schedule: schedule,
                timezone: 'Asia/Jakarta',
                dataSourceId: null, // Always null for now (Google Sheets config is in templateConfig)
                googleSheetsUrl: formData.dataSource === 'google_sheets' ? formData.contactSheetUrl : undefined,
                templateConfig: templateConfig,

            };

            // Use PUT for edit mode, POST for create mode
            if (reminderId) {
                console.log('[EDIT MODE] Updating reminder:', reminderId, 'with payload:', payload)
                const token = localStorage.getItem('token')
                const response = await fetch(`http://localhost:3001/api/reminders/${reminderId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                })

                const result = await response.json()
                console.log('[EDIT MODE] Update response:', result)
                return result
            } else {
                return await api.reminders.create(payload);
            }
        },
        onSuccess: () => {
            // Invalidate all reminders queries to ensure table refreshes
            queryClient.invalidateQueries({ queryKey: ['reminders'] })
            toast.success(reminderId ? 'Reminder updated successfully' : 'Reminder created successfully')
            onClose()
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to create reminder')
        }
    })

    // Helpers
    const generateCron = (freq: Frequency, time: string, days: number[], dateStr: string) => {
        if (freq === 'now') return 'now'
        const [hh, mm] = time.split(':')
        const date = new Date(dateStr)
        const dd = date.getDate()
        const MM = date.getMonth() + 1
        if (freq === 'once') return `${mm} ${hh} ${dd} ${MM} *`
        if (freq === 'daily') return `${mm} ${hh} * * *`
        if (freq === 'weekly') return `${mm} ${hh} * * ${days.join(',') || '*'}`
        if (freq === 'monthly') return `${mm} ${hh} ${dd} * *`
        return `0 9 * * *`
    }

    // Helper: Convert Markdown to HTML for visual display
    const markdownToHtml = (text: string) => {
        if (!text) return '';

        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        html = html.replace(/\*([^\*]+)\*/g, '<b>$1</b>');
        html = html.replace(/_([^_]+)_/g, '<i>$1</i>');
        html = html.replace(/~([^~]+)~/g, '<s>$1</s>');
        html = html.replace(/```([^`]+)```/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>');

        html = html.replace(/\n/g, '<br>');

        return html;
    }

    // Helper: Convert HTML Visual back to Markdown for storage
    const htmlToMarkdown = (element: HTMLElement, activeStyles: { bold?: boolean, italic?: boolean, strike?: boolean, code?: boolean } = {}): string => {
        let markdown = '';

        for (const node of Array.from(element.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE) {
                markdown += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                const tagName = el.tagName.toLowerCase();
                const styles = window.getComputedStyle(el);

                const isBold = tagName === 'b' || tagName === 'strong' || parseInt(styles.fontWeight) >= 600 || el.style.fontWeight === 'bold';
                const isItalic = tagName === 'i' || tagName === 'em' || styles.fontStyle === 'italic';
                const isStrike = tagName === 's' || tagName === 'strike' || styles.textDecoration.includes('line-through');
                const isCode = tagName === 'code';
                const isDiv = tagName === 'div';

                let content = htmlToMarkdown(el, {
                    bold: activeStyles.bold || isBold,
                    italic: activeStyles.italic || isItalic,
                    strike: activeStyles.strike || isStrike,
                    code: activeStyles.code || isCode
                });

                // Format wrapping logic - prevent redundancy
                if (isBold && !activeStyles.bold) content = `*${content}*`;
                if (isItalic && !activeStyles.italic) content = `_${content}_`;
                if (isStrike && !activeStyles.strike) content = `~${content}~`;
                if (isCode && !activeStyles.code) content = `\`\`\`${content}\`\`\``;

                if (isDiv) {
                    markdown += (markdown ? '\n' : '') + content;
                } else if (tagName === 'br') {
                    markdown += '\n';
                } else {
                    markdown += content;
                }
            }
        }

        return markdown
            .replace(/\*\*+/g, '*')
            .replace(/__+/g, '_')
            .replace(/~~+/g, '~')
            // Don't collapse newlines - preserve them for WhatsApp formatting
            .replace(/\n{3,}/g, '\n\n')  // Only collapse 3+ newlines to 2
            .replace(/^\n+/, '')
            .trimEnd();  // Use trimEnd instead of trim to preserve leading spaces
    }

    const insertText = (str: string) => {
        if (!textareaRef.current) return
        textareaRef.current.focus()
        document.execCommand('insertText', false, str)
        handleEditorInput()
    }

    const insertCode = () => {
        if (!textareaRef.current) return
        const selection = window.getSelection()
        if (!selection) return

        const selectedText = selection.toString()
        const codeText = selectedText || 'code'

        textareaRef.current.focus()
        document.execCommand('insertHTML', false, `<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;">${codeText}</code>&nbsp;`)
        handleEditorInput()
    }

    const handleEditorInput = () => {
        if (!textareaRef.current) return;
        isTypingRef.current = true;

        const markdown = htmlToMarkdown(textareaRef.current);
        setFormData(prev => ({ ...prev, message: markdown.slice(0, 2000) }));

        setTimeout(() => {
            isTypingRef.current = false;
        }, 100);
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === ' ' || e.key === 'Enter') {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const range = selection.getRangeAt(0);
            const textNode = range.startContainer;

            if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
                const textBeforeCaret = textNode.textContent.slice(0, range.startOffset);

                const patterns = [
                    { regex: /\*([^*]+)\*$/, tag: 'b' },
                    { regex: /_([^_]+)_$/, tag: 'i' },
                    { regex: /~([^~]+)~$/, tag: 's' },
                    { regex: /```([^`]+)```$/, tag: 'code' }
                ];

                for (const pattern of patterns) {
                    const match = textBeforeCaret.match(pattern.regex);
                    if (match) {
                        e.preventDefault();
                        const matchIndex = match.index!;
                        const content = match[1];

                        const updateRange = document.createRange();
                        updateRange.setStart(textNode, matchIndex);
                        updateRange.setEnd(textNode, range.startOffset);
                        updateRange.deleteContents();

                        const el = document.createElement(pattern.tag);
                        if (pattern.tag === 'code') {
                            el.style.cssText = "background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;";
                        }
                        el.textContent = content;

                        updateRange.insertNode(el);
                        updateRange.setStartAfter(el);
                        updateRange.setEndAfter(el);

                        const spaceNode = document.createTextNode(e.key === 'Enter' ? '\n' : '\u00A0');
                        updateRange.insertNode(spaceNode);
                        updateRange.setStartAfter(spaceNode);
                        updateRange.setEndAfter(spaceNode);

                        selection.removeAllRanges();
                        selection.addRange(updateRange);

                        document.execCommand('removeFormat');
                        handleEditorInput();
                        return;
                    }
                }
            }
        }
    }

    const execCommand = (command: string, value: string | undefined = undefined) => {
        if (!textareaRef.current) return;
        textareaRef.current.focus();
        document.execCommand(command, false, value);
        handleEditorInput();
    }

    // Format WhatsApp markdown for preview
    const formatWhatsAppText = (text: string) => {
        if (!text) return ''

        let formatted = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")

        // Bold: *text*
        formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>')

        // Italic: _text_
        formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>')

        // Strikethrough: ~text~
        formatted = formatted.replace(/~([^~]+)~/g, '<s>$1</s>')

        // Code: ```text```
        formatted = formatted.replace(/```([^`]+)```/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>')

        // Newlines
        formatted = formatted.replace(/\n/g, '<br>')

        return formatted
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Convert to base64 instead of blob URL
            const reader = new FileReader()
            reader.onloadend = () => {
                setFormData({
                    ...formData,
                    imageFile: file,
                    imagePreview: reader.result as string // base64 data URL
                })
            }
            reader.readAsDataURL(file)
        }
    }


    // --- Derived State for Preview ---
    const getPreviewContactName = (): string => {
        // 1. First check ContactTable data (manual input)
        if (formData.targetType === 'contact' && formData.contactMethod === 'manual') {
            const firstContact = formData.tableContacts.find(c => c.phone?.trim())
            if (firstContact) {
                // Find a name-like column (not 'phone')
                const nameCol = formData.tableColumns.find(col => 
                    col.id !== 'phone' && col.name.toLowerCase().includes('name')
                ) || formData.tableColumns.find(col => col.id !== 'phone')
                
                if (nameCol && firstContact[nameCol.id]?.trim()) {
                    return firstContact[nameCol.id]
                }
            }
        }
        
        // 2. Check CSV/Sheet data
        if ((formData.contactMethod === 'csv' && formData.csvCount > 0) || (formData.contactMethod === 'sheet' && formData.sheetContactCount > 0)) {
            const dataLine = formData.csvPreview[1] || formData.csvPreview[0]
            if (dataLine) {
                const parts = dataLine.split(',')
                if (parts[0] && isNaN(Number(parts[0].trim().replace(/['\"+]/g, '')))) {
                    return parts[0].replace(/['\"]/g, '')
                }
            }
        }
        return '{NAME}'
    }

    // Get all preview replacements from ContactTable
    const getPreviewReplacements = (): Record<string, string> => {
        const replacements: Record<string, string> = {}
        
        if (formData.targetType === 'contact' && formData.contactMethod === 'manual') {
            const firstContact = formData.tableContacts.find(c => c.phone?.trim())
            if (firstContact) {
                // Add Phone
                if (firstContact.phone) {
                    replacements['Phone'] = firstContact.phone
                }
                // Add all custom columns - use col.id to access the raw ContactRow data
                formData.tableColumns.forEach(col => {
                    if (col.id !== 'phone') {
                        const value = firstContact[col.id]?.trim() || ''
                        if (value) {
                            // Map column name to its value (case-insensitive matching)
                            replacements[col.name] = value
                        }
                    }
                })
            }
        }
        
        return replacements
    }

    const previewMessage = (() => {
        let msg = formData.message
            .replace(/{NAME}/g, getPreviewContactName().replace(/\"/g, ''))
        
        // Replace ContactTable variables ({{ColumnName}} format)
        const replacements = getPreviewReplacements()
        Object.entries(replacements).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi')
            msg = msg.replace(regex, value)
        })
        
        return msg
    })()

    // --- Sub-Components ---


    const SectionHeader = ({ title, desc, step }: { title: string, desc: string, step?: number }) => (
        <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
                {step && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-sm shrink-0">
                        {step}
                    </div>
                )}
                <h3 className="text-lg font-semibold text-white">
                    {title}
                </h3>
            </div>
            <p className="text-sm text-zinc-500 ml-11">{desc}</p>
        </div>
    )

    // --- Main Render ---

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex">

                {/* --- Left Panel: Scrollable Form --- */}
                <div className="flex-1 flex flex-col h-full border-r border-zinc-800 relative bg-zinc-950 overflow-hidden">
                    {/* Header */}
                    <div className="shrink-0 bg-zinc-950/95 backdrop-blur-sm z-20 border-b border-zinc-800">
                        <div className="max-w-6xl mx-auto px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div>
                                        <h1 className="text-xl font-semibold text-white">{reminderId ? 'Edit Reminder' : 'Create Reminder'}</h1>
                                        <p className="text-sm text-zinc-500">Set up automated messages for your contacts</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                                        className={`hidden lg:flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium transition-all ${
                                            isPreviewOpen 
                                                ? 'bg-zinc-800 border-zinc-700 text-white' 
                                                : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                                        }`}
                                    >
                                        <Eye size={16} />
                                        Preview
                                    </button>
                                    <button 
                                        onClick={() => createMutation.mutate()} 
                                        disabled={createMutation.isPending || !formData.name} 
                                        className="flex items-center gap-2 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
                                    >
                                        <Save size={16} />
                                        {createMutation.isPending ? 'Saving...' : (reminderId ? 'Update' : 'Save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 lg:px-12 py-8 pb-24 lg:pb-8">
                        <div className="max-w-3xl mx-auto space-y-8">

                        {/* 1. Basic Details */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                            <SectionHeader step={1} title="Basic Details" desc="Name your reminder to easily identify it later." />
                            <div className="mt-5">
                                <label className="block text-sm font-medium text-zinc-300 mb-2">Reminder Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Daily Team Standup"
                                    required
                                />
                            </div>
                        </section>

                        {/* 2. Target Audience */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                            <SectionHeader step={2} title="Target Audience" desc="Who should receive this reminder?" />

                            <div className="mt-5 flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700 w-fit">
                                <button
                                    onClick={() => setFormData({ ...formData, targetType: 'group' })}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${formData.targetType === 'group' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    WhatsApp Groups
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, targetType: 'contact' })}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${formData.targetType === 'contact' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                                >
                                    Individual Contacts
                                </button>
                            </div>


                            {formData.targetType === 'group' ? (
                                <div className="space-y-4 animate-in fade-in">
                                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Selected Groups</label>

                                    {/* Selected Chips */}
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {formData.selectedGroups.map(id => {
                                            const group = groupsData?.find(g => g.jid === id)
                                            return (
                                                <span key={id} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm">
                                                    {group?.name || id}
                                                    <button onClick={() => setFormData(prev => ({ ...prev, selectedGroups: prev.selectedGroups.filter(g => g !== id) }))} className="hover:text-white">
                                                        <X size={14} />
                                                    </button>
                                                </span>
                                            )
                                        })}
                                        <button
                                            onClick={() => setIsGroupSelectorOpen(!isGroupSelectorOpen)}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-sm border border-zinc-700 transition delay-75"
                                        >
                                            <Plus size={14} /> Add Group
                                        </button>
                                    </div>

                                    {/* Dropdown Selector */}
                                    {isGroupSelectorOpen && (
                                        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 max-h-60 overflow-y-auto shadow-xl animate-in zoom-in-95">
                                            {groupsData?.filter(g => !formData.selectedGroups.includes(g.jid)).map(group => (
                                                <button
                                                    key={group.jid}
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            selectedGroups: [...prev.selectedGroups, group.jid]
                                                        }))
                                                        setIsGroupSelectorOpen(false)
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-md flex items-center justify-between group"
                                                >
                                                    {group.name}
                                                    <Plus size={14} className="opacity-0 group-hover:opacity-100 text-zinc-500" />
                                                </button>
                                            ))}
                                            {groupsData?.filter(g => !formData.selectedGroups.includes(g.jid)).length === 0 && (
                                                <div className="p-2 text-center text-zinc-500 text-xs">No more groups available</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="flex gap-4 border-b border-zinc-800 pb-1">
                                        {[
                                            { id: 'manual', label: 'Manual Input', icon: FileText },
                                            { id: 'csv', label: 'Import CSV', icon: Upload },
                                            { id: 'sheet', label: 'Google Sheets', icon: Database }
                                        ].map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => setFormData({ ...formData, contactMethod: m.id as any })}
                                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-all ${formData.contactMethod === m.id ? 'border-blue-600 text-blue-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                <m.icon size={14} /> {m.label}
                                            </button>
                                        ))}
                                    </div>

                                    {formData.contactMethod === 'manual' && (
                                        <div className="space-y-3">
                                            {/* Compact inline table */}
                                            <div className="max-h-[280px] overflow-auto border border-zinc-800">
                                                <ContactTable
                                                    contacts={formData.tableContacts}
                                                    columns={formData.tableColumns}
                                                    onChange={(contacts, columns) => setFormData({ ...formData, tableContacts: contacts, tableColumns: columns })}
                                                />
                                            </div>

                                            {/* Open Full Table link */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    try {
                                                        localStorage.setItem(CONTACT_TABLE_STORAGE_KEY, JSON.stringify({
                                                            contacts: formData.tableContacts,
                                                            columns: formData.tableColumns,
                                                            botId: botId,
                                                            editId: reminderId || ''
                                                        }))
                                                    } catch (e) {
                                                        console.error('Failed to save contact data:', e)
                                                    }
                                                    const params = new URLSearchParams()
                                                    if (botId) params.set('botId', botId)
                                                    if (reminderId) params.set('edit', reminderId)
                                                    router.push(`/dashboard/reminders/create/contacts?${params.toString()}`)
                                                }}
                                                className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                                            >
                                                Open full page editor →
                                            </button>
                                        </div>
                                    )}

                                    {formData.contactMethod === 'sheet' && (
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={formData.contactSheetUrl}
                                                    onChange={e => setFormData({ ...formData, contactSheetUrl: e.target.value, sheetContactCount: 0 })}
                                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                                    className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-blue-600 outline-none text-sm"
                                                />
                                                <button
                                                    onClick={async () => {
                                                        const url = formData.contactSheetUrl
                                                        const match = url.match(/\/d\/(.*?)(\/|$)/)
                                                        if (!match || !match[1]) return toast.error('Invalid URL')
                                                        const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/gviz/tq?tqx=out:csv`
                                                        const toastId = toast.loading('Fetching...')
                                                        try {
                                                            const res = await fetch(csvUrl)
                                                            if (!res.ok) throw new Error('Fetch failed')
                                                            const text = await res.text()
                                                            const lines = text.split('\n').map(r => r.replace(/^"|"$/g, '').replace(/""/g, '"')).filter(l => l.trim().length > 0)
                                                            setFormData(prev => ({ ...prev, sheetContactCount: lines.length, csvPreview: lines.slice(0, 10) })) // Get 10 for preview
                                                            toast.success(`Found ${lines.length} rows`, { id: toastId })
                                                        } catch (e) { toast.error('Failed or Private Sheet', { id: toastId }) }
                                                    }}
                                                    className="px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 font-medium text-sm"
                                                >
                                                    Check
                                                </button>
                                            </div>

                                            {/* Preview Dropdown for Sheet */}
                                            {formData.sheetContactCount > 0 && (
                                                <div className="border border-zinc-800 rounded-lg bg-zinc-900/50">
                                                    <button
                                                        onClick={() => setIsContactPreviewOpen(!isContactPreviewOpen)}
                                                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-emerald-400 font-medium"
                                                    >
                                                        <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Sheet Connected ({formData.sheetContactCount})</span>
                                                        {isContactPreviewOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                    {isContactPreviewOpen && (
                                                        <div className="border-t border-zinc-800 p-2 max-h-40 overflow-y-auto">
                                                            {formData.csvPreview.map((line, i) => (
                                                                <div key={i} className="text-xs text-zinc-400 px-2 py-1 font-mono truncate border-b border-zinc-800/20 last:border-0">{line}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* 3. Message Content (Data Source) */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                            <SectionHeader step={3} title="Message Content" desc="Choose how to create your message - simple text or dynamic data from Google Sheets." />
                            <div className="mt-5 space-y-4">
                                <button
                                    onClick={() => setFormData({ ...formData, dataSource: formData.dataSource === 'static' ? 'google_sheets' : 'static' })}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all relative overflow-hidden group
                                    ${formData.dataSource === 'google_sheets' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${formData.dataSource === 'google_sheets' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                            <Database size={24} />
                                        </div>
                                        <div className="text-left">
                                            <div className={`font-semibold text-base mb-1 ${formData.dataSource === 'google_sheets' ? 'text-emerald-400' : 'text-zinc-200'}`}>Get Data from Google Sheets</div>
                                            <div className="text-xs text-zinc-500">Pull data from your spreadsheet and send personalized messages</div>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${formData.dataSource === 'google_sheets' ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                                        {formData.dataSource === 'google_sheets' && <Check size={14} />}
                                    </div>
                                </button>

                                {formData.dataSource === 'google_sheets' && (
                                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-6 animate-in fade-in slide-in-from-top-2">

                                        {/* 1. Connection Inputs */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Google Sheets URL</label>
                                                <div className="relative">
                                                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                                                    <input
                                                        type="url"
                                                        value={formData.contactSheetUrl}
                                                        onChange={e => setFormData({ ...formData, contactSheetUrl: e.target.value, sheetContactCount: 0 })}
                                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                                        className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500/50 outline-none text-sm transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span>Tab Name</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const match = formData.contactSheetUrl.match(/\/d\/([\w-]+)/);
                                                                if (match) {
                                                                    setAvailableTabs([]);
                                                                    // Re-trigger the detectTabs logic by clearing and setting back
                                                                    const currentUrl = formData.contactSheetUrl;
                                                                    setFormData(prev => ({ ...prev, contactSheetUrl: '' }));
                                                                    setTimeout(() => setFormData(prev => ({ ...prev, contactSheetUrl: currentUrl })), 10);
                                                                }
                                                            }}
                                                            className="text-zinc-500 hover:text-emerald-400 transition-colors"
                                                            title="Refresh tabs"
                                                        >
                                                            <RefreshCw size={10} className={isLoadingTabs ? 'animate-spin' : ''} />
                                                        </button>
                                                    </div>
                                                    {isLoadingTabs && (
                                                        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 animate-pulse lowercase font-normal">
                                                            detecting...
                                                        </span>
                                                    )}
                                                </label>
                                                <div className="relative group/tabs">
                                                    {availableTabs.length > 0 ? (
                                                        <select
                                                            value={formData.sheetName}
                                                            onChange={e => setFormData({ ...formData, sheetName: e.target.value })}
                                                            className="w-full px-4 py-2.5 bg-zinc-900 border border-emerald-500/30 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm transition-all cursor-pointer appearance-none shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                                                        >
                                                            <option value="" disabled>Select a tab...</option>
                                                            {availableTabs.map(tab => (
                                                                <option key={tab.gid} value={tab.name}>
                                                                    {tab.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={formData.sheetName}
                                                            onChange={e => setFormData({ ...formData, sheetName: e.target.value })}
                                                            placeholder={isLoadingTabs ? "Detecting tabs..." : "e.g. Sheet1"}
                                                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none text-sm transition-all"
                                                            disabled={isLoadingTabs}
                                                        />
                                                    )}
                                                    {availableTabs.length > 0 && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                                            <ChevronDown size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                    {availableTabs.length > 0 ? `✓ ${availableTabs.length} tabs found` : 'Paste URL to auto-detect tabs'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* 2. Check Connection Button */}
                                        <div className="flex justify-between items-center">
                                            <div className="text-[10px] text-zinc-500 italic">Ensure your sheet is "Anyone with the link can view".</div>
                                            <button
                                                onClick={async () => {
                                                    const url = formData.contactSheetUrl
                                                    const match = url.match(/\/d\/(.*?)(\/|$)/)
                                                    if (!match || !match[1]) {
                                                        toast.error('Invalid Google Sheets URL')
                                                        return
                                                    }
                                                    const sheetId = match[1]

                                                    // Smart Tab Detection: Use Name input OR 'gid' from URL
                                                    let sheetParam = ''
                                                    const gidMatch = url.match(/[#&?]gid=(\d+)/)

                                                    if (formData.sheetName) {
                                                        sheetParam = `&sheet=${encodeURIComponent(formData.sheetName)}`
                                                    } else if (gidMatch && gidMatch[1]) {
                                                        sheetParam = `&gid=${gidMatch[1]}`
                                                    }

                                                    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${sheetParam}`

                                                    const toastMsg = formData.sheetName ? `Fetching '${formData.sheetName}'...` : (gidMatch ? 'Fetching tab from URL...' : 'Fetching default tab...')
                                                    const toastId = toast.loading(toastMsg)

                                                    try {
                                                        // Fallback Tab Detection: If dropdown is empty, try to fetch tabs now
                                                        if (availableTabs.length === 0) {
                                                            api.sheets.getTabs(url).then(res => {
                                                                if (res.data.success && res.data.tabs?.length > 0) {
                                                                    setAvailableTabs(res.data.tabs);
                                                                }
                                                            }).catch(() => { });
                                                        }

                                                        const res = await fetch(csvUrl)
                                                        if (!res.ok) throw new Error('Failed to fetch')

                                                        const text = await res.text()
                                                        const lines = text.split('\n')
                                                            .map(row => row.replace(/^"|"$/g, '').replace(/""/g, '"'))
                                                            .filter(l => l.trim().length > 0)

                                                        if (lines.length === 0) {
                                                            toast.error('Sheet appears empty', { id: toastId })
                                                            return
                                                        }

                                                        setFormData(prev => ({
                                                            ...prev,
                                                            sheetContactCount: lines.length,
                                                            csvPreview: lines.slice(0, 5)
                                                        }))

                                                        toast.success(`Found ${lines.length} rows`, { id: toastId })

                                                    } catch (err) {
                                                        console.error(err)
                                                        toast.error('Failed to fetch. Check permissions & tab name.', { id: toastId })
                                                    }
                                                }}
                                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                            >
                                                <Database size={14} /> Check Connection
                                            </button>
                                        </div>

                                        {/* 3. Preview (Collapsible) */}
                                        {formData.sheetContactCount > 0 && (
                                            <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 overflow-hidden">
                                                <button
                                                    onClick={() => setIsContactPreviewOpen(!isContactPreviewOpen)}
                                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-emerald-400 font-medium hover:bg-zinc-800/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 size={16} />
                                                        <span>Connected: {formData.sheetContactCount} rows found</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-zinc-500 font-normal">
                                                        {isContactPreviewOpen ? 'Hide Data' : 'Show Data'}
                                                        {isContactPreviewOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </div>
                                                </button>

                                                {isContactPreviewOpen && (
                                                    <div className="border-t border-zinc-800 max-h-48 overflow-y-auto custom-scrollbar bg-black/20">
                                                        <table className="w-full text-left text-xs text-zinc-400">
                                                            <thead className="bg-zinc-800/50 text-zinc-300 font-mono sticky top-0">
                                                                <tr>
                                                                    <th className="px-3 py-1.5 font-normal">#</th>
                                                                    <th className="px-3 py-1.5 font-normal">Raw Row Data</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-zinc-800/50">
                                                                {formData.csvPreview.map((line, i) => (
                                                                    <tr key={i} className="hover:bg-white/5 font-mono">
                                                                        <td className="px-3 py-1.5 w-10 opacity-50">{i + 1}</td>
                                                                        <td className="px-3 py-1.5 truncate max-w-[200px]">{line}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        <div className="px-3 py-1 text-[10px] text-zinc-600 border-t border-zinc-800 bg-zinc-900/50">
                                                            Showing first {formData.csvPreview.length} rows used for loop simulation.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* 5. Filter Mode Toggle */}
                                        <div className="pt-2 space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                                <div>
                                                    <div className="font-medium text-white text-sm">Filter Data (Optional)</div>
                                                    <div className="text-xs text-zinc-500">Show only rows that match specific conditions (e.g., deadlines within 3 days)</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, useAdvancedFilters: !formData.useAdvancedFilters })}
                                                    className={`w-11 h-6 rounded-full p-0.5 transition-colors ${formData.useAdvancedFilters ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                                                >
                                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.useAdvancedFilters ? 'translate-x-5' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            {formData.useAdvancedFilters ? (
                                                /* Advanced Filters Mode */
                                                <div className="animate-in fade-in slide-in-from-top-2">
                                                    <AdvancedFilters
                                                        filters={formData.filters}
                                                        onChange={(filters) => setFormData({ ...formData, filters })}
                                                        availableColumns={formData.csvPreview.length > 0 ? formData.csvPreview[0].split(',').map(c => c.trim()) : []}
                                                    />

                                                    {/* Sorting */}
                                                    <div className="mt-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">Sort Results (Optional)</label>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <input
                                                                type="text"
                                                                value={formData.sort?.column || ''}
                                                                onChange={e => setFormData({
                                                                    ...formData,
                                                                    sort: e.target.value ? { column: e.target.value, order: formData.sort?.order || 'asc' } : null
                                                                })}
                                                                placeholder="Column name (e.g. waktu)"
                                                                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none"
                                                            />
                                                            <select
                                                                value={formData.sort?.order || 'asc'}
                                                                onChange={e => setFormData({
                                                                    ...formData,
                                                                    sort: formData.sort ? { ...formData.sort, order: e.target.value as 'asc' | 'desc' } : null
                                                                })}
                                                                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-white text-sm focus:ring-1 focus:ring-emerald-500/50 outline-none"
                                                                disabled={!formData.sort?.column}
                                                            >
                                                                <option value="asc">Ascending</option>
                                                                <option value="desc">Descending</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Legacy Trigger Mode */
                                                <div className="animate-in fade-in slide-in-from-top-2">

                                                    {/* 5. Trigger Inputs */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trigger Column Header</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={formData.triggerColumn}
                                                                    onChange={e => setFormData({ ...formData, triggerColumn: e.target.value })}
                                                                    placeholder="Status"
                                                                    className="w-full pl-4 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-medium"
                                                                />
                                                            </div>
                                                            <p className="text-[10px] text-zinc-500">Column to check (e.g. "Status")</p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trigger Value</label>
                                                            <input
                                                                type="text"
                                                                value={formData.triggerValue}
                                                                onChange={e => setFormData({ ...formData, triggerValue: e.target.value })}
                                                                placeholder="SEND"
                                                                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-emerald-400 placeholder-zinc-700 font-bold focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                                            />
                                                            <p className="text-[10px] text-zinc-500">Value to match (e.g. "SEND")</p>
                                                        </div>
                                                    </div>

                                                </div>
                                            )}
                                        </div>
                                        {/* End Filter Mode Toggle */}

                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 4. Schedule */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                            <SectionHeader step={4} title="Schedule" desc="When should this reminder run?" />
                            <div className="mt-5 space-y-6">
                                {/* Schedule Type Selector */}
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, frequency: 'now' as any })}
                                        className={`p-4 rounded-xl border transition-all text-left ${formData.frequency === 'now' ? 'bg-cyan-500/20 border-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-lg ${formData.frequency === 'now' ? 'bg-cyan-500/30 text-cyan-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <ArrowRight size={16} />
                                            </div>
                                            <span className={`font-semibold text-sm ${formData.frequency === 'now' ? 'text-cyan-400' : 'text-zinc-400'}`}>Send Now</span>
                                        </div>
                                        <div className={`text-xs ${formData.frequency === 'now' ? 'text-cyan-300/80' : 'text-zinc-500'}`}>Send immediately</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, frequency: 'once' as any })}
                                        className={`p-4 rounded-xl border transition-all text-left ${formData.frequency === 'once' || formData.frequency === 'daily' ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-lg ${formData.frequency === 'once' || formData.frequency === 'daily' ? 'bg-blue-500/30 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <Calendar size={16} />
                                            </div>
                                            <span className={`font-semibold text-sm ${formData.frequency === 'once' || formData.frequency === 'daily' ? 'text-blue-400' : 'text-zinc-400'}`}>Once / Daily</span>
                                        </div>
                                        <div className={`text-xs ${formData.frequency === 'once' || formData.frequency === 'daily' ? 'text-blue-300/80' : 'text-zinc-500'}`}>Schedule or repeat</div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, frequency: 'weekly' as any })}
                                        className={`p-4 rounded-xl border transition-all text-left ${formData.frequency === 'weekly' ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`p-1.5 rounded-lg ${formData.frequency === 'weekly' ? 'bg-purple-500/30 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <RefreshCw size={16} />
                                            </div>
                                            <span className={`font-semibold text-sm ${formData.frequency === 'weekly' ? 'text-purple-400' : 'text-zinc-400'}`}>Weekly</span>
                                        </div>
                                        <div className={`text-xs ${formData.frequency === 'weekly' ? 'text-purple-300/80' : 'text-zinc-500'}`}>Repeat weekly</div>
                                    </button>
                                </div>
                                {/* Once/Daily Options */}
                                {(formData.frequency === 'once' || formData.frequency === 'daily') && (
                                    <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                                        {/* Repeat Daily Toggle */}
                                        <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                                            <div>
                                                <div className="font-medium text-white text-sm">Repeat Daily</div>
                                                <div className="text-xs text-zinc-500">Send every day at the same time</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, frequency: formData.frequency === 'daily' ? 'once' : 'daily' as any })}
                                                className={`w-11 h-6 rounded-full p-0.5 transition-colors ${formData.frequency === 'daily' ? 'bg-blue-600' : 'bg-zinc-700'}`}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.frequency === 'daily' ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>

                                        {/* Date & Time */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-zinc-400 uppercase">{formData.frequency === 'daily' ? 'Start Date' : 'Execution Date'}</label>
                                                <input
                                                    type="date"
                                                    value={formData.startDate}
                                                    min={today}
                                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-zinc-400 uppercase">Time</label>
                                                <input
                                                    type="time"
                                                    value={formData.time}
                                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-blue-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Weekly Options */}
                                {formData.frequency === 'weekly' && (
                                    <div className="space-y-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                                        {/* Day Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400 uppercase">Select Days</label>
                                            <div className="grid grid-cols-7 gap-2">
                                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={() => {
                                                            const days = formData.days.includes(index)
                                                                ? formData.days.filter(d => d !== index)
                                                                : [...formData.days, index].sort()
                                                            setFormData({ ...formData, days })
                                                        }}
                                                        className={`py-3 px-2 rounded-lg border text-xs font-semibold transition-all ${formData.days.includes(index)
                                                            ? 'bg-purple-500 border-purple-500 text-white shadow-lg shadow-purple-500/30'
                                                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                            {formData.days.length === 0 && (
                                                <p className="text-xs text-red-400 mt-1">Please select at least one day</p>
                                            )}
                                        </div>

                                        {/* Time */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400 uppercase">Time</label>
                                            <input
                                                type="time"
                                                value={formData.time}
                                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white outline-none focus:border-purple-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 5. Message Content */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                            <SectionHeader step={5} title="Message" desc="Compose your message with formatting and variables." />

                            <div className="mt-5 bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-blue-600/50 transition-all">
                                {/* Digest Mode Toggle */}
                                <div className="px-4 py-3 border-b border-zinc-800 bg-[#18181b]/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-md ${formData.isDigestMode ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-zinc-200">Group Multiple Rows?</div>
                                            <div className="text-[10px] text-zinc-500">Combine all matching rows into one message (useful for daily summaries)</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFormData({ ...formData, isDigestMode: !formData.isDigestMode })}
                                        className={`w-10 h-6 rounded-full p-1 transition-colors ${formData.isDigestMode ? 'bg-purple-600' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${formData.isDigestMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* Toolbar */}
                                <div className="bg-[#18181b] p-2 flex items-center justify-between border-b border-zinc-800">
                                    <div className="flex items-center gap-1 relative">
                                        <button onClick={() => execCommand('bold')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Bold"><Bold size={14} /></button>
                                        <button onClick={() => execCommand('italic')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Italic"><Italic size={14} /></button>
                                        <button onClick={() => execCommand('strikeThrough')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Strikethrough"><Strikethrough size={14} /></button>
                                        <button onClick={() => insertCode()} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Code"><Code size={14} /></button>
                                        <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
                                        <button
                                            ref={emojiTriggerRef}
                                            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                            className={`p-1.5 rounded transition-all ${isEmojiPickerOpen ? 'text-yellow-400 bg-yellow-400/10' : 'text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800'}`}
                                            title="Insert Emoji"
                                        >
                                            <Smile size={14} />
                                        </button>

                                        {/* Rich Emoji Picker */}
                                        {isEmojiPickerOpen && (
                                            <div
                                                ref={emojiPickerRef}
                                                className="absolute left-0 top-full mt-2 z-50 w-80 bg-[#1f2c34]/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 origin-top-left"
                                            >
                                                <div className="flex bg-[#111b21]/50 p-1.5 gap-1 overflow-x-auto custom-scrollbar border-b border-zinc-700/30 no-scrollbar">
                                                    {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => setActiveEmojiCategory(cat as any)}
                                                            className={`p-2 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${activeEmojiCategory === cat
                                                                ? 'bg-[#2a3942] text-[#00a884] shadow-sm ring-1 ring-[#00a884]/20'
                                                                : 'text-[#8696a0] hover:bg-[#2a3942]/30 hover:text-zinc-300'
                                                                }`}
                                                        >
                                                            {CATEGORY_ICONS[cat] || <Smile size={18} />}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="h-64 overflow-y-auto p-3 custom-scrollbar bg-[#111b21]">
                                                    <div className="grid grid-cols-8 gap-y-2 gap-x-1">
                                                        {EMOJI_CATEGORIES[activeEmojiCategory].map((emoji) => (
                                                            <button
                                                                key={emoji}
                                                                type="button"
                                                                onClick={() => {
                                                                    insertText(emoji)
                                                                    setIsEmojiPickerOpen(false)
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-[#2a3942] cursor-pointer transition-all hover:scale-110 active:scale-95"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {formData.isDigestMode && (
                                            <>
                                                <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
                                                <button
                                                    onClick={() => insertText('📬 *DAILY DIGEST ({TODAY_DATE})*\n\n🗓️ *Jadwal Hari Ini ({TODAY_NAME})*\n{SCHEDULE_TODAY}\n\n🧾 *Deadline ≤ 3 Hari*\n{TASKS_URGENT}\n\nSemangat! 💪')}
                                                    className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-medium rounded transition-colors border border-purple-500/20"
                                                >
                                                    <RefreshCw size={12} /> Insert Academic Template
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium transition-colors ${formData.imagePreview ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                        >
                                            <ImageIcon size={14} /> {formData.imagePreview ? 'Change Image' : 'Add Image'}
                                        </button>
                                        {formData.imagePreview && (
                                            <button
                                                onClick={() => setFormData({ ...formData, imageFile: null, imagePreview: null })}
                                                className="p-1 hover:bg-red-500/10 text-red-400 rounded transition-colors"
                                                title="Remove Image"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div
                                    ref={textareaRef}
                                    contentEditable
                                    onInput={handleEditorInput}
                                    onKeyDown={handleKeyDown}
                                    className="w-full bg-transparent p-4 min-h-[200px] text-zinc-200 focus:outline-none font-mono text-sm leading-relaxed resize-y overflow-y-auto"
                                    style={{ maxHeight: '400px' }}
                                    spellCheck={false}
                                    suppressContentEditableWarning
                                />

                                <div className="px-3 py-2 bg-[#18181b] border-t border-zinc-800 flex items-center justify-between gap-2 text-[10px]">
                                    <div className="flex items-center gap-2 overflow-x-auto flex-1">
                                        <span className="text-zinc-500 uppercase mr-2 font-bold flex-shrink-0">Variables:</span>
                                        {/* Dynamic variables from ContactTable */}
                                        {formData.targetType === 'contact' && formData.contactMethod === 'manual' && formData.tableColumns.length > 0 ? (
                                            formData.tableColumns.map(col => (
                                                <button key={col.id} onClick={() => insertText(`{{${col.name}}}`)} className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-blue-400 rounded hover:bg-zinc-700 flex-shrink-0">{`{{${col.name}}}`}</button>
                                            ))
                                        ) : (
                                            // Default variables for Google Sheets mode
                                            ['{{#LOOP}}', '{{/LOOP}}', '{{Nama}}', '{{Status}}', '{{index}}', '{TODAY}'].map(tag => (
                                                <button key={tag} onClick={() => insertText(tag)} className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-blue-400 rounded hover:bg-zinc-700 flex-shrink-0">{tag}</button>
                                            ))
                                        )}
                                    </div>
                                    <div className={`text-[10px] font-medium tracking-wide flex-shrink-0 ${formData.message.length >= 2000 ? 'text-red-500' : 'text-zinc-600'}`}>
                                        {formData.message.length} / 2000
                                    </div>
                                </div>
                            </div>
                        </section>

                        </div>
                    </div>

                    {/* Mobile Save Button */}
                    <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 z-30">
                        <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !formData.name} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50">
                            {createMutation.isPending
                                ? (reminderId ? 'Updating...' : 'Saving...')
                                : (reminderId ? 'Update Reminder' : 'Save Reminder')
                            } <Save size={18} />
                        </button>
                    </div>
                </div>

                {/* --- Right Panel: Preview - Toggle with button --- */}
                {isPreviewOpen && (
                <div className="hidden lg:flex w-[380px] shrink-0 bg-[#0b141a] relative flex-col h-full border-l border-zinc-800 animate-in slide-in-from-right-5 duration-200">
                    <div className="h-16 bg-[#202c33] flex items-center px-4 gap-3 border-b border-[#2a3942] z-10">
                        <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center overflow-hidden">
                            <img src="/Sendr-logo.png" alt="Sendr" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[#e9edef] text-sm font-medium truncate">{formData.name || 'Sendr Assistant'}</div>
                            <div className="text-[#8696a0] text-xs">Business Account</div>
                        </div>
                        <Search size={20} className="text-[#aebac1]" />
                    </div>

                    <div className="flex-1 relative flex flex-col min-h-0">
                        <div className="absolute inset-0 bg-[url('https://static.whatsapp.net/rsrc.php/v3/yl/r/gi_DckOUM5a.png')] bg-repeat opacity-[0.06] pointer-events-none mix-blend-overlay"></div>
                        <div className="relative z-10 flex-1 p-6 flex flex-col justify-end gap-3 overflow-y-auto">
                            <div className="flex justify-center mb-4"><span className="bg-[#182229] text-[#8696a0] text-xs px-3 py-1.5 rounded-lg shadow-sm font-medium">TODAY</span></div>

                            <div className="self-start max-w-[90%] relative group animate-in slide-in-from-left-2">
                                <div className="bg-[#202c33] p-1 rounded-lg rounded-tl-none shadow border border-white/5 text-[#e9edef] text-sm relative min-w-[120px]">
                                    {/* Image Preview */}
                                    {formData.imagePreview && (
                                        <div className="mb-1 rounded-lg overflow-hidden">
                                            <img src={formData.imagePreview} alt="Attached" className="w-full h-auto object-cover max-h-60" />
                                        </div>
                                    )}

                                    <div className="px-2 pt-1 pb-6 leading-relaxed">
                                        {/* Dynamic Preview Logic */}
                                        {(() => {
                                            // Handle Digest Preview (Real Data)
                                            if (formData.isDigestMode) {
                                                if (isPreviewLoading) {
                                                    return (
                                                        <div className="flex items-center gap-2 text-zinc-500 italic py-2">
                                                            <RefreshCw className="animate-spin w-3 h-3" /> Generating preview from Sheet...
                                                        </div>
                                                    )
                                                }
                                                // Only show if we truly have fetched content
                                                if (previewText) {
                                                    return <div dangerouslySetInnerHTML={{ __html: formatWhatsAppText(previewText) }} />
                                                }
                                            }

                                            // Fallback: Legacy / Local Simulation
                                            let finalMsg = formData.message || '';

                                            // 1. Basic Variables
                                            finalMsg = finalMsg
                                                .replace(/{TODAY}/g, new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }))
                                                .replace(/{NAME}/g, getPreviewContactName());

                                            // 2. Replace ContactTable variables ({{ColumnName}} format)
                                            const replacements = getPreviewReplacements();
                                            Object.entries(replacements).forEach(([key, value]) => {
                                                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
                                                finalMsg = finalMsg.replace(regex, value);
                                            });

                                            // 3. Digest Loop Simulation (Legacy)
                                            if (formData.isDigestMode) {
                                                const loopRegex = /{{#LOOP}}([\s\S]*?){{\/LOOP}}/g;
                                                finalMsg = finalMsg.replace(loopRegex, (_, template) => {
                                                    // Simulate 3 items
                                                    const mockData = formData.csvPreview.length > 0 ? formData.csvPreview.slice(0, 3) : ['Item A', 'Item B', 'Item C'];

                                                    return mockData.map((row, i) => {
                                                        let itemText = template;
                                                        // Naive replacement
                                                        itemText = itemText.replace(/{.*?}/g, (match: string) => {
                                                            return typeof row === 'string' ? row : match;
                                                        });
                                                        return itemText;
                                                    }).join('\n');
                                                });
                                            }

                                            if (!finalMsg) {
                                                return <span className="text-white/30 italic">Start typing to preview...</span>
                                            }

                                            return <div dangerouslySetInnerHTML={{ __html: formatWhatsAppText(finalMsg) }} />
                                        })()}
                                    </div>
                                    <div className="absolute right-2 bottom-1 text-[10px] text-[#8696a0]">{formData.time}</div>
                                </div>
                                <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-[#202c33] border-l-[10px] border-l-transparent transform scale-x-[-1]"></div>
                            </div>
                        </div>
                    </div>

                    <div className="h-[62px] bg-[#202c33] px-3 flex items-center gap-3 shrink-0 border-t border-[#2a3942] mt-auto relative z-20">
                        <Upload size={24} className="text-[#8696a0]" />
                        <div className="flex-1 bg-[#2a3942] rounded-lg h-9 px-3 flex items-center text-[#8696a0] text-sm">Type a message</div>
                        <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white"><ArrowRight size={16} /></div>
                    </div>
                </div>
                )}
        </div>
    )
}
