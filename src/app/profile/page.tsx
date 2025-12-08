'use client'

import { currentUser } from '@/data/mock'
import { clsx } from 'clsx'

export default function ProfilePage() {
  const winRate = Math.round((currentUser.wins / currentUser.totalDuels) * 100)
  
  // Mock stats
  const stats = {
    currentStreak: 5,
    bestStreak: 12,
    totalEarnings: 15600,
    rank: 142,
  }

  // Mock recent matches
  const recentMatches = [
    { opponent: 'NightHunter', result: 'win', stake: 500, date: '2 hours ago' },
    { opponent: 'CryptoWolf', result: 'loss', stake: 1200, date: '5 hours ago' },
    { opponent: 'PhantomX', result: 'win', stake: 350, date: '1 day ago' },
    { opponent: 'BladeRunner', result: 'win', stake: 800, date: '1 day ago' },
    { opponent: 'ShadowKing', result: 'loss', stake: 2000, date: '2 days ago' },
  ]

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="card-base mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-4xl font-bold shadow-neon">
                {currentUser.username[0]}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent-success border-4 border-dark-800" />
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-white mb-1">{currentUser.username}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  ⭐ Rating: <span className="text-white font-semibold">{currentUser.rating}</span>
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="flex items-center gap-1">
                  🏆 Rank: <span className="text-accent-warning font-semibold">#{stats.rank}</span>
                </span>
              </div>
            </div>

            {/* Trust Score */}
            <div className="text-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    strokeWidth="6"
                    fill="none"
                    className="stroke-dark-600"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    className="stroke-accent-success"
                    strokeDasharray={`${currentUser.trustScore * 2.2} 220`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{currentUser.trustScore}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">Trust Score</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card-base text-center">
            <p className="text-3xl font-bold text-white mb-1">{currentUser.totalDuels}</p>
            <p className="text-sm text-gray-400">Total Duels</p>
          </div>
          <div className="card-base text-center">
            <p className="text-3xl font-bold text-accent-success mb-1">{currentUser.wins}</p>
            <p className="text-sm text-gray-400">Wins</p>
          </div>
          <div className="card-base text-center">
            <p className="text-3xl font-bold text-accent-danger mb-1">{currentUser.losses}</p>
            <p className="text-sm text-gray-400">Losses</p>
          </div>
          <div className="card-base text-center">
            <p className={clsx(
              'text-3xl font-bold mb-1',
              winRate >= 50 ? 'text-accent-success' : 'text-accent-danger'
            )}>
              {winRate}%
            </p>
            <p className="text-sm text-gray-400">Win Rate</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card-base">
            <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Current Streak</span>
                <span className="flex items-center gap-2 font-semibold text-accent-warning">
                  🔥 {stats.currentStreak} wins
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Best Streak</span>
                <span className="font-semibold text-white">🏆 {stats.bestStreak} wins</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Earnings</span>
                <span className="font-semibold text-accent-success">
                  💎 {stats.totalEarnings.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="card-base">
            <h3 className="text-lg font-semibold text-white mb-4">Win Rate by Stake</h3>
            <div className="space-y-3">
              {[
                { label: 'Low (< 500)', value: 68, color: 'bg-accent-success' },
                { label: 'Medium (500-2000)', value: 52, color: 'bg-accent-warning' },
                { label: 'High (> 2000)', value: 45, color: 'bg-accent-danger' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">{stat.label}</span>
                    <span className="text-white font-medium">{stat.value}%</span>
                  </div>
                  <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-500', stat.color)}
                      style={{ width: `${stat.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Matches */}
        <div className="card-base">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Matches</h3>
          <div className="space-y-3">
            {recentMatches.map((match, index) => (
              <div
                key={index}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-xl',
                  match.result === 'win' ? 'bg-accent-success/10' : 'bg-accent-danger/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-xl flex items-center justify-center font-bold',
                    match.result === 'win' 
                      ? 'bg-accent-success/20 text-accent-success' 
                      : 'bg-accent-danger/20 text-accent-danger'
                  )}>
                    {match.result === 'win' ? 'W' : 'L'}
                  </div>
                  <div>
                    <p className="font-medium text-white">vs {match.opponent}</p>
                    <p className="text-xs text-gray-400">{match.date}</p>
                  </div>
                </div>
                <div className={clsx(
                  'font-semibold',
                  match.result === 'win' ? 'text-accent-success' : 'text-accent-danger'
                )}>
                  {match.result === 'win' ? '+' : '-'}{match.stake} 💎
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

