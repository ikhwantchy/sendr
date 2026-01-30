'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface TimePickerCardProps {
    value: string // HH:mm format
    onChange: (time: string) => void
    label?: string
    color?: 'blue' | 'purple' // Support different color themes
}

export default function TimePickerCard({ 
    value, 
    onChange, 
    label,
    color = 'blue'
}: TimePickerCardProps) {
    const [selectedTime, setSelectedTime] = useState<string>(value || '09:00')
    const [showTimePopup, setShowTimePopup] = useState(false)

    // Sync with external value changes
    useEffect(() => {
        if (value) {
            setSelectedTime(value)
        }
    }, [value])

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time)
        onChange(time)
        setShowTimePopup(false)
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

    const colorClasses = {
        blue: {
            icon: 'text-blue-400',
            border: showTimePopup ? 'border-blue-500' : 'border-zinc-800',
            hoverBorder: 'hover:border-blue-500/50',
            selected: 'bg-blue-500 text-white'
        },
        purple: {
            icon: 'text-purple-400',
            border: showTimePopup ? 'border-purple-500' : 'border-zinc-800',
            hoverBorder: 'hover:border-purple-500/50',
            selected: 'bg-purple-500 text-white'
        }
    }

    const colors = colorClasses[color]

    return (
        <div className="space-y-2">
            {label && (
                <label className="text-xs font-medium text-zinc-400 uppercase">{label}</label>
            )}
            
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowTimePopup(!showTimePopup)}
                    className={`flex items-center gap-2 p-3 bg-zinc-900 border rounded-lg ${colors.hoverBorder} transition-all text-left w-full ${colors.border}`}
                >
                    <Clock className={`w-4 h-4 ${colors.icon} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-zinc-500 uppercase">Time</p>
                        <p className="text-sm text-white font-medium">{selectedTime}</p>
                    </div>
                </button>
                
                {/* Time Picker Popup */}
                {showTimePopup && (
                    <div className="absolute top-full left-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-3 w-36 z-50">
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                            {generateTimeSlots().map(time => (
                                <button
                                    key={time}
                                    type="button"
                                    onClick={() => handleTimeSelect(time)}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                                        selectedTime === time 
                                            ? colors.selected 
                                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                                    }`}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Click outside to close */}
                {showTimePopup && (
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowTimePopup(false)}
                    />
                )}
            </div>
        </div>
    )
}
