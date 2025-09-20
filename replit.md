# DukaFiti - Kenya Shop Management System

## Overview

DukaFiti is a comprehensive shop management system specifically designed for Kenyan entrepreneurs. Built with React 18, TypeScript, and Supabase, it provides offline-first capabilities, M-Pesa integration, and complete business management features including inventory tracking, customer management, sales processing, and financial reporting.

The system follows a modern PWA architecture with robust offline functionality, ensuring business continuity even with unreliable internet connections. It features a complete design system with semantic color tokens, shadcn/ui components, and responsive layouts optimized for mobile-first usage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18 + TypeScript + Vite**: Modern development stack with fast HMR and type safety
- **Offline-First Design**: IndexedDB-based caching with automatic sync when online
- **Progressive Web App**: Full PWA implementation with service worker and offline capabilities
- **Responsive Design**: Mobile-first approach using Tailwind CSS with custom breakpoints
- **Component System**: Shadcn/ui component library with custom extensions and semantic design tokens

### State Management & Data Flow
- **TanStack Query**: Server state management with intelligent caching and background updates
- **Custom Hooks Pattern**: Unified hooks for products, customers, sales, and sync operations
- **Cache Manager**: Sophisticated caching system with user-specific storage and automatic cleanup
- **Sync Coordinator**: Manages offline operations and coordinates data synchronization

### Authentication & Security
- **Supabase Auth**: Email/password and OAuth (Google) authentication
- **Row Level Security**: Database-level security policies for multi-tenant data isolation
- **JWT Tokens**: Secure session management with automatic token refresh
- **Protected Routes**: Route-based authentication with offline fallback

### Data Storage Architecture
- **Primary Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Offline Storage**: IndexedDB for local data persistence
- **Cache Strategy**: Multi-layered caching with localStorage for UI state and IndexedDB for business data
- **Sync Strategy**: Optimistic UI updates with background synchronization

### Business Logic Components
- **Sales Processing**: Multi-payment method support (cash, M-Pesa, debt, split payments)
- **Inventory Management**: Stock tracking with low-stock alerts and variant support
- **Customer Management**: Debt tracking, credit limits, and risk assessment
- **Reporting System**: Real-time analytics with offline report generation

### Database Schema Design
- **Users Table**: User profiles with shop metadata
- **Products Table**: Inventory with variant support and image URLs
- **Customers Table**: Customer profiles with debt tracking and purchase history
- **Sales Table**: Transaction records with detailed payment information
- **Debt Payments Table**: Separate debt payment tracking
- **Database Triggers**: Automated customer debt updates and business logic enforcement

## External Dependencies

### Core Services
- **Supabase**: Backend-as-a-Service providing PostgreSQL database, authentication, and real-time subscriptions
- **Vercel**: Deployment platform with edge network and serverless functions
- **Google OAuth**: Third-party authentication provider

### Payment Integration
- **M-Pesa API**: Mobile payment processing (configured for integration)
- **Till Number Support**: Business payment collection setup

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **ESLint**: Code linting and quality enforcement

### UI and Experience
- **Radix UI**: Accessible component primitives
- **Lucide Icons**: Icon system
- **Next Themes**: Theme management system
- **Fuse.js**: Fuzzy search functionality

### Offline and PWA
- **IndexedDB**: Browser-based database for offline storage
- **Service Worker**: Background sync and caching
- **Web App Manifest**: PWA configuration and installation

### Data Processing
- **Date-fns**: Date manipulation and formatting
- **React Hook Form**: Form handling with validation
- **Zod**: Runtime type validation
- **React Window**: Virtual scrolling for large lists