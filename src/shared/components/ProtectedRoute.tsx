// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import type { UserRole } from "../types/userRole";

type Props = {
  children: ReactNode;
  allow: UserRole[];
  role: UserRole | null;
  loading: boolean;
};

export default function ProtectedRoute({ children, allow, role, loading }: Props) {
  if (loading) return <div style={{ padding: 32 }}>Loading…</div>;

  if (!role) return <Navigate to="/login" replace />;

  if (!allow.includes(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
