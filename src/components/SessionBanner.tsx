import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function SessionBanner() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      setEmail(data.user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      setRole(profile?.role ?? null);
    }

    load();
  }, []);

  if (!email) return null;

  return (
    <div style={{
      padding: "8px 16px",
      background: "#111",
      color: "#fff",
      fontSize: "13px"
    }}>
      Logged in as: <strong>{email}</strong> ({role})
    </div>
  );
}
