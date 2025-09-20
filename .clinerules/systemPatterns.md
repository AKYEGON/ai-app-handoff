# System Patterns: DukaFiti

## Architecture Overview
DukaFiti follows a modern React-based architecture with Supabase backend integration, designed for offline-first operation and real-time synchronization.

## Key Technical Decisions

### Frontend Architecture
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **TanStack Query** for server-state management
- **React Router** for navigation with protected routes
- **Shadcn/ui** component library for consistent UI

### Backend Integration
- **Supabase PostgreSQL** with Row Level Security (RLS)
- **Real-time subscriptions** for live data updates
- **Offline-first approach** with local data persistence
- **Automatic synchronization** when online

### Data Management Patterns
- **Unified data hooks** for consistent data access
- **Local storage caching** for offline operation
- **Optimistic updates** for better UX
- **Conflict resolution** for sync operations

## Component Relationships

### Core Hooks Architecture
1. **useAuth** - Authentication state management
2. **useOfflineFirstSupabase** - Base offline synchronization
3. **useUnifiedProducts** - Product management with offline support
4. **useUnifiedCustomers** - Customer management with debt tracking
5. **useUnifiedSales** - Sales processing and analytics
6. **useSyncCoordinator** - Cross-hook synchronization

### Page Structure
- **Landing** - Marketing and signup flow
- **Dashboard** - Business overview and metrics
- **Sales** - Point of sale interface
- **Inventory** - Product management
- **Customers** - Customer relationship management
- **Reports** - Business analytics

## Critical Implementation Paths

### Authentication Flow
1. User signs up/verifies email
2. Profile created in public.profiles table
3. Trial period initialized (14 days)
4. User redirected to dashboard

### Offline Operation
1. Data stored in localStorage with versioning
2. Operations queued in sync_queue table
3. Automatic retry on connection restore
4. Conflict resolution with last-write-wins

### Sales Processing
1. Product selection with stock validation
2. Customer association (optional)
3. Payment method selection (cash/M-Pesa/debt)
4. Transaction recording with profit calculation
5. Stock level updates

## Design Patterns in Use

### Singleton Patterns
- Supabase client singleton
- Authentication provider
- Cache manager

### Observer Patterns
- Auth state change listeners
- Real-time database subscriptions
- Network status monitoring

### Strategy Patterns
- Payment method handlers
- Sync conflict resolvers
- Data validation strategies

### Factory Patterns
- Product variant creation
- Report generation
- Template-based data creation

## Performance Considerations

### Bundle Optimization
- Code splitting at route level
- Lazy loading of heavy components
- Tree shaking with Vite

### Data Efficiency
- Pagination for large datasets
- Selective field queries
- Client-side filtering and sorting

### Offline Performance
- Local storage indexing
- Batch operations
- Background synchronization
