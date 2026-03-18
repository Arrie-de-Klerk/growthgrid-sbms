import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    async function run() {
      const { data: { user } } = await supabase.auth.getUser();

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
        console.error("Profile error:", error);
        navigate("/", { replace: true });
        return;
      }

      if (data.role === "owner") {
        navigate("/owner", { replace: true });
      } else {
        navigate("/clerk", { replace: true });
      }
    }

    run();
  }, []);

  return <p>Checking authentication…</p>;
}
