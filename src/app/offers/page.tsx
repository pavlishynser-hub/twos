'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import Link from 'next/link'

// Types
type ChipType = 'SMILE' | 'HEART' | 'FIRE' | 'RING'

interface ChipConfig {
  type: ChipType
  value: number
  emoji: string
  name: string
}

const CHIPS: ChipConfig[] = [
  { type: 'SMILE', value: 5, emoji: '😊', name: 'Smile' },
  { type: 'HEART', value: 10, emoji: '❤️', name: 'Heart' },
  { type: 'FIRE', value: 25, emoji: '🔥', name: 'Fire' },
  { type: 'RING', value: 50, emoji: '💍', name: 'Ring' },
]

// Mock offers
const mockOffers = [
  { id: '1', creator: { username: 'ShadowKing', reliability: 95 }, chipType: 'RING' as ChipType, chipValue: 50, gamesCount: 3, createdAt: new Date() },
  { id: '2', creator: { username: 'NightHunter', reliability: 88 }, chipType: 'FIRE' as ChipType, chipValue: 25, gamesCount: 2, createdAt: new Date() },
  { id: '3', creator: { username: 'CryptoWolf', reliability: 99 }, chipType: 'HEART' as ChipType, chipValue: 10, gamesCount: 5, createdAt: new Date() },
  { id: '4', creator: { username: 'PhantomX', reliability: 72 }, chipType: 'SMILE' as ChipType, chipValue: 5, gamesCount: 2, createdAt: new Date() },
]

export default function OffersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedChip, setSelectedChip] = useState<ChipType>('HEART')
  const [gamesCount, setGamesCount] = useState(2)
  const [filterChip, setFilterChip] = useState<ChipType | 'ALL'>('ALL')

  const filteredOffers = filterChip === 'ALL' 
    ? mockOffers 
    : mockOffers.filter(o => o.chipType === filterChip)

  const getChipConfig = (type: ChipType) => CHIPS.find(c => c.type === type)!

  const handleCreateOffer = () => {
    console.log('Creating offer:', { chipType: selectedChip, gamesCount })
    setShowCreateModal(false)
    // TODO: Call API
  }

  const handleAcceptOffer = (offerId: string) => {
    console.log('Accepting offer:', offerId)
    // TODO: Call API and redirect to duel
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">P2P Offers Board</h1>
            <p className="text-gray-400">Accept offers or create your own duel</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            + Create Offer
          </button>
        </div>

        {/* Chip Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterChip('ALL')}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              filterChip === 'ALL'
                ? 'bg-accent-primary text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            )}
          >
            All
          </button>
          {CHIPS.map((chip) => (
            <button
              key={chip.type}
              onClick={() => setFilterChip(chip.type)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2',
                filterChip === chip.type
                  ? 'bg-accent-primary text-white'
                  : 'bg-dark-700 text-gray-400 hover:text-white'
              )}
            >
              <span>{chip.emoji}</span>
              <span>{chip.value} pts</span>
            </button>
          ))}
        </div>

        {/* Offers List */}
        <div className="space-y-4">
          {filteredOffers.map((offer) => {
            const chip = getChipConfig(offer.chipType)
            return (
              <div 
                key={offer.id}
                className="card-base flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Offer Info */}
                <div className="flex items-center gap-4">
                  {/* Chip Badge */}
                  <div className="w-14 h-14 rounded-xl bg-dark-600 flex items-center justify-center text-2xl">
                    {chip.emoji}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{offer.creator.username}</span>
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full',
                        offer.creator.reliability >= 90 ? 'bg-accent-success/20 text-accent-success' :
                        offer.creator.reliability >= 70 ? 'bg-accent-warning/20 text-accent-warning' :
                        'bg-accent-danger/20 text-accent-danger'
                      )}>
                        {offer.creator.reliability}% reliable
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>{chip.emoji} {chip.value} pts per game</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span>{offer.gamesCount} games</span>
                      <span className="w-1 h-1 rounded-full bg-gray-600" />
                      <span>Total: {chip.value * offer.gamesCount} pts</span>
                    </div>
                  </div>
                </div>

                {/* Accept Button */}
                <button 
                  onClick={() => handleAcceptOffer(offer.id)}
                  className="btn-primary whitespace-nowrap"
                >
                  Accept Duel
                </button>
              </div>
            )
          })}
        </div>

        {filteredOffers.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-white mb-2">No offers available</h3>
            <p className="text-gray-400 mb-6">Be the first to create an offer!</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Offer
            </button>
          </div>
        )}
      </div>

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card-base max-w-md w-full animate-scaleIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Create Offer</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Chip Selection */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-3 block">Select Chip Type</label>
              <div className="grid grid-cols-2 gap-3">
                {CHIPS.map((chip) => (
                  <button
                    key={chip.type}
                    onClick={() => setSelectedChip(chip.type)}
                    className={clsx(
                      'p-4 rounded-xl border-2 transition-all',
                      selectedChip === chip.type
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-dark-500 hover:border-dark-400'
                    )}
                  >
                    <div className="text-3xl mb-2">{chip.emoji}</div>
                    <div className="font-semibold text-white">{chip.name}</div>
                    <div className="text-sm text-gray-400">{chip.value} pts</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Games Count */}
            <div className="mb-6">
              <label className="text-sm text-gray-400 mb-3 block">Number of Games (min 2)</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setGamesCount(Math.max(2, gamesCount - 1))}
                  className="w-12 h-12 rounded-xl bg-dark-600 text-white text-xl hover:bg-dark-500"
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <span className="text-3xl font-bold text-white">{gamesCount}</span>
                  <span className="text-gray-400 ml-2">games</span>
                </div>
                <button
                  onClick={() => setGamesCount(Math.min(10, gamesCount + 1))}
                  className="w-12 h-12 rounded-xl bg-dark-600 text-white text-xl hover:bg-dark-500"
                >
                  +
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-dark-700 rounded-xl mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Stake per game</span>
                <span className="text-white font-semibold">
                  {getChipConfig(selectedChip).emoji} {getChipConfig(selectedChip).value} pts
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total stake</span>
                <span className="text-accent-warning font-bold">
                  💎 {getChipConfig(selectedChip).value * gamesCount} pts
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateOffer}
                className="flex-1 btn-primary"
              >
                Create Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

