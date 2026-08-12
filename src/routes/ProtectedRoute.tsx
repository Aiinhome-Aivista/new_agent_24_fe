import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/ui/Loading";
import { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><Loading label="Restoring session" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
