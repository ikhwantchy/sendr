'use client'

import { useState } from 'react'

interface ModernDateTimePickerProps {
    value: Date | null
    onChange: (date: Date) => void
    minDate?: Date
}

export default function ModernDateTimePicker({ value, onChange, minDate = new Date() }: ModernDateTimePickerProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(value || new Date())
    const [currentMonth, setCurrentMonth] = useState<Date>(value || new Date())
    const [showTimePicker, setShowTimePicker] = useState(false)

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, selectedDate.getHours(), selectedDate.getMinutes())
        setSelectedDate(newDate)
        onChange(newDate)
    }

    const handleTimeChange = (hours: number, minutes: number) => {
        const newDate = new Date(selectedDate)
        newDate.setHours(hours)
        newDate.setMinutes(minutes)
        setSelectedDate(newDate)
        onChange(newDate)
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
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
        return date < minDate
    }

    const renderCalendar = () => {
        const days = []

        // Empty cells for days before month starts
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="aspect-square" />)
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const disabled = isPastDate(day)
            const selected = isSelected(day)
            const today = isToday(day)

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => !disabled && handleDateClick(day)}
                    disabled={disabled}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${disabled
                            ? 'text-gray-600 cursor-not-allowed'
                            : selected
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                                : today
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
                                    : 'text-gray-300 hover:bg-white/10'
                        }`}
                >
                    {day}
                </button>
            )
        }

        return days
    }

    const renderTimePicker = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i)
        const minutes = [0, 15, 30, 45]

        return (
            <div className="grid grid-cols-2 gap-4">
                {/* Hours */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Hour</label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-black/30 rounded-lg">
                        {hours.map(hour => (
                            <button
                                key={hour}
                                type="button"
                                onClick={() => handleTimeChange(hour, selectedDate.getMinutes())}
                                className={`py-2 rounded-lg text-sm font-medium transition-all ${selectedDate.getHours() === hour
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    }`}
                            >
                                {hour.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Minutes */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Minute</label>
                    <div className="grid grid-cols-2 gap-2">
                        {minutes.map(minute => (
                            <button
                                key={minute}
                                type="button"
                                onClick={() => handleTimeChange(selectedDate.getHours(), minute)}
                                className={`py-3 rounded-lg text-sm font-medium transition-all ${selectedDate.getMinutes() === minute
                                        ? 'bg-cyan-500 text-white'
                                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    }`}
                            >
                                {minute.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-4">
            {/* Selected Date/Time Display */}
            <div className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div>
                    <div className="text-xs text-gray-400">Selected Date & Time</div>
                    <div className="text-white font-semibold">
                        {selectedDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </div>
                    <div className="text-cyan-400 text-sm">
                        {selectedDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm font-medium"
                >
                    {showTimePicker ? 'Show Calendar' : 'Set Time'}
                </button>
            </div>

            {!showTimePicker ? (
                <>
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={previousMonth}
                            className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="text-white font-semibold">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </div>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="w-8 h-8 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center text-gray-400 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="text-center text-xs font-medium text-gray-500">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {renderCalendar()}
                    </div>
                </>
            ) : (
                renderTimePicker()
            )}
        </div>
    )
}
