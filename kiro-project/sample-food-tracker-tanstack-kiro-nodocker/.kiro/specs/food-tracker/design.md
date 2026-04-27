# Food Tracker Design Document

## Overview

The Food Tracker feature will be implemented as a new route (`/food-tracker`) in the TanStack Start application. It will provide a comprehensive interface for managing food entries with full CRUD operations, featuring an attractive gradient design that matches the existing application aesthetic. The implementation will leverage the existing database schema and follow established patterns in the codebase.

## Architecture

### Route Structure

- **Route Path**: `/food-tracker`
- **File Location**: `src/routes/food-tracker.tsx`
- **Layout**: Uses existing root layout with Header component

### Data Flow

1. **Client → Server**: Form submissions via TanStack Start server functions
2. **Server → Database**: Drizzle ORM queries to PostgreSQL
3. **Database → Client**: Server-side data loading with route loaders
4. **Client State**: React state for form management and optimistic updates

## Components and Interfaces

### Main Components

#### 1. FoodTrackerPage Component

- **Purpose**: Main page component containing the entire food tracker interface
- **Location**: `src/routes/food-tracker.tsx`
- **Responsibilities**:
  - Render add food form
  - Display food entries list
  - Handle loading and error states
  - Coordinate between form and list components

#### 2. AddFoodForm Component

- **Purpose**: Form for adding new food entries
- **Features**:
  - Input fields: name (required), description, category, quantity, unit, calories, protein, carbs, fat, expiration date
  - Real-time validation with error display
  - Success feedback on submission
  - Form reset after successful submission
- **Styling**: Gradient background with modern form controls

#### 3. FoodEntriesList Component

- **Purpose**: Display all food entries with delete functionality
- **Features**:
  - Responsive grid/list layout
  - Delete button with confirmation dialog
  - Empty state message
  - Reverse chronological ordering

#### 4. FoodEntryCard Component

- **Purpose**: Individual food entry display
- **Features**:
  - Display all food entry fields
  - Delete button with hover effects
  - Responsive design
  - Gradient accent elements

### Server Functions

#### 1. createFoodEntry

```typescript
const createFoodEntry = createServerFn({ method: "POST" })
  .inputValidator(
    insertFoodItemSchema.pick({
      name: true,
      description: true,
      category: true,
      quantity: true,
      unit: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      expirationDate: true,
    })
  )
  .handler(async ({ data }) => {
    // Insert food entry into database
    // Return success/error response
  });
```

#### 2. getFoodEntries

```typescript
const getFoodEntries = createServerFn({ method: "GET" }).handler(async () => {
  // Fetch all food entries ordered by createdAt DESC
  // Return food entries array
});
```

#### 3. deleteFoodEntry

```typescript
const deleteFoodEntry = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    // Delete food entry by ID
    // Return success/error response
  });
```

## Data Models

### Food Entry Form Data

```typescript
interface FoodEntryFormData {
  name: string; // Required, 2-255 characters
  description?: string; // Optional, text description
  category?: string; // Optional, max 100 characters
  quantity?: number; // Optional, positive integer, default 1
  unit?: string; // Optional, max 50 characters, default "piece"
  calories?: number; // Optional, non-negative integer
  protein?: number; // Optional, non-negative decimal
  carbs?: number; // Optional, non-negative decimal
  fat?: number; // Optional, non-negative decimal
  expirationDate?: Date; // Optional, future date
}
```

### Food Entry Display Data

```typescript
interface FoodEntryDisplay extends FoodItem {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  expirationDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### Client-Side Error Handling

- **Form Validation**: Real-time validation with Zod schemas
- **Network Errors**: Toast notifications for connection issues
- **Server Errors**: User-friendly error messages
- **Loading States**: Skeleton loaders and disabled states

### Server-Side Error Handling

- **Database Errors**: Proper error logging and user-friendly responses
- **Validation Errors**: Detailed field-level error messages
- **Transaction Safety**: Proper rollback on failures

### Error Boundaries

- Route-level error boundary for catastrophic failures
- Component-level error boundaries for isolated failures

## Testing Strategy

### Unit Tests

- Form validation logic
- Server function input/output validation
- Component rendering with different props
- Error handling scenarios

### Integration Tests

- Full form submission flow
- Database operations
- Server function integration
- Route loading and navigation

### End-to-End Tests

- Complete user workflows
- Cross-browser compatibility
- Mobile responsiveness
- Performance under load

## Design System

### Color Palette

- **Primary Gradient**: `from-cyan-500 to-blue-500`
- **Background Gradient**: `from-slate-900 via-slate-800 to-slate-900`
- **Accent Colors**: `cyan-400`, `blue-400`
- **Text Colors**: `white`, `gray-300`, `gray-400`
- **Error Colors**: `red-400`, `red-500`
- **Success Colors**: `green-400`, `green-500`

### Typography

- **Headings**: Font weight 600-700, appropriate sizing
- **Body Text**: Font weight 400, readable line height
- **Form Labels**: Font weight 500, proper contrast

### Layout

- **Container**: Max width with centered content
- **Spacing**: Consistent padding and margins using Tailwind scale
- **Grid**: Responsive grid for food entries (1-3 columns based on screen size)
- **Form**: Single column layout with proper field spacing

### Interactive Elements

- **Buttons**: Gradient backgrounds with hover effects
- **Form Inputs**: Border focus states with cyan accent
- **Cards**: Subtle hover effects with shadow and border changes
- **Delete Buttons**: Red accent with confirmation modal

## Performance Considerations

### Data Loading

- Server-side data fetching with route loaders
- Optimistic updates for better UX
- Proper loading states during operations

### Database Optimization

- Indexed queries for food entries retrieval
- Efficient pagination if needed in future
- Connection pooling through existing setup

### Client Performance

- Minimal JavaScript bundle size
- Efficient re-renders with proper React patterns
- Image optimization for any icons/graphics

## Security Considerations

### Input Validation

- Server-side validation with Zod schemas
- SQL injection prevention through Drizzle ORM
- XSS prevention through proper escaping

### Authentication

- Currently no authentication required (matches existing app)
- Future-ready for user-specific food entries

### Data Sanitization

- Proper input sanitization
- Output encoding for display
- CSRF protection through TanStack Start defaults
