# RACKD - Industrial OS

A modern, production-grade inventory and warehouse management system built with React, TypeScript, and Tailwind CSS.

## Features

- **Dashboard Overview** - Real-time operational metrics and system status
- **Inventory Management** - Track products, stock levels, and reorder points
- **Receipts & Deliveries** - Monitor incoming and outgoing operations
- **Analytics** - Comprehensive reporting and insights
- **Multi-warehouse Support** - Manage multiple distribution centers

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Motion (Framer Motion)
- Lucide Icons

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/MrKathanDesai/Rackd.git
   cd Rackd
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run TypeScript type checking
- `npm run clean` - Remove build artifacts

## Project Structure

```
src/
├── components/       # React components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── StatCard.tsx
│   ├── InventoryTable.tsx
│   └── OperationsList.tsx
├── assets/          # Static assets
├── App.tsx          # Main application component
├── constants.ts     # Mock data and constants
├── types.ts         # TypeScript type definitions
└── main.tsx         # Application entry point
```

## License

MIT

## Author

Kathan Desai
