import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function OwnerMotorCustomerNew() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [budget, setBudget] = useState("");

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadBusinessId();
  }, []);

  async function loadBusinessId() {
    setLoadingBusiness(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("You are not logged in.");
      setLoadingBusiness(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      alert("No business linked to this user.");
      setLoadingBusiness(false);
      return;
    }

    setBusinessId(profile.business_id);
    setLoadingBusiness(false);
  }

  async function handleSave() {
    if (!businessId) {
      alert("Business not loaded yet.");
      return;
    }

    if (!name.trim()) {
      alert("Please enter the customer name.");
      return;
    }

    if (!phone.trim()) {
      alert("Please enter the phone number.");
      return;
    }

    setSaving(true);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanVehicle = vehicle.trim();

    const { data: existing, error: existingError } = await supabase
      .from("motor_customers")
      .select("id")
      .eq("business_id", businessId)
      .ilike("name", cleanName)
      .eq("phone", cleanPhone)
      .limit(1);

    if (existingError) {
      console.log(existingError);
    }

    if (existing && existing.length > 0) {
      alert("This customer already exists.");
      setSaving(false);
      navigate("/motor/customers");
      return;
    }

    const { error } = await supabase.from("motor_customers").insert([
      {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail || null,
        interested_vehicle: cleanVehicle || null,
        budget: budget ? Number(budget) : null,
        status: "lead",
        business_id: businessId,
      },
    ]);

    setSaving(false);

    if (error) {
      alert(error.message);
      console.log(error);
    } else {
      navigate("/motor/customers");
    }
  }

  if (loadingBusiness) {
    return <div style={{ padding: 32 }}>Loading customer form...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate("/motor/customers")} style={backBtn}>
          ← Back to Customers
        </button>

        <button onClick={() => navigate("/motor/deals")} style={darkBtn}>
          Open Deals
        </button>
      </div>

      <h1 style={{ marginBottom: 8 }}>Add Customer</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 20 }}>
        Create a real customer record linked to your business.
      </p>

      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={input}
      />

      <input
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={input}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={input}
      />

      <input
        placeholder="Interested Vehicle"
        value={vehicle}
        onChange={(e) => setVehicle(e.target.value)}
        style={input}
      />

      <input
        placeholder="Budget"
        type="number"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        style={input}
      />

      <button onClick={handleSave} style={btn} disabled={saving || !businessId}>
        {saving ? "Saving..." : "Save Customer"}
      </button>
    </div>
  );
}

const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const btn: React.CSSProperties = {
  padding: "10px 16px",
  background: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const backBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const darkBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};