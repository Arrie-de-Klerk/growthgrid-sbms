import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "../hooks/useUserRole";

type Props = {
  allow: ("owner" | "clerk")[];
  children: ReactNode;
};

export default function RoleGuard({ allow, children }: Props) {
  const { role, loading } = useUserRole();

  if (loading) {
    return <div className="loading">Checking permissions…</div>;
  }

  if (!role || !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
