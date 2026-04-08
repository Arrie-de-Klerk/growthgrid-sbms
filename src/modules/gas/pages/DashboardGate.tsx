import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

export default function DashboardGate() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      // ✅ STEP 1 — CHECK SESSION FIRST
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/login", { replace: true });
        return;
      }

      // ✅ STEP 2 — LOAD PROFILE
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      // ❌ IF PROFILE MISSING → GO LOGIN (NOT OWNER!)
      if (error || !data) {
        console.warn("No profile found");
        navigate("/login", { replace: true });
        return;
      }

      // ✅ STEP 3 — ROUTE
      if (data.role === "owner") {
        navigate("/dashboard/owner", { replace: true });
      } else {
        navigate("/dashboard/clerk", { replace: true });
      }
    };

    run();

    // ✅ OPTIONAL: still listen for login/logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      run();
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <div className="loading">Loading dashboard…</div>;
}