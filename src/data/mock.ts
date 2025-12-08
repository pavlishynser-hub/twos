import { Duel, User, Skin, InventoryItem } from '@/types'

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'ShadowKing',
    rating: 2450,
    totalDuels: 156,
    wins: 98,
    losses: 58,
    trustScore: 95,
  },
  {
    id: '2',
    username: 'NightHunter',
    rating: 1890,
    totalDuels: 89,
    wins: 52,
    losses: 37,
    trustScore: 88,
  },
  {
    id: '3',
    username: 'CryptoWolf',
    rating: 3200,
    totalDuels: 312,
    wins: 201,
    losses: 111,
    trustScore: 99,
  },
  {
    id: '4',
    username: 'PhantomX',
    rating: 1560,
    totalDuels: 45,
    wins: 24,
    losses: 21,
    trustScore: 72,
  },
  {
    id: '5',
    username: 'BladeRunner',
    rating: 2100,
    totalDuels: 178,
    wins: 95,
    losses: 83,
    trustScore: 91,
  },
]

// Mock Skins
export const mockSkins: Skin[] = [
  {
    id: 's1',
    name: 'Dragon Lore',
    image: '/skins/dragon-lore.png',
    rarity: 'legendary',
    value: 5000,
  },
  {
    id: 's2',
    name: 'Neon Blade',
    image: '/skins/neon-blade.png',
    rarity: 'epic',
    value: 2500,
  },
  {
    id: 's3',
    name: 'Cyber Wolf',
    image: '/skins/cyber-wolf.png',
    rarity: 'rare',
    value: 800,
  },
  {
    id: 's4',
    name: 'Shadow Fang',
    image: '/skins/shadow-fang.png',
    rarity: 'uncommon',
    value: 350,
  },
  {
    id: 's5',
    name: 'Basic Striker',
    image: '/skins/basic-striker.png',
    rarity: 'common',
    value: 100,
  },
]

// Mock Duels
export const mockDuels: Duel[] = [
  {
    id: 'd1',
    creator: mockUsers[0],
    stake: { type: 'skin', skin: mockSkins[0] },
    status: 'open',
    createdAt: new Date(Date.now() - 120000),
    expiresAt: new Date(Date.now() + 180000),
  },
  {
    id: 'd2',
    creator: mockUsers[1],
    stake: { type: 'points', amount: 500 },
    status: 'open',
    createdAt: new Date(Date.now() - 300000),
    expiresAt: new Date(Date.now() + 60000),
  },
  {
    id: 'd3',
    creator: mockUsers[2],
    stake: { type: 'skin', skin: mockSkins[1] },
    status: 'open',
    createdAt: new Date(Date.now() - 60000),
    expiresAt: new Date(Date.now() + 240000),
  },
  {
    id: 'd4',
    creator: mockUsers[3],
    stake: { type: 'points', amount: 1000 },
    status: 'open',
    createdAt: new Date(Date.now() - 180000),
    expiresAt: new Date(Date.now() + 120000),
  },
  {
    id: 'd5',
    creator: mockUsers[4],
    stake: { type: 'skin', skin: mockSkins[2] },
    status: 'open',
    createdAt: new Date(Date.now() - 45000),
    expiresAt: new Date(Date.now() + 300000),
  },
]

// Current user (you)
export const currentUser: User = {
  id: 'me',
  username: 'Player1',
  rating: 2450,
  totalDuels: 67,
  wins: 42,
  losses: 25,
  trustScore: 94,
}

// Mock inventory
export const mockInventory: InventoryItem[] = [
  { skin: mockSkins[2], acquiredAt: new Date(Date.now() - 86400000), source: 'win' },
  { skin: mockSkins[3], acquiredAt: new Date(Date.now() - 172800000), source: 'win' },
  { skin: mockSkins[4], acquiredAt: new Date(Date.now() - 259200000), source: 'bonus' },
]

// Rarity colors
export const rarityColors = {
  common: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  uncommon: 'text-green-400 bg-green-400/10 border-green-400/20',
  rare: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  epic: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  legendary: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
}

export const rarityGlow = {
  common: '',
  uncommon: 'shadow-[0_0_20px_rgba(74,222,128,0.2)]',
  rare: 'shadow-[0_0_20px_rgba(96,165,250,0.3)]',
  epic: 'shadow-[0_0_25px_rgba(192,132,252,0.4)]',
  legendary: 'shadow-[0_0_30px_rgba(251,191,36,0.5)]',
}

