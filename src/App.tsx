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
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ClientsPage from "./pages/ClientsPage";
import AgendaPage from "./pages/AgendaPage";
import CalculatorPage from "./pages/CalculatorPage";
import ProductsPage from "./pages/ProductsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import QuotesPage from "./pages/QuotesPage";
import ServiceExecutionPage from "./pages/ServiceExecutionPage";
import CheckoutPage from "./pages/CheckoutPage";
import StrategicDashboardPage from "./pages/StrategicDashboardPage";
import EquipmentPage from "./pages/EquipmentPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </TechnicianProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
