'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Bold, Italic, Smile, ArrowLeft, Maximize2, Minimize2
} from 'lucide-react'
import { EMOJI_CATEGORIES } from '@/lib/emojiList'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    'Smileys': <Smile size={18} />,
    // We can rely on just passing the key or a simple icon if imports are heavy. 
    // Re-using the icons from CreateCampaignWizard might require importing many icons.
    // Let's keep it simple or copy the map.
}

// Full icon set for emojis
import {
    Hand, Cat, Coffee, Dumbbell, Car, Lightbulb, Heart
} from 'lucide-react'

const EMOJI_ICONS: Record<string, React.ReactNode> = {
    'Smileys': <Smile size={18} />,
    'Gestures & People': <Hand size={18} />,
    'Animals & Nature': <Cat size={18} />,
    'Food & Drink': <Coffee size={18} />,
    'Activity': <Dumbbell size={18} />,
    'Objects': <Lightbulb size={18} />,
    'Travel & Places': <Car size={18} />,
    'Symbols': <Heart size={18} />,
}

const htmlToMarkdown = (element: HTMLElement, activeStyles: any = {}): string => {
    let markdown = '';
    if (!element) return '';
    for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            markdown += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tagName = el.tagName.toLowerCase();
            const styles = window.getComputedStyle(el);
            const isBold = tagName === 'b' || tagName === 'strong' || parseInt(styles.fontWeight) >= 600;
            const isItalic = tagName === 'i' || tagName === 'em' || styles.fontStyle === 'italic';
            const isStrike = tagName === 's' || tagName === 'strike' || styles.textDecoration.includes('line-through');
            const isCode = tagName === 'code';
            let content = htmlToMarkdown(el, {
                bold: activeStyles.bold || isBold,
                italic: activeStyles.italic || isItalic,
                strike: activeStyles.strike || isStrike,
                code: activeStyles.code || isCode
            });
            if (isBold && !activeStyles.bold) content = `*${content}*`;
            if (isItalic && !activeStyles.italic) content = `_${content}_`;
            if (isStrike && !activeStyles.strike) content = `~${content}~`;
            if (isCode && !activeStyles.code) content = `\`\`\`${content}\`\`\``;
            if (tagName === 'div') markdown += (markdown ? '\n' : '') + content;
            else if (tagName === 'br') markdown += '\n';
            else markdown += content;
        }
    }
    return markdown.replace(/\n{3,}/g, '\n\n').trim();
}

const markdownToHtml = (text: string) => {
    if (!text) return '';
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/\*([^\*]+)\*/g, '<b>$1</b>');
    html = html.replace(/_([^_]+)_/g, '<i>$1</i>');
    html = html.replace(/~([^~]+)~/g, '<s>$1</s>');
    html = html.replace(/```([^`]+)```/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>');
    html = html.replace(/\n/g, '<br>');
    return html;
}

export const formatWhatsAppText = (text: string) => {
    if (!text) return ''
    let formatted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>')
    formatted = formatted.replace(/~([^~]+)~/g, '<s>$1</s>')
    formatted = formatted.replace(/```([^`]+)```/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace;">$1</code>')
    formatted = formatted.replace(/\n/g, '<br>')
    return formatted
}

interface SharedMessageEditorProps {
    value: string
    onChange: (value: string) => void
    variables?: string[] // Optional
    isExpanded: boolean
    onToggleExpand: () => void
    placeholder?: string
    variableWrapper?: [string, string]
    extraToolbarItems?: React.ReactNode
}

export default function SharedMessageEditor({
    value, onChange, variables = [], isExpanded, onToggleExpand, placeholder,
    variableWrapper = ['[', ']'],
    extraToolbarItems
}: SharedMessageEditorProps) {
    const textareaRef = useRef<HTMLDivElement>(null)
    const emojiTriggerRef = useRef<HTMLButtonElement>(null)
    const emojiPickerRef = useRef<HTMLDivElement>(null)
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
    const [activeEmojiCategory, setActiveEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys')
    const isTypingRef = useRef(false)

    // Sync content
    useEffect(() => {
        if (textareaRef.current && !isTypingRef.current) {
            const currentMD = htmlToMarkdown(textareaRef.current)
            if (currentMD !== value) {
                textareaRef.current.innerHTML = markdownToHtml(value)
            }
        }
    }, [value])

    // Init content
    useEffect(() => {
        if (textareaRef.current && !textareaRef.current.innerHTML) {
            textareaRef.current.innerHTML = markdownToHtml(value) || '<br>'
        }
    }, [])

    const handleInput = () => {
        if (!textareaRef.current) return
        isTypingRef.current = true
        const md = htmlToMarkdown(textareaRef.current)
        onChange(md)
        setTimeout(() => { isTypingRef.current = false }, 100)
    }

    const execCommand = (command: string) => {
        if (!textareaRef.current) return
        textareaRef.current.focus()
        document.execCommand(command, false)
        handleInput()
    }

    const insertText = (str: string) => {
        if (!textareaRef.current) return
        textareaRef.current.focus()
        document.execCommand('insertText', false, str)
        handleInput()
    }

    // Handle paste to preserve newlines
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault()
        const text = e.clipboardData.getData('text/plain')
        if (!text) return
        
        // Insert plain text with newlines preserved
        const selection = window.getSelection()
        if (!selection || !selection.rangeCount) return
        
        const range = selection.getRangeAt(0)
        range.deleteContents()
        
        // Split by newlines and insert with <br> tags
        const lines = text.split('\n')
        const fragment = document.createDocumentFragment()
        
        lines.forEach((line, index) => {
            fragment.appendChild(document.createTextNode(line))
            if (index < lines.length - 1) {
                fragment.appendChild(document.createElement('br'))
            }
        })
        
        range.insertNode(fragment)
        
        // Move cursor to end
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
        
        handleInput()
    }

    // Emoji outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) &&
                emojiTriggerRef.current && !emojiTriggerRef.current.contains(event.target as Node)) {
                setIsEmojiPickerOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={`border rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-blue-600/50 transition-all ${isExpanded ? 'w-full h-full bg-zinc-900 border-zinc-700 shadow-2xl flex flex-col' : 'bg-zinc-800 border-zinc-700'}`}>
            {isExpanded && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={onToggleExpand} className="text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-base font-bold text-white">Message Content</h2>
                            <p className="text-xs text-zinc-500">{placeholder || 'Draft your message'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onToggleExpand}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                    >
                        Done
                    </button>
                </div>
            )}

            <div className="bg-[#18181b] p-2 flex items-center gap-1 border-b border-zinc-800 relative shrink-0">
                <button onClick={() => execCommand('bold')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Bold"><Bold size={14} /></button>
                <button onClick={() => execCommand('italic')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Italic"><Italic size={14} /></button>
                <button onClick={() => insertText('~')} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded" title="Strikethrough"><span className="text-xs font-bold">~</span></button>
                <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
                <button
                    ref={emojiTriggerRef}
                    onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                    className={`p-1.5 rounded transition-all ${isEmojiPickerOpen ? 'text-yellow-400 bg-yellow-400/10' : 'text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800'}`}
                ><Smile size={14} /></button>

                {extraToolbarItems && (
                    <>
                        <div className="w-[1px] h-4 bg-zinc-700 mx-1" />
                        {extraToolbarItems}
                    </>
                )}

                {/* Expand Toggle */}
                <div className="ml-auto w-[1px] h-4 bg-zinc-700 mx-1" />
                <button
                    onClick={onToggleExpand}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                    title={isExpanded ? "Minimize" : "Maximize"}
                >
                    {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>

                {isEmojiPickerOpen && (
                    <div ref={emojiPickerRef} className="absolute left-0 top-full mt-2 z-50 w-80 bg-[#1f2c34] border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-1 overflow-x-auto p-2 bg-[#111b21] border-b border-zinc-700 no-scrollbar">
                            {Object.keys(EMOJI_CATEGORIES).map(cat => (
                                <button key={cat} onClick={() => setActiveEmojiCategory(cat as any)} className={`p-2 rounded-lg flex-shrink-0 transition-colors ${activeEmojiCategory === cat ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:bg-zinc-800'}`}>
                                    {EMOJI_ICONS[cat]}
                                </button>
                            ))}
                        </div>
                        <div className="h-56 overflow-y-auto grid grid-cols-7 p-2 bg-[#111b21] custom-scrollbar">
                            {EMOJI_CATEGORIES[activeEmojiCategory].map(emoji => (
                                <button key={emoji} onClick={() => { insertText(emoji); setIsEmojiPickerOpen(false); }} className="w-9 h-9 flex items-center justify-center text-xl hover:bg-zinc-800 rounded-lg transition-transform active:scale-90">{emoji}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div
                ref={textareaRef}
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                className={`w-full bg-transparent p-3 text-zinc-200 focus:outline-none font-mono text-xs leading-relaxed resize-y overflow-y-auto ${isExpanded ? 'flex-1 h-full' : 'min-h-[200px]'}`}
                spellCheck={false}
            />

            <div className="px-3 py-2 bg-[#18181b] border-t border-zinc-800 flex items-center justify-between gap-2 text-[10px] shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto flex-1 no-scrollbar">
                    {variables.length > 0 && (
                        <>
                            <span className="text-zinc-500 uppercase mr-2 font-bold flex-shrink-0">Variables:</span>
                            {variables.map(v => {
                                const isWrapped = v.startsWith(variableWrapper[0]) || v.startsWith('{')
                                const displayV = isWrapped ? v : `${variableWrapper[0]}${v}${variableWrapper[1]}`
                                return (
                                    <button key={v} onClick={() => insertText(displayV)} className={`px-2 py-1 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 flex-shrink-0 transition-colors whitespace-nowrap ${displayV.toLowerCase().includes('phone') ? 'text-blue-400' : 'text-emerald-400'}`}>
                                        {displayV}
                                    </button>
                                )
                            })}
                        </>
                    )}
                </div>
                <div className="text-zinc-600 font-medium whitespace-nowrap">
                    {value.length} chars
                </div>
            </div>
        </div>
    )
}
