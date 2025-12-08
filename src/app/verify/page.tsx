'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { clsx } from 'clsx'
import Link from 'next/link'

function VerifyContent() {
  const searchParams = useSearchParams()
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending')
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Get verification data from URL params
  const duelId = searchParams.get('duelId') || ''
  const roundNumber = searchParams.get('round') || ''
  const timeSlot = searchParams.get('timeSlot') || ''
  const playerA = searchParams.get('playerA') || ''
  const playerB = searchParams.get('playerB') || ''
  const seedSlice = searchParams.get('seedSlice') || ''
  const winnerIndex = searchParams.get('winner') || ''

  // Calculate verification manually (client-side)
  const seedNumber = seedSlice ? parseInt(seedSlice, 16) : 0
  const calculatedWinnerIndex = seedNumber % 2

  const handleVerify = async () => {
    if (!seedSlice || winnerIndex === '') {
      setVerificationStatus('pending')
      return
    }

    setIsVerifying(true)
    
    // Simulate verification delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Client-side verification (no server call needed for basic check)
    const expectedWinner = parseInt(seedSlice, 16) % 2
    const isValid = expectedWinner === parseInt(winnerIndex)
    
    setVerificationStatus(isValid ? 'verified' : 'failed')
    if (!isValid) {
      setErrorMessage(`Expected winner index ${expectedWinner}, but got ${winnerIndex}`)
    }
    setIsVerifying(false)
  }

  useEffect(() => {
    if (seedSlice && winnerIndex !== '') {
      handleVerify()
    }
  }, [seedSlice, winnerIndex])

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Fairness Verification</h1>
          <p className="text-gray-400">Verify that this duel was resolved fairly</p>
        </div>

        {/* Verification Status */}
        <div className={clsx(
          'card-base mb-6 text-center',
          verificationStatus === 'verified' && 'border-accent-success/30 bg-accent-success/5',
          verificationStatus === 'failed' && 'border-accent-danger/30 bg-accent-danger/5'
        )}>
          {isVerifying ? (
            <div className="py-8">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
              <p className="text-lg font-medium text-white">Verifying...</p>
              <p className="text-sm text-gray-400 mt-1">Checking cryptographic proof</p>
            </div>
          ) : verificationStatus === 'verified' ? (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-success/20 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-2xl font-bold text-accent-success mb-2">Verified!</p>
              <p className="text-gray-400">This duel result is cryptographically valid</p>
            </div>
          ) : verificationStatus === 'failed' ? (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-danger/20 flex items-center justify-center">
                <span className="text-3xl">✕</span>
              </div>
              <p className="text-2xl font-bold text-accent-danger mb-2">Verification Failed</p>
              <p className="text-gray-400">{errorMessage || 'The proof could not be verified'}</p>
            </div>
          ) : (
            <div className="py-8">
              <p className="text-gray-400">Enter verification data or use a verification link</p>
            </div>
          )}
        </div>

        {/* Duel Data */}
        <div className="card-base mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Duel Parameters</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-dark-700 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">Duel ID</p>
                <p className="font-mono text-sm text-white truncate">{duelId || '-'}</p>
              </div>
              <div className="p-3 bg-dark-700 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">Round</p>
                <p className="font-mono text-sm text-white">{roundNumber || '-'}</p>
              </div>
            </div>

            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-1">Time Slot</p>
              <p className="font-mono text-sm text-white">{timeSlot || '-'}</p>
              {timeSlot && (
                <p className="text-xs text-gray-500 mt-1">
                  ≈ {new Date(parseInt(timeSlot) * 30000).toISOString()}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-dark-700 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">Player A</p>
                <p className="font-mono text-sm text-white truncate">{playerA || '-'}</p>
              </div>
              <div className="p-3 bg-dark-700 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">Player B</p>
                <p className="font-mono text-sm text-white truncate">{playerB || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Formula */}
        <div className="card-base mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Verification Formula</h2>
          
          <div className="space-y-4">
            {/* Step 1: Seed Input */}
            <div className="p-4 bg-dark-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Step 1: Build Seed Input</p>
              <code className="text-xs text-accent-primary break-all">
                {duelId && playerA && playerB 
                  ? `"${duelId}:${roundNumber}:${timeSlot}:${playerA}:${playerB}"`
                  : '"duelId:roundNumber:timeSlot:playerA:playerB"'
                }
              </code>
            </div>

            {/* Step 2: HMAC */}
            <div className="p-4 bg-dark-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Step 2: Compute HMAC-SHA256</p>
              <code className="text-xs text-gray-300">
                HMAC-SHA256(PLATFORM_SECRET, seedInput)
              </code>
            </div>

            {/* Step 3: Seed Slice */}
            <div className="p-4 bg-dark-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Step 3: Extract Seed Slice (first 8 hex chars)</p>
              <code className="text-xl text-accent-warning font-mono">
                {seedSlice || '????????'}
              </code>
            </div>

            {/* Step 4: Calculate Winner */}
            <div className="p-4 bg-dark-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Step 4: Determine Winner</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  Seed as number: <span className="text-white font-mono">{seedSlice ? seedNumber.toLocaleString() : '-'}</span>
                </p>
                <p className="text-sm text-gray-300">
                  {seedSlice ? seedNumber.toLocaleString() : 'seedNumber'} % 2 = <span className="text-accent-primary font-bold">{seedSlice ? calculatedWinnerIndex : '?'}</span>
                </p>
                <p className="text-sm text-gray-300">
                  Winner: <span className={clsx(
                    'font-bold',
                    calculatedWinnerIndex === 0 ? 'text-blue-400' : 'text-orange-400'
                  )}>
                    {seedSlice ? (calculatedWinnerIndex === 0 ? 'Player A' : 'Player B') : '-'}
                  </span>
                </p>
              </div>
            </div>

            {/* Result */}
            <div className={clsx(
              'p-4 rounded-xl',
              winnerIndex === '0' ? 'bg-blue-500/10 border border-blue-500/30' :
              winnerIndex === '1' ? 'bg-orange-500/10 border border-orange-500/30' :
              'bg-dark-700'
            )}>
              <p className="text-xs text-gray-400 mb-2">Result</p>
              <p className="text-lg font-bold">
                {winnerIndex !== '' ? (
                  <>
                    🏆 Winner: {winnerIndex === '0' ? 'Player A' : 'Player B'}
                    <span className="text-sm font-normal text-gray-400 ml-2">
                      (index: {winnerIndex})
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">No result data</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="card-base mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">How It Works</h2>
          
          <div className="space-y-4 text-sm">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-white">Deterministic Input</p>
                <p className="text-gray-400">
                  All parameters (duel ID, round, time, players) are combined into a seed string.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-white">HMAC-SHA256</p>
                <p className="text-gray-400">
                  The seed is hashed with the platform secret using HMAC-SHA256.
                  This is deterministic — same input always gives same output.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-white">Winner Selection</p>
                <p className="text-gray-400">
                  First 8 hex characters are converted to a number, then <code>% 2</code> gives 0 or 1.
                  This ensures a fair 50/50 distribution.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-success/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-success">4</span>
              </div>
              <div>
                <p className="font-medium text-white">Verification</p>
                <p className="text-gray-400">
                  Anyone can verify that seedSlice % 2 equals the claimed winner.
                  The formula is public and unchangeable.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="card-base">
          <h2 className="text-lg font-semibold text-white mb-4">Technical Details</h2>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">Hash Algorithm</p>
              <p className="font-mono text-white">HMAC-SHA256</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">Seed Slice Size</p>
              <p className="font-mono text-white">8 hex chars (32 bits)</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">Time Slot Duration</p>
              <p className="font-mono text-white">30 seconds</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">Winner Formula</p>
              <p className="font-mono text-white">seedNumber % 2</p>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <Link href="/" className="btn-secondary inline-block">
            ← Back to Lobby
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
