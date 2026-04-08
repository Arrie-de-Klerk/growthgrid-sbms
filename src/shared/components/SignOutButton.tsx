import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function SignOutButton() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #ccc",
        background: "#fff",
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
