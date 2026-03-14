# RACKD - Inventory Management System

A production-grade inventory and warehouse management system built with brutal minimalism. Designed for real operations: receipts, deliveries, transfers, adjustments, and complete stock ledger tracking.

## Features

### Core Operations
- **Receipts** - Incoming goods from suppliers
- **Deliveries** - Outgoing shipments to customers
- **Transfers** - Internal warehouse movements
- **Adjustments** - Stock corrections and cycle counts

### Workflow Management
- **Status Tracking** - Draft → Waiting → Ready → Done → Cancelled
- **Validate Action** - Lock operations and create stock moves
- **Line Items** - Multiple products per operation
- **Operation History** - Full audit trail

### Inventory Control
- **Products** - SKU, category, UoM management
- **Stock Levels** - On hand, reserved, available quantities
- **Low Stock Alerts** - Automatic reorder point monitoring
- **Move History** - Complete stock movement ledger

### Configuration
- **Warehouses** - Multiple distribution centers
- **Locations** - Stock, transit, customer, supplier locations
- **Multi-location Tracking** - Source → destination routing

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first styling

## Design Philosophy

**Brutal Minimalism**: No dark mode, no custom fonts, no animations. Black text on white background. 1px borders. Maximum information density. Zero decoration.

This is a utility tool, not a marketing site. Design decisions prioritize:
- Data density over whitespace
- Readability over aesthetics
- Function over form
- Speed over polish

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

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

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── components/
│   ├── common/          # Primitive UI components
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Table.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── Textarea.tsx
│   └── layout/          # Layout components
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── PageLayout.tsx
├── pages/               # Route components
│   ├── Dashboard.tsx
│   ├── OperationsList.tsx
│   ├── OperationDetail.tsx
│   ├── ReceiptsList.tsx
│   ├── DeliveriesList.tsx
│   ├── TransfersList.tsx
│   ├── AdjustmentsList.tsx
│   ├── MoveHistory.tsx
│   ├── ProductsList.tsx
│   ├── WarehousesList.tsx
│   └── LocationsList.tsx
├── types.ts             # TypeScript interfaces
├── constants.ts         # Mock data
└── App.tsx              # Router configuration
```

## Data Model

### Operation
```typescript
{
  id: string
  reference: string              // REC/00001, DEL/00001, etc.
  type: 'receipt' | 'delivery' | 'transfer' | 'adjustment'
  status: 'draft' | 'waiting' | 'ready' | 'done' | 'cancelled'
  partner?: string               // Supplier or customer
  scheduledDate: string
  sourceLocationId: string
  destLocationId: string
  lines: OperationLine[]         // Product lines
  notes?: string
  createdAt: string
  createdBy: string
}
```

### Status Workflow
- **Draft** - Editable, no stock impact
- **Waiting** - Scheduled, locked for editing
- **Ready** - Ready to execute
- **Done** - Validated, stock updated, immutable
- **Cancelled** - Archived

## API Integration

Currently using mock data (`src/constants.ts`). To connect to a real backend:

1. Create API client functions in `src/api/`
2. Replace mock data imports with API calls
3. Add loading states and error handling
4. Use React Query or similar for server state management

Expected API endpoints:
```
GET    /api/operations?type=receipt&status=draft
GET    /api/operations/:id
POST   /api/operations
PUT    /api/operations/:id
POST   /api/operations/:id/validate
POST   /api/operations/:id/cancel

GET    /api/products
GET    /api/products/:id/stock
GET    /api/moves
GET    /api/warehouses
GET    /api/locations
```

## Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run TypeScript type checking
- `npm run clean` - Remove build artifacts

## Contributing

This is a production-focused inventory system. Contributions should:
- Maintain brutal minimalism aesthetic
- Prioritize functionality over visual polish
- Add real features, not decoration
- Include proper TypeScript types
- Work with API-ready architecture

## License

MIT

## Author

Kathan Desai
