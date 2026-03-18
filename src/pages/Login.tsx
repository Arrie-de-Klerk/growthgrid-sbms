// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // ✅ ALWAYS go to gate
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="centered">
      <div className="auth-card">
        <h1>SBMS Hermanus Gas</h1>
        <p className="muted">Sign in to continue</p>

        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
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
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>

        {/* 🔗 THESE WERE MISSING */}
        <div className="auth-switch">
          <p>
            No account? <Link to="/register">Register</Link>
          </p>
          <p>
            Forgot password?{" "}
            <Link to="/forgot-password">Reset</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
