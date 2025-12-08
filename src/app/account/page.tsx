'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { clsx } from 'clsx'

export default function AccountPage() {
  const router = useRouter()
  const { user, stats, isLoading, isAuthenticated, updateProfile, changePassword, logout } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'stats'>('profile')
  
  // Profile form state
  const [username, setUsername] = useState('')
  const [telegramId, setTelegramId] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Initialize form values when user loads
  useState(() => {
    if (user) {
      setUsername(user.username)
    }
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')
    setProfileLoading(true)

    const result = await updateProfile({ username, telegramId: telegramId || undefined })

    if (result.success) {
      setProfileSuccess('Profile updated successfully!')
    } else {
      setProfileError(result.error || 'Update failed')
    }

    setProfileLoading(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordLoading(true)

    const result = await changePassword(currentPassword, newPassword)

    if (result.success) {
      router.push('/login')
    } else {
      setPasswordError(result.error || 'Password change failed')
    }

    setPasswordLoading(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
            <p className="text-gray-400">Manage your profile and security</p>
          </div>
          
          {/* User Badge */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-lg font-bold">
              {user?.username[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="font-semibold text-white">{user?.username}</p>
              <p className="text-sm text-accent-warning">💎 {user?.pointsBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { key: 'profile', label: '👤 Profile', icon: '👤' },
            { key: 'security', label: '🔒 Security', icon: '🔒' },
            { key: 'stats', label: '📊 Statistics', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={clsx(
                'px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-accent-primary text-white'
                  : 'bg-dark-700 text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card-base">
            <h2 className="text-xl font-bold text-white mb-6">Edit Profile</h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {profileError && (
                <div className="p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-xl text-accent-danger text-sm">
                  {profileError}
                </div>
              )}
              
              {profileSuccess && (
                <div className="p-4 bg-accent-success/10 border border-accent-success/30 rounded-xl text-accent-success text-sm">
                  {profileSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-base"
                  placeholder={user?.username}
                  disabled={profileLoading}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Telegram ID (optional)</label>
                <input
                  type="text"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  className="input-base"
                  placeholder="@yourtelegram"
                  disabled={profileLoading}
                />
                <p className="text-xs text-gray-500 mt-1">For notifications about duels</p>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className={clsx(
                  'btn-primary',
                  profileLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="card-base">
              <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>
              
              <form onSubmit={handleChangePassword} className="space-y-6">
                {passwordError && (
                  <div className="p-4 bg-accent-danger/10 border border-accent-danger/30 rounded-xl text-accent-danger text-sm">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-base"
                    placeholder="••••••••"
                    required
                    disabled={passwordLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-base"
                    placeholder="••••••••"
                    required
                    disabled={passwordLoading}
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="input-base"
                    placeholder="••••••••"
                    required
                    disabled={passwordLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className={clsx(
                    'btn-primary',
                    passwordLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Logout */}
            <div className="card-base">
              <h2 className="text-xl font-bold text-white mb-4">Session</h2>
              <p className="text-gray-400 mb-4">Sign out of your account on this device.</p>
              <button onClick={handleLogout} className="btn-danger">
                Logout
              </button>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-base text-center">
                <p className="text-3xl font-bold text-white">{stats?.totalDuels || 0}</p>
                <p className="text-sm text-gray-400">Total Duels</p>
              </div>
              <div className="card-base text-center">
                <p className="text-3xl font-bold text-accent-success">{stats?.wins || 0}</p>
                <p className="text-sm text-gray-400">Wins</p>
              </div>
              <div className="card-base text-center">
                <p className="text-3xl font-bold text-accent-danger">{stats?.losses || 0}</p>
                <p className="text-sm text-gray-400">Losses</p>
              </div>
              <div className="card-base text-center">
                <p className={clsx(
                  'text-3xl font-bold',
                  (stats?.winRate || 0) >= 50 ? 'text-accent-success' : 'text-accent-danger'
                )}>
                  {stats?.winRate || 0}%
                </p>
                <p className="text-sm text-gray-400">Win Rate</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="card-base">
              <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Current Streak</span>
                  <span className="font-semibold text-accent-warning">🔥 {stats?.currentStreak || 0} wins</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Earnings</span>
                  <span className={clsx(
                    'font-semibold',
                    (stats?.totalEarnings || 0) >= 0 ? 'text-accent-success' : 'text-accent-danger'
                  )}>
                    {(stats?.totalEarnings || 0) >= 0 ? '+' : ''}{stats?.totalEarnings || 0} 💎
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Reliability Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-dark-600 overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          (stats?.reliabilityPercent || 0) >= 90 ? 'bg-accent-success' :
                          (stats?.reliabilityPercent || 0) >= 70 ? 'bg-accent-warning' : 'bg-accent-danger'
                        )}
                        style={{ width: `${stats?.reliabilityPercent || 0}%` }}
                      />
                    </div>
                    <span className="font-semibold text-white">{stats?.reliabilityPercent || 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="card-base">
              <h3 className="text-lg font-semibold text-white mb-4">Balance</h3>
              <div className="flex items-center justify-between p-4 bg-dark-700 rounded-xl">
                <span className="text-gray-400">Current Points</span>
                <span className="text-2xl font-bold text-accent-warning">
                  💎 {user?.pointsBalance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

