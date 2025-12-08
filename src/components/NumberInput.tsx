'use client'

import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'

interface NumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  placeholder?: string
  maxValue?: number
  label?: string
  isOpponent?: boolean
  isRevealed?: boolean
}

export function NumberInput({
  value,
  onChange,
  disabled = false,
  placeholder = '0',
  maxValue = 999999,
  label = 'Your Number',
  isOpponent = false,
  isRevealed = false,
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value?.toString() || '')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value !== null) {
      setInputValue(value.toString())
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    
    if (raw === '') {
      setInputValue('')
      onChange(null)
      return
    }

    const num = parseInt(raw, 10)
    if (num > maxValue) {
      setInputValue(maxValue.toString())
      onChange(maxValue)
    } else {
      setInputValue(raw)
      onChange(num)
    }
  }

  const formatDisplay = (num: number | null): string => {
    if (num === null) return '---,---'
    return num.toLocaleString()
  }

  // Hidden input for opponent
  if (isOpponent && !isRevealed) {
    return (
      <div className="relative">
        <label className="block text-sm text-gray-400 mb-2 text-center">{label}</label>
        <div className={clsx(
          'w-full px-4 py-4 rounded-2xl text-center text-3xl font-mono font-bold',
          'bg-dark-700 border-2 border-dark-500',
          'text-gray-500'
        )}>
          ???,???
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">Waiting for input...</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <label className="block text-sm text-gray-400 mb-2 text-center">{label}</label>
      
      {disabled ? (
        // Display mode (after submission)
        <div className={clsx(
          'w-full px-4 py-4 rounded-2xl text-center text-3xl font-mono font-bold',
          'border-2',
          isOpponent 
            ? 'bg-accent-danger/10 border-accent-danger/30 text-accent-danger'
            : 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'
        )}>
          {formatDisplay(value)}
        </div>
      ) : (
        // Input mode
        <div className={clsx(
          'relative rounded-2xl transition-all duration-300',
          isFocused && 'ring-2 ring-accent-primary/50'
        )}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={6}
            className={clsx(
              'w-full px-4 py-4 rounded-2xl text-center text-3xl font-mono font-bold',
              'bg-dark-700 border-2 border-dark-500',
              'focus:border-accent-primary focus:outline-none',
              'placeholder:text-gray-600',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          
          {/* Quick buttons */}
          {!disabled && (
            <div className="flex gap-2 mt-3">
              {[100000, 250000, 500000, 750000, 999999].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setInputValue(num.toString())
                    onChange(num)
                  }}
                  className="flex-1 py-1 text-xs font-medium text-gray-400 bg-dark-600 rounded-lg hover:bg-dark-500 hover:text-white transition-all"
                >
                  {(num / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      <p className="text-xs text-gray-500 text-center mt-2">
        Range: 0 — {maxValue.toLocaleString()}
      </p>
    </div>
  )
}

