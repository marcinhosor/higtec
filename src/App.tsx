import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import InstallAppBanner from "@/components/InstallAppBanner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TechnicianProvider } from "@/contexts/TechnicianContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Critical path — eagerly loaded
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";

// Lazy-loaded pages (prefetched after initial render)
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const AgendaPage = lazy(() => import("./pages/AgendaPage"));
const QuotesPage = lazy(() => import("./pages/QuotesPage"));
const CalculatorPage = lazy(() => import("./pages/CalculatorPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ServiceExecutionPage = lazy(() => import("./pages/ServiceExecutionPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const StrategicDashboardPage = lazy(() => import("./pages/StrategicDashboardPage"));
const EquipmentPage = lazy(() => import("./pages/EquipmentPage"));
const AdminPanelPage = lazy(() => import("./pages/AdminPanelPage"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const VehicleTripsPage = lazy(() => import("./pages/VehicleTripsPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Prefetch all lazy routes after first paint
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    setTimeout(() => {
      import("./pages/ClientsPage");
      import("./pages/AgendaPage");
      import("./pages/QuotesPage");
      import("./pages/ProductsPage");
      import("./pages/SettingsPage");
      import("./pages/ReportsPage");
      import("./pages/CalculatorPage");
      import("./pages/ServiceExecutionPage");
      import("./pages/CheckoutPage");
      import("./pages/StrategicDashboardPage");
      import("./pages/EquipmentPage");
      import("./pages/MarketplacePage");
      import("./pages/VehicleTripsPage");
    }, 1500);
  });
}

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <Toaster />
        <Sonner />
        <InstallAppBanner />
        <BrowserRouter>
          <TechnicianProvider>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/cadastro" element={<SignupPage />} />
                  <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Protected routes */}
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/clientes" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
                  <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
                  <Route path="/orcamentos" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
                  <Route path="/calculadora" element={<ProtectedRoute><CalculatorPage /></ProtectedRoute>} />
                  <Route path="/produtos" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
                  <Route path="/relatorios" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
                  <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                  <Route path="/execucao" element={<ProtectedRoute><ServiceExecutionPage /></ProtectedRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
                  <Route path="/painel" element={<ProtectedRoute><StrategicDashboardPage /></ProtectedRoute>} />
                  <Route path="/x9k2m" element={<ProtectedRoute><AdminPanelPage /></ProtectedRoute>} />
                  <Route path="/painel-admin" element={<ProtectedRoute><AdminPanelPage /></ProtectedRoute>} />
                  <Route path="/equipamentos" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
                  <Route path="/marketplace" element={<ProtectedRoute><MarketplacePage /></ProtectedRoute>} />
                  <Route path="/deslocamentos" element={<ProtectedRoute><VehicleTripsPage /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </TechnicianProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
