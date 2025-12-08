'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { mockUsers, currentUser } from '@/data/mock'
import { 
  compareTOTPCodes, 
  formatTOTPCode, 
  getResultMessage,
  getResultColor,
  DuelResult,
  INPUT_WINDOW_MS
} from '@/lib/duelEngine'
import { TOTPInput, TOTPDisplay, CountdownTimer } from '@/components/TOTPInput'
import { FairnessBadge } from '@/components/FairnessBadge'
import { clsx } from 'clsx'

type DuelPhase = 'waiting' | 'countdown' | 'input' | 'reveal' | 'result'

export default function DuelPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<DuelPhase>('waiting')
  const [countdown, setCountdown] = useState(3)
  const [inputTimeLeft, setInputTimeLeft] = useState(10)
  const [playerCode, setPlayerCode] = useState<string | null>(null)
  const [opponentCode, setOpponentCode] = useState<string | null>(null)
  const [result, setResult] = useState<DuelResult | null>(null)
  const [playerSubmitted, setPlayerSubmitted] = useState(false)
  const [opponentSubmitted, setOpponentSubmitted] = useState(false)

  const opponent = mockUsers[0]

  // Phase transitions
  useEffect(() => {
    if (phase === 'waiting') {
      const timer = setTimeout(() => setPhase('countdown'), 2000)
      return () => clearTimeout(timer)
    }
  }, [phase])

  // Countdown phase
  useEffect(() => {
    if (phase !== 'countdown') return

    if (countdown === 0) {
      setPhase('input')
      return
    }

    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdown])

  // Input timer
  useEffect(() => {
    if (phase !== 'input') return

    if (inputTimeLeft === 0) {
      // Time's up - process results
      handleTimeUp()
      return
    }

    const timer = setTimeout(() => setInputTimeLeft(prev => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, inputTimeLeft])

  // Simulate opponent input (random delay, random code)
  useEffect(() => {
    if (phase !== 'input' || opponentSubmitted) return

    const delay = 2000 + Math.random() * 5000 // 2-7 seconds
    const timer = setTimeout(() => {
      const code = Math.floor(Math.random() * 1000000)
      setOpponentCode(formatTOTPCode(code))
      setOpponentSubmitted(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [phase, opponentSubmitted])

  // Check if both submitted
  useEffect(() => {
    if (playerSubmitted && opponentSubmitted && phase === 'input') {
      setTimeout(() => setPhase('reveal'), 500)
    }
  }, [playerSubmitted, opponentSubmitted, phase])

  // Reveal phase - show codes and result
  useEffect(() => {
    if (phase !== 'reveal') return

    const timer = setTimeout(() => {
      // Calculate result
      const p1Code = parseInt(playerCode || '0')
      const p2Code = parseInt(opponentCode || '0')
      const duelResult = compareTOTPCodes(p1Code, p2Code)
      setResult(duelResult)
      setPhase('result')
    }, 2000)

    return () => clearTimeout(timer)
  }, [phase, playerCode, opponentCode])

  const handlePlayerSubmit = useCallback((code: string) => {
    if (playerSubmitted) return
    setPlayerCode(code)
    setPlayerSubmitted(true)
  }, [playerSubmitted])

  const handleTimeUp = () => {
    // If player didn't submit, use 000000
    if (!playerSubmitted) {
      setPlayerCode('000000')
    }
    // If opponent didn't submit, use 000000
    if (!opponentSubmitted) {
      setOpponentCode('000000')
    }
    setPhase('reveal')
  }

  const getStakeChange = () => {
    if (result === 'draw') return { text: '0', color: 'text-accent-warning' }
    if (result === 'player1') return { text: '+1,000 💎', color: 'text-accent-success' }
    return { text: '-1,000 💎', color: 'text-accent-danger' }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Fairness Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <FairnessBadge />
        </div>

        {/* Duel Arena */}
        <div className="card-base relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 to-accent-secondary/5" />
          
          {/* Waiting Phase */}
          {phase === 'waiting' && (
            <div className="relative text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
              <p className="text-lg font-medium text-white">Matching opponent...</p>
              <p className="text-sm text-gray-400 mt-2">Preparing duel arena</p>
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
              <p className="text-xl font-bold text-white mt-6">GET READY!</p>
              <p className="text-gray-400 mt-2">Open Google Authenticator</p>
            </div>
          )}

          {/* Input Phase */}
          {phase === 'input' && (
            <div className="relative">
              {/* Players Header */}
              <div className="flex items-center justify-between mb-6">
                {/* You */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-lg font-bold">
                    {currentUser.username[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{currentUser.username}</p>
                    <p className="text-xs text-gray-400">You</p>
                  </div>
                </div>

                <div className="text-2xl font-bold text-gray-600">VS</div>

                {/* Opponent */}
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-semibold text-white text-right">{opponent.username}</p>
                    <p className="text-xs text-gray-400 text-right">
                      {opponentSubmitted ? '✓ Submitted' : '⏳ Entering...'}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-danger to-accent-warning flex items-center justify-center text-lg font-bold">
                    {opponent.username[0]}
                  </div>
                </div>
              </div>

              {/* Timer */}
              <CountdownTimer 
                seconds={inputTimeLeft} 
                total={10} 
                label="Time remaining" 
              />

              {/* Input Area */}
              <div className="mt-6 p-6 bg-dark-700/50 rounded-2xl">
                {!playerSubmitted ? (
                  <TOTPInput
                    onSubmit={handlePlayerSubmit}
                    timeLeft={inputTimeLeft}
                    label="Enter your TOTP code"
                  />
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-success/20 flex items-center justify-center">
                      <span className="text-3xl">✓</span>
                    </div>
                    <p className="text-lg font-medium text-accent-success">Code Submitted!</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {opponentSubmitted ? 'Revealing results...' : 'Waiting for opponent...'}
                    </p>
                  </div>
                )}
              </div>

              {/* Stake Info */}
              <div className="mt-4 p-3 bg-dark-700 rounded-xl text-center">
                <p className="text-sm text-gray-400">Stake</p>
                <p className="text-xl font-bold text-accent-warning">💎 1,000</p>
              </div>
            </div>
          )}

          {/* Reveal Phase */}
          {phase === 'reveal' && (
            <div className="relative text-center py-8">
              <p className="text-xl font-bold text-white mb-8 animate-pulse">
                Revealing codes...
              </p>
              
              <div className="flex items-center justify-around">
                {/* Player Code */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">{currentUser.username}</p>
                  <TOTPDisplay 
                    code={playerCode || '000000'} 
                    highlight="none"
                  />
                </div>

                <div className="text-2xl font-bold text-gray-600">VS</div>

                {/* Opponent Code */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">{opponent.username}</p>
                  <TOTPDisplay 
                    code={opponentCode || '000000'} 
                    highlight="none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Result Phase */}
          {phase === 'result' && result && (
            <div className="relative">
              {/* Result Banner */}
              <div className={clsx(
                'text-center py-6 rounded-xl mb-6',
                result === 'player1' && 'bg-accent-success/20',
                result === 'player2' && 'bg-accent-danger/20',
                result === 'draw' && 'bg-accent-warning/20'
              )}>
                <p className={clsx('text-3xl font-bold', getResultColor(result, true))}>
                  {getResultMessage(result, true)}
                </p>
                <p className={clsx('text-xl font-semibold mt-2', getStakeChange().color)}>
                  {getStakeChange().text}
                </p>
              </div>

              {/* Codes Comparison */}
              <div className="flex items-stretch justify-around mb-6">
                {/* Player */}
                <div className={clsx(
                  'flex-1 p-4 rounded-xl mr-2',
                  result === 'player1' && 'bg-accent-success/10 ring-2 ring-accent-success',
                  result === 'player2' && 'bg-dark-700 opacity-60',
                  result === 'draw' && 'bg-accent-warning/10'
                )}>
                  <p className="text-sm text-gray-400 text-center mb-2">
                    {currentUser.username}
                    {result === 'player1' && ' 🏆'}
                  </p>
                  <TOTPDisplay 
                    code={playerCode || '000000'} 
                    highlight={result === 'player1' ? 'win' : result === 'draw' ? 'draw' : 'lose'}
                  />
                  <p className="text-center mt-2 font-mono text-lg text-white">
                    {parseInt(playerCode || '0').toLocaleString()}
                  </p>
                </div>

                {/* VS */}
                <div className="flex items-center px-4">
                  <span className={clsx(
                    'text-sm font-medium px-2 py-1 rounded',
                    result === 'player1' && 'text-accent-success',
                    result === 'player2' && 'text-accent-danger',
                    result === 'draw' && 'text-accent-warning bg-accent-warning/20'
                  )}>
                    {result === 'player1' ? '>' : result === 'player2' ? '<' : '='}
                  </span>
                </div>

                {/* Opponent */}
                <div className={clsx(
                  'flex-1 p-4 rounded-xl ml-2',
                  result === 'player2' && 'bg-accent-success/10 ring-2 ring-accent-success',
                  result === 'player1' && 'bg-dark-700 opacity-60',
                  result === 'draw' && 'bg-accent-warning/10'
                )}>
                  <p className="text-sm text-gray-400 text-center mb-2">
                    {opponent.username}
                    {result === 'player2' && ' 🏆'}
                  </p>
                  <TOTPDisplay 
                    code={opponentCode || '000000'} 
                    highlight={result === 'player2' ? 'win' : result === 'draw' ? 'draw' : 'lose'}
                  />
                  <p className="text-center mt-2 font-mono text-lg text-white">
                    {parseInt(opponentCode || '0').toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Draw Explanation */}
              {result === 'draw' && (
                <div className="p-4 bg-accent-warning/10 border border-accent-warning/30 rounded-xl mb-6 text-center">
                  <p className="text-accent-warning font-medium">🎲 Incredible! Both codes are identical!</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Probability: 1 in 1,000,000 (0.0001%)
                  </p>
                  <p className="text-sm text-gray-400">
                    Stakes have been returned to both players.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => router.push('/')}
                  className="flex-1 btn-secondary"
                >
                  Back to Lobby
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 btn-primary"
                >
                  Rematch
                </button>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-4 text-center">
          <button className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
            🔒 Provably Fair • Higher code wins • Equal codes = Draw
          </button>
        </div>
      </div>
    </div>
  )
}
