'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api, API_URL, apiClient } from '@/lib/api'
import {
    Bot, MessageCircle, MoreVertical, Send, CheckSquare,
    Search, RefreshCw, Paperclip, Image as ImageIcon, FileText, X,
    File, Video, Music, Download, CheckCheck, Phone, ChevronDown,
    Filter, Circle, DownloadCloud, ChevronRight, Plus, Smile
} from 'lucide-react'
import dynamic from 'next/dynamic'
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })
import { format, isToday, isYesterday } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { io, Socket } from 'socket.io-client'

interface Conversation {
    id: string;
    bot_id: string;
    bot_name: string;
    contact_number: string;
    contact_name?: string;
    unread_count: number;
    status: 'open' | 'closed' | 'resolved';
    last_message_at: string;
    last_message_content?: string;
}

interface Message {
    id: string;
    sender_type: 'contact' | 'bot' | 'agent';
    sender_name?: string;
    content: string;
    message_type?: string;
    status: string;
    created_at: string;
    media_meta?: {
        filename?: string;
        mimetype?: string;
        file_size?: number;
        message_type?: string;
        media_url?: string;
    };
}

interface PendingAttachment {
    file: File;
    previewUrl?: string;
    name: string;
    type: 'image' | 'video' | 'audio' | 'document';
    size: number;
}

function getFileType(file: File): 'image' | 'video' | 'audio' | 'document' {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'document'
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(isoString: string): string {
    const d = new Date(isoString)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return 'Kemarin'
    return format(d, 'dd MMM', { locale: localeId })
}

function formatDateLabel(isoString: string): string {
    const d = new Date(isoString)
    if (isToday(d)) return 'Hari ini'
    if (isYesterday(d)) return 'Kemarin'
    return format(d, 'EEEE, dd MMMM yyyy', { locale: localeId })
}

/** Strip Baileys JID suffix to show clean phone / group ID */
function formatJid(jid: string): string {
    if (!jid) return ''
    if (jid.includes('@')) return jid.split('@')[0]
    return jid
}

function getMediaUrl(url?: string) {
    if (!url) return null
    if (url.startsWith('http')) return url
    return API_URL.replace('/api', '') + url
}

function MediaBubble({ content, messageType, mediaMeta }: {
    content: string;
    messageType?: string;
    mediaMeta?: Message['media_meta'];
}) {
    const type = mediaMeta?.message_type || messageType
    const fullUrl = getMediaUrl(mediaMeta?.media_url)

    if (type === 'image') {
        return (
            <div className="flex flex-col gap-1">
                {fullUrl ? (
                    <div className="rounded overflow-hidden mb-1 max-w-[240px] max-h-[300px] bg-black/10 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={fullUrl}
                            alt={mediaMeta?.filename || 'Gambar'}
                            className="max-w-full max-h-[300px] object-contain hover:opacity-90 transition-opacity cursor-pointer"
                            onClick={() => window.open(fullUrl, '_blank')}
                        />
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm opacity-80 bg-black/5 p-2 rounded">
                        <ImageIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{mediaMeta?.filename || 'Gambar'}</span>
                    </div>
                )}
                {content && !content.startsWith('[image:') && (
                    <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
                )}
            </div>
        )
    }

    if (type === 'video') {
        return (
            <div className="flex flex-col gap-1">
                {fullUrl ? (
                    <div className="rounded overflow-hidden mb-1 max-w-[240px] max-h-[300px] bg-black/90 flex items-center justify-center">
                        <video
                            src={fullUrl}
                            controls
                            className="max-w-full max-h-[300px] object-contain"
                        />
                    </div>
                ) : (
                    <div className="flex items-center gap-3 min-w-[180px] bg-black/5 p-2 rounded">
                        <div className="w-9 h-9 rounded bg-black/20 flex items-center justify-center flex-shrink-0">
                            <Video className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{mediaMeta?.filename || 'Video'}</p>
                            {mediaMeta?.file_size && <p className="text-[11px] opacity-60">{formatBytes(mediaMeta.file_size)}</p>}
                        </div>
                    </div>
                )}
                {content && !content.startsWith('[video:') && (
                    <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
                )}
            </div>
        )
    }

    if (type === 'audio') {
        return (
            <div className="flex items-center gap-3 min-w-[180px]">
                <div className="w-9 h-9 rounded bg-black/20 flex items-center justify-center flex-shrink-0">
                    <Music className="w-4 h-4" />
                </div>
                {fullUrl ? (
                    <audio src={fullUrl} controls className="h-10 w-[200px]" />
                ) : (
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mediaMeta?.filename || 'Audio'}</p>
                        {mediaMeta?.file_size && <p className="text-[11px] opacity-60">{formatBytes(mediaMeta.file_size)}</p>}
                    </div>
                )}
            </div>
        )
    }

    if (type === 'document') {
        const docContent = (
            <div className="flex items-center gap-3 min-w-[200px] bg-black/5 p-2 rounded">
                <div className="w-10 h-10 rounded bg-white/50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate leading-tight">{mediaMeta?.filename || content}</p>
                    {mediaMeta?.file_size && <p className="text-[11px] opacity-60 mt-0.5">{formatBytes(mediaMeta.file_size)}</p>}
                </div>
                <Download className="w-4 h-4 opacity-50 flex-shrink-0 ml-1" />
            </div>
        )

        return (
            <div className="flex flex-col gap-1">
                {fullUrl ? (
                    <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        {docContent}
                    </a>
                ) : docContent}

                {content && !content.startsWith('[document:') && content !== mediaMeta?.filename && (
                    <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
                )}
            </div>
        )
    }

    // Fallback parse [image: xxx] style content
    const match = content.match(/^\[(image|video|audio|document|file):\s*(.+)\]$/)
    if (match) {
        return (
            <div className="flex items-center gap-2">
                <File className="w-4 h-4 flex-shrink-0 opacity-70" />
                <p className="text-sm truncate">{match[2]}</p>
            </div>
        )
    }

    return <span className="whitespace-pre-wrap break-words text-[14px] leading-[1.5]">{content}</span>
}

const MESSAGES_PER_PAGE = 50

export default function InboxPage() {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [activeConvId, setActiveConvId] = useState<string | null>(null)
    const [isLoadingConvs, setIsLoadingConvs] = useState(true)
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [hasMoreMessages, setHasMoreMessages] = useState(false)
    const [msgOffset, setMsgOffset] = useState(0)
    const [inputText, setInputText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [filterStatus, setFilterStatus] = useState<string>('open')
    const [searchQuery, setSearchQuery] = useState('')
    const [socket, setSocket] = useState<Socket | null>(null)
    const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null)
    const [isSendingMedia, setIsSendingMedia] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    // Bot selector
    const [bots, setBots] = useState<{ id: string; name: string; status: string; phone_number?: string }[]>([])
    const [selectedBotId, setSelectedBotId] = useState<string>('all')
    const [showBotDropdown, setShowBotDropdown] = useState(false)

    // New Chat Modal
    const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
    const [newChatPhone, setNewChatPhone] = useState('')
    const [newChatBotId, setNewChatBotId] = useState('')
    const [isCreatingChat, setIsCreatingChat] = useState(false)

    // Emoji Picker
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesTopRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const prevScrollHeightRef = useRef<number>(0)

    const activeConv = conversations.find(c => c.id === activeConvId)

    const filteredConversations = conversations.filter(conv => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
            (conv.contact_name || '').toLowerCase().includes(q) ||
            conv.contact_number.toLowerCase().includes(q) ||
            (conv.last_message_content || '').toLowerCase().includes(q)
        )
    })

    useEffect(() => {
        fetchBots()
        fetchConversations()
    }, [filterStatus, selectedBotId])

    useEffect(() => {
        if (activeConvId) {
            setMessages([])
            setMsgOffset(0)
            setHasMoreMessages(false)
            fetchMessages(activeConvId, 0, true)
            setPendingAttachment(null)
            setShowEmojiPicker(false)
        } else {
            setMessages([])
            setShowEmojiPicker(false)
        }
    }, [activeConvId])

    // Scroll to bottom only on initial load + new messages from bottom
    useEffect(() => {
        if (messages.length > 0 && !isLoadingMore) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [activeConvId])

    // Setup Socket.IO
    useEffect(() => {
        const userStr = localStorage.getItem('user')
        if (!userStr) return
        try {
            const user = JSON.parse(userStr)
            const tenantId = user.tenant_id

            const newSocket = io(API_URL.replace('/api', ''), {
                transports: ['websocket', 'polling']
            })

            newSocket.on('connect', () => {
                newSocket.emit('join_tenant', tenantId)
            })

            newSocket.on('inbox:new_message', (msg: Message) => {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev
                    return [...prev, msg]
                })
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
            })

            newSocket.on('inbox:conversation_updated', (conv: Conversation) => {
                setConversations(prev => {
                    const idx = prev.findIndex(c => c.id === conv.id)
                    if (idx === -1) return [conv, ...prev]
                    const newArr = [...prev]
                    newArr[idx] = conv
                    return newArr.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
                })
            })

            newSocket.on('inbox:new_conversation', (conv: Conversation) => {
                setConversations(prev => {
                    if (prev.some(c => c.id === conv.id)) return prev
                    return [conv, ...prev]
                })
            })

            setSocket(newSocket)
            return () => { newSocket.disconnect() }
        } catch (e) { }
    }, [])

    // Join/leave conversation room
    useEffect(() => {
        if (socket && activeConvId) {
            socket.emit('join_conversation', activeConvId)
            return () => { socket.emit('leave_conversation', activeConvId) }
        }
    }, [socket, activeConvId])

    const fetchBots = async () => {
        try {
            const res = await api.bots.list()
            setBots(res.data.data || res.data || [])
        } catch { /* silent */ }
    }

    const fetchConversations = async () => {
        setIsLoadingConvs(true)
        try {
            const botId = selectedBotId !== 'all' ? selectedBotId : undefined
            const res = await api.inbox.getConversations(botId, filterStatus !== 'all' ? filterStatus : undefined)
            setConversations(res.data.data || [])
        } catch {
            toast.error('Gagal memuat daftar chat')
        } finally {
            setIsLoadingConvs(false)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const res = await api.inbox.sync()
            const { created, skipped } = res.data
            toast.success(`Sync selesai! ${created} chat baru ditemukan, ${skipped} sudah ada.`)
            await fetchConversations()
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Sync gagal')
        } finally {
            setIsSyncing(false)
        }
    }

    const handleCreateNewChat = async () => {
        if (!newChatPhone) {
            toast.error('Nomor telepon harus diisi')
            return
        }
        if (!newChatBotId) {
            toast.error('Pilih bot pengirim terlebih dahulu')
            return
        }

        setIsCreatingChat(true)
        try {
            // Clean phone number input
            const cleanPhone = newChatPhone.replace(/\D/g, '')
            if (cleanPhone.length < 9) {
                toast.error('Nomor telepon tidak valid')
                setIsCreatingChat(false)
                return
            }

            // check if conversation already exists in frontend list
            const jid = `${cleanPhone}@s.whatsapp.net`
            const existing = conversations.find(c => c.contact_number === jid && c.bot_id === newChatBotId)

            if (existing) {
                setActiveConvId(existing.id)
                setIsNewChatModalOpen(false)
                return
            }

            // Create new empty conversation in DB via an API call
            // We reuse the sync or create endpoint logic, but we'll simulate sending a silent empty message 
            // OR ideally your backend should have a direct createConv endpoint. 
            // For now, we manually build it in the list and send the first message to register it.

            // Actually, we need to add a real API endpoint for creating a blank conversation.
            // Let's call the hidden POST /conversations endpoint:
            const res = await apiClient.post('/inbox/conversations', {
                bot_id: newChatBotId,
                contact_number: jid,
                contact_name: cleanPhone
            })

            await fetchConversations()
            setActiveConvId(res.data.id || res.data.data?.id)
            setIsNewChatModalOpen(false)
            setNewChatPhone('')

        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal membuat chat baru')
        } finally {
            setIsCreatingChat(false)
        }
    }

    const fetchMessages = async (id: string, offset: number = 0, isInitial: boolean = false) => {
        if (isInitial) setIsLoadingMsgs(true)
        else setIsLoadingMore(true)

        // Save current scroll height before loading more
        if (!isInitial && messagesContainerRef.current) {
            prevScrollHeightRef.current = messagesContainerRef.current.scrollHeight
        }

        try {
            const res = await api.inbox.getMessages(id, MESSAGES_PER_PAGE, offset)
            const fetched: Message[] = res.data.data || []

            if (isInitial) {
                setMessages(fetched)
                setMsgOffset(fetched.length)
                setHasMoreMessages(fetched.length === MESSAGES_PER_PAGE)
                // scroll to bottom
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' }), 50)
            } else {
                // Prepend older messages and maintain scroll position
                setMessages(prev => [...fetched, ...prev])
                setMsgOffset(prev => prev + fetched.length)
                setHasMoreMessages(fetched.length === MESSAGES_PER_PAGE)

                // Restore scroll position after prepend
                requestAnimationFrame(() => {
                    if (messagesContainerRef.current) {
                        const newScrollHeight = messagesContainerRef.current.scrollHeight
                        messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current
                    }
                })
            }

            // mark as read
            setConversations(prev => prev.map(c => c.id === id ? { ...c, unread_count: 0 } : c))
        } catch {
            toast.error('Gagal memuat pesan')
        } finally {
            setIsLoadingMsgs(false)
            setIsLoadingMore(false)
        }
    }

    const handleLoadMore = () => {
        if (!activeConvId || isLoadingMore) return
        fetchMessages(activeConvId, msgOffset, false)
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (pendingAttachment) { await handleSendMedia(); return }
        if (!inputText.trim() || !activeConvId) return

        setIsSending(true)
        setShowEmojiPicker(false)
        const content = inputText.trim()
        setInputText('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'

        try {
            const res = await api.inbox.sendMessage(activeConvId, content)
            const newMsg = res.data.data
            setMessages(prev => [...prev, newMsg])
            setConversations(prev => prev.map(c =>
                c.id === activeConvId ? { ...c, last_message_content: content, last_message_at: new Date().toISOString() } : c
            ))
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mengirim pesan')
            setInputText(content)
        } finally {
            setIsSending(false)
        }
    }

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeConvId) return
        if (file.size > 64 * 1024 * 1024) { toast.error('File terlalu besar (maks 64 MB)'); return }
        const type = getFileType(file)
        const previewUrl = type === 'image' ? URL.createObjectURL(file) : undefined
        setPendingAttachment({ file, previewUrl, name: file.name, type, size: file.size })
        e.target.value = ''
    }

    const handleSendMedia = async () => {
        if (!pendingAttachment || !activeConvId) return
        setIsSendingMedia(true)
        const attachment = pendingAttachment
        const caption = inputText.trim()
        setInputText('')
        setPendingAttachment(null)
        if (textareaRef.current) textareaRef.current.style.height = 'auto'

        try {
            const res = await api.inbox.sendMedia(activeConvId, attachment.file, caption || undefined)
            const newMsg = res.data.data
            setMessages(prev => [...prev, newMsg])
            const preview = caption || `[${attachment.type}: ${attachment.name}]`
            setConversations(prev => prev.map(c =>
                c.id === activeConvId ? { ...c, last_message_content: preview, last_message_at: new Date().toISOString() } : c
            ))
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
            toast.success('File terkirim!')
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Gagal mengirim file')
            setPendingAttachment(attachment)
            setInputText(caption)
        } finally {
            setIsSendingMedia(false)
            if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
        }
    }

    const cancelAttachment = () => {
        if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl)
        setPendingAttachment(null)
    }

    const handleUpdateStatus = async (status: 'open' | 'closed' | 'resolved') => {
        if (!activeConvId) return
        try {
            await api.inbox.updateStatus(activeConvId, status)
            setConversations(prev => prev.map(c => c.id === activeConvId ? { ...c, status } : c))
            toast.success(`Ditandai ${status}`)
            if (filterStatus !== 'all' && filterStatus !== status) setActiveConvId(null)
        } catch {
            toast.error('Gagal update status')
        }
    }

    const isMediaMessage = (msg: Message) => {
        const t = msg.media_meta?.message_type || msg.message_type
        return t && ['image', 'video', 'audio', 'document'].includes(t)
    }

    // Avatar initials
    const initials = (name?: string, fallback?: string) =>
        (name || fallback || '??').substring(0, 2).toUpperCase()

    return (
        // Full-height, full-width — layout.tsx already handles stripping padding for inbox
        <div className="flex flex-1 min-h-0 border-t border-zinc-200 dark:border-zinc-800">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                onChange={handleFileSelected}
            />

            {/* ─── LEFT PANE: Conversation List ─── */}
            <div className="w-[300px] xl:w-[340px] flex flex-col min-h-0 border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 bg-white dark:bg-zinc-950">

                {/* Header with Bot Selector */}
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    {/* Bot Selector */}
                    <div className="relative mb-3">
                        <button
                            onClick={() => setShowBotDropdown(!showBotDropdown)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <Bot className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                                <span className="font-medium text-zinc-900 dark:text-white truncate">
                                    {selectedBotId === 'all'
                                        ? 'Semua Bot'
                                        : bots.find(b => b.id === selectedBotId)?.name || 'Pilih Bot'
                                    }
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                {selectedBotId !== 'all' && (() => {
                                    const bot = bots.find(b => b.id === selectedBotId)
                                    return bot ? (
                                        <span className={cn("w-1.5 h-1.5 rounded-full", bot.status === 'connected' ? 'bg-emerald-500' : 'bg-zinc-400')} />
                                    ) : null
                                })()}
                                <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", showBotDropdown && "rotate-180")} />
                            </div>
                        </button>

                        {showBotDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg z-50 rounded overflow-hidden">
                                <button
                                    onClick={() => { setSelectedBotId('all'); setShowBotDropdown(false) }}
                                    className={cn(
                                        "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors",
                                        selectedBotId === 'all' && "bg-primary/5 text-primary font-medium"
                                    )}
                                >
                                    <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Semua Bot</span>
                                </button>
                                {bots.map(bot => (
                                    <button
                                        key={bot.id}
                                        onClick={() => { setSelectedBotId(bot.id); setShowBotDropdown(false) }}
                                        className={cn(
                                            "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors",
                                            selectedBotId === bot.id && "bg-primary/5 text-primary font-medium"
                                        )}
                                    >
                                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", bot.status === 'connected' ? 'bg-emerald-500' : 'bg-zinc-300')} />
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="truncate font-medium">{bot.name}</span>
                                            {bot.phone_number && (
                                                <span className="text-[11px] text-zinc-400 font-normal">{bot.phone_number}</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Title + action buttons */}
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <MessageCircle className="w-3.5 h-3.5 text-primary" />
                            Live Chat
                        </h2>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors disabled:opacity-50"
                                title="Sync semua chat dari WhatsApp"
                            >
                                <DownloadCloud className={cn("w-3.5 h-3.5", isSyncing && "animate-pulse text-emerald-500")} />
                            </button>
                            <button
                                onClick={fetchConversations}
                                className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                title="Refresh daftar chat"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isLoadingConvs && "animate-spin")} />
                            </button>
                        </div>
                    </div>

                    {/* Search & Add */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 rounded"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setIsNewChatModalOpen(true)
                                if (selectedBotId !== 'all') setNewChatBotId(selectedBotId)
                                else if (bots.length > 0) setNewChatBotId(bots[0].id)
                            }}
                            className="w-9 h-9 flex items-center justify-center bg-primary hover:bg-primary/90 text-white rounded flex-shrink-0 transition-colors"
                            title="Pesan Baru"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex mt-3 gap-1">
                        {[
                            { label: 'Aktif', value: 'open' },
                            { label: 'Selesai', value: 'resolved' },
                            { label: 'Semua', value: 'all' },
                        ].map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => setFilterStatus(tab.value)}
                                className={cn(
                                    "flex-1 text-xs py-1.5 font-medium transition-colors rounded",
                                    filterStatus === tab.value
                                        ? "bg-primary text-white"
                                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation count */}
                {!isLoadingConvs && filteredConversations.length > 0 && (
                    <div className="px-5 py-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800/50">
                        {filteredConversations.length} percakapan
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {isLoadingConvs ? (
                        <div className="p-4 space-y-3">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                                        <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800/50 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                            <p className="text-sm text-zinc-400 dark:text-zinc-500">
                                {searchQuery ? 'Tidak ada hasil' : 'Belum ada percakapan'}
                            </p>
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const isActive = activeConvId === conv.id
                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => setActiveConvId(conv.id)}
                                    className={cn(
                                        "flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800/50",
                                        isActive
                                            ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary"
                                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900 border-l-2 border-l-transparent"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 text-white",
                                        isActive ? "bg-primary" : "bg-zinc-400 dark:bg-zinc-600"
                                    )}>
                                        {initials(conv.contact_name, conv.contact_number)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className={cn(
                                                "text-sm truncate font-medium",
                                                conv.unread_count > 0 ? "font-semibold text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                                            )}>
                                                {conv.contact_name || formatJid(conv.contact_number)}
                                            </span>
                                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap ml-2">
                                                {formatDate(conv.last_message_at)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5 gap-2">
                                            <p className={cn(
                                                "text-xs truncate",
                                                conv.unread_count > 0 ? "text-zinc-600 dark:text-zinc-400" : "text-zinc-400 dark:text-zinc-500"
                                            )}>
                                                {conv.last_message_content || '—'}
                                            </p>
                                            {conv.unread_count > 0 && (
                                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 mt-1 opacity-60">
                                            <Bot className="w-2.5 h-2.5 text-zinc-400" />
                                            <span className="text-[10px] text-zinc-400 truncate">{conv.bot_name}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ─── RIGHT PANE: Chat Area ─── */}
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-950 min-w-0">
                {activeConvId && activeConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-6 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-zinc-950">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-white">
                                    {initials(activeConv.contact_name, activeConv.contact_number)}
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
                                        {activeConv.contact_name || formatJid(activeConv.contact_number)}
                                    </h3>
                                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                                        <span>{formatJid(activeConv.contact_number)}</span>
                                        {selectedBotId === 'all' && (
                                            <><span className="text-zinc-300 dark:text-zinc-700">·</span>
                                                <span>{activeConv.bot_name}</span></>
                                        )}
                                        <span className={cn(
                                            "ml-1 px-1.5 py-px rounded text-[10px] font-medium",
                                            activeConv.status === 'open' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                activeConv.status === 'resolved' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                                    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                        )}>
                                            {activeConv.status === 'open' ? 'Aktif' : activeConv.status === 'resolved' ? 'Selesai' : 'Ditutup'}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {activeConv.status !== 'resolved' && (
                                    <button
                                        onClick={() => handleUpdateStatus('resolved')}
                                        className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded transition-colors border border-emerald-200 dark:border-emerald-800"
                                    >
                                        <CheckSquare className="w-3.5 h-3.5" />
                                        Resolve
                                    </button>
                                )}
                                {activeConv.status === 'resolved' && (
                                    <button
                                        onClick={() => handleUpdateStatus('open')}
                                        className="flex items-center gap-1.5 text-xs font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 px-3 py-1.5 rounded transition-colors"
                                    >
                                        Buka Kembali
                                    </button>
                                )}
                                <button className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={messagesContainerRef}
                            className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-[#0d1117]"
                        >
                            {/* Load More Button */}
                            {hasMoreMessages && (
                                <div className="flex justify-center pt-4 pb-1">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={isLoadingMore}
                                        className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-primary dark:hover:text-primary transition-colors bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded"
                                    >
                                        {isLoadingMore ? (
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <ChevronDown className="w-3 h-3 rotate-180" />
                                        )}
                                        {isLoadingMore ? 'Memuat...' : 'Muat pesan lebih lama'}
                                    </button>
                                </div>
                            )}

                            {isLoadingMsgs ? (
                                <div className="flex justify-center items-center h-full">
                                    <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col justify-center items-center h-full gap-2 opacity-40">
                                    <MessageCircle className="w-10 h-10 text-zinc-400" />
                                    <p className="text-sm text-zinc-500">Belum ada pesan</p>
                                </div>
                            ) : (
                                <div className="px-6 py-4 space-y-1">
                                    {messages.map((msg, idx) => {
                                        const isOwn = msg.sender_type === 'agent' || msg.sender_type === 'bot'
                                        const isBotMsg = msg.sender_type === 'bot'
                                        const isContact = msg.sender_type === 'contact'

                                        // Date separator
                                        const prevMsg = messages[idx - 1]
                                        const showDate = idx === 0 || (
                                            prevMsg &&
                                            new Date(prevMsg.created_at).toDateString() !== new Date(msg.created_at).toDateString()
                                        )
                                        // Group consecutive messages
                                        const nextMsg = messages[idx + 1]
                                        const isSameGroupAsPrev = idx > 0 && prevMsg?.sender_type === msg.sender_type &&
                                            !showDate
                                        const isLastInGroup = !nextMsg || nextMsg.sender_type !== msg.sender_type

                                        const media = isMediaMessage(msg)
                                        const msgTime = format(new Date(msg.created_at), 'HH:mm')

                                        return (
                                            <div key={msg.id}>
                                                {/* Date label */}
                                                {showDate && (
                                                    <div className="flex justify-center my-4">
                                                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1 rounded font-medium">
                                                            {formatDateLabel(msg.created_at)}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className={cn(
                                                    "flex items-end gap-2 mb-0.5",
                                                    isOwn ? "flex-row-reverse" : "flex-row",
                                                    isSameGroupAsPrev ? "mt-0.5" : "mt-3"
                                                )}>
                                                    {/* Avatar - only show for last message in group */}
                                                    {!isOwn && (
                                                        <div className={cn(
                                                            "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold text-white",
                                                            isLastInGroup ? "bg-zinc-400 dark:bg-zinc-600 opacity-100" : "opacity-0"
                                                        )}>
                                                            {initials(msg.sender_name, activeConv.contact_name)}
                                                        </div>
                                                    )}

                                                    {/* Bubble */}
                                                    <div className={cn(
                                                        "max-w-[65%] flex flex-col",
                                                        isOwn ? "items-end" : "items-start"
                                                    )}>
                                                        {/* Sender name (group) */}
                                                        {!isOwn && !isSameGroupAsPrev && msg.sender_name && msg.sender_name !== activeConv.contact_name && (
                                                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5 ml-1">
                                                                {msg.sender_name}
                                                            </span>
                                                        )}

                                                        {/* Bot label */}
                                                        {isBotMsg && !isSameGroupAsPrev && (
                                                            <span className="text-[10px] text-zinc-400 mb-0.5 flex items-center gap-1 mr-1">
                                                                <Bot className="w-2.5 h-2.5" /> Auto-Reply
                                                            </span>
                                                        )}

                                                        <div className={cn(
                                                            "px-3 py-2 text-sm",
                                                            isOwn
                                                                ? "bg-primary text-white"
                                                                : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700",
                                                            // corners
                                                            isOwn ? [
                                                                "rounded-l-xl",
                                                                isSameGroupAsPrev ? "rounded-tr-xl" : "rounded-tr-sm",
                                                                isLastInGroup ? "rounded-br-xl" : "rounded-br-xl"
                                                            ] : [
                                                                "rounded-r-xl",
                                                                isSameGroupAsPrev ? "rounded-tl-xl" : "rounded-tl-sm",
                                                                isLastInGroup ? "rounded-bl-xl" : "rounded-bl-xl"
                                                            ],
                                                        )}>
                                                            {media ? (
                                                                <MediaBubble
                                                                    content={msg.content}
                                                                    messageType={msg.message_type}
                                                                    mediaMeta={msg.media_meta}
                                                                />
                                                            ) : (
                                                                <span className="whitespace-pre-wrap break-words leading-relaxed">
                                                                    {msg.content}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Time + status */}
                                                        {isLastInGroup && (
                                                            <div className={cn(
                                                                "flex items-center gap-1 mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500",
                                                                isOwn ? "flex-row-reverse" : "flex-row"
                                                            )}>
                                                                <span>{msgTime}</span>
                                                                {isOwn && (
                                                                    <CheckCheck className={cn(
                                                                        "w-3 h-3",
                                                                        msg.status === 'read' ? "text-sky-500" : "text-zinc-400"
                                                                    )} />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        {activeConv.status !== 'closed' ? (
                            <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-shrink-0">
                                {/* Attachment preview */}
                                {pendingAttachment && (
                                    <div className="px-4 pt-3 pb-0">
                                        <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded">
                                            {pendingAttachment.type === 'image' && pendingAttachment.previewUrl ? (
                                                <div className="w-12 h-12 rounded overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex-shrink-0">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={pendingAttachment.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                                    {pendingAttachment.type === 'video' && <Video className="w-5 h-5 text-zinc-500" />}
                                                    {pendingAttachment.type === 'audio' && <Music className="w-5 h-5 text-zinc-500" />}
                                                    {pendingAttachment.type === 'document' && <FileText className="w-5 h-5 text-zinc-500" />}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate text-zinc-800 dark:text-zinc-200">{pendingAttachment.name}</p>
                                                <p className="text-xs text-zinc-400">{formatBytes(pendingAttachment.size)}</p>
                                            </div>
                                            <button onClick={cancelAttachment} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-600 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSendMessage} className="px-4 py-3 flex items-end gap-2 relative">
                                    <div className="flex bg-transparent">
                                        <button
                                            type="button"
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
                                            title="Pilih emoji"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
                                            title="Kirim file"
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {showEmojiPicker && (
                                        <div className="absolute bottom-16 left-4 z-50 shadow-xl border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                            <EmojiPicker
                                                onEmojiClick={(emojiData) => {
                                                    setInputText(prev => prev + emojiData.emoji)
                                                    if (textareaRef.current) textareaRef.current.focus()
                                                }}
                                                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light' as any}
                                            />
                                        </div>
                                    )}

                                    <div className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 focus-within:border-primary dark:focus-within:border-primary transition-colors flex items-end">
                                        <textarea
                                            ref={textareaRef}
                                            rows={1}
                                            placeholder={pendingAttachment ? "Caption (opsional)..." : "Type a message"}
                                            value={inputText}
                                            onChange={e => {
                                                setInputText(e.target.value)
                                                e.target.style.height = 'auto'
                                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault()
                                                    handleSendMessage(e as any)
                                                }
                                            }}
                                            className="w-full max-h-[120px] bg-transparent resize-none outline-none py-2.5 px-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSending || isSendingMedia || (!inputText.trim() && !pendingAttachment)}
                                        className="p-2.5 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                                    >
                                        {(isSending || isSendingMedia)
                                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                                            : <Send className="w-4 h-4" />
                                        }
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-center">
                                <p className="text-sm text-zinc-400">Percakapan ini ditutup.</p>
                                <button onClick={() => handleUpdateStatus('open')} className="mt-1 text-sm text-primary hover:underline">
                                    Buka kembali
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#0d1117] gap-3 opacity-50">
                        <MessageCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
                        <div className="text-center">
                            <p className="font-medium text-zinc-500 dark:text-zinc-400">Pilih percakapan</p>
                            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Klik chat di kiri untuk memulai</p>
                        </div>
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            {isNewChatModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg w-full max-w-sm shadow-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                            <h3 className="font-semibold text-sm">Pesan Baru</h3>
                            <button onClick={() => setIsNewChatModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Pilih Bot Pengirim</label>
                                <select
                                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-2 outline-none"
                                    value={newChatBotId}
                                    onChange={e => setNewChatBotId(e.target.value)}
                                >
                                    <option value="" disabled>Pilih bot...</option>
                                    {bots.filter(b => b.status === 'connected').map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.phone_number})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Nomor Tujuan (Kode Negara, misal: 628...)</label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="6281234567890"
                                        value={newChatPhone}
                                        onChange={e => setNewChatPhone(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 pt-0 flex justify-end gap-2">
                            <button
                                onClick={() => setIsNewChatModalOpen(false)}
                                className="px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleCreateNewChat}
                                disabled={isCreatingChat || !newChatPhone || !newChatBotId}
                                className="px-3 py-1.5 text-sm bg-primary hover:bg-primary/90 text-white rounded transition-colors disabled:opacity-50"
                            >
                                {isCreatingChat ? 'Membuka...' : 'Mulai Chat'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
