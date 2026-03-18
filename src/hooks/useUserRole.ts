// src/hooks/useUserRole.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { UserRole } from "../types/userRole";

export function useUserRole(userId?: string) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // We don’t even need userId here; RPC uses auth.uid()
        const { data, error } = await supabase.rpc("get_my_role");
        if (error) throw error;

        if (!cancelled) {
          setRole((data as UserRole) ?? null);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("useUserRole error:", e);
        if (!cancelled) {
          setRole(null);
          setError(e?.message ?? "Role lookup failed");
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { role, loading, error };
}
