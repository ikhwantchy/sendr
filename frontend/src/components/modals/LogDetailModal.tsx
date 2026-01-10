'use client'

import { X, MessageSquare, Clock, Activity, Zap, Megaphone, Bot, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LogDetailModalProps {
    isOpen: boolean
    onClose: () => void
    log: any | null
}

export default function LogDetailModal({
    isOpen,
    onClose,
    log
}: LogDetailModalProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!isVisible || !log) return null

    // Determine header color/icon based on type
    const getHeaderStyle = (type: string) => {
        switch (type) {
            case 'message': return { icon: <MessageSquare size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
            case 'bot': return { icon: <Bot size={20} />, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
            case 'error': return { icon: <Activity size={20} />, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' }
            case 'rule': return { icon: <Zap size={20} />, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
            case 'campaign': return { icon: <Megaphone size={20} />, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' }
            default: return { icon: <Activity size={20} />, color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700' }
        }
    }

    const style = getHeaderStyle(log.type)

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`
                relative w-full max-w-2xl mx-4 
                bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl 
                transform transition-all duration-300 flex flex-col max-h-[85vh]
                ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
            `}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${style.bg} ${style.color}`}>
                            {style.icon}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-100 capitalize">
                                {log.type} Details
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                                <Clock size={12} />
                                {new Date(log.timestamp).toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-300 p-2 rounded-full hover:bg-zinc-800/50 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        {/* Deleted Warning */}
                        {log.is_deleted && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                                <div className="p-1.5 bg-red-500/20 rounded-full">
                                    <Activity size={16} className="text-red-500" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-red-400">Message Deleted</h4>
                                    <p className="text-xs text-red-500/80">This message was deleted by the sender.</p>
                                </div>
                            </div>
                        )}

                        {/* Message Content */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Message Content
                            </label>
                            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                                <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans text-sm">
                                    {log.message}
                                </p>
                            </div>
                        </div>

                        {/* Metadata if needed */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                                <span className="text-xs text-zinc-500 block mb-1">Log ID</span>
                                <code className="text-xs text-zinc-400 font-mono">{log.id}</code>
                            </div>
                            <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                                <span className="text-xs text-zinc-500 block mb-1">Type</span>
                                <code className="text-xs text-zinc-400 font-mono capitalize">{log.type}</code>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 rounded-b-2xl flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-zinc-100 hover:bg-white text-black font-medium rounded-lg text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
