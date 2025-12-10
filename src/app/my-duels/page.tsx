'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

// Types
interface DuelOffer {
  id: string
  creatorUserId: string
  opponentUserId: string | null
  chipType: string
  chipPointsValue: number
  gamesCount: number
  status: string
  createdAt: string
  expiresAt: string | null
  creator?: { id: string; username: string }
}

const CHIP_EMOJI: Record<string, string> = {
  'SMILE': '😊',
  'HEART': '❤️',
  'FIRE': '🔥',
  'RING': '💍',
}

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

  return (
    <span className={clsx(
      'font-mono',
      timeLeft === 'Expired' ? 'text-accent-danger' : 'text-accent-warning'
    )}>
      ⏱️ {timeLeft}
    </span>
  )
}

export default function MyDuelsPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [offers, setOffers] = useState<DuelOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all')

  // Load user's offers
  const loadOffers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/p2p/my-offers')
      const data = await response.json()
      
      if (data.success) {
        setOffers(data.data || [])
      } else {
        console.error('Failed to load offers:', data.error)
      }
    } catch (err) {
      console.error('Error loading offers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadOffers()
      // Auto-refresh every 10 seconds
      const interval = setInterval(loadOffers, 10000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, loadOffers])

  // Helper to check role
  const isCreator = (offer: DuelOffer) => offer.creatorUserId === user?.id
  const isOpponent = (offer: DuelOffer) => offer.opponentUserId === user?.id

  // Filter offers
  const pendingConfirm = offers.filter(o => 
    o.status === 'WAITING_CREATOR_CONFIRM'
  )
  const activeOffers = offers.filter(o => 
    o.status === 'MATCHED' || o.status === 'IN_PROGRESS'
  )
  const myOpenOffers = offers.filter(o => 
    o.status === 'OPEN' && isCreator(o)
  )

  const displayedOffers = filter === 'all' 
    ? offers 
    : filter === 'pending' 
      ? pendingConfirm 
      : activeOffers

  // Confirm offer (creator only)
  const handleConfirm = async (offerId: string) => {
    try {
      setConfirming(offerId)
      setError(null)

      const response = await fetch(`/api/p2p/orders/${offerId}/confirm`, {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        // Reload offers
        await loadOffers()
        // Navigate to duel
        router.push(`/duel/${offerId}`)
      } else {
        setError(data.error || 'Failed to confirm')
      }
    } catch (err) {
      console.error('Error confirming:', err)
      setError('Network error')
    } finally {
      setConfirming(null)
    }
  }

  // Cancel offer
  const handleCancel = async (offerId: string) => {
    try {
      const response = await fetch(`/api/p2p/orders/${offerId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        await loadOffers()
      } else {
        setError(data.error || 'Failed to cancel')
      }
    } catch (err) {
      console.error('Error cancelling:', err)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please login to see your duels</p>
          <Link href="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Duels</h1>
            <p className="text-gray-400">Manage your active and pending duels</p>
          </div>
          <Link href="/offers" className="btn-secondary">
            ← Back to Offers
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-accent-danger/20 border border-accent-danger rounded-xl text-accent-danger">
            {error}
            <button onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card-base text-center">
            <p className="text-2xl font-bold text-accent-warning">{pendingConfirm.length}</p>
            <p className="text-sm text-gray-400">Need Action</p>
          </div>
          <div className="card-base text-center">
            <p className="text-2xl font-bold text-accent-success">{myOpenOffers.length}</p>
            <p className="text-sm text-gray-400">My Open</p>
          </div>
          <div className="card-base text-center">
            <p className="text-2xl font-bold text-white">{offers.length}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
        </div>

        {/* Pending Confirmations Alert - For Creator */}
        {pendingConfirm.filter(o => isCreator(o)).length > 0 && (
          <div className="mb-6 p-4 bg-accent-warning/20 border border-accent-warning rounded-xl">
            <p className="text-accent-warning font-medium">
              ⚠️ You have {pendingConfirm.filter(o => isCreator(o)).length} duel(s) waiting for YOUR confirmation!
            </p>
          </div>
        )}

        {/* Waiting for opponent confirmation - For Opponent */}
        {pendingConfirm.filter(o => isOpponent(o)).length > 0 && (
          <div className="mb-6 p-4 bg-dark-700 border border-dark-500 rounded-xl">
            <p className="text-gray-300 font-medium">
              ⏳ You have {pendingConfirm.filter(o => isOpponent(o)).length} duel(s) waiting for creator confirmation
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: `Pending (${pendingConfirm.length})` },
            { key: 'active', label: 'Active' },
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

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4 animate-spin">⏳</div>
            <p className="text-gray-400">Loading your duels...</p>
          </div>
        )}

        {/* Offers List */}
        {!loading && (
          <div className="space-y-4">
            {displayedOffers.map((offer) => {
              const amCreator = isCreator(offer)
              const amOpponent = isOpponent(offer)
              const needsMyConfirm = offer.status === 'WAITING_CREATOR_CONFIRM' && amCreator
              const waitingForCreator = offer.status === 'WAITING_CREATOR_CONFIRM' && amOpponent
              const chipEmoji = CHIP_EMOJI[offer.chipType] || '🎮'
              
              return (
                <div 
                  key={offer.id}
                  className={clsx(
                    'card-base',
                    needsMyConfirm && 'border-2 border-accent-warning bg-accent-warning/5 animate-pulse'
                  )}
                >
                  {/* Status Banner - Creator needs to confirm */}
                  {needsMyConfirm && (
                    <div className="flex items-center justify-between mb-4 p-3 bg-accent-warning/20 rounded-lg">
                      <span className="text-accent-warning font-bold text-lg">
                        🔔 Opponent found! Confirm NOW to start!
                      </span>
                      {offer.expiresAt && (
                        <CountdownTimer deadline={new Date(offer.expiresAt)} />
                      )}
                    </div>
                  )}

                  {/* Status Banner - Waiting for creator */}
                  {waitingForCreator && (
                    <div className="flex items-center justify-between mb-4 p-3 bg-dark-600 rounded-lg">
                      <span className="text-gray-300">
                        ⏳ Waiting for {offer.creator?.username || 'creator'} to confirm...
                      </span>
                      {offer.expiresAt && (
                        <CountdownTimer deadline={new Date(offer.expiresAt)} />
                      )}
                    </div>
                  )}

                  {/* Offer Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Chip Badge */}
                      <div className="w-14 h-14 rounded-xl bg-dark-600 flex items-center justify-center text-2xl">
                        {chipEmoji}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">
                            {chipEmoji} {offer.chipType} Duel
                          </span>
                          <span className={clsx(
                            'text-xs px-2 py-0.5 rounded-full',
                            offer.status === 'OPEN' && 'bg-accent-success/20 text-accent-success',
                            offer.status === 'WAITING_CREATOR_CONFIRM' && 'bg-accent-warning/20 text-accent-warning',
                            offer.status === 'MATCHED' && 'bg-accent-primary/20 text-accent-primary',
                            offer.status === 'CANCELLED' && 'bg-gray-500/20 text-gray-400',
                          )}>
                            {offer.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500">
                            {amCreator ? '(Creator)' : '(Opponent)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span>{offer.chipPointsValue} pts/game</span>
                          <span className="w-1 h-1 rounded-full bg-gray-600" />
                          <span>{offer.gamesCount} games</span>
                          <span className="w-1 h-1 rounded-full bg-gray-600" />
                          <span>Total: {offer.chipPointsValue * offer.gamesCount} pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {/* Creator needs to confirm */}
                      {needsMyConfirm && (
                        <button 
                          onClick={() => handleConfirm(offer.id)}
                          className="btn-primary bg-accent-warning hover:bg-accent-warning/80 text-black font-bold px-6"
                          disabled={confirming === offer.id}
                        >
                          {confirming === offer.id ? 'Confirming...' : '✓ CONFIRM NOW'}
                        </button>
                      )}
                      
                      {/* Open offer - can cancel */}
                      {offer.status === 'OPEN' && amCreator && (
                        <button 
                          onClick={() => handleCancel(offer.id)}
                          className="btn-secondary text-accent-danger"
                        >
                          Cancel
                        </button>
                      )}

                      {/* Matched or In Progress - go to game */}
                      {(offer.status === 'MATCHED' || offer.status === 'IN_PROGRESS') && (
                        <Link href={`/duel/${offer.id}`} className="btn-primary">
                          Play Game →
                        </Link>
                      )}
                      
                      {/* Waiting for confirm - opponent can go to game page to wait */}
                      {offer.status === 'WAITING_CREATOR_CONFIRM' && !amCreator && (
                        <Link href={`/duel/${offer.id}`} className="btn-secondary">
                          Go to Game →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && displayedOffers.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">⚔️</div>
            <h3 className="text-xl font-semibold text-white mb-2">No duels yet</h3>
            <p className="text-gray-400 mb-6">Create your first offer or accept someone elses!</p>
            <Link href="/offers" className="btn-primary inline-block">
              Browse Offers
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
