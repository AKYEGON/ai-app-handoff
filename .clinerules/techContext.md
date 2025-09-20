# Tech Context: DukaFiti

## Technologies Used
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query + React Context
- **Routing**: React Router v6
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **Build Tool**: Vite
- **Package Manager**: npm
- **Language**: TypeScript

## Development Setup
- **Node.js**: Required for development
- **Supabase CLI**: For database migrations
- **Playwright**: For end-to-end testing (installation issues)
- **ESLint**: For code linting
- **PostCSS**: For CSS processing

## Technical Constraints
- **Offline-first architecture** required
- **Low bandwidth optimization** for Kenyan market
- **Mobile-first responsive design**
- **Real-time data synchronization**
- **PWA capabilities** for mobile devices

## Dependencies
### Core Dependencies
- @supabase/supabase-js: Database client
- @tanstack/react-query: Server state management
- react-router-dom: Navigation
- lucide-react: Icons
- date-fns: Date utilities
- crypto-js: Encryption for offline data

### UI Dependencies
- @radix-ui/react-*: Component primitives
- tailwindcss: Utility-first CSS
- tailwind-merge: Conditional classes
- tailwindcss-animate: Animation utilities
- class-variance-authority: Component variants

### Development Dependencies
- @vitejs/plugin-react: Vite React plugin
- typescript: Type checking
- eslint: Code linting
- @playwright/test: End-to-end testing
- postcss: CSS processing

## Supabase Configuration
- **Project ID**: jrmwivphspbxmacqrava
- **URL**: https://jrmwivphspbxmacqrava.supabase.co
- **Anonymous Key**: Hardcoded in client.ts
- **RLS Enabled**: All tables have row-level security
- **Real-time**: Enabled for relevant tables

## Environment Requirements
- Node.js 18+ 
- Modern browser support
- Internet connection for initial setup
- Local storage for offline data

## Build and Deployment
- **Development**: `npm run dev` (Vite dev server)
- **Production**: `npm run build` (Vite build)
- **Preview**: `npm run preview` (Production preview)
- **Linting**: `npm run lint` (ESLint)

## Performance Considerations
- Bundle size optimization needed
- Code splitting implementation required
- Lazy loading for heavy components
- Local storage management for offline data
