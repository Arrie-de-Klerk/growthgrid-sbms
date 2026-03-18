// src/pages/UpdatePassword.tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMsg("Password updated! You can now log in.");
    setTimeout(() => navigate("/", { replace: true }), 800);
  }

  return (
    <div className="centered">
      <div className="auth-card">
        <h1>Set new password</h1>
        <p className="muted">Enter a new password for your account</p>

        <form onSubmit={handleUpdate} className="auth-form">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error">{error}</div>}
          {msg && <div style={{ color: "green" }}>{msg}</div>}

          <button disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <button type="button" onClick={() => navigate("/")}>
          Back to login
        </button>
      </div>
    </div>
  );
}
