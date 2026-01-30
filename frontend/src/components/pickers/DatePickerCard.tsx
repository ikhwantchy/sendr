'use client'

import { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface DatePickerCardProps {
    value: string // YYYY-MM-DD format
    onChange: (date: string) => void
    minDate?: string // YYYY-MM-DD format
    label?: string
}

export default function DatePickerCard({ 
    value, 
    onChange, 
    minDate,
    label
}: DatePickerCardProps) {
    const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date()
        const [year, month, day] = dateStr.split('-').map(Number)
        return new Date(year, month - 1, day)
    }

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-CA') // Returns YYYY-MM-DD
    }

    const [selectedDate, setSelectedDate] = useState<Date>(parseDate(value))
    const [calendarMonth, setCalendarMonth] = useState<Date>(parseDate(value))
    const [showCalendarPopup, setShowCalendarPopup] = useState(false)

    // Sync with external value changes
    useEffect(() => {
        if (value) {
            const newDate = parseDate(value)
            setSelectedDate(newDate)
            setCalendarMonth(newDate)
        }
    }, [value])

    const handleDateSelect = (day: number) => {
        const newDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
        setSelectedDate(newDate)
        onChange(formatDate(newDate))
        setShowCalendarPopup(false)
    }

    const isPastDate = (day: number) => {
        if (!minDate) return false
        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
        const minDateObj = parseDate(minDate)
        const minDateOnly = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), minDateObj.getDate())
        return date < minDateOnly
    }

    const isSelected = (day: number) => {
        return day === selectedDate.getDate() &&
            calendarMonth.getMonth() === selectedDate.getMonth() &&
            calendarMonth.getFullYear() === selectedDate.getFullYear()
    }

    const isToday = (day: number) => {
        const today = new Date()
        return day === today.getDate() &&
            calendarMonth.getMonth() === today.getMonth() &&
            calendarMonth.getFullYear() === today.getFullYear()
    }

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-xs font-medium text-zinc-400 uppercase">{label}</label>
            )}
            
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowCalendarPopup(!showCalendarPopup)}
                    className={`flex items-center gap-2 p-3 bg-zinc-900 border rounded-lg hover:border-blue-500/50 transition-all text-left w-full ${showCalendarPopup ? 'border-blue-500' : 'border-zinc-800'}`}
                >
                    <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-zinc-500 uppercase">Date</p>
                        <p className="text-sm text-white font-medium truncate">
                            {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </button>
                
                {/* Calendar Popup */}
                {showCalendarPopup && (
                    <div className="absolute top-full left-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-4 w-72 z-50">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-medium text-white">
                                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="text-center text-xs text-zinc-500 font-medium py-1">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                            {(() => {
                                const year = calendarMonth.getFullYear()
                                const month = calendarMonth.getMonth()
                                const firstDay = new Date(year, month, 1).getDay()
                                const daysInMonth = new Date(year, month + 1, 0).getDate()
                                const days = []

                                for (let i = 0; i < firstDay; i++) {
                                    days.push(<div key={`empty-${i}`} className="h-8" />)
                                }

                                for (let day = 1; day <= daysInMonth; day++) {
                                    const disabled = isPastDate(day)
                                    const selected = isSelected(day)
                                    const today = isToday(day)

                                    days.push(
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => !disabled && handleDateSelect(day)}
                                            disabled={disabled}
                                            className={`h-8 w-full rounded-lg text-sm font-medium transition-all ${
                                                disabled
                                                    ? 'text-zinc-700 cursor-not-allowed'
                                                    : selected 
                                                        ? 'bg-blue-500 text-white' 
                                                        : today
                                                            ? 'bg-zinc-800 text-white'
                                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    )
                                }

                                return days
                            })()}
                        </div>
                    </div>
                )}

                {/* Click outside to close */}
                {showCalendarPopup && (
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowCalendarPopup(false)}
                    />
                )}
            </div>
        </div>
    )
}
