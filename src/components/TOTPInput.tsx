'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { clsx } from 'clsx'

interface TOTPInputProps {
  onSubmit: (code: string) => void
  disabled?: boolean
  timeLeft?: number
  label?: string
}

export function TOTPInput({ onSubmit, disabled = false, timeLeft, label }: TOTPInputProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    if (!disabled) {
      inputRefs.current[0]?.focus()
    }
  }, [disabled])

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (digits.every(d => d !== '')) {
      const code = digits.join('')
      onSubmit(code)
    }
  }, [digits, onSubmit])

  const handleChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.slice(-1)
    if (!/^\d*$/.test(digit)) return

    const newDigits = [...digits]
    newDigits[index] = digit
    setDigits(newDigits)

    // Move to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (digits[index] === '' && index > 0) {
        // Move to previous input
        inputRefs.current[index - 1]?.focus()
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        setDigits(newDigits)
      } else {
        const newDigits = [...digits]
        newDigits[index] = ''
        setDigits(newDigits)
      }
    }
    
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    
    if (pastedData.length === 6) {
      const newDigits = pastedData.split('')
      setDigits(newDigits)
      inputRefs.current[5]?.focus()
    }
  }

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-400">{label}</label>
          {timeLeft !== undefined && (
            <span className={clsx(
              'text-sm font-mono',
              timeLeft <= 3 ? 'text-accent-danger animate-pulse' : 'text-gray-400'
            )}>
              {timeLeft}s
            </span>
          )}
        </div>
      )}
      
      <div className="flex gap-2 justify-center">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={clsx(
              'w-12 h-14 text-center text-2xl font-mono font-bold rounded-xl',
              'bg-dark-700 border-2 transition-all duration-200',
              'focus:outline-none focus:ring-0',
              disabled 
                ? 'border-dark-600 text-gray-500 cursor-not-allowed'
                : digit
                  ? 'border-accent-primary text-white'
                  : 'border-dark-500 text-white focus:border-accent-primary'
            )}
          />
        ))}
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500 text-center">
        Enter your 6-digit code from Google Authenticator
      </p>
    </div>
  )
}

/**
 * Display-only TOTP code (for showing opponent's code after reveal)
 */
interface TOTPDisplayProps {
  code: string | number
  label?: string
  highlight?: 'win' | 'lose' | 'draw' | 'none'
}

export function TOTPDisplay({ code, label, highlight = 'none' }: TOTPDisplayProps) {
  const codeStr = typeof code === 'number' ? code.toString().padStart(6, '0') : code
  const digits = codeStr.split('')

  const highlightClasses = {
    win: 'border-accent-success bg-accent-success/10',
    lose: 'border-accent-danger bg-accent-danger/10',
    draw: 'border-accent-warning bg-accent-warning/10',
    none: 'border-dark-500 bg-dark-700'
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm text-gray-400 block text-center">{label}</label>
      )}
      
      <div className="flex gap-2 justify-center">
        {digits.map((digit, index) => (
          <div
            key={index}
            className={clsx(
              'w-10 h-12 flex items-center justify-center text-xl font-mono font-bold rounded-lg border-2',
              highlightClasses[highlight]
            )}
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Countdown timer with visual urgency
 */
interface CountdownTimerProps {
  seconds: number
  total: number
  label?: string
}

export function CountdownTimer({ seconds, total, label }: CountdownTimerProps) {
  const percentage = (seconds / total) * 100
  const isUrgent = seconds <= 3
  
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{label}</span>
          <span className={clsx(
            'font-mono font-bold',
            isUrgent ? 'text-accent-danger animate-pulse' : 'text-white'
          )}>
            {seconds}s
          </span>
        </div>
      )}
      
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-1000',
            isUrgent 
              ? 'bg-accent-danger' 
              : percentage > 50 
                ? 'bg-accent-success' 
                : 'bg-accent-warning'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

