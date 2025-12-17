"use client"

import { useState } from "react"
import { Power } from "lucide-react"

interface StatusToggleProps {
    id: number
    isActive: boolean
    endpoint: string
    onToggle?: (id: number, newStatus: boolean) => void
    size?: "sm" | "md"
}

export default function StatusToggle({
                                         id,
                                         isActive,
                                         endpoint,
                                         onToggle,
                                         size = "md"
                                     }: StatusToggleProps) {
    const [loading, setLoading] = useState(false)
    const [active, setActive] = useState(isActive)

    const handleToggle = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${endpoint}/${id}`, {
                method: 'PATCH',
            })
            const data = await response.json()

            if (data.success) {
                setActive(data.is_active)
                onToggle?.(id, data.is_active)
            }
        } catch (error) {
            console.error('Toggle error:', error)
        } finally {
            setLoading(false)
        }
    }

    const sizeClasses = size === "sm" ? "w-8 h-4" : "w-11 h-6"
    const dotSizeClasses = size === "sm" ? "w-3 h-3" : "w-5 h-5"

    const translateClasses = size === "sm"
        ? (active ? "translate-x-4" : "translate-x-0.5")
        : (active ? "translate-x-5" : "translate-x-0.5")

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`
                relative inline-flex items-center rounded-full transition-colors duration-200
                ${sizeClasses}
                ${active ? 'bg-green-500' : 'bg-slate-600'}
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
            `}
            title={active ? 'Click to deactivate' : 'Click to activate'}
        >
            <span
                className={`
                    inline-block rounded-full bg-white shadow transform transition-transform duration-200
                    ${dotSizeClasses}
                    ${translateClasses}
                `}
            />
        </button>
    )
}

export function StatusToggleButton({
                                       id,
                                       isActive,
                                       endpoint,
                                       onToggle,
                                       label
                                   }: StatusToggleProps & { label?: string }) {
    const [loading, setLoading] = useState(false)
    const [active, setActive] = useState(isActive)

    const handleToggle = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${endpoint}/${id}`, {
                method: 'PATCH',
            })
            const data = await response.json()

            if (data.success) {
                setActive(data.is_active)
                onToggle?.(id, data.is_active)
            }
        } catch (error) {
            console.error('Toggle error:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${active
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <Power className="w-3 h-3" />
            {label || (active ? 'Active' : 'Inactive')}
        </button>
    )
}