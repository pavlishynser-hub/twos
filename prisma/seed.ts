/**
 * Prisma Seed Script
 * Creates initial data for TWOS platform
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create demo skins
  const skins = await Promise.all([
    prisma.skin.upsert({
      where: { id: 'skin_dragon' },
      update: {},
      create: {
        id: 'skin_dragon',
        name: 'Dragon',
        description: 'Legendary fire-breathing dragon',
        rarity: 'LEGENDARY',
        pointsValue: 500,
        availableForPurchase: true,
      },
    }),
    prisma.skin.upsert({
      where: { id: 'skin_cyberwolf' },
      update: {},
      create: {
        id: 'skin_cyberwolf',
        name: 'Cyber Wolf',
        description: 'Epic cybernetic wolf',
        rarity: 'EPIC',
        pointsValue: 250,
        availableForPurchase: true,
      },
    }),
    prisma.skin.upsert({
      where: { id: 'skin_neonblade' },
      update: {},
      create: {
        id: 'skin_neonblade',
        name: 'Neon Blade',
        description: 'Rare glowing sword',
        rarity: 'RARE',
        pointsValue: 100,
        availableForPurchase: true,
      },
    }),
    prisma.skin.upsert({
      where: { id: 'skin_shadowshield' },
      update: {},
      create: {
        id: 'skin_shadowshield',
        name: 'Shadow Shield',
        description: 'Uncommon dark shield',
        rarity: 'UNCOMMON',
        pointsValue: 50,
        availableForPurchase: true,
      },
    }),
    prisma.skin.upsert({
      where: { id: 'skin_basic' },
      update: {},
      create: {
        id: 'skin_basic',
        name: 'Basic Skin',
        description: 'Common starter skin',
        rarity: 'COMMON',
        pointsValue: 25,
        availableForPurchase: true,
      },
    }),
  ])

  console.log(`✅ Created ${skins.length} skins`)

  // Create demo bot users for testing
  const botUsers = await Promise.all([
    prisma.user.upsert({
      where: { username: 'NightHunter' },
      update: {},
      create: {
        username: 'NightHunter',
        pointsBalance: 5000,
        totalDeals: 50,
        completedDeals: 44,
        reliabilityPercent: 88,
      },
    }),
    prisma.user.upsert({
      where: { username: 'CryptoWolf' },
      update: {},
      create: {
        username: 'CryptoWolf',
        pointsBalance: 10000,
        totalDeals: 100,
        completedDeals: 99,
        reliabilityPercent: 99,
      },
    }),
    prisma.user.upsert({
      where: { username: 'ShadowKing' },
      update: {},
      create: {
        username: 'ShadowKing',
        pointsBalance: 7500,
        totalDeals: 75,
        completedDeals: 73,
        reliabilityPercent: 97,
      },
    }),
    prisma.user.upsert({
      where: { username: 'PhantomX' },
      update: {},
      create: {
        username: 'PhantomX',
        pointsBalance: 2000,
        totalDeals: 25,
        completedDeals: 18,
        reliabilityPercent: 72,
      },
    }),
  ])

  console.log(`✅ Created ${botUsers.length} bot users`)

  // Create platform vault
  await prisma.platformVault.upsert({
    where: { id: 'main_vault' },
    update: {},
    create: {
      id: 'main_vault',
      totalPoints: 0,
      totalSkins: 0,
    },
  })

  console.log('✅ Created platform vault')

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

