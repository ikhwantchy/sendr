'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ScheduleDateTimePickerProps {
    value: string // ISO string or YYYY-MM-DDTHH:mm
    onChange: (value: string) => void
    minDate?: Date
}

export default function ScheduleDateTimePicker({ 
    value, 
    onChange, 
    minDate = new Date() 
}: ScheduleDateTimePickerProps) {
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [showTimePicker, setShowTimePicker] = useState(false)
    const datePickerRef = useRef<HTMLDivElement>(null)
    const timePickerRef = useRef<HTMLDivElement>(null)
    const hourScrollRef = useRef<HTMLDivElement>(null)
    const minuteScrollRef = useRef<HTMLDivElement>(null)

    // Parse value to Date
    const selectedDate = value ? new Date(value) : new Date()
    const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate)

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false)
            }
            if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
                setShowTimePicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Scroll to selected hour/minute when time picker opens
    useEffect(() => {
        if (showTimePicker) {
            const hour24 = selectedDate.getHours()
            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
            const minute = selectedDate.getMinutes()
            
            if (hourScrollRef.current) {
                const hourElement = hourScrollRef.current.querySelector(`[data-hour="${hour12}"]`)
                if (hourElement) {
                    hourElement.scrollIntoView({ block: 'center', behavior: 'auto' })
                }
            }
            if (minuteScrollRef.current) {
                const minuteElement = minuteScrollRef.current.querySelector(`[data-minute="${minute}"]`)
                if (minuteElement) {
                    minuteElement.scrollIntoView({ block: 'center', behavior: 'auto' })
                }
            }
        }
    }, [showTimePicker])

    // Calendar calculations
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

    const formatLocalDateTime = (date: Date) => {
        const pad = (num: number) => String(num).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, selectedDate.getHours(), selectedDate.getMinutes())
        onChange(formatLocalDateTime(newDate))
        setShowDatePicker(false)
    }

    const handleTimeChange = (hour12: number, minutes: number, period: 'AM' | 'PM') => {
        const newDate = new Date(selectedDate)
        let hour24 = hour12
        if (period === 'AM') {
            hour24 = hour12 === 12 ? 0 : hour12
        } else {
            hour24 = hour12 === 12 ? 12 : hour12 + 12
        }
        newDate.setHours(hour24)
        newDate.setMinutes(minutes)
        onChange(formatLocalDateTime(newDate))
    }

    const handleClear = () => {
        const newDate = new Date()
        newDate.setMinutes(newDate.getMinutes() + 5)
        setCurrentMonth(newDate)
        onChange(formatLocalDateTime(newDate))
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
        return selectedDate.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const formatDisplayTime = () => {
        return selectedDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    }

    // Get current 12-hour format values
    const hour24 = selectedDate.getHours()
    const currentHour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const currentPeriod: 'AM' | 'PM' = hour24 < 12 ? 'AM' : 'PM'
    const currentMinute = selectedDate.getMinutes()

    // Generate hours (1-12) and minutes (0-59) arrays
    const hours12 = Array.from({ length: 12 }, (_, i) => i + 1)
    const minutes = Array.from({ length: 60 }, (_, i) => i)

    return (
        <div className="flex gap-3">
            {/* Date Picker Field */}
            <div className="relative flex-1" ref={datePickerRef}>
                <button
                    type="button"
                    onClick={() => {
                        setShowDatePicker(!showDatePicker)
                        setShowTimePicker(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border rounded-lg text-left transition-all hover:border-zinc-600 ${
                        showDatePicker ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-zinc-700'
                    }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Calendar size={16} className="text-zinc-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Date</div>
                        <div className="text-xs text-white font-semibold">{formatDisplayDate()}</div>
                    </div>
                </button>

                {/* Date Picker Dropdown */}
                {showDatePicker && (
                    <div className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 p-4 w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                type="button"
                                onClick={previousMonth}
                                className="w-8 h-8 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="text-white font-semibold text-sm">
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </div>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="w-8 h-8 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Day Names */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map(day => (
                                <div key={day} className="text-center text-xs font-medium text-zinc-500 py-1">
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
                                        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                                            disabled
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
                        <div className="flex justify-end mt-4 pt-3 border-t border-zinc-800">
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Time Picker Field */}
            <div className="relative flex-1" ref={timePickerRef}>
                <button
                    type="button"
                    onClick={() => {
                        setShowTimePicker(!showTimePicker)
                        setShowDatePicker(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border rounded-lg text-left transition-all hover:border-zinc-600 ${
                        showTimePicker ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-zinc-700'
                    }`}
                >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Clock size={16} className="text-zinc-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Time</div>
                        <div className="text-xs text-white font-semibold">{formatDisplayTime()}</div>
                    </div>
                </button>

                {/* Time Picker Dropdown */}
                {showTimePicker && (
                    <div className="absolute top-full right-0 mt-2 z-50 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 p-4 w-[320px] animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Current Time Display */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                            <div className="text-lg font-bold text-white">{formatDisplayTime()}</div>
                            <button
                                type="button"
                                onClick={() => setShowTimePicker(false)}
                                className="w-7 h-7 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center text-zinc-500 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Time Selection - Three Columns: Hour, Minute, AM/PM */}
                        <div className="flex gap-2">
                            {/* Hours Column (1-12) */}
                            <div 
                                ref={hourScrollRef}
                                className="flex-1 max-h-[200px] overflow-y-auto rounded-lg bg-zinc-800/50 p-1"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
                            >
                                {hours12.map(hour => (
                                    <button
                                        key={hour}
                                        type="button"
                                        data-hour={hour}
                                        onClick={() => handleTimeChange(hour, currentMinute, currentPeriod)}
                                        className={`w-full py-2 px-3 text-sm font-medium rounded-lg transition-all mb-1 text-center ${
                                            currentHour12 === hour
                                                ? 'bg-blue-600 text-white'
                                                : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                        }`}
                                    >
                                        {hour.toString().padStart(2, '0')}
                                    </button>
                                ))}
                            </div>

                            {/* Minutes Column */}
                            <div 
                                ref={minuteScrollRef}
                                className="flex-1 max-h-[200px] overflow-y-auto rounded-lg bg-zinc-800/50 p-1"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
                            >
                                {minutes.map(minute => (
                                    <button
                                        key={minute}
                                        type="button"
                                        data-minute={minute}
                                        onClick={() => handleTimeChange(currentHour12, minute, currentPeriod)}
                                        className={`w-full py-2 px-3 text-sm font-medium rounded-lg transition-all mb-1 text-center ${
                                            currentMinute === minute
                                                ? 'bg-blue-600 text-white'
                                                : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                        }`}
                                    >
                                        {minute.toString().padStart(2, '0')}
                                    </button>
                                ))}
                            </div>

                            {/* AM/PM Column */}
                            <div className="w-16 flex flex-col gap-1 p-1">
                                <button
                                    type="button"
                                    onClick={() => handleTimeChange(currentHour12, currentMinute, 'AM')}
                                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                                        currentPeriod === 'AM'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                    }`}
                                >
                                    AM
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTimeChange(currentHour12, currentMinute, 'PM')}
                                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${
                                        currentPeriod === 'PM'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                                    }`}
                                >
                                    PM
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
