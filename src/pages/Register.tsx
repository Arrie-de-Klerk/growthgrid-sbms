// src/pages/Register.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../App.css";

type Role = "owner" | "clerk";

export default function Register() {
  const navigate = useNavigate();

  // Personal details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Account setup
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("clerk");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDone(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          role, // "owner" | "clerk"
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmations are ON, user must confirm before session exists.
    // For demos, we keep it simple: show success + go back to login.
    setDone("Account created. Please log in (and confirm email if required).");
    setTimeout(() => navigate("/", { replace: true }), 800);
  }

  return (
    <div className="centered">
      <div className="auth-card">
        <h1>SBMS – Hermanus Gas</h1>
        <p className="muted">Register new user</p>

        <form onSubmit={handleRegister} className="auth-form">
          {/* ======================
              SECTION 1: Personal details
          ====================== */}
          <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 700 }}>
            Personal details
          </div>

          <input
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />

          <input
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />

          <input
            placeholder="Cell phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <hr style={{ margin: "14px 0" }} />

          {/* ======================
              SECTION 2: Account setup
          ====================== */}
          <div style={{ marginTop: 4, marginBottom: 8, fontWeight: 700 }}>
            Account setup
          </div>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Account role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="clerk">Clerk (Staff)</option>
            <option value="owner">Owner</option>
          </select>

          {error && <div className="error">{error}</div>}
          {done && <div style={{ color: "green", fontSize: 14 }}>{done}</div>}

          <button disabled={loading}>
            {loading ? "Creating…" : "Register"}
          </button>

          <p className="muted" style={{ marginTop: 10 }}>
            Already have an account? <Link to="/">Log in</Link>
          </p>

          <p className="muted" style={{ marginTop: 6 }}>
            Forgot password? <Link to="/reset-password">Reset</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
