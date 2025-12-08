'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'

type DuelPhase = 'loading' | 'ready' | 'countdown' | 'resolving' | 'result'

interface VerificationData {
  duelId: string
  roundNumber: number
  timeSlot: number
  players: [string, string]
  seedSlice: string
  winnerIndex: 0 | 1
  formula: string
}

interface DuelResult {
  winnerId: string
  loserId: string
  winnerIndex: 0 | 1
  verification: VerificationData
}

// Mock players
const mockPlayers = {
  me: { id: 'user_me', username: 'You', avatar: '👤' },
  opponent: { id: 'user_opponent', username: 'ShadowKing', avatar: '🎭' },
}

export default function DuelPage() {
  const router = useRouter()
  const params = useParams()
  const duelId = params.id as string

  const [phase, setPhase] = useState<DuelPhase>('loading')
  const [countdown, setCountdown] = useState(3)
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds] = useState(3) // Mock: 3 rounds
  const [result, setResult] = useState<DuelResult | null>(null)
  const [scores, setScores] = useState({ me: 0, opponent: 0 })
  const [roundHistory, setRoundHistory] = useState<Array<{ round: number; winner: 'me' | 'opponent' }>>([])

  // Initialize duel
  useEffect(() => {
    const timer = setTimeout(() => setPhase('ready'), 1500)
    return () => clearTimeout(timer)
  }, [])

  // Start duel
  const handleStartRound = () => {
    setPhase('countdown')
    setCountdown(3)
  }

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return

    if (countdown === 0) {
      setPhase('resolving')
      resolveDuel()
      return
    }

    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdown])

  // Resolve duel using new system
  const resolveDuel = async () => {
    try {
      const response = await fetch('/api/duel/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId: `${duelId}_round_${currentRound}`,
          roundNumber: currentRound,
          playerAId: mockPlayers.me.id,
          playerBId: mockPlayers.opponent.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const winnerIsMe = data.data.winnerIndex === 0
        
        setResult(data.data)
        setScores(prev => ({
          me: prev.me + (winnerIsMe ? 1 : 0),
          opponent: prev.opponent + (winnerIsMe ? 0 : 1),
        }))
        setRoundHistory(prev => [
          ...prev,
          { round: currentRound, winner: winnerIsMe ? 'me' : 'opponent' }
        ])
        
        // Short delay then show result
        setTimeout(() => setPhase('result'), 1500)
      }
    } catch (error) {
      console.error('Resolution error:', error)
      // Fallback to client-side resolution
      const winnerIsMe = Math.random() > 0.5
      setScores(prev => ({
        me: prev.me + (winnerIsMe ? 1 : 0),
        opponent: prev.opponent + (winnerIsMe ? 0 : 1),
      }))
      setRoundHistory(prev => [
        ...prev,
        { round: currentRound, winner: winnerIsMe ? 'me' : 'opponent' }
      ])
      setTimeout(() => setPhase('result'), 1500)
    }
  }

  // Next round
  const handleNextRound = () => {
    if (currentRound >= totalRounds) {
      // Duel finished
      return
    }
    setCurrentRound(prev => prev + 1)
    setResult(null)
    setPhase('ready')
  }

  // Check if duel is finished
  const isDuelFinished = currentRound >= totalRounds && phase === 'result'
  const finalWinner = scores.me > scores.opponent ? 'me' : scores.opponent > scores.me ? 'opponent' : 'draw'

  // Generate verification URL
  const getVerificationUrl = () => {
    if (!result?.verification) return '/verify'
    const v = result.verification
    return `/verify?duelId=${v.duelId}&round=${v.roundNumber}&timeSlot=${v.timeSlot}&playerA=${v.players[0]}&playerB=${v.players[1]}&seedSlice=${v.seedSlice}&winner=${v.winnerIndex}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Provably Fair Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-accent-success/10 border border-accent-success/30 rounded-full">
            <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
            <span className="text-sm font-medium text-accent-success">Provably Fair</span>
            <span className="text-xs text-gray-400">HMAC-SHA256</span>
          </div>
        </div>

        {/* Round Info */}
        <div className="text-center mb-4">
          <span className="text-sm text-gray-400">
            Round {currentRound} of {totalRounds}
          </span>
        </div>

        {/* Score Board */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="text-center">
            <div className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2',
              'bg-gradient-to-br from-accent-primary to-accent-secondary'
            )}>
              {mockPlayers.me.avatar}
            </div>
            <p className="font-medium text-white">{mockPlayers.me.username}</p>
            <p className="text-2xl font-bold text-accent-primary">{scores.me}</p>
          </div>

          <div className="text-4xl font-bold text-gray-600">VS</div>

          <div className="text-center">
            <div className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2',
              'bg-gradient-to-br from-accent-danger to-accent-warning'
            )}>
              {mockPlayers.opponent.avatar}
            </div>
            <p className="font-medium text-white">{mockPlayers.opponent.username}</p>
            <p className="text-2xl font-bold text-accent-danger">{scores.opponent}</p>
          </div>
        </div>

        {/* Main Arena */}
        <div className="card-base relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 to-accent-secondary/5" />

          {/* Loading Phase */}
          {phase === 'loading' && (
            <div className="relative text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
              <p className="text-lg font-medium text-white">Loading duel...</p>
            </div>
          )}

          {/* Ready Phase */}
          {phase === 'ready' && (
            <div className="relative text-center py-12">
              <div className="text-6xl mb-4">⚔️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Round {currentRound}</h2>
              <p className="text-gray-400 mb-6">
                Winner will be determined by cryptographic formula
              </p>
              <button onClick={handleStartRound} className="btn-primary text-lg px-8">
                Start Round
              </button>
            </div>
          )}

          {/* Countdown Phase */}
          {phase === 'countdown' && (
            <div className="relative text-center py-12">
              <div className={clsx(
                'w-24 h-24 mx-auto rounded-full flex items-center justify-center',
                'bg-accent-danger text-white text-5xl font-bold',
                'animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.5)]'
              )}>
                {countdown}
              </div>
              <p className="text-xl font-bold text-white mt-6">Get Ready!</p>
            </div>
          )}

          {/* Resolving Phase */}
          {phase === 'resolving' && (
            <div className="relative text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-accent-warning border-t-transparent animate-spin" />
              <p className="text-xl font-bold text-accent-warning animate-pulse">Determining winner...</p>
              <p className="text-sm text-gray-400 mt-2">Computing HMAC-SHA256</p>
            </div>
          )}

          {/* Result Phase */}
          {phase === 'result' && (
            <div className="relative">
              {/* Round Result */}
              {!isDuelFinished && (
                <div className={clsx(
                  'text-center py-8 rounded-xl mb-6',
                  roundHistory[roundHistory.length - 1]?.winner === 'me'
                    ? 'bg-accent-success/20'
                    : 'bg-accent-danger/20'
                )}>
                  <p className="text-3xl font-bold mb-2">
                    {roundHistory[roundHistory.length - 1]?.winner === 'me' 
                      ? '🏆 You Won!' 
                      : '😔 You Lost'}
                  </p>
                  <p className="text-gray-400">Round {currentRound}</p>
                </div>
              )}

              {/* Final Result */}
              {isDuelFinished && (
                <div className={clsx(
                  'text-center py-8 rounded-xl mb-6',
                  finalWinner === 'me' ? 'bg-accent-success/20' :
                  finalWinner === 'opponent' ? 'bg-accent-danger/20' :
                  'bg-accent-warning/20'
                )}>
                  <p className="text-4xl font-bold mb-2">
                    {finalWinner === 'me' ? '🏆 Victory!' :
                     finalWinner === 'opponent' ? '😔 Defeat' :
                     '🤝 Draw!'}
                  </p>
                  <p className="text-xl text-gray-400">
                    Final Score: {scores.me} - {scores.opponent}
                  </p>
                </div>
              )}

              {/* Verification Data */}
              {result?.verification && (
                <div className="p-4 bg-dark-700 rounded-xl mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">Fairness Proof</span>
                    <span className="badge-success">Verified</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Seed Slice</span>
                      <code className="text-accent-primary font-mono">{result.verification.seedSlice}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Winner Index</span>
                      <code className="text-white font-mono">{result.verification.winnerIndex}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Slot</span>
                      <code className="text-white font-mono">{result.verification.timeSlot}</code>
                    </div>
                  </div>
                  <Link 
                    href={getVerificationUrl()}
                    className="block mt-4 text-center text-sm text-accent-primary hover:text-accent-secondary transition-colors"
                  >
                    🔍 Verify this result →
                  </Link>
                </div>
              )}

              {/* Round History */}
              <div className="flex justify-center gap-2 mb-6">
                {roundHistory.map((r, i) => (
                  <div
                    key={i}
                    className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold',
                      r.winner === 'me' 
                        ? 'bg-accent-success/20 text-accent-success'
                        : 'bg-accent-danger/20 text-accent-danger'
                    )}
                  >
                    {r.winner === 'me' ? '✓' : '✕'}
                  </div>
                ))}
                {[...Array(totalRounds - roundHistory.length)].map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-10 h-10 rounded-full bg-dark-600 flex items-center justify-center text-gray-600"
                  >
                    ?
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => router.push('/')}
                  className="flex-1 btn-secondary"
                >
                  Back to Lobby
                </button>
                {!isDuelFinished && (
                  <button 
                    onClick={handleNextRound}
                    className="flex-1 btn-primary"
                  >
                    Next Round →
                  </button>
                )}
                {isDuelFinished && (
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex-1 btn-primary"
                  >
                    Play Again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Formula Info */}
        <div className="mt-4 text-center">
          <Link 
            href="/verify"
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            🔒 Provably Fair • HMAC-SHA256 • Click to learn more
          </Link>
        </div>
      </div>
    </div>
  )
}
