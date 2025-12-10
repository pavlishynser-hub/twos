'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'
import { NumberInput } from '@/components/NumberInput'
import { useAuth } from '@/contexts/AuthContext'

type DuelPhase = 'loading' | 'input' | 'waiting_opponent' | 'resolving' | 'result'

interface DuelData {
  id: string
  creatorUserId: string
  opponentUserId: string | null
  creator: { id: string; username: string }
  opponent: { id: string; username: string } | null
  chipType: string
  chipPointsValue: number
  gamesCount: number
  status: string
  isCreator: boolean
  isOpponent: boolean
  myId: string
  myUsername: string
}

interface RoundResult {
  randomNumber: number
  myNumber: number
  opponentNumber: number
  myDistance: number
  opponentDistance: number
  winnerId: string | null
  isDraw: boolean
}

export default function DuelPage() {
  const router = useRouter()
  const params = useParams()
  const duelId = params.id as string
  const { isAuthenticated } = useAuth()

  const [phase, setPhase] = useState<DuelPhase>('loading')
  const [currentRound, setCurrentRound] = useState(1)
  
  const [duel, setDuel] = useState<DuelData | null>(null)
  const [myNumber, setMyNumber] = useState<number | null>(null)
  const [result, setResult] = useState<RoundResult | null>(null)
  
  const [myReady, setMyReady] = useState(false)
  const [opponentReady, setOpponentReady] = useState(false)
  
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

  // Load duel data
  const loadDuel = useCallback(async () => {
    try {
      const response = await fetch(`/api/duel/${duelId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        setDuel(data.data)
        // Check if duel is ready to play
        if (data.data.status === 'MATCHED' || data.data.status === 'IN_PROGRESS') {
          setPhase('input')
        } else if (data.data.status === 'WAITING_CREATOR_CONFIRM') {
          // Need to wait for creator confirmation
          setPhase('loading')
        } else {
          setError(`Duel is not ready. Status: ${data.data.status}`)
        }
      } else {
        setError(data.error || 'Failed to load duel')
      }
    } catch (err) {
      console.error('Error loading duel:', err)
      setError('Network error')
    }
  }, [duelId])

  // Initialize
  useEffect(() => {
    if (isAuthenticated) {
      loadDuel()
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [isAuthenticated, loadDuel])

  // Submit my number
  const handleSubmitNumber = async () => {
    if (myNumber === null || !duel) return
    
    setSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/duel/${duelId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNumber: currentRound,
          playerNumber: myNumber,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMyReady(true)
        
        if (data.data.bothReady) {
          // Both ready - check status for result
          setPhase('resolving')
          checkStatus()
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

  // Start polling
  const startPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    
    // Check immediately
    checkStatus()
    
    // Then every 2 seconds
    pollingRef.current = setInterval(() => {
      checkStatus()
    }, 2000)
  }

  // Check status
  const checkStatus = async () => {
    if (!duel) return
    
    try {
      const response = await fetch(`/api/duel/${duelId}/status?round=${currentRound}`)
      const data = await response.json()

      if (data.success) {
        const { status, bothReady, opponentSubmitted, result: gameResult } = data.data

        setOpponentReady(opponentSubmitted)

        if (status === 'finished' && gameResult) {
          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
          }
          
          // Process result
          processResult(gameResult)
        } else if (bothReady && status !== 'finished') {
          setPhase('resolving')
        }
      }
    } catch (err) {
      console.error('Status check error:', err)
    }
  }

  // Process game result
  const processResult = (gameResult: any) => {
    if (!duel) return

    const { randomNumber, creatorNumber, opponentNumber, creatorDistance, opponentDistance, winnerId, isDraw } = gameResult

    // Map to my perspective
    const myNum = duel.isCreator ? creatorNumber : opponentNumber
    const oppNum = duel.isCreator ? opponentNumber : creatorNumber
    const myDist = duel.isCreator ? creatorDistance : opponentDistance
    const oppDist = duel.isCreator ? opponentDistance : creatorDistance

    setResult({
      randomNumber,
      myNumber: myNum,
      opponentNumber: oppNum,
      myDistance: myDist,
      opponentDistance: oppDist,
      winnerId,
      isDraw,
    })

    // Update scores
    const iWon = winnerId === duel.myId
    if (!isDraw) {
      setScores(prev => ({
        me: prev.me + (iWon ? 1 : 0),
        opponent: prev.opponent + (iWon ? 0 : 1),
      }))
    }

    // Add to history
    setRoundHistory(prev => [
      ...prev,
      {
        round: currentRound,
        winner: isDraw ? 'draw' : (iWon ? 'me' : 'opponent'),
        myNumber: myNum,
        opponentNumber: oppNum,
        randomNumber,
      }
    ])

    setPhase('result')
  }

  // Next round
  const handleNextRound = () => {
    if (!duel || currentRound >= duel.gamesCount) return
    
    setCurrentRound(prev => prev + 1)
    setMyNumber(null)
    setResult(null)
    setMyReady(false)
    setOpponentReady(false)
    setPhase('input')
  }

  // Helpers
  const isDuelFinished = duel && currentRound >= duel.gamesCount && phase === 'result'
  const finalWinner = scores.me > scores.opponent ? 'me' : scores.opponent > scores.me ? 'opponent' : 'draw'
  
  const myName = duel?.myUsername || 'You'
  const opponentName = duel?.isCreator 
    ? (duel?.opponent?.username || 'Opponent')
    : (duel?.creator?.username || 'Creator')

  // Loading states
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

  if (!duel) {
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
          </div>
        </div>

        {/* Round Info */}
        <div className="text-center mb-4">
          <span className="text-sm text-gray-400">
            Round {currentRound} of {duel.gamesCount}
          </span>
          <span className="ml-4 text-sm text-accent-warning">
            {duel.chipPointsValue} pts/round
          </span>
        </div>

        {/* Score Board */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2 bg-gradient-to-br from-accent-primary to-accent-secondary">
              👤
            </div>
            <p className="font-medium text-white">{myName}</p>
            <p className="text-2xl font-bold text-accent-primary">{scores.me}</p>
            {myReady && phase !== 'result' && (
              <span className="text-xs text-accent-success">✓ Ready</span>
            )}
          </div>

          <div className="text-4xl font-bold text-gray-600">VS</div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2 bg-gradient-to-br from-accent-danger to-accent-warning">
              🎭
            </div>
            <p className="font-medium text-white">{opponentName}</p>
            <p className="text-2xl font-bold text-accent-danger">{scores.opponent}</p>
            {opponentReady && phase !== 'result' && (
              <span className="text-xs text-accent-success">✓ Ready</span>
            )}
          </div>
        </div>

        {/* Main Arena */}
        <div className="card-base relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 to-accent-secondary/5" />

          {/* Loading / Waiting for Confirm */}
          {phase === 'loading' && (
            <div className="relative text-center py-16">
              {duel?.status === 'WAITING_CREATOR_CONFIRM' ? (
                <>
                  <div className="text-6xl mb-4">⏳</div>
                  <p className="text-lg font-medium text-white mb-2">
                    {duel.isCreator 
                      ? 'Please confirm this duel in My Duels page'
                      : 'Waiting for creator to confirm...'}
                  </p>
                  <p className="text-sm text-gray-400 mb-6">
                    {duel.isCreator 
                      ? 'Go back and click CONFIRM to start'
                      : 'The game will start once they confirm'}
                  </p>
                  <Link href="/my-duels" className="btn-primary">
                    Go to My Duels
                  </Link>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-accent-primary border-t-transparent animate-spin" />
                  <p className="text-lg font-medium text-white">Loading duel...</p>
                </>
              )}
            </div>
          )}

          {/* Input Phase */}
          {phase === 'input' && (
            <div className="relative py-8">
              <h2 className="text-2xl font-bold text-white text-center mb-4">
                Choose Your Number
              </h2>
              <p className="text-gray-400 text-center mb-8">
                Enter 0-999,999. Closest to random number wins!
              </p>
              
              <div className="max-w-xs mx-auto mb-8">
                <NumberInput
                  value={myNumber}
                  onChange={setMyNumber}
                  disabled={false}
                  label="Your Number"
                />
              </div>
              
              <button 
                onClick={handleSubmitNumber}
                disabled={myNumber === null || submitting}
                className={clsx(
                  'w-full btn-primary text-lg py-4',
                  (myNumber === null || submitting) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {submitting ? 'Submitting...' : 'Lock In Number'}
              </button>
            </div>
          )}

          {/* Waiting for Opponent */}
          {phase === 'waiting_opponent' && (
            <div className="relative py-8 text-center">
              <h2 className="text-xl font-bold text-accent-success mb-6">
                ✓ Your Number Locked!
              </h2>
              
              <div className="p-6 bg-accent-success/10 border border-accent-success/30 rounded-xl mb-6">
                <p className="text-sm text-gray-400 mb-2">Your Number</p>
                <p className="text-4xl font-bold font-mono text-accent-success">
                  {myNumber?.toLocaleString()}
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 rounded-full bg-accent-warning animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-lg text-white">Waiting for {opponentName}...</p>
              <p className="text-xs text-gray-500 mt-2">Page updates automatically</p>
            </div>
          )}

          {/* Resolving */}
          {phase === 'resolving' && (
            <div className="relative text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full border-4 border-accent-warning border-t-transparent animate-spin" />
              <p className="text-xl font-bold text-accent-warning">Both Ready!</p>
              <p className="text-sm text-gray-400 mt-2">Calculating result...</p>
            </div>
          )}

          {/* Result */}
          {phase === 'result' && result && (
            <div className="relative py-6">
              {/* Random Number */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-400 mb-2">🎲 Random Number</p>
                <p className="text-5xl font-bold font-mono text-accent-warning">
                  {result.randomNumber.toLocaleString()}
                </p>
              </div>
              
              {/* Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={clsx(
                  'p-4 rounded-xl text-center',
                  !result.isDraw && result.winnerId === duel.myId
                    ? 'bg-accent-success/20 border border-accent-success/30'
                    : 'bg-dark-700'
                )}>
                  <p className="text-sm text-gray-400">You</p>
                  <p className="text-2xl font-bold font-mono text-white">{result.myNumber?.toLocaleString()}</p>
                  <p className="text-sm mt-1">
                    Distance: <span className={clsx(
                      'font-bold',
                      !result.isDraw && result.winnerId === duel.myId ? 'text-accent-success' : 'text-gray-400'
                    )}>{result.myDistance?.toLocaleString()}</span>
                  </p>
                  {!result.isDraw && result.winnerId === duel.myId && (
                    <span className="inline-block mt-2 text-sm text-accent-success font-bold">🏆 WINNER!</span>
                  )}
                </div>
                
                <div className={clsx(
                  'p-4 rounded-xl text-center',
                  !result.isDraw && result.winnerId !== duel.myId && result.winnerId !== null
                    ? 'bg-accent-danger/20 border border-accent-danger/30'
                    : 'bg-dark-700'
                )}>
                  <p className="text-sm text-gray-400">{opponentName}</p>
                  <p className="text-2xl font-bold font-mono text-white">{result.opponentNumber?.toLocaleString()}</p>
                  <p className="text-sm mt-1">
                    Distance: <span className={clsx(
                      'font-bold',
                      !result.isDraw && result.winnerId !== duel.myId ? 'text-accent-danger' : 'text-gray-400'
                    )}>{result.opponentDistance?.toLocaleString()}</span>
                  </p>
                  {!result.isDraw && result.winnerId !== duel.myId && result.winnerId !== null && (
                    <span className="inline-block mt-2 text-sm text-accent-danger font-bold">🏆 WINNER!</span>
                  )}
                </div>
              </div>

              {/* Round Result */}
              <div className={clsx(
                'text-center py-4 rounded-xl mb-6',
                result.isDraw
                  ? 'bg-accent-warning/20'
                  : result.winnerId === duel.myId
                    ? 'bg-accent-success/20'
                    : 'bg-accent-danger/20'
              )}>
                <p className="text-3xl font-bold">
                  {result.isDraw 
                    ? '🤝 Draw!' 
                    : result.winnerId === duel.myId 
                      ? '🏆 You Win!' 
                      : '😔 You Lose'}
                </p>
              </div>

              {/* Final Result */}
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
                     '🤝 TIE!'}
                  </p>
                  <p className="text-xl text-gray-400">
                    Final: {scores.me} - {scores.opponent}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={() => router.push('/my-duels')}
                  className="flex-1 btn-secondary"
                >
                  Exit
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

        {/* History */}
        {roundHistory.length > 0 && (
          <div className="mt-4 card-base">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">History</h3>
            <div className="space-y-2">
              {roundHistory.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-dark-700 rounded-lg">
                  <span className="text-gray-400">R{r.round}</span>
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
                    {r.winner === 'me' ? '✓ W' : r.winner === 'opponent' ? '✗ L' : '= D'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
