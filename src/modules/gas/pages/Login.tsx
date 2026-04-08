// src/modules/gas/pages/Login.tsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";
import "../../../App.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error || !data.session) {
      setError(error?.message || "Login failed");
      return;
    }

    // ⭐ VERY IMPORTANT
    // We go to root → DashboardGate decides owner / clerk
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="centered">
      <div className="auth-card">
        <h1>GrowthGrid</h1>
          <p style={{ marginTop: 5, color: "#666" }}>
              Smart Business Management System
          </p>
          <p className="muted">Login</p>

        <form onSubmit={handleLogin} className="auth-form">
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <div className="error">{error}</div>}

          <button disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>

          <p className="muted" style={{ marginTop: 10 }}>
            No account? <Link to="/register">Register</Link>
          </p>

          <p className="muted" style={{ marginTop: 6 }}>
            Forgot password? <Link to="/reset-password">Reset</Link>
          </p>
        </form>
      </div>
    </div>
  );
}