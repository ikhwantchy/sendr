'use client'

import { useState } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'

interface DateTimePickerCardProps {
    value: Date | null
    onChange: (date: Date) => void
    minDate?: Date
    label?: string
}

export default function DateTimePickerCard({ 
    value, 
    onChange, 
    minDate,
    label = 'Select Date & Time'
}: DateTimePickerCardProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(value || new Date())
    const [calendarMonth, setCalendarMonth] = useState<Date>(value || new Date())
    const [showCalendarPopup, setShowCalendarPopup] = useState(false)
    const [showTimePopup, setShowTimePopup] = useState(false)
    const [selectedTime, setSelectedTime] = useState<string>(
        value ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}` : '09:00'
    )

    const handleDateSelect = (day: number) => {
        const newDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
        const [hours, minutes] = selectedTime.split(':').map(Number)
        newDate.setHours(hours, minutes, 0, 0)
        setSelectedDate(newDate)
        onChange(newDate)
        setShowCalendarPopup(false)
    }

    const handleTimeSelect = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number)
        const newDate = new Date(selectedDate)
        newDate.setHours(hours, minutes, 0, 0)
        setSelectedDate(newDate)
        setSelectedTime(time)
        onChange(newDate)
        setShowTimePopup(false)
    }

    const isPastDate = (day: number) => {
        if (!minDate) return false
        const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
        const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
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

    // Generate time slots (every 30 minutes)
    const generateTimeSlots = () => {
        const times = []
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
            }
        }
        return times
    }

    return (
        <div className="space-y-3">
            {label && (
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
            )}
            
            <div className="grid grid-cols-2 gap-3">
                {/* Date Picker Button */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => { setShowCalendarPopup(!showCalendarPopup); setShowTimePopup(false); }}
                        className={`flex items-center gap-2 p-3 bg-zinc-900 border rounded-lg hover:border-blue-500/50 transition-all text-left w-full ${showCalendarPopup ? 'border-blue-500' : 'border-zinc-800'}`}
                    >
                        <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
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
                </div>
                
                {/* Time Picker Button */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => { setShowTimePopup(!showTimePopup); setShowCalendarPopup(false); }}
                        className={`flex items-center gap-2 p-3 bg-zinc-900 border rounded-lg hover:border-blue-500/50 transition-all text-left w-full ${showTimePopup ? 'border-blue-500' : 'border-zinc-800'}`}
                    >
                        <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[10px] text-zinc-500 uppercase">Time</p>
                            <p className="text-sm text-white font-medium">{selectedTime}</p>
                        </div>
                    </button>
                    
                    {/* Time Picker Popup */}
                    {showTimePopup && (
                        <div className="absolute top-full right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-3 w-36 z-50">
                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                                {generateTimeSlots().map(time => (
                                    <button
                                        key={time}
                                        type="button"
                                        onClick={() => handleTimeSelect(time)}
                                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                                            selectedTime === time 
                                                ? 'bg-blue-500 text-white' 
                                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                        }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Click outside to close */}
            {(showCalendarPopup || showTimePopup) && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => { setShowCalendarPopup(false); setShowTimePopup(false); }}
                />
            )}
        </div>
    )
}
