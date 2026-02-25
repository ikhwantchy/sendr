'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateOnlyPickerProps {
    value: string // YYYY-MM-DD format
    onChange: (value: string) => void
    minDate?: Date
    placeholder?: string
}

export default function DateOnlyPicker({
    value,
    onChange,
    minDate = new Date(),
    placeholder = 'Select date'
}: DateOnlyPickerProps) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const datePickerRef = useRef<HTMLDivElement>(null)

    // Parse value to Date
    const selectedDate = value ? new Date(value + 'T00:00:00') : null
    const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date())

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Calendar calculations
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        const pad = (num: number) => String(num).padStart(2, '0')
        const formatted = `${newDate.getFullYear()}-${pad(newDate.getMonth() + 1)}-${pad(newDate.getDate())}`
        onChange(formatted)
        setShowDatePicker(false)
    }

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    const isToday = (day: number) => {
        const today = new Date()
        return day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
    }

    const isSelected = (day: number) => {
        if (!selectedDate) return false
        return day === selectedDate.getDate() &&
            currentMonth.getMonth() === selectedDate.getMonth() &&
            currentMonth.getFullYear() === selectedDate.getFullYear()
    }

    const isPastDate = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 23, 59, 59)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today
    }

    const formatDisplayDate = () => {
        if (!selectedDate) return placeholder
        return selectedDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
    }

    return (
        <div className="relative flex-1" ref={datePickerRef}>
            <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`w-full flex items-center gap-3 px-4 h-[48px] bg-[#0a0a0a] border rounded-xl text-left transition-all hover:border-zinc-700 ${showDatePicker ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-zinc-800'
                    }`}
            >
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                    <Calendar size={15} className="text-zinc-500" />
                </div>
                <div className="flex-1">
                    <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-medium">Expiration Date</div>
                    <div className={`text-[11px] font-semibold ${selectedDate ? 'text-white' : 'text-zinc-500'}`}>{formatDisplayDate()}</div>
                </div>
            </button>

            {/* Date Picker Dropdown - Opens upward to avoid modal overflow */}
            {showDatePicker && (
                <div className="absolute bottom-full left-0 mb-2 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black/50 p-3 w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            onClick={previousMonth}
                            className="w-7 h-7 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="text-white font-semibold text-xs">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </div>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="w-7 h-7 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {dayNames.map(day => (
                            <div key={day} className="text-center text-[10px] font-medium text-zinc-500 py-0.5">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells */}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}

                        {/* Days */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const disabled = isPastDate(day)
                            const selected = isSelected(day)
                            const today = isToday(day)

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => !disabled && handleDateClick(day)}
                                    disabled={disabled}
                                    className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all ${disabled
                                            ? 'text-zinc-700 cursor-not-allowed'
                                            : selected
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                                : today
                                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                                                    : 'text-zinc-300 hover:bg-zinc-800'
                                        }`}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>

                    {/* Clear Button */}
                    <div className="flex justify-between mt-3 pt-2 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={() => {
                                onChange('')
                                setShowDatePicker(false)
                            }}
                            className="px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="px-2 py-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
