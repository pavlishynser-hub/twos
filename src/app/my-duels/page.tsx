'use client'

import { useState, useEffect, useCallback } from 'react'
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
  creator?: { id: string; username: string }
}

const CHIP_EMOJI: Record<string, string> = {
  'SMILE': '😊',
  'HEART': '❤️',
  'FIRE': '🔥',
  'RING': '💍',
}

export default function MyDuelsPage() {
  const { user, isAuthenticated } = useAuth()
  const [offers, setOffers] = useState<DuelOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'open'>('all')

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
      // Auto-refresh every 5 seconds
      const interval = setInterval(loadOffers, 5000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, loadOffers])

  // Helper to check role
  const isCreator = (offer: DuelOffer) => offer.creatorUserId === user?.id

  // Filter offers
  const activeOffers = offers.filter(o => 
    o.status === 'MATCHED' || o.status === 'IN_PROGRESS'
  )
  const myOpenOffers = offers.filter(o => 
    o.status === 'OPEN' && isCreator(o)
  )

  const displayedOffers = filter === 'all' 
    ? offers 
    : filter === 'active' 
      ? activeOffers 
      : myOpenOffers

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
            <p className="text-gray-400">Your active and open duels</p>
          </div>
          <Link href="/offers" className="btn-primary">
            + New Duel
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
            <p className="text-2xl font-bold text-accent-success">{activeOffers.length}</p>
            <p className="text-sm text-gray-400">Active Games</p>
          </div>
          <div className="card-base text-center">
            <p className="text-2xl font-bold text-accent-warning">{myOpenOffers.length}</p>
            <p className="text-sm text-gray-400">Open Offers</p>
          </div>
          <div className="card-base text-center">
            <p className="text-2xl font-bold text-white">{offers.length}</p>
            <p className="text-sm text-gray-400">Total</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: `Active (${activeOffers.length})` },
            { key: 'open', label: `Open (${myOpenOffers.length})` },
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
              const chipEmoji = CHIP_EMOJI[offer.chipType] || '🎮'
              const canPlay = offer.status === 'MATCHED' || offer.status === 'IN_PROGRESS'
              
              return (
                <div 
                  key={offer.id}
                  className={clsx(
                    'card-base',
                    canPlay && 'border border-accent-success/30 bg-accent-success/5'
                  )}
                >
                  {/* Ready to play banner */}
                  {canPlay && (
                    <div className="flex items-center justify-between mb-4 p-3 bg-accent-success/20 rounded-lg">
                      <span className="text-accent-success font-bold">
                        🎮 Ready to play!
                      </span>
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
                            offer.status === 'OPEN' && 'bg-accent-warning/20 text-accent-warning',
                            (offer.status === 'MATCHED' || offer.status === 'IN_PROGRESS') && 'bg-accent-success/20 text-accent-success',
                            offer.status === 'CANCELLED' && 'bg-gray-500/20 text-gray-400',
                          )}>
                            {offer.status === 'OPEN' ? 'Waiting for opponent' : 
                             offer.status === 'MATCHED' ? 'Ready!' :
                             offer.status === 'IN_PROGRESS' ? 'In Progress' :
                             offer.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {amCreator ? '(You created)' : '(You joined)'}
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
                      {/* Ready to play */}
                      {canPlay && (
                        <Link href={`/duel/${offer.id}`} className="btn-primary">
                          Play Now →
                        </Link>
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
