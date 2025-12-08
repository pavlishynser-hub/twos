'use client'

import { clsx } from 'clsx'

interface FairnessBadgeProps {
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

export function FairnessBadge({ variant = 'default', className }: FairnessBadgeProps) {
  if (variant === 'compact') {
    return (
      <div className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg',
        'bg-accent-success/10 border border-accent-success/20',
        className
      )}>
        <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse" />
        <span className="text-xs font-medium text-accent-success">Fair</span>
      </div>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={clsx(
        'p-4 rounded-xl',
        'bg-accent-success/5 border border-accent-success/20',
        className
      )}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-success/20 flex items-center justify-center">
            <span className="text-xl">🔒</span>
          </div>
          <div>
            <p className="font-semibold text-white">Provably Fair</p>
            <p className="text-xs text-gray-400">TOTP-SHA256 Algorithm</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-dark-700 rounded-lg">
            <p className="text-gray-500">Hash</p>
            <p className="text-white font-mono">SHA-256</p>
          </div>
          <div className="p-2 bg-dark-700 rounded-lg">
            <p className="text-gray-500">RNG</p>
            <p className="text-white font-mono">TOTP</p>
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={clsx(
      'inline-flex items-center gap-2 px-4 py-2',
      'bg-accent-success/10 border border-accent-success/30 rounded-full',
      className
    )}>
      <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
      <span className="text-sm font-medium text-accent-success">Provably Fair</span>
      <span className="text-xs text-gray-400">TOTP-SHA256</span>
    </div>
  )
}

/**
 * Seed commitment display component
 */
interface SeedCommitmentProps {
  commitment: string
  showFull?: boolean
  className?: string
}

export function SeedCommitment({ commitment, showFull = false, className }: SeedCommitmentProps) {
  const displayCommitment = showFull 
    ? commitment 
    : `${commitment.slice(0, 8)}...${commitment.slice(-8)}`

  return (
    <div className={clsx('p-3 bg-dark-700 rounded-xl', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">Seed Commitment</span>
        <span className="badge-success text-xs">Locked</span>
      </div>
      <p className={clsx(
        'font-mono text-sm text-white',
        showFull && 'break-all'
      )}>
        {displayCommitment}
      </p>
    </div>
  )
}

/**
 * Verification result display
 */
interface VerificationResultProps {
  isValid: boolean
  details?: {
    commitmentVerified: boolean
    totpVerified: boolean
    winnerCorrect: boolean
  }
}

export function VerificationResult({ isValid, details }: VerificationResultProps) {
  return (
    <div className={clsx(
      'p-4 rounded-xl',
      isValid 
        ? 'bg-accent-success/10 border border-accent-success/30' 
        : 'bg-accent-danger/10 border border-accent-danger/30'
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={clsx(
          'w-10 h-10 rounded-full flex items-center justify-center',
          isValid ? 'bg-accent-success/20' : 'bg-accent-danger/20'
        )}>
          <span className="text-xl">{isValid ? '✓' : '✕'}</span>
        </div>
        <div>
          <p className={clsx(
            'font-semibold',
            isValid ? 'text-accent-success' : 'text-accent-danger'
          )}>
            {isValid ? 'Verification Passed' : 'Verification Failed'}
          </p>
          <p className="text-xs text-gray-400">
            {isValid ? 'This duel was fairly resolved' : 'Could not verify fairness'}
          </p>
        </div>
      </div>

      {details && (
        <div className="space-y-2">
          <VerificationCheck 
            label="Commitment Hash" 
            passed={details.commitmentVerified} 
          />
          <VerificationCheck 
            label="TOTP Code" 
            passed={details.totpVerified} 
          />
          <VerificationCheck 
            label="Winner Calculation" 
            passed={details.winnerCorrect} 
          />
        </div>
      )}
    </div>
  )
}

function VerificationCheck({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 bg-dark-700 rounded-lg">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={clsx(
        'text-sm font-medium',
        passed ? 'text-accent-success' : 'text-accent-danger'
      )}>
        {passed ? '✓ Valid' : '✕ Invalid'}
      </span>
    </div>
  )
}

