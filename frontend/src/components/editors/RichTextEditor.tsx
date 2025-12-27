'use client'

import { useState, useRef } from 'react'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    maxLength?: number
    showEmojiPicker?: boolean
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Type your message...',
    maxLength = 1000,
    showEmojiPicker = true,
}: RichTextEditorProps) {
    const [showEmoji, setShowEmoji] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const insertFormatting = (before: string, after: string = '') => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end)
        const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)

        onChange(newText)

        // Restore cursor position
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + before.length, end + before.length)
        }, 0)
    }

    const formatButtons = [
        { icon: 'B', label: 'Bold', before: '*', after: '*', style: 'font-bold' },
        { icon: 'I', label: 'Italic', before: '_', after: '_', style: 'italic' },
        { icon: 'S', label: 'Strikethrough', before: '~', after: '~', style: 'line-through' },
        { icon: '`', label: 'Code', before: '```', after: '```', style: 'font-mono' },
    ]

    const quickEmojis = ['😊', '👍', '❤️', '🎉', '🔥', '✅', '⚡', '💡']

    return (
        <div className="space-y-2">
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-white/10">
                {/* Format Buttons */}
                <div className="flex items-center gap-1">
                    {formatButtons.map((btn) => (
                        <button
                            key={btn.label}
                            type="button"
                            onClick={() => insertFormatting(btn.before, btn.after)}
                            className="w-8 h-8 rounded hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white"
                            title={btn.label}
                        >
                            <span className={btn.style}>{btn.icon}</span>
                        </button>
                    ))}
                </div>

                <div className="w-px h-6 bg-white/10" />

                {/* Quick Emojis */}
                {showEmojiPicker && (
                    <>
                        <div className="flex items-center gap-1">
                            {quickEmojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => onChange(value + emoji)}
                                    className="w-8 h-8 rounded hover:bg-white/10 transition-colors flex items-center justify-center text-lg"
                                    title="Add emoji"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowEmoji(!showEmoji)}
                            className="w-8 h-8 rounded hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white"
                            title="More emojis"
                        >
                            😀
                        </button>
                    </>
                )}

                <div className="flex-1" />

                {/* Character Count */}
                <div className="text-xs text-gray-500">
                    {value.length}/{maxLength}
                </div>
            </div>

            {/* Extended Emoji Picker */}
            {showEmoji && showEmojiPicker && (
                <div className="p-4 bg-black/30 rounded-lg border border-white/10 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-2">
                        {[
                            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
                            '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
                            '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
                            '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
                            '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
                            '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
                            '🤢', '🤮', '🤧', '🥵', '🥶', '😵', '🤯', '🤠',
                            '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️',
                            '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
                            '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐',
                            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
                            '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
                            '🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💯',
                            '✅', '❌', '⚠️', '🚫', '💢', '💬', '💭', '🗯',
                        ].map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                    onChange(value + emoji)
                                    setShowEmoji(false)
                                }}
                                className="text-2xl hover:bg-white/10 rounded p-1 transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Text Area */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
                placeholder={placeholder}
                rows={4}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />

            {/* Format Help */}
            <div className="text-xs text-gray-500 space-y-1">
                <div>💡 Formatting: *bold* _italic_ ~strikethrough~ ```code```</div>
            </div>
        </div>
    )
}
