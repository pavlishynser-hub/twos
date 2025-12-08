'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { mockUsers, currentUser } from '@/data/mock'
import { 
  generateDemoDuelResolution, 
  generateFairnessProof,
  formatCommitment 
} from '@/lib/fairRng'
import { DuelFairnessData } from '@/types'
import { clsx } from 'clsx'

type DuelPhase = 'committing' | 'waiting' | 'countdown' | 'rolling' | 'result'

export default function DuelPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<DuelPhase>('committing')
  const [countdown, setCountdown] = useState(3)
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null)
  const [rollingValue, setRollingValue] = useState(50)
  const [fairnessData, setFairnessData] = useState<DuelFairnessData | null>(null)
  const [seedCommitment, setSeedCommitment] = useState<string>('')
  const [showFairnessDetails, setShowFairnessDetails] = useState(false)

  const opponent = mockUsers[0] // Mock opponent

  // Generate seed commitment on mount
  useEffect(() => {
    const initFairness = async () => {
      // Generate commitment (shown to players before duel)
      const resolution = await generateDemoDuelResolution(currentUser.id, opponent.id)
      setSeedCommitment(resolution.seedCommitment)
      
      // Store full resolution for later
      const proof = generateFairnessProof(resolution)
      setFairnessData({
        seedCommitment: resolution.seedCommitment,
        timestamp: resolution.timestamp,
        totpCode: resolution.totpCode,
        winnerIndex: resolution.winnerIndex,
        algorithm: proof.algorithm,
        timeStep: proof.timeStep
      })

      // Move to waiting phase after commitment is shown
      setTimeout(() => setPhase('waiting'), 1500)
    }

    initFairness()
  }, [opponent.id])

  // Auto-start countdown after waiting
  useEffect(() => {
    if (phase !== 'waiting') return
    
    const startTimer = setTimeout(() => {
      setPhase('countdown')
    }, 2000)

    return () => clearTimeout(startTimer)
  }, [phase])

  // Countdown logic
  useEffect(() => {
    if (phase !== 'countdown') return

    if (countdown === 0) {
      setPhase('rolling')
      return
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [phase, countdown])

  // Rolling animation with fairness resolution
  useEffect(() => {
    if (phase !== 'rolling' || !fairnessData) return

    let iteration = 0
    const maxIterations = 30
    
    const rollInterval = setInterval(() => {
      setRollingValue(Math.floor(Math.random() * 100))
      iteration++

      if (iteration >= maxIterations) {
        clearInterval(rollInterval)
        
        // Use the pre-determined fair result
        const isPlayerWinner = fairnessData.winnerIndex === 0
        setWinner(isPlayerWinner ? 'player' : 'opponent')
        setRollingValue(isPlayerWinner ? 75 : 25)
        setPhase('result')
      }
    }, 100)

    return () => clearInterval(rollInterval)
  }, [phase, fairnessData])

  const handleVerify = useCallback(() => {
    if (fairnessData) {
      // Navigate to verification page with duel data
      const params = new URLSearchParams({
        commitment: fairnessData.seedCommitment,
        timestamp: fairnessData.timestamp.toString(),
        totp: fairnessData.totpCode.toString(),
        winner: fairnessData.winnerIndex.toString()
      })
      router.push(`/verify?${params.toString()}`)
    }
  }, [fairnessData, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Provably Fair Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-accent-success/10 border border-accent-success/30 rounded-full">
            <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
            <span className="text-sm font-medium text-accent-success">Provably Fair</span>
            <span className="text-xs text-gray-400">TOTP-SHA256</span>
          </div>
        </div>

        {/* Seed Commitment Display (Before Duel) */}
        {seedCommitment && phase !== 'result' && (
          <div className="mb-4 p-3 bg-dark-800 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Seed Commitment</span>
              <button 
                onClick={() => setShowFairnessDetails(!showFairnessDetails)}
                className="text-xs text-accent-primary hover:text-accent-secondary transition-colors"
              >
                {showFairnessDetails ? 'Hide' : 'Details'}
              </button>
            </div>
            <p className="font-mono text-sm text-white mt-1 break-all">
              {showFairnessDetails ? seedCommitment : formatCommitment(seedCommitment)}
            </p>
            {showFairnessDetails && (
              <p className="text-xs text-gray-500 mt-2">
                This hash was generated before the duel and cannot be changed.
                It proves the outcome wasn't manipulated.
              </p>
            )}
          </div>
        )}

        {/* Duel Arena */}
        <div className="card-base relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 to-accent-secondary/5" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-accent-primary/50 via-accent-secondary/50 to-transparent" />

          {/* Committing Phase */}
          {phase === 'committing' && (
            <div className="relative text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
              <p className="text-lg font-medium text-white">Generating Commitment...</p>
              <p className="text-sm text-gray-400 mt-2">Creating provably fair seed</p>
            </div>
          )}

          {/* Players */}
          {phase !== 'committing' && (
            <>
              <div className="relative flex items-center justify-between mb-8">
                {/* Player 1 (You) */}
                <div className={clsx(
                  'flex-1 text-center p-4 rounded-2xl transition-all duration-500',
                  phase === 'result' && winner === 'player' && 'bg-accent-success/20 ring-2 ring-accent-success',
                  phase === 'result' && winner === 'opponent' && 'opacity-50'
                )}>
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-3xl font-bold mb-3 shadow-neon">
                    {currentUser.username[0]}
                  </div>
                  <h3 className="font-bold text-white text-lg">{currentUser.username}</h3>
                  <p className="text-sm text-gray-400">⭐ {currentUser.rating}</p>
                  {phase === 'result' && winner === 'player' && (
                    <div className="mt-2 badge-success">🏆 Winner!</div>
                  )}
                </div>

                {/* VS */}
                <div className="px-6">
                  <div className={clsx(
                    'w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl transition-all',
                    phase === 'rolling' 
                      ? 'bg-accent-warning animate-pulse' 
                      : phase === 'countdown'
                      ? 'bg-accent-danger scale-110'
                      : 'bg-dark-600'
                  )}>
                    {phase === 'countdown' ? countdown : 'VS'}
                  </div>
                </div>

                {/* Player 2 (Opponent) */}
                <div className={clsx(
                  'flex-1 text-center p-4 rounded-2xl transition-all duration-500',
                  phase === 'result' && winner === 'opponent' && 'bg-accent-success/20 ring-2 ring-accent-success',
                  phase === 'result' && winner === 'player' && 'opacity-50'
                )}>
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent-danger to-accent-warning flex items-center justify-center text-3xl font-bold mb-3">
                    {opponent.username[0]}
                  </div>
                  <h3 className="font-bold text-white text-lg">{opponent.username}</h3>
                  <p className="text-sm text-gray-400">⭐ {opponent.rating}</p>
                  {phase === 'result' && winner === 'opponent' && (
                    <div className="mt-2 badge-success">🏆 Winner!</div>
                  )}
                </div>
              </div>

              {/* Rolling Bar */}
              <div className="relative h-8 bg-dark-700 rounded-full overflow-hidden mb-6">
                {/* Player side */}
                <div 
                  className={clsx(
                    'absolute left-0 top-0 h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all',
                    phase === 'rolling' ? 'duration-100' : 'duration-500'
                  )}
                  style={{ width: `${rollingValue}%` }}
                />
                {/* Opponent side */}
                <div 
                  className={clsx(
                    'absolute right-0 top-0 h-full bg-gradient-to-l from-accent-danger to-accent-warning transition-all',
                    phase === 'rolling' ? 'duration-100' : 'duration-500'
                  )}
                  style={{ width: `${100 - rollingValue}%` }}
                />
                {/* Center marker */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1 h-full bg-white/50" />
                
                {/* Value display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-mono font-bold text-white text-lg drop-shadow-lg">
                    {rollingValue.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Phase messages */}
              <div className="text-center mb-6">
                {phase === 'waiting' && (
                  <p className="text-gray-400 animate-pulse">Waiting for opponent...</p>
                )}
                {phase === 'countdown' && (
                  <p className="text-2xl font-bold text-accent-warning animate-pulse">Get Ready!</p>
                )}
                {phase === 'rolling' && (
                  <div>
                    <p className="text-xl font-bold text-white animate-pulse">Rolling...</p>
                    <p className="text-xs text-gray-500 mt-1">Using TOTP @ {new Date().toISOString()}</p>
                  </div>
                )}
                {phase === 'result' && (
                  <div className="space-y-2">
                    <p className={clsx(
                      'text-2xl font-bold',
                      winner === 'player' ? 'text-accent-success' : 'text-accent-danger'
                    )}>
                      {winner === 'player' ? '🎉 You Won!' : '😔 You Lost'}
                    </p>
                    <p className={clsx(
                      'text-lg font-semibold',
                      winner === 'player' ? 'text-accent-success' : 'text-accent-danger'
                    )}>
                      {winner === 'player' ? '+1,000 💎' : '-1,000 💎'}
                    </p>
                  </div>
                )}
              </div>

              {/* Stake info */}
              <div className="p-4 bg-dark-700 rounded-xl text-center">
                <p className="text-sm text-gray-400 mb-1">Total Pot</p>
                <p className="text-2xl font-bold text-accent-warning">💎 2,000</p>
              </div>
            </>
          )}

          {/* Result Actions */}
          {phase === 'result' && (
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => router.push('/')}
                className="flex-1 btn-secondary"
              >
                Back to Lobby
              </button>
              <button className="flex-1 btn-primary">
                Rematch
              </button>
            </div>
          )}
        </div>

        {/* Fairness Proof Section (After Result) */}
        {phase === 'result' && fairnessData && (
          <div className="mt-4 card-base">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="text-accent-success">🔒</span>
                Fairness Proof
              </h3>
              <span className="badge-success">Verified</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-gray-400">Seed Commitment</span>
                <span className="font-mono text-white text-right max-w-[200px] truncate">
                  {formatCommitment(fairnessData.seedCommitment)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timestamp</span>
                <span className="font-mono text-white">
                  {new Date(fairnessData.timestamp).toISOString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">TOTP Code</span>
                <span className="font-mono text-accent-primary">
                  {fairnessData.totpCode.toString().padStart(6, '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Winner Index</span>
                <span className="font-mono text-white">
                  {fairnessData.winnerIndex} ({fairnessData.winnerIndex === 0 ? 'Player 1' : 'Player 2'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Algorithm</span>
                <span className="text-white">{fairnessData.algorithm}</span>
              </div>
            </div>

            <button 
              onClick={handleVerify}
              className="w-full mt-4 btn-secondary text-sm"
            >
              🔍 Verify Fairness
            </button>
          </div>
        )}

        {/* Provably Fair info (always visible) */}
        <div className="mt-4 text-center">
          <button 
            onClick={() => setShowFairnessDetails(!showFairnessDetails)}
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            🔒 Provably Fair • TOTP-SHA256 • Click for details
          </button>
        </div>
      </div>
    </div>
  )
}
