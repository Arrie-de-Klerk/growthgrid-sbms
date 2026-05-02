import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Props = {
  children: ReactNode;
};

export default function AuthGate({ children }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!data.session) {
        navigate("/", { replace: true }); // ✅ send to real login page
        return;
      }

      setLoading(false);
    };

    checkUser();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return <div style={{ padding: 32 }}>Loading…</div>;
  }

  return <>{children}</>;
}