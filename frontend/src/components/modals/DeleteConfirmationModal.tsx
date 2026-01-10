'use client'

import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface DeleteConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title?: string
    message?: string
    isDeleting?: boolean
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Delete Rule',
    message = 'Are you sure you want to delete this rule? This action cannot be undone.',
    isDeleting = false
}: DeleteConfirmationModalProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true)
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300)
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!isVisible) return null

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`
                relative w-full max-w-md mx-4 
                bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl 
                transform transition-all duration-300 
                ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
            `}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800/50 transition-all"
                >
                    <X size={20} />
                </button>

                <div className="p-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center ring-1 ring-red-500/20">
                            <Trash2 size={24} className="text-red-500" />
                        </div>

                        {/* Text */}
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-zinc-100">{title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                {message}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 w-full mt-4">
                            <button
                                onClick={onClose}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl font-medium transition-all text-sm disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium shadow-lg shadow-red-900/20 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
