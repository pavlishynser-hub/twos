'use client'

import { useState } from 'react'
import { mockInventory, rarityColors, rarityGlow } from '@/data/mock'
import { InventoryItem } from '@/types'
import { clsx } from 'clsx'

export default function InventoryPage() {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const totalValue = mockInventory.reduce((sum, item) => sum + item.skin.value, 0)

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Inventory</h1>
            <p className="text-gray-400">Manage your skins and rewards</p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4">
            <div className="card-base">
              <p className="text-sm text-gray-400">Total Items</p>
              <p className="text-2xl font-bold text-white">{mockInventory.length}</p>
            </div>
            <div className="card-base">
              <p className="text-sm text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-accent-warning">💎 {totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Inventory Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {mockInventory.map((item, index) => (
            <button
              key={`${item.skin.id}-${index}`}
              onClick={() => setSelectedItem(item)}
              className={clsx(
                'p-4 rounded-2xl border transition-all duration-300 group',
                rarityColors[item.skin.rarity],
                rarityGlow[item.skin.rarity],
                'hover:scale-105 hover:border-opacity-50',
                selectedItem?.skin.id === item.skin.id && 'ring-2 ring-accent-primary'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Skin Image */}
              <div className="w-full aspect-square rounded-xl bg-dark-700 mb-3 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                🎮
              </div>
              
              {/* Info */}
              <div className="text-left">
                <p className="font-semibold text-white text-sm truncate">{item.skin.name}</p>
                <p className="text-xs text-gray-400 capitalize">{item.skin.rarity}</p>
                <p className="text-sm font-medium mt-1">💎 {item.skin.value}</p>
              </div>

              {/* Source badge */}
              <div className="mt-2">
                <span className={clsx(
                  'badge text-xs',
                  item.source === 'win' ? 'badge-success' : 
                  item.source === 'bonus' ? 'badge-warning' : 'badge-primary'
                )}>
                  {item.source === 'win' ? '🏆 Won' : 
                   item.source === 'bonus' ? '🎁 Bonus' : '💰 Bought'}
                </span>
              </div>
            </button>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 10 - mockInventory.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="p-4 rounded-2xl border border-dashed border-dark-600 flex items-center justify-center aspect-square opacity-30"
            >
              <span className="text-gray-600 text-3xl">+</span>
            </div>
          ))}
        </div>

        {/* Selected Item Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="card-base max-w-md w-full animate-scaleIn">
              {/* Close button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>

              {/* Skin preview */}
              <div className={clsx(
                'w-32 h-32 mx-auto rounded-2xl flex items-center justify-center text-6xl mb-6 border',
                rarityColors[selectedItem.skin.rarity],
                rarityGlow[selectedItem.skin.rarity]
              )}>
                🎮
              </div>

              <h2 className="text-2xl font-bold text-white text-center mb-2">
                {selectedItem.skin.name}
              </h2>
              
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className={clsx('badge capitalize', rarityColors[selectedItem.skin.rarity])}>
                  {selectedItem.skin.rarity}
                </span>
                <span className="text-xl font-bold text-accent-warning">
                  💎 {selectedItem.skin.value.toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button className="w-full btn-primary">
                  ⚔️ Use in Duel
                </button>
                <button className="w-full btn-secondary">
                  💱 Convert to Points
                </button>
                <button className="w-full btn-danger">
                  🎁 Donate to System
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

