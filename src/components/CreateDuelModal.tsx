'use client'

import { useState } from 'react'
import { mockSkins, rarityColors } from '@/data/mock'
import { Skin } from '@/types'
import { clsx } from 'clsx'

interface CreateDuelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (stake: { type: 'skin' | 'points'; skin?: Skin; amount?: number }) => void
}

export function CreateDuelModal({ isOpen, onClose, onCreate }: CreateDuelModalProps) {
  const [stakeType, setStakeType] = useState<'skin' | 'points'>('points')
  const [amount, setAmount] = useState(500)
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null)

  if (!isOpen) return null

  const handleCreate = () => {
    if (stakeType === 'points') {
      onCreate({ type: 'points', amount })
    } else if (selectedSkin) {
      onCreate({ type: 'skin', skin: selectedSkin })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="card-base max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create Duel</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-dark-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stake Type Toggle */}
        <div className="flex gap-2 p-1 bg-dark-700 rounded-xl mb-6">
          <button
            onClick={() => setStakeType('points')}
            className={clsx(
              'flex-1 py-3 rounded-lg font-medium transition-all',
              stakeType === 'points'
                ? 'bg-accent-primary text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            💎 Points
          </button>
          <button
            onClick={() => setStakeType('skin')}
            className={clsx(
              'flex-1 py-3 rounded-lg font-medium transition-all',
              stakeType === 'skin'
                ? 'bg-accent-primary text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            🎮 Skin
          </button>
        </div>

        {/* Points Stake */}
        {stakeType === 'points' && (
          <div className="space-y-4 mb-6">
            <label className="block">
              <span className="text-sm text-gray-400 mb-2 block">Stake Amount</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={100}
                max={10000}
                step={100}
                className="input-base text-2xl font-bold text-center"
              />
            </label>

            {/* Quick amounts */}
            <div className="flex gap-2">
              {[100, 500, 1000, 2500, 5000].map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                    amount === val
                      ? 'bg-accent-primary text-white'
                      : 'bg-dark-600 text-gray-400 hover:text-white'
                  )}
                >
                  {val >= 1000 ? `${val / 1000}K` : val}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skin Stake */}
        {stakeType === 'skin' && (
          <div className="mb-6">
            <span className="text-sm text-gray-400 mb-3 block">Select Skin</span>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
              {mockSkins.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => setSelectedSkin(skin)}
                  className={clsx(
                    'p-3 rounded-xl border transition-all',
                    rarityColors[skin.rarity],
                    selectedSkin?.id === skin.id
                      ? 'ring-2 ring-accent-primary scale-105'
                      : 'hover:scale-102'
                  )}
                >
                  <div className="w-full aspect-square rounded-lg bg-dark-700 mb-2 flex items-center justify-center text-2xl">
                    🎮
                  </div>
                  <p className="font-medium text-white text-sm truncate">{skin.name}</p>
                  <p className="text-xs text-gray-400">💎 {skin.value}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Duration */}
        <div className="mb-6">
          <span className="text-sm text-gray-400 mb-2 block">Duel Duration</span>
          <div className="flex gap-2">
            {['1 min', '3 min', '5 min', '10 min'].map((duration) => (
              <button
                key={duration}
                className="flex-1 py-2 px-3 rounded-lg bg-dark-600 text-sm text-gray-400 hover:text-white hover:bg-dark-500 transition-all"
              >
                {duration}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-dark-700 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Your Stake</span>
            <span className="font-bold text-white">
              {stakeType === 'points' 
                ? `💎 ${amount.toLocaleString()}`
                : selectedSkin ? `🎮 ${selectedSkin.name}` : 'Select a skin'
              }
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Potential Win</span>
            <span className="font-bold text-accent-success">
              {stakeType === 'points'
                ? `💎 ${(amount * 2).toLocaleString()}`
                : selectedSkin ? `💎 ${(selectedSkin.value * 2).toLocaleString()}` : '-'
              }
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleCreate}
            disabled={stakeType === 'skin' && !selectedSkin}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚔️ Create Duel
          </button>
        </div>
      </div>
    </div>
  )
}

