import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../../App.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      setLoading(false);
      setErrorMsg(error?.message || "Login failed");
      return;
    }

    // 🔥 GET PROFILE
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id, business_type, role")
      .eq("id", data.session.user.id)
      .single();

    if (!profile) {
      setErrorMsg("Profile not found");
      setLoading(false);
      return;
    }

  const businessType = String(profile.business_type || "").trim().toLowerCase();
const role = String(profile.role || "").trim().toLowerCase();

// GAS
if (businessType === "gas") {
  if (role === "owner") {
    navigate("/gas", { replace: true });
  } else {
    navigate("/gas/clerk", { replace: true });
  }
  return;
}

// ACCOUNTING
if (businessType === "accounting") {
  if (role === "clerk") {
    navigate("/accounting/staff", { replace: true });
  } else {
    navigate("/accounting", { replace: true });
  }
  return;
}

// MOTOR SALES
if (businessType === "motor-sales" || businessType === "motor") {
  if (role === "owner") {
    navigate("/motor", { replace: true });
  } else {
    navigate("/motor/team", { replace: true });
  }
  return;
}

// FALLBACK
setErrorMsg(`Business type not connected yet: ${profile.business_type}`);
setLoading(false);

  } // ✅ THIS WAS MISSING

  return (
    <div className="centered">
      <div className="auth-card">
        <h1>GrowthGrid</h1>

      <p
        className="muted"
        style={{
          marginTop: -6,
          marginBottom: 14,
          fontWeight: 700,
          letterSpacing: 0.3,
       }}
       >
          Smart Business Management Systems
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

          {errorMsg && <div className="error">{errorMsg}</div>}

          <button disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>

          <p className="muted" style={{ marginTop: 10 }}>
             No account? <Link to="/register">Register</Link>
         </p>

         <p className="muted" style={{ marginTop: 8 }}>
           Forgot password? <Link to="/reset-password">Reset password</Link>
         </p>
        </form>
      </div>
    </div>
  );
}

