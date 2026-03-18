import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import "../App.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "Password reset email sent. Please check your inbox."
      );
    }

    setLoading(false);
  }

  return (
    <div className="centered">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        <p className="muted">
          Enter your email and we’ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div className="auth-switch">
          <Link to="/login">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
