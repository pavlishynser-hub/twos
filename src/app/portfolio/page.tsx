'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

// Types
type SkinRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

interface Skin {
  id: string
  name: string
  rarity: SkinRarity
  pointsValue: number
  imageUrl?: string
}

interface UserSkin {
  id: string
  skin: Skin
}

// Rarity config
const RARITY_CONFIG: Record<SkinRarity, { color: string; bg: string; glow: string }> = {
  COMMON: { color: 'text-gray-400', bg: 'bg-gray-400/10', glow: '' },
  UNCOMMON: { color: 'text-green-400', bg: 'bg-green-400/10', glow: 'shadow-[0_0_15px_rgba(74,222,128,0.2)]' },
  RARE: { color: 'text-blue-400', bg: 'bg-blue-400/10', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.3)]' },
  EPIC: { color: 'text-purple-400', bg: 'bg-purple-400/10', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.4)]' },
  LEGENDARY: { color: 'text-amber-400', bg: 'bg-amber-400/10', glow: 'shadow-[0_0_25px_rgba(251,191,36,0.5)]' },
}

// Mock data
const mockUserSkins: UserSkin[] = [
  { id: 'us1', skin: { id: 's1', name: 'Neon Blade', rarity: 'RARE', pointsValue: 100 } },
  { id: 'us2', skin: { id: 's2', name: 'Shadow Shield', rarity: 'UNCOMMON', pointsValue: 50 } },
  { id: 'us3', skin: { id: 's3', name: 'Basic Skin', rarity: 'COMMON', pointsValue: 25 } },
]

const mockShopSkins: Skin[] = [
  { id: 'shop1', name: 'Dragon', rarity: 'LEGENDARY', pointsValue: 500 },
  { id: 'shop2', name: 'Cyber Wolf', rarity: 'EPIC', pointsValue: 250 },
  { id: 'shop3', name: 'Neon Blade', rarity: 'RARE', pointsValue: 100 },
  { id: 'shop4', name: 'Shadow Shield', rarity: 'UNCOMMON', pointsValue: 50 },
  { id: 'shop5', name: 'Basic Skin', rarity: 'COMMON', pointsValue: 25 },
]

export default function PortfolioPage() {
  const [balance, setBalance] = useState(1000)
  const [selectedSkins, setSelectedSkins] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'inventory' | 'shop'>('inventory')

  const toggleSkinSelection = (skinId: string) => {
    setSelectedSkins(prev => 
      prev.includes(skinId) 
        ? prev.filter(id => id !== skinId)
        : [...prev, skinId]
    )
  }

  const selectedValue = selectedSkins.reduce((sum, id) => {
    const skin = mockUserSkins.find(s => s.id === id)
    return sum + (skin?.skin.pointsValue || 0)
  }, 0)

  const handleConvertToPoints = () => {
    if (selectedSkins.length === 0) return
    console.log('Converting skins to points:', selectedSkins)
    // TODO: Call API
    setBalance(prev => prev + selectedValue)
    setSelectedSkins([])
  }

  const handleBuySkin = (skinId: string) => {
    const skin = mockShopSkins.find(s => s.id === skinId)
    if (!skin || balance < skin.pointsValue) return
    console.log('Buying skin:', skinId)
    // TODO: Call API
    setBalance(prev => prev - skin.pointsValue)
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Portfolio</h1>
            <p className="text-gray-400">Manage your skins and points</p>
          </div>
          
          {/* Balance */}
          <div className="card-base flex items-center gap-3">
            <span className="text-2xl">💎</span>
            <div>
              <p className="text-sm text-gray-400">Balance</p>
              <p className="text-2xl font-bold text-white">{balance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('inventory')}
            className={clsx(
              'px-6 py-3 rounded-xl font-medium transition-all',
              activeTab === 'inventory'
                ? 'bg-accent-primary text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            )}
          >
            🎒 My Skins ({mockUserSkins.length})
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={clsx(
              'px-6 py-3 rounded-xl font-medium transition-all',
              activeTab === 'shop'
                ? 'bg-accent-primary text-white'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            )}
          >
            🛒 Shop
          </button>
        </div>

        {/* My Skins */}
        {activeTab === 'inventory' && (
          <>
            {/* Convert Action Bar */}
            {selectedSkins.length > 0 && (
              <div className="sticky top-20 z-10 mb-6 p-4 bg-dark-800/95 backdrop-blur-lg rounded-xl border border-accent-primary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      {selectedSkins.length} skin(s) selected
                    </p>
                    <p className="text-lg font-bold text-accent-warning">
                      💎 {selectedValue} pts
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setSelectedSkins([])}
                      className="btn-secondary"
                    >
                      Clear
                    </button>
                    <button 
                      onClick={handleConvertToPoints}
                      className="btn-primary"
                    >
                      Convert to Points
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Skins Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mockUserSkins.map((userSkin) => {
                const rarity = RARITY_CONFIG[userSkin.skin.rarity]
                const isSelected = selectedSkins.includes(userSkin.id)
                
                return (
                  <button
                    key={userSkin.id}
                    onClick={() => toggleSkinSelection(userSkin.id)}
                    className={clsx(
                      'p-4 rounded-2xl border-2 transition-all text-left',
                      rarity.bg,
                      rarity.glow,
                      isSelected 
                        ? 'border-accent-primary ring-2 ring-accent-primary/50 scale-105'
                        : 'border-transparent hover:border-white/10 hover:scale-102'
                    )}
                  >
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent-primary flex items-center justify-center">
                        ✓
                      </div>
                    )}
                    
                    {/* Skin image placeholder */}
                    <div className="w-full aspect-square rounded-xl bg-dark-700 mb-3 flex items-center justify-center text-4xl">
                      🎮
                    </div>
                    
                    {/* Info */}
                    <p className="font-semibold text-white text-sm truncate">{userSkin.skin.name}</p>
                    <p className={clsx('text-xs capitalize', rarity.color)}>{userSkin.skin.rarity.toLowerCase()}</p>
                    <p className="text-sm font-medium text-accent-warning mt-1">
                      💎 {userSkin.skin.pointsValue}
                    </p>
                  </button>
                )
              })}

              {mockUserSkins.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <div className="text-6xl mb-4">🎒</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No skins yet</h3>
                  <p className="text-gray-400 mb-6">Buy skins from the shop!</p>
                  <button 
                    onClick={() => setActiveTab('shop')}
                    className="btn-primary"
                  >
                    Go to Shop
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Shop */}
        {activeTab === 'shop' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mockShopSkins.map((skin) => {
              const rarity = RARITY_CONFIG[skin.rarity]
              const canAfford = balance >= skin.pointsValue
              
              return (
                <div
                  key={skin.id}
                  className={clsx(
                    'p-4 rounded-2xl border transition-all',
                    rarity.bg,
                    rarity.glow,
                    'border-transparent'
                  )}
                >
                  {/* Skin image placeholder */}
                  <div className="w-full aspect-square rounded-xl bg-dark-700 mb-3 flex items-center justify-center text-4xl">
                    🎮
                  </div>
                  
                  {/* Info */}
                  <p className="font-semibold text-white text-sm truncate">{skin.name}</p>
                  <p className={clsx('text-xs capitalize', rarity.color)}>{skin.rarity.toLowerCase()}</p>
                  <p className="text-sm font-medium text-accent-warning mt-1 mb-3">
                    💎 {skin.pointsValue}
                  </p>
                  
                  {/* Buy button */}
                  <button
                    onClick={() => handleBuySkin(skin.id)}
                    disabled={!canAfford}
                    className={clsx(
                      'w-full py-2 rounded-lg text-sm font-medium transition-all',
                      canAfford 
                        ? 'bg-accent-primary text-white hover:bg-accent-primary/80'
                        : 'bg-dark-600 text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {canAfford ? 'Buy' : 'Not enough'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

