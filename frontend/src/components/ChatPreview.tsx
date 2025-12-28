'use client'

import { useEffect, useState } from 'react'

interface ChatPreviewProps {
    message: string
    senderName?: string
    timestamp?: Date
    isLoading?: boolean
}

export default function ChatPreview({
    message,
    senderName = 'WhatsApp Bot',
    timestamp,
    isLoading = false
}: ChatPreviewProps) {
    const [displayTime, setDisplayTime] = useState('')

    useEffect(() => {
        const time = timestamp || new Date()
        setDisplayTime(time.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        }))
    }, [timestamp])

    return (
        <div className="w-full h-full bg-[#0a0e1a] rounded-2xl border border-white/10 overflow-hidden flex flex-col">
            {/* WhatsApp Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-3 flex items-center gap-3 border-b border-white/10">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">{senderName}</h3>
                    <p className="text-white/70 text-xs">Online</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Chat Background Pattern */}
            <div className="flex-1 p-4 overflow-y-auto relative" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundColor: '#0a0e1a'
            }}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-xl backdrop-blur-sm">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-start">
                        <div className="max-w-[85%]">
                            {/* Message Bubble */}
                            <div className="bg-gradient-to-br from-[#005c4b] to-[#004d3f] rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg relative">
                                {/* Message Content */}
                                <div className="text-white text-sm whitespace-pre-wrap break-words">
                                    {message || (
                                        <span className="text-white/50 italic">
                                            Your message preview will appear here...
                                        </span>
                                    )}
                                </div>

                                {/* Timestamp */}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className="text-[10px] text-white/60">{displayTime}</span>
                                    <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                    </svg>
                                    <svg className="w-4 h-4 text-cyan-400 -ml-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                    </svg>
                                </div>

                                {/* Tail */}
                                <div className="absolute -left-2 top-0 w-0 h-0 border-t-[12px] border-t-[#005c4b] border-r-[12px] border-r-transparent"></div>
                            </div>

                            {/* Sender Name (for groups) */}
                            <div className="mt-1 px-2">
                                <span className="text-xs text-gray-500">~{senderName}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area (disabled, just for show) */}
            <div className="bg-[#1a1f2e] px-4 py-3 flex items-center gap-2 border-t border-white/10">
                <button className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
                <div className="flex-1 bg-white/5 rounded-full px-4 py-2 text-sm text-gray-500">
                    Type a message...
                </div>
                <button className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
                <button className="w-10 h-10 bg-cyan-600 hover:bg-cyan-700 flex items-center justify-center rounded-full transition">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
