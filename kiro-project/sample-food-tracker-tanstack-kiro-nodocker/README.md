# 🍎 Food Tracker

A modern, full-stack food tracking application built with TanStack Start, React 19, and an embedded PostgreSQL database (PGlite). Track your food consumption with a beautiful, responsive interface featuring comprehensive nutritional information and expiration date management.

> 📺 **Featured on AWS Kiro YouTube Channel**
> This project is showcased in a tutorial video on the [AWS Kiro YouTube channel](https://www.youtube.com/@kirodotdev), demonstrating modern full-stack development with TanStack Start, Kiro and PostgreSQL.

## ✨ Features

- **🍎 Add Food Entries** - Create detailed food entries with nutritional information
- **👁️ View & Manage** - Browse all your food entries in an organized grid layout
- **🗑️ Delete Entries** - Remove food entries with confirmation dialogs
- **📊 Nutritional Tracking** - Track calories, protein, carbs, and fat content
- **⏰ Expiration Dates** - Monitor food expiration dates to reduce waste
- **🏷️ Categories & Units** - Organize food by categories with flexible unit measurements
- **⚡ Real-time Updates** - Instant UI updates with server-side data persistence
- **🎨 Modern Design** - Beautiful dark-themed interface that works on all devices

## 🛠 Tech Stack

### Frontend

- **TanStack Start** - Full-stack React framework with SSR
- **React 19** - Latest React with concurrent features
- **TypeScript** - Strict type checking throughout
- **Tailwind CSS v4** - Modern utility-first styling
- **Lucide React** - Beautiful icon library

### Backend & Database

- **PGlite** - Embedded PostgreSQL that runs in-process (no Docker, no server)
- **Drizzle ORM** - Type-safe database toolkit
- **Zod** - Runtime type validation
- **Server Functions** - Type-safe API endpoints

### Development Tools

- **Vite** - Fast build tool and dev server
- **Biome** - Fast formatter and linter
- **npm** - Standard Node.js package manager

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (npm comes bundled with Node)

That's it. No Docker, no Postgres install, no environment variables.

### Installation

```bash
git clone <repository-url>
cd food-tracker
npm install
npm run dev
```

Visit `http://localhost:3000` to see your food tracker in action.

The first time you run `npm run dev`, the app will:

1. Create a local database in the `local-db/` folder
2. Run migrations automatically
3. Seed it with sample food items so you have data to play with

The database lives entirely on your filesystem. To wipe it and start fresh, run `npm run db:reset`.

## 📝 Available Scripts

### Development

```bash
npm run dev          # Start development server on port 3000
npm run build        # Build for production
npm run serve        # Preview production build
npm test             # Run tests with Vitest
```

### Code Quality

```bash
npm run format       # Format code with Biome
npm run lint         # Lint code with Biome
npm run check        # Run both format and lint
```

### Database Operations

```bash
npm run db:generate  # Generate migrations from schema changes
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run db:seed      # Re-seed the database with sample data
npm run db:reset     # Delete the local database (recreated on next dev run)
```

> Migrations run automatically when the dev server starts — you only need `db:generate` after editing `src/db/schema.ts` to produce a new migration file.

## 🗄 Database Schema

The application uses a single `food_items` table with the following structure:

- **id** - Auto-incrementing primary key
- **name** - Food item name (required)
- **description** - Optional description
- **category** - Food category (e.g., "Fruits", "Vegetables")
- **quantity** - Amount (default: 1)
- **unit** - Measurement unit (default: "piece")
- **calories** - Caloric content
- **protein** - Protein content in grams
- **carbs** - Carbohydrate content in grams
- **fat** - Fat content in grams
- **expirationDate** - When the food expires
- **createdAt** - Entry creation timestamp
- **updatedAt** - Last update timestamp

## 🎨 UI Features

- **Dark Theme** - Modern dark interface with cyan/blue accents
- **Responsive Grid** - Adaptive layout for all screen sizes
- **Form Validation** - Real-time validation with helpful error messages
- **Loading States** - Smooth loading indicators
- **Confirmation Dialogs** - Safe deletion with confirmation prompts
- **Success Feedback** - Visual confirmation of successful operations

## 📁 Project Structure

```
src/
├── components/           # Reusable React components
├── routes/              # File-based routing
│   ├── __root.tsx       # Root layout
│   ├── index.tsx        # Home page
│   └── food-tracker.tsx # Main food tracker page
├── db/                  # Database layer
│   ├── schema.ts        # Drizzle schema & Zod validation
│   ├── index.ts         # Database connection (auto-migrate + seed)
│   └── seed.ts          # Sample data + reseed script
└── styles.css           # Global styles
```

## 🚀 Deployment

PGlite is intended for local development and demos — it stores data in a local folder and runs in-process with the server. For production deployments where multiple instances or persistent shared state are needed, swap `src/db/index.ts` to a hosted Postgres connection (the schema and Drizzle code are unchanged because PGlite is real PostgreSQL).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run check` to ensure code quality
5. Submit a pull request

## 📄 License

This library is licensed under the MIT-0 License. See the LICENSE file.
