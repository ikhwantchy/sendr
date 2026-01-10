'use client'

import { useState, useRef, useEffect } from 'react'
import { EMOJI_CATEGORIES } from '@/lib/emojiList'
import {
    Bold, Italic, Strikethrough, Smile,
    Cat, Coffee, Dumbbell, Car, Lightbulb, Heart, Hand
} from 'lucide-react'

interface RichTextEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    maxLength?: number
    showEmojiPicker?: boolean
    minHeight?: string
}

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
        .replace(/\n\n+/g, '\n')
        .replace(/^\n+/, '') // Trim extra leading newline if any
        .trim();
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Type your message...',
    maxLength = 1000,
    showEmojiPicker = true,
    minHeight = '120px'
}: RichTextEditorProps) {
    const [showEmoji, setShowEmoji] = useState(false)
    const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('Smileys')
    const editorRef = useRef<HTMLDivElement>(null)
    const pickerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const isTypingRef = useRef(false)

    // Initial Sync
    useEffect(() => {
        if (editorRef.current && !isTypingRef.current) {
            const currentMD = htmlToMarkdown(editorRef.current);
            // Only update innerHTML if it effectively changes the markdown content
            // to avoid resetting cursor position unnecessarily, though typing handles cursor.
            // But if value changed externally (e.g. loaded from DB), we must sync.
            if (currentMD !== value) {
                editorRef.current.innerHTML = markdownToHtml(value);
            }
        }
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node) &&
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setShowEmoji(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleInput = () => {
        if (!editorRef.current) return;
        isTypingRef.current = true;

        const markdown = htmlToMarkdown(editorRef.current);
        onChange(markdown.slice(0, maxLength));

        // Debounce typing flag reset
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

                // Patterns to check
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

                        // Add suffix (newline or space)
                        const spaceNode = document.createTextNode(e.key === 'Enter' ? '\n' : '\u00A0');
                        updateRange.insertNode(spaceNode);
                        updateRange.setStartAfter(spaceNode);
                        updateRange.setEndAfter(spaceNode);

                        selection.removeAllRanges();
                        selection.addRange(updateRange);

                        document.execCommand('removeFormat'); // Clear formatting for next chars
                        handleInput();
                        return;
                    }
                }
            }
        }
    }

    const execCommand = (command: string, value: string | undefined = undefined) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false, value);
        handleInput();
    }

    const insertEmoji = (emoji: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand('insertText', false, emoji);
        handleInput();
    }

    const formatButtons = [
        { icon: <Bold size={16} />, label: 'Bold', action: () => execCommand('bold') },
        { icon: <Italic size={16} />, label: 'Italic', action: () => execCommand('italic') },
        { icon: <Strikethrough size={16} />, label: 'Strikethrough', action: () => execCommand('strikeThrough') },
    ]

    return (
        <div className="space-y-2 relative border border-zinc-800 rounded-xl bg-zinc-900/50 transition-all focus-within:ring-1 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 group flex flex-col">

            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 bg-transparent border-0 text-white placeholder-zinc-600 focus:outline-none focus:ring-0 resize-y font-normal leading-relaxed custom-scrollbar overflow-y-auto whitespace-pre-wrap outline-none"
                style={{
                    minHeight,
                    maxHeight: '300px'
                }}
                spellCheck={false}
                data-placeholder={placeholder}
            />

            {!value && (
                <div className="absolute top-3 left-4 text-zinc-600 pointer-events-none text-sm select-none">
                    {placeholder}
                </div>
            )}

            <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800/50 bg-zinc-900/30 rounded-b-xl relative select-none">
                <div className="flex items-center gap-3">
                    <div className="flex items-center relative">
                        {showEmojiPicker && (
                            <button
                                ref={triggerRef}
                                type="button"
                                onClick={() => setShowEmoji(!showEmoji)}
                                className={`p-1.5 rounded-lg transition-all active:scale-95 flex items-center gap-2 ${showEmoji
                                        ? 'text-yellow-400 bg-yellow-400/10'
                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                                    }`}
                                title="Insert Emoji"
                            >
                                <Smile size={20} />
                            </button>
                        )}

                        {showEmoji && showEmojiPicker && (
                            <div
                                ref={pickerRef}
                                className="absolute left-0 bottom-[calc(100%+12px)] z-50 w-80 bg-[#1f2c34]/95 backdrop-blur-xl border border-zinc-700/50 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 origin-bottom-left"
                            >
                                <div className="flex bg-[#111b21]/50 p-1.5 gap-1 overflow-x-auto custom-scrollbar border-b border-zinc-700/30 no-scrollbar">
                                    {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setActiveCategory(cat as any)}
                                            className={`p-2 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${activeCategory === cat
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
                                        {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => insertEmoji(emoji)}
                                                className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-[#2a3942] cursor-pointer transition-all hover:scale-110 active:scale-95"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-5 w-px bg-zinc-800" />

                    <div className="flex items-center gap-0.5">
                        {formatButtons.map((btn) => (
                            <button
                                key={btn.label}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    btn.action();
                                }}
                                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-all active:scale-95"
                                title={btn.label}
                            >
                                {btn.icon}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`text-[10px] font-medium tracking-wide ${value.length >= maxLength ? 'text-red-500' : 'text-zinc-600'}`}>
                    {value.length} / {maxLength}
                </div>
            </div>
        </div>
    )
}
