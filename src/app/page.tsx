'use client'

import { useState } from 'react'
import { DuelCard } from '@/components/DuelCard'
import { mockDuels } from '@/data/mock'
import { Duel } from '@/types'
import { clsx } from 'clsx'

type FilterType = 'all' | 'skins' | 'points'

export default function LobbyPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedDuel, setSelectedDuel] = useState<Duel | null>(null)

  const filteredDuels = mockDuels.filter(duel => {
    if (filter === 'all') return true
    if (filter === 'skins') return duel.stake.type === 'skin'
    if (filter === 'points') return duel.stake.type === 'points'
    return true
  })

  const handleAcceptDuel = (duel: Duel) => {
    setSelectedDuel(duel)
    // TODO: Navigate to duel screen
    console.log('Accepting duel:', duel)
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="text-gradient">P2P Duel</span>
              <br />
              <span className="text-white">Arena</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl mb-8">
              Challenge opponents in 1v1 duels. Bet skins, win prizes, climb the ranks.
            </p>
            
            {/* Stats */}
            <div className="flex items-center justify-center gap-8 md:gap-12">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-white">1,234</p>
                <p className="text-sm text-gray-500">Active Duels</p>
              </div>
              <div className="w-px h-12 bg-dark-600" />
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-accent-success">$45.2K</p>
                <p className="text-sm text-gray-500">Won Today</p>
              </div>
              <div className="w-px h-12 bg-dark-600" />
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-accent-warning">8,901</p>
                <p className="text-sm text-gray-500">Players Online</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lobby Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Active Duels</h2>
            <p className="text-gray-400">Choose your opponent wisely</p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 p-1 bg-dark-800 rounded-xl">
            {[
              { key: 'all', label: 'All' },
              { key: 'skins', label: '🎮 Skins' },
              { key: 'points', label: '💎 Points' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as FilterType)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  filter === item.key
                    ? 'bg-accent-primary text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDuels.map((duel, index) => (
            <div
              key={duel.id}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <DuelCard duel={duel} onAccept={handleAcceptDuel} />
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredDuels.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-white mb-2">No duels available</h3>
            <p className="text-gray-400 mb-6">Be the first to create a duel!</p>
            <button className="btn-primary">
              Create Duel
            </button>
          </div>
        )}
      </section>
    </div>
  )
}


