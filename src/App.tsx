import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { isApkMode } from "@/utils/platform";

// Lazy-load heavy pages to reduce initial bundle size
const Index = lazy(() => import("./pages/Index"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Classroom = lazy(() => import("./pages/Classroom"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const MobileApp = lazy(() => import("./pages/MobileApp"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
            <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route path="/mobile" element={
                <ProtectedRoute>
                  <MobileApp />
                </ProtectedRoute>
              } />
              <Route path="/home" element={
                <ProtectedRoute>
                  {isApkMode() ? <MobileApp /> : <LandingPage />}
                </ProtectedRoute>
              } />
              <Route path="/simulator" element={
                <ProtectedRoute>
                  {isApkMode() ? <MobileApp /> : <Index />}
                </ProtectedRoute>
              } />
              <Route path="/classroom" element={
                <ProtectedRoute>
                  <Classroom />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
