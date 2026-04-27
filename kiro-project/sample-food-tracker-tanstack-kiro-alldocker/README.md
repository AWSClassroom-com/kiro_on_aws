# 🍎 Food Tracker

A modern, full-stack food tracking application built with TanStack Start, React 19, and PostgreSQL. Track your food consumption with a beautiful, responsive interface featuring comprehensive nutritional information and expiration date management.

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

- **PostgreSQL** - Robust relational database
- **Drizzle ORM** - Type-safe database toolkit
- **Zod** - Runtime type validation
- **Server Functions** - Type-safe API endpoints

### Development Tools

- **Vite** - Fast build tool and dev server
- **Biome** - Fast formatter and linter
- **pnpm** - Efficient package manager
- **Docker Compose** - Containerized PostgreSQL setup

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for PostgreSQL)

### Installation

1. **Clone and install dependencies**

```bash
git clone <repository-url>
cd food-tracker
pnpm install
```

2. **Start PostgreSQL with Docker**

```bash
pnpm docker:up
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env.local with your database URL
```

4. **Run database generate and migrations**

```bash
pnpm db:generate
```

```bash
pnpm db:migrate
```

5. **Start development server**

```bash
pnpm dev
```

Visit `http://localhost:3000` to see your food tracker in action!

## 📝 Available Scripts

### Development

```bash
pnpm dev          # Start development server on port 3000
pnpm build        # Build for production
pnpm serve        # Preview production build
pnpm test         # Run tests with Vitest
```

### Code Quality

```bash
pnpm format       # Format code with Biome
pnpm lint         # Lint code with Biome
pnpm check        # Run both format and lint
```

### Database Operations

```bash
pnpm db:generate  # Generate migrations from schema changes
pnpm db:migrate   # Apply migrations to database
pnpm db:push      # Push schema directly to database (dev)
pnpm db:pull      # Pull schema from database
pnpm db:studio    # Open Drizzle Studio (database GUI)
pnpm db:seed      # Seed database with sample data
```

### Docker Commands

```bash
pnpm docker:up    # Start PostgreSQL container
pnpm docker:down  # Stop PostgreSQL container
pnpm docker:logs  # View PostgreSQL logs
```

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

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with:

(add password in after username)

```env
DATABASE_URL="postgresql://username:@localhost:5432/mydb"
```

### Database Connection

The app connects to PostgreSQL using the `DATABASE_URL` environment variable. The default Docker setup provides:

- Host: localhost
- Port: 5432
- Database: mydb
- Username: username
- Password:

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
│   ├── index.ts         # Database connection
│   └── seed.ts          # Database seeding
└── styles.css           # Global styles
```

## 🚀 Deployment

The application is ready for deployment on platforms like Vercel, Netlify, or any Node.js hosting service. Make sure to:

1. Set up a production PostgreSQL database
2. Configure the `DATABASE_URL` environment variable
3. Run migrations in production: `pnpm db:migrate`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm check` to ensure code quality
5. Submit a pull request

## 📄 License

This library is licensed under the MIT-0 License. See the LICENSE file.
