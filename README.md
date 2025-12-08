# TWOS — P2P Duel Platform 🎮

> Challenge opponents in 1v1 duels. Bet skins, win prizes, climb the ranks.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Navigate to project directory
cd "/Users/serhii2626/Desktop/Twos projects/twos"

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
twos/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # P2P Lobby (главная)
│   │   ├── inventory/         # Инвентарь скинов
│   │   ├── profile/           # Профиль и статистика
│   │   └── duel/[id]/         # Экран дуэли
│   │
│   ├── components/            # React компоненты
│   │   ├── Navigation.tsx     # Навигация
│   │   ├── DuelCard.tsx       # Карточка дуэли
│   │   └── CreateDuelModal.tsx # Модальное окно создания
│   │
│   ├── data/                  # Mock данные
│   │   └── mock.ts
│   │
│   └── types/                 # TypeScript типы
│       └── index.ts
│
├── public/                    # Статические файлы
├── tailwind.config.ts         # Tailwind конфиг
└── package.json
```

## ✨ Features

### MVP Features
- [x] **P2P Lobby** — список активных дуэлей с фильтрами
- [x] **Duel Cards** — карточки с информацией о дуэли
- [x] **Duel Screen** — экран 1v1 с анимацией выбора победителя
- [x] **Inventory** — управление скинами
- [x] **Profile** — статистика и рейтинг игрока
- [x] **Dark UI** — стильный темный интерфейс

### Coming Soon
- [ ] Backend интеграция
- [ ] Secure random (provably fair)
- [ ] Wallet система
- [ ] Real-time дуэли
- [ ] Чат между игроками
- [ ] Лидерборд

## 🎨 Design System

### Colors
- **Primary**: `#6366f1` (Indigo)
- **Secondary**: `#8b5cf6` (Purple)  
- **Success**: `#10b981` (Green)
- **Danger**: `#ef4444` (Red)
- **Background**: `#0a0a0f` - `#1a1a24`

### Components
- `btn-primary` — основная кнопка
- `btn-secondary` — второстепенная кнопка
- `card-base` — базовая карточка
- `glass` — стеклянный эффект
- `badge-*` — бейджи статусов

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State**: React useState (пока без глобального стейта)

## 📜 Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License — feel free to use this project.

---

Built with ❤️ for gamers

