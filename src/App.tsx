
import React from 'react';
import { SafeToasterWrapper } from "./components/SafeToasterWrapper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import ModernLanding from "./pages/ModernLanding";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Offline from "./pages/Offline";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./components/Dashboard";
import RebuiltModernSalesPage from "./components/RebuiltModernSalesPage";
import InventoryPage from "./components/InventoryPage";
import CustomersPage from "./components/CustomersPage";
import ReportsPage from "./components/ReportsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import TestPage from "./pages/TestPage";
import ImageDownloadTestPage from "./pages/ImageDownloadTest";
import TemplateCacheCleaner from "./components/TemplateCacheCleaner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
      // Enhanced offline support
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <TooltipProvider>
              <AuthProvider>
                <TemplateCacheCleaner />
                <ErrorBoundary>
                <div className="min-h-screen w-full bg-background text-foreground">
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/modern-landing" element={<ModernLanding />} />
                    <Route path="/landing" element={<ModernLanding />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/auth" element={<Navigate to="/signin" replace />} />
                    <Route path="/offline" element={<Offline />} />
                    
                    {/* Dashboard compatibility route */}
                    <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                    
                    {/* Protected routes with persistent layout */}
                    <Route path="/app" element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Outlet />
                        </AppLayout>
                      </ProtectedRoute>
                    }>
                      <Route index element={<Navigate to="/app/dashboard" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="sales" element={<RebuiltModernSalesPage />} />
                      <Route path="inventory" element={<InventoryPage />} />
                      <Route path="customers" element={<CustomersPage />} />
                      <Route path="reports" element={<ReportsPage />} />
                      <Route path="settings" element={<Settings />} />
                    </Route>
                    
                    {/* Test routes */}
                    <Route path="/test" element={<TestPage />} />
                    <Route path="/image-download-test" element={<ImageDownloadTestPage />} />
                    
                    
                    {/* 404 - Always show with layout if user is authenticated */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <SafeToasterWrapper />
                  </div>
                </ErrorBoundary>
              </AuthProvider>
            </TooltipProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
