'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'
import { NumberInput } from '@/components/NumberInput'

type DuelPhase = 'loading' | 'input' | 'waiting' | 'countdown' | 'resolving' | 'result'

interface PlayerState {
  id: string
  username: string
  avatar: string
  number: number | null
  distance: number | null
  isReady: boolean
}

interface RoundResult {
  randomNumber: number
  winnerId: string | null
  isDraw: boolean
  verification: {
    seedSlice: string
    timeSlot: number
    formula: string
  }
}

// Mock players
const mockMe: PlayerState = {
  id: 'user_me',
  username: 'You',
  avatar: '👤',
  number: null,
  distance: null,
  isReady: false,
}

const mockOpponent: PlayerState = {
  id: 'user_opponent',
  username: 'ShadowKing',
  avatar: '🎭',
  number: null,
  distance: null,
  isReady: false,
}

export default function DuelPage() {
  const router = useRouter()
  const params = useParams()
  const duelId = params.id as string

  const [phase, setPhase] = useState<DuelPhase>('loading')
  const [countdown, setCountdown] = useState(3)
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds] = useState(3)
  
  const [me, setMe] = useState<PlayerState>(mockMe)
  const [opponent, setOpponent] = useState<PlayerState>(mockOpponent)
  const [result, setResult] = useState<RoundResult | null>(null)
  
  const [scores, setScores] = useState({ me: 0, opponent: 0 })
  const [roundHistory, setRoundHistory] = useState<Array<{ 
    round: number
    winner: 'me' | 'opponent' | 'draw'
    myNumber: number
    opponentNumber: number
    randomNumber: number
  }>>([])

  // Initialize duel
  useEffect(() => {
    const timer = setTimeout(() => setPhase('input'), 1500)
    return () => clearTimeout(timer)
  }, [])

  // Handle my number change
  const handleMyNumberChange = (num: number | null) => {
    setMe(prev => ({ ...prev, number: num }))
  }

  // Submit my number and wait for opponent
  const handleSubmitNumber = () => {
    if (me.number === null) return
    
    setMe(prev => ({ ...prev, isReady: true }))
    setPhase('waiting')
    
    // Simulate opponent submitting (random number between 0-999999)
    setTimeout(() => {
      const opponentNumber = Math.floor(Math.random() * 1000000)
      setOpponent(prev => ({ ...prev, number: opponentNumber, isReady: true }))
      
      // Start countdown
      setTimeout(() => {
        setPhase('countdown')
        setCountdown(3)
      }, 500)
    }, 1500 + Math.random() * 2000)
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

  // Resolve duel
  const resolveDuel = async () => {
    try {
      const response = await fetch('/api/duel/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duelId: `${duelId}_round_${currentRound}`,
          roundNumber: currentRound,
          playerAId: me.id,
          playerBId: opponent.id,
          playerANumber: me.number,
          playerBNumber: opponent.number,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const { randomNumber, playerA, playerB, winnerId, isDraw, verification } = data.data
        
        // Update distances
        setMe(prev => ({ ...prev, distance: playerA.distance }))
        setOpponent(prev => ({ ...prev, distance: playerB.distance }))
        
        // Set result
        setResult({
          randomNumber,
          winnerId,
          isDraw,
          verification: {
            seedSlice: verification.seedSlice,
            timeSlot: verification.timeSlot,
            formula: verification.formula,
          },
        })

        // Update scores
        if (!isDraw) {
          const winnerIsMe = winnerId === me.id
          setScores(prev => ({
            me: prev.me + (winnerIsMe ? 1 : 0),
            opponent: prev.opponent + (winnerIsMe ? 0 : 1),
          }))
          setRoundHistory(prev => [
            ...prev,
            {
              round: currentRound,
              winner: winnerIsMe ? 'me' : 'opponent',
              myNumber: me.number!,
              opponentNumber: opponent.number!,
              randomNumber,
            }
          ])
        } else {
          setRoundHistory(prev => [
            ...prev,
            {
              round: currentRound,
              winner: 'draw',
              myNumber: me.number!,
              opponentNumber: opponent.number!,
              randomNumber,
            }
          ])
        }
        
        setTimeout(() => setPhase('result'), 1500)
      }
    } catch (error) {
      console.error('Resolution error:', error)
      // Fallback
      const randomNumber = Math.floor(Math.random() * 1000000)
      const distanceMe = Math.abs(me.number! - randomNumber)
      const distanceOpp = Math.abs(opponent.number! - randomNumber)
      const winnerIsMe = distanceMe < distanceOpp
      const isDraw = distanceMe === distanceOpp
      
      setMe(prev => ({ ...prev, distance: distanceMe }))
      setOpponent(prev => ({ ...prev, distance: distanceOpp }))
      
      if (!isDraw) {
        setScores(prev => ({
          me: prev.me + (winnerIsMe ? 1 : 0),
          opponent: prev.opponent + (winnerIsMe ? 0 : 1),
        }))
      }
      
      setResult({ randomNumber, winnerId: isDraw ? null : (winnerIsMe ? me.id : opponent.id), isDraw, verification: { seedSlice: 'fallback', timeSlot: 0, formula: '' } })
      setRoundHistory(prev => [...prev, { round: currentRound, winner: isDraw ? 'draw' : (winnerIsMe ? 'me' : 'opponent'), myNumber: me.number!, opponentNumber: opponent.number!, randomNumber }])
      setTimeout(() => setPhase('result'), 1500)
    }
  }

  // Next round
  const handleNextRound = () => {
    if (currentRound >= totalRounds) return
    setCurrentRound(prev => prev + 1)
    setMe(prev => ({ ...prev, number: null, distance: null, isReady: false }))
    setOpponent(prev => ({ ...prev, number: null, distance: null, isReady: false }))
    setResult(null)
    setPhase('input')
  }

  // Check if duel is finished
  const isDuelFinished = currentRound >= totalRounds && phase === 'result'
  const finalWinner = scores.me > scores.opponent ? 'me' : scores.opponent > scores.me ? 'opponent' : 'draw'

  // Generate verification URL
  const getVerificationUrl = () => {
    if (!result?.verification) return '/verify'
    return `/verify?duelId=${duelId}_round_${currentRound}&round=${currentRound}&timeSlot=${result.verification.timeSlot}&playerA=${me.id}&playerANumber=${me.number}&playerB=${opponent.id}&playerBNumber=${opponent.number}&seedSlice=${result.verification.seedSlice}&random=${result.randomNumber}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Provably Fair Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-accent-success/10 border border-accent-success/30 rounded-full">
            <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
            <span className="text-sm font-medium text-accent-success">Provably Fair</span>
            <span className="text-xs text-gray-400">Closest Number Wins</span>
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
              {me.avatar}
            </div>
            <p className="font-medium text-white">{me.username}</p>
            <p className="text-2xl font-bold text-accent-primary">{scores.me}</p>
          </div>

          <div className="text-4xl font-bold text-gray-600">VS</div>

          <div className="text-center">
            <div className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2',
              'bg-gradient-to-br from-accent-danger to-accent-warning'
            )}>
              {opponent.avatar}
            </div>
            <p className="font-medium text-white">{opponent.username}</p>
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

          {/* Input Phase */}
          {phase === 'input' && (
            <div className="relative py-8">
              <h2 className="text-2xl font-bold text-white text-center mb-6">
                Choose Your Number
              </h2>
              <p className="text-gray-400 text-center mb-8">
                The player with the number closest to the random number wins!
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <NumberInput
                  value={me.number}
                  onChange={handleMyNumberChange}
                  disabled={false}
                  label="Your Number"
                />
                <NumberInput
                  value={opponent.number}
                  onChange={() => {}}
                  disabled={true}
                  isOpponent={true}
                  isRevealed={false}
                  label="Opponent's Number"
                />
              </div>
              
              <button 
                onClick={handleSubmitNumber}
                disabled={me.number === null}
                className={clsx(
                  'w-full btn-primary text-lg py-4',
                  me.number === null && 'opacity-50 cursor-not-allowed'
                )}
              >
                Lock In Number
              </button>
            </div>
          )}

          {/* Waiting Phase */}
          {phase === 'waiting' && (
            <div className="relative py-8">
              <h2 className="text-xl font-bold text-white text-center mb-6">
                Number Locked! ✓
              </h2>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-accent-primary/10 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">Your Number</p>
                  <p className="text-3xl font-bold font-mono text-accent-primary">
                    {me.number?.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-dark-700 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">Opponent</p>
                  <p className="text-3xl font-bold font-mono text-gray-500">
                    ???,???
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-gray-400 text-center mt-3">Waiting for opponent...</p>
            </div>
          )}

          {/* Countdown Phase */}
          {phase === 'countdown' && (
            <div className="relative text-center py-8">
              <h2 className="text-xl font-bold text-white mb-6">Both Numbers Locked!</h2>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-accent-primary/10 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">You</p>
                  <p className="text-3xl font-bold font-mono text-accent-primary">
                    {me.number?.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-accent-danger/10 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">{opponent.username}</p>
                  <p className="text-3xl font-bold font-mono text-accent-danger">
                    {opponent.number?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className={clsx(
                'w-24 h-24 mx-auto rounded-full flex items-center justify-center',
                'bg-accent-danger text-white text-5xl font-bold',
                'animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.5)]'
              )}>
                {countdown}
              </div>
              <p className="text-lg text-white mt-4">Generating random number...</p>
            </div>
          )}

          {/* Resolving Phase */}
          {phase === 'resolving' && (
            <div className="relative text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-accent-warning border-t-transparent animate-spin" />
              <p className="text-xl font-bold text-accent-warning animate-pulse">Calculating...</p>
              <p className="text-sm text-gray-400 mt-2">Finding the closest number</p>
            </div>
          )}

          {/* Result Phase */}
          {phase === 'result' && result && (
            <div className="relative py-6">
              {/* Random Number Reveal */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-400 mb-2">🎲 Random Number</p>
                <p className="text-5xl font-bold font-mono text-accent-warning">
                  {result.randomNumber.toLocaleString()}
                </p>
              </div>
              
              {/* Distances */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={clsx(
                  'p-4 rounded-xl text-center',
                  !result.isDraw && result.winnerId === me.id
                    ? 'bg-accent-success/20 border border-accent-success/30'
                    : 'bg-dark-700'
                )}>
                  <p className="text-sm text-gray-400">Your Number</p>
                  <p className="text-2xl font-bold font-mono text-white">{me.number?.toLocaleString()}</p>
                  <p className="text-sm mt-1">
                    Distance: <span className={clsx(
                      'font-bold',
                      !result.isDraw && result.winnerId === me.id ? 'text-accent-success' : 'text-gray-400'
                    )}>{me.distance?.toLocaleString()}</span>
                  </p>
                  {!result.isDraw && result.winnerId === me.id && (
                    <span className="inline-block mt-2 text-sm text-accent-success font-bold">🏆 CLOSER!</span>
                  )}
                </div>
                
                <div className={clsx(
                  'p-4 rounded-xl text-center',
                  !result.isDraw && result.winnerId === opponent.id
                    ? 'bg-accent-danger/20 border border-accent-danger/30'
                    : 'bg-dark-700'
                )}>
                  <p className="text-sm text-gray-400">{opponent.username}</p>
                  <p className="text-2xl font-bold font-mono text-white">{opponent.number?.toLocaleString()}</p>
                  <p className="text-sm mt-1">
                    Distance: <span className={clsx(
                      'font-bold',
                      !result.isDraw && result.winnerId === opponent.id ? 'text-accent-danger' : 'text-gray-400'
                    )}>{opponent.distance?.toLocaleString()}</span>
                  </p>
                  {!result.isDraw && result.winnerId === opponent.id && (
                    <span className="inline-block mt-2 text-sm text-accent-danger font-bold">🏆 CLOSER!</span>
                  )}
                </div>
              </div>

              {/* Round Result Banner */}
              <div className={clsx(
                'text-center py-4 rounded-xl mb-6',
                result.isDraw
                  ? 'bg-accent-warning/20'
                  : result.winnerId === me.id
                    ? 'bg-accent-success/20'
                    : 'bg-accent-danger/20'
              )}>
                <p className="text-3xl font-bold">
                  {result.isDraw 
                    ? '🤝 Draw!' 
                    : result.winnerId === me.id 
                      ? '🏆 You Win!' 
                      : '😔 You Lose'}
                </p>
              </div>

              {/* Final Result (if duel finished) */}
              {isDuelFinished && (
                <div className={clsx(
                  'text-center py-4 rounded-xl mb-6 border-2',
                  finalWinner === 'me' ? 'bg-accent-success/20 border-accent-success' :
                  finalWinner === 'opponent' ? 'bg-accent-danger/20 border-accent-danger' :
                  'bg-accent-warning/20 border-accent-warning'
                )}>
                  <p className="text-4xl font-bold mb-2">
                    {finalWinner === 'me' ? '🏆 VICTORY!' :
                     finalWinner === 'opponent' ? '😔 DEFEAT' :
                     '🤝 DRAW!'}
                  </p>
                  <p className="text-xl text-gray-400">
                    Final Score: {scores.me} - {scores.opponent}
                  </p>
                </div>
              )}

              {/* Verification Link */}
              <div className="text-center mb-6">
                <Link 
                  href={getVerificationUrl()}
                  className="text-sm text-accent-primary hover:text-accent-secondary transition-colors"
                >
                  🔍 Verify this result →
                </Link>
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

        {/* Round History */}
        {roundHistory.length > 0 && (
          <div className="mt-4 card-base">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Round History</h3>
            <div className="space-y-2">
              {roundHistory.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-dark-700 rounded-lg">
                  <span className="text-gray-400">Round {r.round}</span>
                  <span className="font-mono">
                    <span className="text-accent-primary">{r.myNumber.toLocaleString()}</span>
                    {' vs '}
                    <span className="text-accent-danger">{r.opponentNumber.toLocaleString()}</span>
                  </span>
                  <span className="text-accent-warning font-mono">🎲 {r.randomNumber.toLocaleString()}</span>
                  <span className={clsx(
                    'font-bold',
                    r.winner === 'me' ? 'text-accent-success' :
                    r.winner === 'opponent' ? 'text-accent-danger' :
                    'text-accent-warning'
                  )}>
                    {r.winner === 'me' ? '✓ Win' : r.winner === 'opponent' ? '✗ Loss' : '= Draw'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 text-center">
          <Link 
            href="/verify"
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            🔒 Provably Fair • Closest Number Wins • Click to learn more
          </Link>
        </div>
      </div>
    </div>
  )
}
