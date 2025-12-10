'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'
import { NumberInput } from '@/components/NumberInput'
import { useAuth } from '@/contexts/AuthContext'

type DuelPhase = 'loading' | 'input' | 'waiting_opponent' | 'both_ready' | 'resolving' | 'result'

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

interface OfferData {
  id: string
  creatorUserId: string
  opponentUserId: string | null
  chipType: string
  chipPointsValue: number
  gamesCount: number
  status: string
  owner: { id: string; username: string }
}

export default function DuelPage() {
  const router = useRouter()
  const params = useParams()
  const duelId = params.id as string
  const { user, isAuthenticated } = useAuth()

  const [phase, setPhase] = useState<DuelPhase>('loading')
  const [currentRound, setCurrentRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(3)
  
  const [offer, setOffer] = useState<OfferData | null>(null)
  const [isCreator, setIsCreator] = useState(false)
  const [me, setMe] = useState<PlayerState | null>(null)
  const [opponent, setOpponent] = useState<PlayerState | null>(null)
  const [result, setResult] = useState<RoundResult | null>(null)
  
  const [scores, setScores] = useState({ me: 0, opponent: 0 })
  const [roundHistory, setRoundHistory] = useState<Array<{ 
    round: number
    winner: 'me' | 'opponent' | 'draw'
    myNumber: number
    opponentNumber: number
    randomNumber: number
  }>>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Load offer data
  const loadOffer = useCallback(async () => {
    try {
      const response = await fetch(`/api/p2p/orders/${duelId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        const offerData = data.data
        setOffer(offerData)
        setTotalRounds(offerData.gamesPlanned || 3)
        
        // Determine who is who
        const amCreator = user?.id === offerData.owner?.id
        setIsCreator(amCreator)
        
        // Set me
        setMe({
          id: user?.id || '',
          username: user?.username || 'You',
          avatar: amCreator ? '👤' : '🎭',
          number: null,
          distance: null,
          isReady: false,
        })
        
        // Set opponent
        setOpponent({
          id: amCreator ? (offerData.opponentUserId || 'opponent') : offerData.owner?.id,
          username: amCreator ? 'Opponent' : (offerData.owner?.username || 'Creator'),
          avatar: amCreator ? '🎭' : '👤',
          number: null,
          distance: null,
          isReady: false,
        })
        
        setPhase('input')
      } else {
        setError('Failed to load duel')
      }
    } catch (err) {
      console.error('Error loading offer:', err)
      setError('Network error')
    }
  }, [duelId, user])

  // Initialize
  useEffect(() => {
    if (isAuthenticated && user) {
      loadOffer()
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [isAuthenticated, user, loadOffer])

  // Handle my number change
  const handleMyNumberChange = (num: number | null) => {
    if (!me) return
    setMe(prev => prev ? { ...prev, number: num } : null)
  }

  // Submit my number to server
  const handleSubmitNumber = async () => {
    if (!me || me.number === null) return
    
    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/duel/${duelId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNumber: currentRound,
          playerNumber: me.number,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMe(prev => prev ? { ...prev, isReady: true } : null)
        
        if (data.data.bothReady) {
          // Both ready - go to resolving
          setPhase('both_ready')
          setTimeout(() => checkStatus(), 500)
        } else {
          // Wait for opponent
          setPhase('waiting_opponent')
          startPolling()
        }
      } else {
        setError(data.error || 'Failed to submit')
      }
    } catch (err) {
      console.error('Submit error:', err)
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  // Start polling for opponent
  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    
    pollingRef.current = setInterval(() => {
      checkStatus()
    }, 2000) // Check every 2 seconds
  }

  // Check game status
  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/duel/${duelId}/status?round=${currentRound}`)
      const data = await response.json()

      if (data.success) {
        const { status, bothReady, opponentSubmitted, result: gameResult } = data.data

        // Update opponent status
        if (opponentSubmitted) {
          setOpponent(prev => prev ? { ...prev, isReady: true } : null)
        }

        if (status === 'finished' && gameResult) {
          // Game finished - show result
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          
          handleGameResult(gameResult)
        } else if (bothReady) {
          // Both ready - wait for result
          setPhase('resolving')
        }
      }
    } catch (err) {
      console.error('Status check error:', err)
    }
  }

  // Handle game result from server
  const handleGameResult = (gameResult: any) => {
    if (!me || !opponent) return

    const { randomNumber, creatorNumber, opponentNumber, creatorDistance, opponentDistance, winnerId, isDraw, verification } = gameResult

    // Set numbers and distances based on role
    const myNumber = isCreator ? creatorNumber : opponentNumber
    const theirNumber = isCreator ? opponentNumber : creatorNumber
    const myDistance = isCreator ? creatorDistance : opponentDistance
    const theirDistance = isCreator ? opponentDistance : creatorDistance

    setMe(prev => prev ? { ...prev, number: myNumber, distance: myDistance } : null)
    setOpponent(prev => prev ? { ...prev, number: theirNumber, distance: theirDistance } : null)

    // Set result
    setResult({
      randomNumber,
      winnerId,
      isDraw,
      verification: verification || { seedSlice: '', timeSlot: 0, formula: '' },
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
          myNumber,
          opponentNumber: theirNumber,
          randomNumber,
        }
      ])
    } else {
      setRoundHistory(prev => [
        ...prev,
        {
          round: currentRound,
          winner: 'draw',
          myNumber,
          opponentNumber: theirNumber,
          randomNumber,
        }
      ])
    }

    setPhase('result')
  }

  // Next round
  const handleNextRound = () => {
    if (currentRound >= totalRounds) return
    setCurrentRound(prev => prev + 1)
    setMe(prev => prev ? { ...prev, number: null, distance: null, isReady: false } : null)
    setOpponent(prev => prev ? { ...prev, number: null, distance: null, isReady: false } : null)
    setResult(null)
    setPhase('input')
  }

  // Check if duel is finished
  const isDuelFinished = currentRound >= totalRounds && phase === 'result'
  const finalWinner = scores.me > scores.opponent ? 'me' : scores.opponent > scores.me ? 'opponent' : 'draw'

  // Loading / Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please login to play</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-accent-danger mb-4">{error}</p>
          <Link href="/offers" className="btn-primary">Back to Offers</Link>
        </div>
      </div>
    )
  }

  if (!me || !opponent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 mx-auto rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
      </div>
    )
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
          {offer && (
            <span className="ml-4 text-sm text-accent-warning">
              {offer.chipPointsValue} pts/round
            </span>
          )}
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
            {me.isReady && phase !== 'result' && (
              <span className="text-xs text-accent-success">✓ Ready</span>
            )}
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
            {opponent.isReady && phase !== 'result' && (
              <span className="text-xs text-accent-success">✓ Ready</span>
            )}
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
                Enter a number from 0 to 999,999. The closest to the random number wins!
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <NumberInput
                  value={me.number}
                  onChange={handleMyNumberChange}
                  disabled={false}
                  label="Your Number"
                />
                <NumberInput
                  value={null}
                  onChange={() => {}}
                  disabled={true}
                  isOpponent={true}
                  isRevealed={false}
                  label="Opponent's Number"
                />
              </div>
              
              <button 
                onClick={handleSubmitNumber}
                disabled={me.number === null || submitting}
                className={clsx(
                  'w-full btn-primary text-lg py-4',
                  (me.number === null || submitting) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {submitting ? 'Submitting...' : 'Lock In Number'}
              </button>
            </div>
          )}

          {/* Waiting for Opponent Phase */}
          {phase === 'waiting_opponent' && (
            <div className="relative py-8">
              <h2 className="text-xl font-bold text-white text-center mb-6">
                Number Locked! ✓
              </h2>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-accent-success/10 border border-accent-success/30 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">Your Number</p>
                  <p className="text-3xl font-bold font-mono text-accent-success">
                    {me.number?.toLocaleString()}
                  </p>
                  <p className="text-xs text-accent-success mt-2">✓ Submitted</p>
                </div>
                <div className="text-center p-4 bg-dark-700 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">Opponent</p>
                  <p className="text-3xl font-bold font-mono text-gray-500">
                    ???,???
                  </p>
                  <p className="text-xs text-accent-warning mt-2">⏳ Waiting...</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-gray-400 text-center">Waiting for opponent to submit their number...</p>
              <p className="text-xs text-gray-500 text-center mt-2">Page will update automatically</p>
            </div>
          )}

          {/* Both Ready Phase */}
          {phase === 'both_ready' && (
            <div className="relative text-center py-8">
              <h2 className="text-xl font-bold text-accent-success mb-6">Both Players Ready!</h2>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-accent-success/10 border border-accent-success/30 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">You</p>
                  <p className="text-3xl font-bold font-mono text-accent-success">✓</p>
                </div>
                <div className="text-center p-4 bg-accent-success/10 border border-accent-success/30 rounded-xl">
                  <p className="text-sm text-gray-400 mb-2">{opponent.username}</p>
                  <p className="text-3xl font-bold font-mono text-accent-success">✓</p>
                </div>
              </div>
              
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent-warning border-t-transparent animate-spin" />
              <p className="text-lg text-white">Calculating result...</p>
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

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => router.push('/my-duels')}
                  className="flex-1 btn-secondary"
                >
                  Back to My Duels
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
                  <Link href="/offers" className="flex-1 btn-primary text-center">
                    New Duel
                  </Link>
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
            🔒 Provably Fair • Closest Number Wins
          </Link>
        </div>
      </div>
    </div>
  )
}
