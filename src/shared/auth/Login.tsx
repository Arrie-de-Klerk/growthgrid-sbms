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
      .select("role, business_type")
      .eq("id", data.session.user.id)
      .single();

    if (!profile) {
      setErrorMsg("Profile not found");
      setLoading(false);
      return;
    }

    // GAS
     if (profile.business_type === "gas") {
       if (profile.role === "owner") {
         navigate("/gas", { replace: true });
       } else {
         navigate("/gas/clerk", { replace: true });
       }
     }

     // MOTOR SALES
     else if (profile.business_type === "motor-sales") {
       if (profile.role === "owner") {
         navigate("/motor", { replace: true });
       } else {
         navigate("/motor/team", { replace: true });
       }
     }

    // fallback
    else {
      setErrorMsg("System not configured");
    }

    setLoading(false);
  } // ✅ THIS WAS MISSING

  return (
    <div className="centered">
      <div className="auth-card">
        <h1>GrowthGrid</h1>
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
        </form>
      </div>
    </div>
  );
}

