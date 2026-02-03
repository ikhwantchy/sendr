'use client'

import { Minus, Plus } from 'lucide-react'

interface StyledNumberInputProps {
    value: number
    onChange: (value: number) => void
    min?: number
    max?: number
    step?: number
    label?: string
    suffix?: string
    className?: string
}

export default function StyledNumberInput({
    value,
    onChange,
    min = 0,
    max = 9999,
    step = 1,
    label,
    suffix,
    className = ''
}: StyledNumberInputProps) {
    const handleDecrement = () => {
        const newValue = Math.max(min, value - step)
        onChange(newValue)
    }

    const handleIncrement = () => {
        const newValue = Math.min(max, value + step)
        onChange(newValue)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, '')
        if (rawValue === '') {
            onChange(min)
            return
        }
        const numValue = parseInt(rawValue, 10)
        if (!isNaN(numValue)) {
            onChange(Math.max(min, Math.min(max, numValue)))
        }
    }

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                    {label}
                </label>
            )}
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
                {/* Decrement Button */}
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={value <= min}
                    className="w-9 h-9 flex items-center justify-center text-blue-400 hover:bg-zinc-800 disabled:text-zinc-700 disabled:hover:bg-transparent transition-colors shrink-0"
                >
                    <Minus size={14} />
                </button>

                {/* Input Field */}
                <div className="flex-1 flex items-center justify-center">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={value}
                        onChange={handleInputChange}
                        className="w-full text-center bg-transparent text-white text-xs font-semibold outline-none py-2"
                    />
                    {suffix && (
                        <span className="text-zinc-500 text-xs font-medium pr-2">{suffix}</span>
                    )}
                </div>

                {/* Increment Button */}
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={value >= max}
                    className="w-9 h-9 flex items-center justify-center text-blue-400 hover:bg-zinc-800 disabled:text-zinc-700 disabled:hover:bg-transparent transition-colors shrink-0"
                >
                    <Plus size={14} />
                </button>
            </div>
        </div>
    )
}
