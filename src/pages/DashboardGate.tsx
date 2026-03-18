// src/pages/DashboardGate.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function DashboardGate() {
  const navigate = useNavigate();

  useEffect(() => {
    async function routeUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Profile missing");
        navigate("/", { replace: true });
        return;
      }

      if (data.role === "owner") {
        navigate("/dashboard/owner", { replace: true });
      } else {
        navigate("/dashboard/clerk", { replace: true });
      }
    }

    routeUser();
  }, [navigate]);

  return <div className="loading">Loading dashboard…</div>;
}
