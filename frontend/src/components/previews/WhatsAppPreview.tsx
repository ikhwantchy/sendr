'use client'

interface WhatsAppPreviewProps {
    message: string
    image?: string
    timestamp?: string
    isOwn?: boolean
}

export default function WhatsAppPreview({
    message,
    image,
    timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    isOwn = false
}: WhatsAppPreviewProps) {
    // Format WhatsApp text (bold, italic, strikethrough, code)
    const formatMessage = (text: string) => {
        if (!text) return ''

        // Bold: *text*
        text = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        // Italic: _text_
        text = text.replace(/_(.*?)_/g, '<em>$1</em>')
        // Strikethrough: ~text~
        text = text.replace(/~(.*?)~/g, '<del>$1</del>')
        // Code: ```text```
        text = text.replace(/```(.*?)```/g, '<code class="bg-gray-700 px-1 rounded">$1</code>')
        // Line breaks
        text = text.replace(/\n/g, '<br/>')

        return text
    }

    return (
        <div className="w-full max-w-md mx-auto">
            {/* WhatsApp Header */}
            <div className="bg-[#075E54] text-white p-3 rounded-t-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-bold">
                    {isOwn ? 'You' : 'Bot'}
                </div>
                <div className="flex-1">
                    <div className="font-semibold">{isOwn ? 'You' : 'WhatsApp Bot'}</div>
                    <div className="text-xs opacity-80">online</div>
                </div>
            </div>

            {/* Chat Background */}
            <div
                className="min-h-[300px] p-4 rounded-b-lg relative overflow-hidden"
                style={{
                    backgroundColor: '#0a1014',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            >
                {/* Message Bubble */}
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div className="max-w-[80%]">
                        {/* Image if provided */}
                        {image && (
                            <div className="mb-1">
                                <img
                                    src={image}
                                    alt="Preview"
                                    className="rounded-lg max-w-full h-auto"
                                />
                            </div>
                        )}

                        {/* Message Bubble */}
                        <div
                            className={`rounded-lg px-3 py-2 ${isOwn
                                    ? 'bg-[#005C4B] text-white'
                                    : 'bg-[#1F2C33] text-white'
                                }`}
                        >
                            <div
                                className="text-sm whitespace-pre-wrap break-words"
                                dangerouslySetInnerHTML={{ __html: formatMessage(message) }}
                            />
                            <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] opacity-60">{timestamp}</span>
                                {isOwn && (
                                    <svg className="w-4 h-4 opacity-60" viewBox="0 0 16 15" fill="currentColor">
                                        <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Label */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                    <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-300">
                        Preview
                    </div>
                </div>
            </div>
        </div>
    )
}
