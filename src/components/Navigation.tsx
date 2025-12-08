'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const navItems = [
  { href: '/', label: 'Lobby', icon: '⚔️' },
  { href: '/inventory', label: 'Inventory', icon: '🎒' },
  { href: '/profile', label: 'Profile', icon: '👤' },
  { href: '/setup', label: 'Setup', icon: '🔐' },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center font-bold text-lg group-hover:shadow-neon transition-shadow duration-300">
              T
            </div>
            <span className="text-xl font-bold text-gradient">TWOS</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
                  pathname === item.href
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Balance & Actions */}
          <div className="flex items-center gap-3">
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-xl">
              <span className="text-accent-warning">💎</span>
              <span className="font-semibold">2,450</span>
            </div>

            {/* Create Duel Button */}
            <button className="btn-primary text-sm">
              <span className="hidden sm:inline">Create Duel</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/5 px-4 py-2 z-50">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-300',
                pathname === item.href
                  ? 'text-accent-primary'
                  : 'text-gray-500'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}

