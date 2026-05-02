import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    async function run() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role, business_type")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        console.error("Profile error:", error);
        navigate("/", { replace: true });
        return;
      }

      if (data.business_type !== "gas") {
        navigate("/", { replace: true });
        return;
      }

      if (data.role === "owner") {
        navigate("/gas", { replace: true });
      } else {
        navigate("/gas/clerk", { replace: true });
      }
    }

    run();
  }, [navigate]);

  return <p>Checking authentication…</p>;
}