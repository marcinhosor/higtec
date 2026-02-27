import { useAuth } from "@/contexts/AuthContext";
import { useTechnician } from "@/contexts/TechnicianContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { isTechnician } = useTechnician();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Allow if either admin session or technician session exists
  if (!session && !isTechnician) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
