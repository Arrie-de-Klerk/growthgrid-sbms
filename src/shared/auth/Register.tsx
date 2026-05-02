// src/pages/Register.tsx

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";
import "../../App.css";

type Role = "owner" | "clerk";

type BusinessType =
  | "accounting"
  | "agriculture"
  | "electrical"
  | "fitment-center"
  | "gas"
  | "motor-dealers"
  | "motor-service"
  | "motor-spares"
  | "plumber";

export default function Register() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("clerk");
  const [businessType, setBusinessType] = useState<BusinessType | "">("");
  const [businessName, setBusinessName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);
    setDone(null);

    try {
      if (!firstName.trim()) throw new Error("Please add first name.");
      if (!lastName.trim()) throw new Error("Please add last name.");
      if (!phone.trim()) throw new Error("Please add cell phone number.");
      if (!email.trim()) throw new Error("Please add email.");
      if (!password.trim()) throw new Error("Please create a password.");
      if (!businessType) throw new Error("Please select a business type.");

      const finalBusinessName =
        businessName.trim() || `${formatBusinessType(businessType)} Business`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
            role,
            business_type: businessType,
            business_name: finalBusinessName,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Signup failed. No user returned.");

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .insert({
          name: finalBusinessName,
          business_type: businessType,
          owner_user_id: data.user.id,
        })
        .select("id")
        .single();

      if (businessError) throw businessError;
      if (!business?.id) throw new Error("Business was not created.");

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          role,
          business_type: businessType,
          business_id: business.id,
        },
        { onConflict: "id" }
      );

      if (profileError) throw profileError;

      setDone("Account and business created. Please log in.");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 900);
    } catch (err: any) {
      console.error("Register error:", err.message);
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="centered">
      <div className="auth-card">
        <h1>GrowthGrid</h1>
        <p className="muted">Register new user</p>

        <form onSubmit={handleRegister} className="auth-form">
          <div style={{ fontWeight: 700 }}>Personal details</div>

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

          <hr />

          <div style={{ fontWeight: 700 }}>Account setup</div>

          <input
            type="password"
            placeholder="Create password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label style={{ fontSize: 12 }}>Account role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="clerk">Clerk / Staff</option>
            <option value="owner">Owner</option>
          </select>

          <label style={{ fontSize: 12 }}>Select Business Type</label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value as BusinessType)}
            required
          >
            <option value="">Select Business</option>
            <option value="accounting">Accounting</option>
            <option value="agriculture">Agriculture</option>
            <option value="electrical">Electrical</option>
            <option value="fitment-center">Fitment Center</option>
            <option value="gas">Gas</option>
            <option value="motor-dealers">Motor Dealers</option>
            <option value="motor-service">Motor Service</option>
            <option value="motor-spares">Motor Spares</option>
            <option value="plumber">Plumber</option>
          </select>

          <label style={{ fontSize: 12 }}>Business Name</label>
          <input
            placeholder="Example: Hermanus Gas / ABC Gas / My Business"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />

          <p className="muted" style={{ fontSize: 12 }}>
            Each registration creates its own business workspace. This keeps
            demo businesses and client businesses separate.
          </p>

          {error && <div className="error">{error}</div>}
          {done && <div style={{ color: "green" }}>{done}</div>}

          <button disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>

          <p className="muted">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function formatBusinessType(type: BusinessType) {
  const labels: Record<BusinessType, string> = {
    accounting: "Accounting",
    agriculture: "Agriculture",
    electrical: "Electrical",
    "fitment-center": "Fitment Center",
    gas: "Gas",
    "motor-dealers": "Motor Dealers",
    "motor-service": "Motor Service",
    "motor-spares": "Motor Spares",
    plumber: "Plumber",
  };

  return labels[type] || "Business";
}