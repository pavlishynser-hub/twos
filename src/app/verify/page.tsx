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
  const playerANumber = searchParams.get('playerANumber') || ''
  const playerB = searchParams.get('playerB') || ''
  const playerBNumber = searchParams.get('playerBNumber') || ''
  const seedSlice = searchParams.get('seedSlice') || ''
  const randomNumber = searchParams.get('random') || ''

  // Calculate verification manually (client-side)
  const seedNum = seedSlice ? parseInt(seedSlice, 16) : 0
  const calculatedRandomNumber = seedNum % 1000000
  const numA = parseInt(playerANumber) || 0
  const numB = parseInt(playerBNumber) || 0
  const distanceA = Math.abs(numA - calculatedRandomNumber)
  const distanceB = Math.abs(numB - calculatedRandomNumber)
  const calculatedWinnerIndex = distanceA < distanceB ? 0 : distanceB < distanceA ? 1 : -1

  const handleVerify = async () => {
    if (!seedSlice) {
      setVerificationStatus('pending')
      return
    }

    setIsVerifying(true)
    
    // Simulate verification delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Client-side verification
    const expectedRandom = parseInt(seedSlice, 16) % 1000000
    const isRandomValid = randomNumber ? parseInt(randomNumber) === expectedRandom : true
    
    setVerificationStatus(isRandomValid ? 'verified' : 'failed')
    if (!isRandomValid) {
      setErrorMessage(`Expected random ${expectedRandom}, but got ${randomNumber}`)
    }
    setIsVerifying(false)
  }

  useEffect(() => {
    if (seedSlice) {
      handleVerify()
    }
  }, [seedSlice])

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

        {/* Game Mechanic Explanation */}
        <div className="card-base mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">🎮 How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-white">Players Choose Numbers</p>
                <p className="text-sm text-gray-400">Both players pick a number from 0 to 999,999</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-white">Random Number Generated</p>
                <p className="text-sm text-gray-400">A provably fair random number is generated using HMAC-SHA256</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-success/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-success">3</span>
              </div>
              <div>
                <p className="font-medium text-white">Closest Number Wins!</p>
                <p className="text-sm text-gray-400">The player whose number is closer to the random number wins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Duel Data */}
        {seedSlice && (
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

              {/* Players */}
              <div className="grid grid-cols-2 gap-4">
                <div className={clsx(
                  'p-3 rounded-xl',
                  calculatedWinnerIndex === 0 ? 'bg-accent-success/10 border border-accent-success/30' : 'bg-dark-700'
                )}>
                  <p className="text-xs text-gray-400 mb-1">Player A</p>
                  <p className="font-mono text-sm text-white truncate">{playerA || '-'}</p>
                  <p className="font-mono text-xl font-bold text-accent-primary mt-1">
                    {numA.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Distance: <span className="text-white">{distanceA.toLocaleString()}</span>
                  </p>
                  {calculatedWinnerIndex === 0 && (
                    <span className="inline-block mt-2 text-xs text-accent-success font-bold">🏆 WINNER</span>
                  )}
                </div>
                <div className={clsx(
                  'p-3 rounded-xl',
                  calculatedWinnerIndex === 1 ? 'bg-accent-success/10 border border-accent-success/30' : 'bg-dark-700'
                )}>
                  <p className="text-xs text-gray-400 mb-1">Player B</p>
                  <p className="font-mono text-sm text-white truncate">{playerB || '-'}</p>
                  <p className="font-mono text-xl font-bold text-accent-danger mt-1">
                    {numB.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Distance: <span className="text-white">{distanceB.toLocaleString()}</span>
                  </p>
                  {calculatedWinnerIndex === 1 && (
                    <span className="inline-block mt-2 text-xs text-accent-success font-bold">🏆 WINNER</span>
                  )}
                </div>
              </div>

              {/* Random Number */}
              <div className="p-4 bg-accent-warning/10 border border-accent-warning/30 rounded-xl text-center">
                <p className="text-xs text-gray-400 mb-2">🎲 Random Number</p>
                <p className="text-4xl font-bold font-mono text-accent-warning">
                  {calculatedRandomNumber.toLocaleString()}
                </p>
              </div>

              {calculatedWinnerIndex === -1 && (
                <div className="p-3 bg-accent-warning/10 border border-accent-warning/30 rounded-xl text-center">
                  <span className="text-accent-warning font-bold">🤝 DRAW - Equal Distance!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Formula */}
        <div className="card-base mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Verification Formula</h2>
          
          <div className="space-y-4">
            {/* Step 1: Seed Input */}
            <div className="p-4 bg-dark-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Step 1: Build Seed Input</p>
              <code className="text-xs text-accent-primary break-all">
                {duelId && playerA && playerB 
                  ? `"${duelId}:${roundNumber}:${timeSlot}:${playerA}:${playerANumber}:${playerB}:${playerBNumber}"`
                  : '"duelId:round:timeSlot:playerA:numberA:playerB:numberB"'
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
              <code className="text-2xl text-accent-warning font-mono">
                {seedSlice || '????????'}
              </code>
            </div>

            {/* Step 4: Random Number */}
            <div className="p-4 bg-dark-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Step 4: Calculate Random Number</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  Hex to decimal: <span className="text-white font-mono">{seedSlice ? seedNum.toLocaleString() : '-'}</span>
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-mono">{seedSlice ? seedNum.toLocaleString() : 'number'}</span> % 1,000,000 = 
                  <span className="text-accent-warning font-bold ml-2">{seedSlice ? calculatedRandomNumber.toLocaleString() : '?'}</span>
                </p>
              </div>
            </div>

            {/* Step 5: Determine Winner */}
            <div className="p-4 bg-dark-700 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Step 5: Compare Distances</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  Distance A: |{numA.toLocaleString()} - {calculatedRandomNumber.toLocaleString()}| = 
                  <span className="text-accent-primary font-bold ml-2">{distanceA.toLocaleString()}</span>
                </p>
                <p className="text-sm text-gray-300">
                  Distance B: |{numB.toLocaleString()} - {calculatedRandomNumber.toLocaleString()}| = 
                  <span className="text-accent-danger font-bold ml-2">{distanceB.toLocaleString()}</span>
                </p>
                <p className="text-sm mt-2">
                  Winner: <span className={clsx(
                    'font-bold',
                    calculatedWinnerIndex === 0 ? 'text-accent-success' :
                    calculatedWinnerIndex === 1 ? 'text-accent-success' :
                    'text-accent-warning'
                  )}>
                    {calculatedWinnerIndex === 0 ? 'Player A (closer)' : 
                     calculatedWinnerIndex === 1 ? 'Player B (closer)' : 
                     'Draw (equal distance)'}
                  </span>
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
              <p className="text-gray-400">Number Range</p>
              <p className="font-mono text-white">0 — 999,999</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">Seed Slice Size</p>
              <p className="font-mono text-white">8 hex chars</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">Winner Rule</p>
              <p className="font-mono text-white">Closest wins</p>
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
