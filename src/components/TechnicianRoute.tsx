import { useTechnician } from "@/contexts/TechnicianContext";
import { Navigate } from "react-router-dom";

interface TechnicianRouteProps {
  children: React.ReactNode;
  /** Which pages the technician is allowed to see */
  allowedFor?: "admin" | "technician" | "both";
}

export default function TechnicianRoute({ children, allowedFor = "both" }: TechnicianRouteProps) {
  const { isTechnician } = useTechnician();

  // If this route is admin-only and user is a technician, redirect
  if (allowedFor === "admin" && isTechnician) {
    return <Navigate to="/orcamentos" replace />;
  }

  return <>{children}</>;
}
