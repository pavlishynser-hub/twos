'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'

// Types
type MatchStatus = 'AWAITING_CONFIRM' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'

interface DuelMatch {
  id: string
  opponent: { username: string; reliability: number }
  chipEmoji: string
  chipValue: number
  gamesPlanned: number
  gamesPlayed: number
  status: MatchStatus
  isCreator: boolean
  confirmDeadline?: Date
  winnerId?: string
}

// Mock data
const mockMatches: DuelMatch[] = [
  {
    id: 'duel_nighthunter',
    opponent: { username: 'NightHunter', reliability: 88 },
    chipEmoji: '🔥',
    chipValue: 25,
    gamesPlanned: 3,
    gamesPlayed: 1,
    status: 'IN_PROGRESS',
    isCreator: true,
  },
  {
    id: 'duel_cryptowolf',
    opponent: { username: 'CryptoWolf', reliability: 99 },
    chipEmoji: '💍',
    chipValue: 50,
    gamesPlanned: 2,
    gamesPlayed: 0,
    status: 'AWAITING_CONFIRM',
    isCreator: true,
    confirmDeadline: new Date(Date.now() + 90000), // 1:30 left
  },
  {
    id: 'duel_phantomx',
    opponent: { username: 'PhantomX', reliability: 72 },
    chipEmoji: '❤️',
    chipValue: 10,
    gamesPlanned: 2,
    gamesPlayed: 2,
    status: 'FINISHED',
    isCreator: false,
    winnerId: 'me',
  },
]

function CountdownTimer({ deadline }: { deadline: Date }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = deadline.getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Expired')
        return
      }
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  const isUrgent = timeLeft !== 'Expired' && parseInt(timeLeft) < 1

  return (
    <span className={clsx(
      'font-mono',
      isUrgent ? 'text-accent-danger animate-pulse' : 'text-accent-warning'
    )}>
      ⏱️ {timeLeft}
    </span>
  )
}

export default function MyDuelsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'active' | 'finished'>('all')

  const activeMatches = mockMatches.filter(m => 
    m.status === 'AWAITING_CONFIRM' || m.status === 'IN_PROGRESS'
  )
  const finishedMatches = mockMatches.filter(m => 
    m.status === 'FINISHED' || m.status === 'CANCELLED'
  )

  const displayedMatches = filter === 'all' 
    ? mockMatches 
    : filter === 'active' 
      ? activeMatches 
      : finishedMatches

  const handleConfirm = (matchId: string) => {
    // Navigate to duel page
    router.push(`/duel/${matchId}`)
  }

  const handleContinue = (matchId: string) => {
    // Navigate to duel page
    router.push(`/duel/${matchId}`)
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Duels</h1>
          <p className="text-gray-400">Manage your active and completed duels</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card-base text-center">
            <p className="text-2xl font-bold text-accent-warning">{activeMatches.length}</p>
            <p className="text-sm text-gray-400">Active</p>
          </div>
          <div className="card-base text-center">
            <p className="text-2xl font-bold text-accent-success">
              {finishedMatches.filter(m => m.winnerId === 'me').length}
            </p>
            <p className="text-sm text-gray-400">Won</p>
          </div>
          <div className="card-base text-center">
            <p className="text-2xl font-bold text-white">{mockMatches.length}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'finished', label: 'Finished' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                filter === f.key
                  ? 'bg-accent-primary text-white'
                  : 'bg-dark-700 text-gray-400 hover:text-white'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Duels List */}
        <div className="space-y-4">
          {displayedMatches.map((match) => (
            <div 
              key={match.id}
              className={clsx(
                'card-base',
                match.status === 'AWAITING_CONFIRM' && 'border border-accent-warning/30'
              )}
            >
              {/* Status Banner */}
              {match.status === 'AWAITING_CONFIRM' && match.isCreator && (
                <div className="flex items-center justify-between mb-4 p-3 bg-accent-warning/10 rounded-lg">
                  <span className="text-accent-warning font-medium">
                    ⚠️ Confirm duel to start!
                  </span>
                  {match.confirmDeadline && (
                    <CountdownTimer deadline={match.confirmDeadline} />
                  )}
                </div>
              )}

              {match.status === 'AWAITING_CONFIRM' && !match.isCreator && (
                <div className="flex items-center justify-between mb-4 p-3 bg-dark-600 rounded-lg">
                  <span className="text-gray-400">
                    ⏳ Waiting for opponent to confirm...
                  </span>
                  {match.confirmDeadline && (
                    <CountdownTimer deadline={match.confirmDeadline} />
                  )}
                </div>
              )}

              {/* Match Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Opponent Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-lg font-bold">
                    {match.opponent.username[0]}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">vs {match.opponent.username}</span>
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full',
                        match.opponent.reliability >= 90 ? 'bg-accent-success/20 text-accent-success' :
                        match.opponent.reliability >= 70 ? 'bg-accent-warning/20 text-accent-warning' :
                        'bg-accent-danger/20 text-accent-danger'
                      )}>
                        {match.opponent.reliability}%
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>{match.chipEmoji} {match.chipValue} pts</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span>{match.gamesPlayed}/{match.gamesPlanned} games</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div>
                  {match.status === 'AWAITING_CONFIRM' && match.isCreator && (
                    <button 
                      onClick={() => handleConfirm(match.id)}
                      className="btn-primary"
                    >
                      Confirm
                    </button>
                  )}
                  
                  {match.status === 'IN_PROGRESS' && (
                    <button 
                      onClick={() => handleContinue(match.id)}
                      className="btn-primary"
                    >
                      Continue
                    </button>
                  )}
                  
                  {match.status === 'FINISHED' && (
                    <span className={clsx(
                      'px-4 py-2 rounded-xl font-medium',
                      match.winnerId === 'me' 
                        ? 'bg-accent-success/20 text-accent-success'
                        : 'bg-accent-danger/20 text-accent-danger'
                    )}>
                      {match.winnerId === 'me' ? '🏆 Won' : '😔 Lost'}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {match.status === 'IN_PROGRESS' && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{match.gamesPlayed}/{match.gamesPlanned}</span>
                  </div>
                  <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent-primary rounded-full transition-all"
                      style={{ width: `${(match.gamesPlayed / match.gamesPlanned) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {displayedMatches.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚔️</div>
            <h3 className="text-xl font-semibold text-white mb-2">No duels yet</h3>
            <p className="text-gray-400 mb-6">Start your first duel!</p>
            <Link href="/offers" className="btn-primary inline-block">
              Browse Offers
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
