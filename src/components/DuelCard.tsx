'use client'

import { Duel } from '@/types'
import { rarityColors, rarityGlow } from '@/data/mock'
import { FairnessBadge } from './FairnessBadge'
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'

interface DuelCardProps {
  duel: Duel
  onAccept?: (duel: Duel) => void
}

export function DuelCard({ duel, onAccept }: DuelCardProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime()
      const expires = duel.expiresAt.getTime()
      const diff = expires - now

      if (diff <= 0) {
        setTimeLeft('Expired')
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [duel.expiresAt])

  const winRate = Math.round((duel.creator.wins / duel.creator.totalDuels) * 100)
  const isExpired = timeLeft === 'Expired'

  return (
    <div
      className={clsx(
        'card-base glass-hover group relative overflow-hidden',
        isExpired && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-primary to-accent-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header: User info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary/30 to-accent-secondary/30 flex items-center justify-center text-lg font-bold">
            {duel.creator.username[0]}
          </div>
          <div>
            <h3 className="font-semibold text-white">{duel.creator.username}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                ⭐ {duel.creator.rating}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className={clsx(
                winRate >= 60 ? 'text-accent-success' : 
                winRate >= 40 ? 'text-accent-warning' : 'text-accent-danger'
              )}>
                {winRate}% WR
              </span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className={clsx(
          'px-3 py-1 rounded-lg text-sm font-mono',
          isExpired 
            ? 'bg-accent-danger/20 text-accent-danger' 
            : 'bg-dark-600 text-white'
        )}>
          ⏱️ {timeLeft}
        </div>
      </div>

      {/* Stake info */}
      <div className={clsx(
        'p-4 rounded-xl border mb-4 transition-all duration-300',
        duel.stake.type === 'skin' && duel.stake.skin
          ? `${rarityColors[duel.stake.skin.rarity]} ${rarityGlow[duel.stake.skin.rarity]}`
          : 'bg-dark-700 border-white/10'
      )}>
        {duel.stake.type === 'skin' && duel.stake.skin ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Skin Stake</p>
              <p className="font-semibold">{duel.stake.skin.name}</p>
              <p className="text-sm text-gray-400">{duel.stake.skin.value.toLocaleString()} pts</p>
            </div>
            <div className="w-16 h-16 rounded-lg bg-dark-600 flex items-center justify-center text-2xl">
              🎮
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Points Stake</p>
              <p className="text-2xl font-bold text-accent-warning">
                💎 {duel.stake.amount?.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Trust score */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">Trust Score</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-dark-600 overflow-hidden">
            <div 
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                duel.creator.trustScore >= 90 ? 'bg-accent-success' :
                duel.creator.trustScore >= 70 ? 'bg-accent-warning' : 'bg-accent-danger'
              )}
              style={{ width: `${duel.creator.trustScore}%` }}
            />
          </div>
          <span className="text-sm font-medium">{duel.creator.trustScore}%</span>
        </div>
      </div>

      {/* Fairness indicator */}
      <div className="flex items-center justify-between mb-4">
        <FairnessBadge variant="compact" />
        <span className="text-xs text-gray-500">TOTP-SHA256</span>
      </div>

      {/* Accept button */}
      <button
        onClick={() => onAccept?.(duel)}
        disabled={isExpired}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ⚔️ Accept Duel
      </button>
    </div>
  )
}

