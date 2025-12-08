import { User, Skin, Duel, InventoryItem } from '@/types'

// Current user (mock)
export const currentUser: User = {
  id: 'user_me',
  username: 'CryptoKing',
  avatar: '👑',
  rating: 1850,
  totalDuels: 156,
  wins: 98,
  losses: 58,
  trustScore: 94,
}

// Mock skins
export const mockSkins: Skin[] = [
  { id: 'skin_1', name: 'Dragon', image: '🐉', rarity: 'legendary', value: 500 },
  { id: 'skin_2', name: 'Cyber Wolf', image: '🐺', rarity: 'epic', value: 250 },
  { id: 'skin_3', name: 'Neon Blade', image: '⚔️', rarity: 'rare', value: 100 },
  { id: 'skin_4', name: 'Shadow Shield', image: '🛡️', rarity: 'uncommon', value: 50 },
  { id: 'skin_5', name: 'Basic Skin', image: '🎮', rarity: 'common', value: 25 },
]

// Mock opponents
export const mockOpponents: User[] = [
  { id: 'opp_1', username: 'ShadowKing', avatar: '👤', rating: 2100, totalDuels: 234, wins: 156, losses: 78, trustScore: 98 },
  { id: 'opp_2', username: 'NightHunter', avatar: '🦇', rating: 1920, totalDuels: 187, wins: 112, losses: 75, trustScore: 88 },
  { id: 'opp_3', username: 'CryptoWolf', avatar: '🐺', rating: 1750, totalDuels: 98, wins: 54, losses: 44, trustScore: 95 },
  { id: 'opp_4', username: 'PhantomX', avatar: '👻', rating: 1650, totalDuels: 67, wins: 35, losses: 32, trustScore: 72 },
  { id: 'opp_5', username: 'BladeRunner', avatar: '🗡️', rating: 2050, totalDuels: 301, wins: 198, losses: 103, trustScore: 91 },
]

// Mock duels
export const mockDuels: Duel[] = [
  {
    id: 'duel_1',
    creator: mockOpponents[0],
    stake: { type: 'skin', skin: mockSkins[0] },
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    expiresAt: new Date(Date.now() + 1000 * 60 * 55),
  },
  {
    id: 'duel_2',
    creator: mockOpponents[1],
    stake: { type: 'points', amount: 500 },
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 12),
    expiresAt: new Date(Date.now() + 1000 * 60 * 48),
  },
  {
    id: 'duel_3',
    creator: mockOpponents[2],
    stake: { type: 'skin', skin: mockSkins[2] },
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 3),
    expiresAt: new Date(Date.now() + 1000 * 60 * 57),
  },
  {
    id: 'duel_4',
    creator: mockOpponents[3],
    stake: { type: 'points', amount: 1200 },
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 8),
    expiresAt: new Date(Date.now() + 1000 * 60 * 52),
  },
  {
    id: 'duel_5',
    creator: mockOpponents[4],
    stake: { type: 'skin', skin: mockSkins[1] },
    status: 'open',
    createdAt: new Date(Date.now() - 1000 * 60 * 1),
    expiresAt: new Date(Date.now() + 1000 * 60 * 59),
  },
]

// Mock inventory
export const mockInventory: InventoryItem[] = [
  { skin: mockSkins[2], acquiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), source: 'win' },
  { skin: mockSkins[3], acquiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), source: 'purchase' },
  { skin: mockSkins[4], acquiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), source: 'bonus' },
  { skin: mockSkins[4], acquiredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), source: 'win' },
]

// Rarity colors
export const rarityColors: Record<string, string> = {
  common: 'border-gray-500 text-gray-400',
  uncommon: 'border-green-500 text-green-400',
  rare: 'border-blue-500 text-blue-400',
  epic: 'border-purple-500 text-purple-400',
  legendary: 'border-amber-500 text-amber-400',
}

// Rarity glow effects
export const rarityGlow: Record<string, string> = {
  common: '',
  uncommon: 'shadow-[0_0_15px_rgba(34,197,94,0.2)]',
  rare: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
  epic: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]',
  legendary: 'shadow-[0_0_25px_rgba(245,158,11,0.5)]',
}
