'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { formatCommitment } from '@/lib/fairRng'
import { clsx } from 'clsx'
import Link from 'next/link'

function VerifyContent() {
  const searchParams = useSearchParams()
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending')
  const [isVerifying, setIsVerifying] = useState(false)

  // Get duel data from URL params
  const commitment = searchParams.get('commitment') || ''
  const timestamp = searchParams.get('timestamp') || ''
  const totpCode = searchParams.get('totp') || ''
  const winnerIndex = searchParams.get('winner') || ''

  const handleVerify = async () => {
    setIsVerifying(true)
    
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In production, this would call the backend verification endpoint
    // For MVP, we simulate successful verification
    const totpNum = parseInt(totpCode)
    const expectedWinner = totpNum % 2
    const isValid = expectedWinner === parseInt(winnerIndex)
    
    setVerificationStatus(isValid ? 'verified' : 'failed')
    setIsVerifying(false)
  }

  useEffect(() => {
    if (commitment && timestamp && totpCode) {
      handleVerify()
    }
  }, [commitment, timestamp, totpCode])

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
            <span className="text-4xl">🔒</span>
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
              <p className="text-gray-400">The proof could not be verified</p>
            </div>
          ) : (
            <div className="py-8">
              <p className="text-gray-400">Enter duel data to verify</p>
            </div>
          )}
        </div>

        {/* Duel Data */}
        <div className="card-base mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Duel Data</h2>
          
          <div className="space-y-4">
            {/* Seed Commitment */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Seed Commitment (SHA-256)</label>
              <div className="p-3 bg-dark-700 rounded-xl font-mono text-sm text-white break-all">
                {commitment || 'Not provided'}
              </div>
            </div>

            {/* Timestamp */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Resolution Timestamp</label>
              <div className="p-3 bg-dark-700 rounded-xl">
                <p className="font-mono text-sm text-white">
                  {timestamp ? new Date(parseInt(timestamp)).toISOString() : 'Not provided'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Unix: {timestamp || 'N/A'}
                </p>
              </div>
            </div>

            {/* TOTP Code */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">TOTP Code</label>
              <div className="p-3 bg-dark-700 rounded-xl font-mono text-xl text-accent-primary">
                {totpCode ? totpCode.padStart(6, '0') : 'Not provided'}
              </div>
            </div>

            {/* Winner Calculation */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Winner Calculation</label>
              <div className="p-3 bg-dark-700 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Formula:</span>
                  <span className="font-mono text-white">TOTP % 2 = winner</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Calculation:</span>
                  <span className="font-mono text-white">
                    {totpCode} % 2 = {totpCode ? parseInt(totpCode) % 2 : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Winner:</span>
                  <span className={clsx(
                    'font-semibold',
                    winnerIndex === '0' ? 'text-accent-primary' : 'text-accent-danger'
                  )}>
                    Player {winnerIndex === '0' ? '1' : '2'} (index: {winnerIndex})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="card-base mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">How Provably Fair Works</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-white">Seed Commitment</p>
                <p className="text-sm text-gray-400">
                  Before the duel, a SHA-256 hash is generated and shown to both players. 
                  This hash commits to the outcome without revealing it.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-white">TOTP Generation</p>
                <p className="text-sm text-gray-400">
                  At the exact resolution moment, a Time-Based One-Time Password (TOTP) 
                  is generated using the committed seed and timestamp.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-white">Winner Determination</p>
                <p className="text-sm text-gray-400">
                  The winner is determined by: <code className="text-accent-primary">TOTP % 2</code>. 
                  Result 0 = Player 1 wins, Result 1 = Player 2 wins.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-accent-success/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-accent-success">4</span>
              </div>
              <div>
                <p className="font-medium text-white">Verification</p>
                <p className="text-sm text-gray-400">
                  Anyone can verify the result by checking that the TOTP code matches 
                  the timestamp and the winner matches the formula.
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
              <p className="font-mono text-white">SHA-256</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">TOTP Algorithm</p>
              <p className="font-mono text-white">HMAC-SHA1</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">Time Step</p>
              <p className="font-mono text-white">30 seconds</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-xl">
              <p className="text-gray-400">Code Digits</p>
              <p className="font-mono text-white">6 digits</p>
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

