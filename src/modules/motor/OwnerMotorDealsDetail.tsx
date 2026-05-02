import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

type DealRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string | null;
  email: string | null;
  budget: number | null;
  deposit: number | null;
  status: string | null;
  salesperson_code: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  financier: string | null;
  documents_received: boolean | null;
  id_copy: boolean | null;
  proof_of_address: boolean | null;
  payslip: boolean | null;
  bank_statements: boolean | null;
  drivers_license: boolean | null;
  vehicle_ready: boolean | null;
  registration_ready: boolean | null;
  handover_ready: boolean | null;
  notes: string | null;
  date: string | null;
  created_at: string | null;
};

type VehicleRow = {
  id: string;
  make: string | null;
  model: string | null;
  vehicle_code: string | null;
  status: string | null;
};

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return `R ${value.toLocaleString("en-ZA")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

export default function OwnerMotorDealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<DealRow | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRow | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void loadDeal();
  }, [id]);

  async function loadDeal() {
    if (!id) {
      setErrorMsg("Deal ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMsg("You are not logged in.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      setErrorMsg("No business linked to this user.");
      setLoading(false);
      return;
    }

    const bid = profile.business_id as string;
    setBusinessId(bid);

    const { data: dealData, error: dealError } = await supabase
      .from("motor_deals")
      .select(`
        id,
        business_id,
        customer_id,
        customer_name,
        phone,
        email,
        budget,
        deposit,
        status,
        salesperson_code,
        vehicle_id,
        vehicle_name,
        financier,
        documents_received,
        id_copy,
        proof_of_address,
        payslip,
        bank_statements,
        drivers_license,
        vehicle_ready,
        registration_ready,
        handover_ready,
        notes,
        date,
        created_at
      `)
      .eq("id", id)
      .eq("business_id", bid)
      .single();

    if (dealError || !dealData) {
      setErrorMsg(dealError?.message || "Deal not found.");
      setLoading(false);
      return;
    }

    const loadedDeal = dealData as DealRow;
    setDeal(loadedDeal);

    if (loadedDeal.vehicle_id) {
      const { data: vehicleData } = await supabase
        .from("motor_vehicles")
        .select("id, make, model, vehicle_code, status")
        .eq("id", loadedDeal.vehicle_id)
        .single();

      setVehicle((vehicleData as VehicleRow) || null);
    } else {
      setVehicle(null);
    }

    setLoading(false);
  }

  async function updateField<K extends keyof DealRow>(field: K, value: DealRow[K]) {
    if (!deal) return;
    setDeal({ ...deal, [field]: value });
  }

  async function handleSave() {
    if (!deal) return;

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      customer_name: deal.customer_name?.trim(),
      phone: deal.phone?.trim() || null,
      email: deal.email?.trim() || null,
      budget: deal.budget,
      deposit: deal.deposit,
      status: deal.status || "new",
      salesperson_code: deal.salesperson_code?.trim() || null,
      financier: deal.financier?.trim() || null,
      documents_received: !!deal.documents_received,
      id_copy: !!deal.id_copy,
      proof_of_address: !!deal.proof_of_address,
      payslip: !!deal.payslip,
      bank_statements: !!deal.bank_statements,
      drivers_license: !!deal.drivers_license,
      vehicle_ready: !!deal.vehicle_ready,
      registration_ready: !!deal.registration_ready,
      handover_ready: !!deal.handover_ready,
      notes: deal.notes?.trim() || null,
      date: deal.date || null,
    };

    const { error } = await supabase
      .from("motor_deals")
      .update(payload)
      .eq("id", deal.id)
      .eq("business_id", businessId!);

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    if (deal.status === "sold" && deal.vehicle_id) {
      const { error: vehicleError } = await supabase
        .from("motor_vehicles")
        .update({ status: "sold" })
        .eq("id", deal.vehicle_id);

      if (vehicleError) {
        setErrorMsg(vehicleError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    await loadDeal();
  }

  const docsComplete = useMemo(() => {
    if (!deal) return false;
    return !!deal.id_copy &&
      !!deal.proof_of_address &&
      !!deal.payslip &&
      !!deal.bank_statements &&
      !!deal.drivers_license;
  }, [deal]);

  const deliveryReady = useMemo(() => {
    if (!deal) return false;
    return !!deal.vehicle_ready &&
      !!deal.registration_ready &&
      !!deal.handover_ready;
  }, [deal]);

  if (loading) {
    return <div style={{ padding: 32 }}>Loading deal...</div>;
  }

  if (!deal || errorMsg) {
    return (
      <div style={{ padding: 32 }}>
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fff3f3",
            border: "1px solid #f0caca",
            color: "#9b1c1c",
          }}
        >
          {errorMsg || "Deal not found."}
        </div>

        <button onClick={() => navigate("/motor/deals")} style={lightBtn}>
          ← Back to Deals
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <button onClick={() => navigate("/motor/deals")} style={lightBtn}>
          ← Back to Deals
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {deal.customer_id && (
            <button
              onClick={() => navigate(`/motor/customers/${deal.customer_id}`)}
              style={lightBtn}
            >
              Open Customer
            </button>
          )}

          <button
            onClick={() => navigate("/motor/admin/approved-delivery")}
            style={darkBtn}
          >
            Approved / Delivery
          </button>
        </div>
      </div>

      <div style={heroCard}>
        <div>
          <h1 style={{ margin: 0 }}>{deal.customer_name}</h1>
          <p style={{ marginTop: 8, color: "#666" }}>
            Deal detail and workflow control page.
          </p>
        </div>

        <div style={statusBadge}>{deal.status || "—"}</div>
      </div>

      {errorMsg && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fff3f3",
            border: "1px solid #f0caca",
            color: "#9b1c1c",
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={grid}>
        <div style={card}>
          <h3 style={title}>Deal Info</h3>

          <Label>Deal Date</Label>
          <input
            type="date"
            value={deal.date || ""}
            onChange={(e) => updateField("date", e.target.value)}
            style={field}
          />

          <Label>Customer Name</Label>
          <input
            value={deal.customer_name || ""}
            onChange={(e) => updateField("customer_name", e.target.value)}
            style={field}
          />

          <Label>Phone</Label>
          <input
            value={deal.phone || ""}
            onChange={(e) => updateField("phone", e.target.value)}
            style={field}
          />

          <Label>Email</Label>
          <input
            value={deal.email || ""}
            onChange={(e) => updateField("email", e.target.value)}
            style={field}
          />

          <Label>Salesperson Code</Label>
          <input
            value={deal.salesperson_code || ""}
            onChange={(e) => updateField("salesperson_code", e.target.value)}
            style={field}
          />

          <Label>Status</Label>
          <select
            value={deal.status || "new"}
            onChange={(e) => updateField("status", e.target.value)}
            style={field}
          >
            <option value="new">New</option>
            <option value="interested">Interested</option>
            <option value="negotiating">Negotiating</option>
            <option value="docs_pending">Docs Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="delivery">Delivery</option>
            <option value="sold">Sold</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <Label>Budget</Label>
          <input
            type="number"
            value={deal.budget ?? ""}
            onChange={(e) =>
              updateField("budget", e.target.value ? Number(e.target.value) : null)
            }
            style={field}
          />

          <Label>Deposit</Label>
          <input
            type="number"
            value={deal.deposit ?? ""}
            onChange={(e) =>
              updateField("deposit", e.target.value ? Number(e.target.value) : null)
            }
            style={field}
          />

          <Label>Financier</Label>
          <input
            value={deal.financier || ""}
            onChange={(e) => updateField("financier", e.target.value)}
            style={field}
          />
        </div>

        <div style={card}>
          <h3 style={title}>Vehicle</h3>

          <p><b>Stored Vehicle Name:</b> {deal.vehicle_name || "—"}</p>
          <p>
            <b>Vehicle Record:</b>{" "}
            {vehicle
              ? `${vehicle.make || ""} ${vehicle.model || ""} (${vehicle.vehicle_code || "—"})`
              : "—"}
          </p>
          <p><b>Vehicle Status:</b> {vehicle?.status || "—"}</p>
          <p><b>Created:</b> {formatDate(deal.created_at)}</p>
          <p><b>Budget:</b> {formatMoney(deal.budget)}</p>
          <p><b>Deposit:</b> {formatMoney(deal.deposit)}</p>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              background: "#f8f8f8",
              border: "1px solid #ddd",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Quick Read</div>
            <div style={{ fontSize: 14, color: "#444" }}>
              Documents complete: <b>{docsComplete ? "Yes" : "No"}</b>
            </div>
            <div style={{ fontSize: 14, color: "#444", marginTop: 4 }}>
              Delivery ready: <b>{deliveryReady ? "Yes" : "No"}</b>
            </div>
          </div>
        </div>
      </div>

      <div style={grid}>
        <div style={card}>
          <h3 style={title}>Documents Checklist</h3>

          <CheckRow
            label="Documents Received"
            checked={!!deal.documents_received}
            onChange={(checked) => updateField("documents_received", checked)}
          />
          <CheckRow
            label="ID Copy"
            checked={!!deal.id_copy}
            onChange={(checked) => updateField("id_copy", checked)}
          />
          <CheckRow
            label="Proof of Address"
            checked={!!deal.proof_of_address}
            onChange={(checked) => updateField("proof_of_address", checked)}
          />
          <CheckRow
            label="Payslip"
            checked={!!deal.payslip}
            onChange={(checked) => updateField("payslip", checked)}
          />
          <CheckRow
            label="Bank Statements"
            checked={!!deal.bank_statements}
            onChange={(checked) => updateField("bank_statements", checked)}
          />
          <CheckRow
            label="Driver's License"
            checked={!!deal.drivers_license}
            onChange={(checked) => updateField("drivers_license", checked)}
          />
        </div>

        <div style={card}>
          <h3 style={title}>Delivery Readiness</h3>

          <CheckRow
            label="Vehicle Ready"
            checked={!!deal.vehicle_ready}
            onChange={(checked) => updateField("vehicle_ready", checked)}
          />
          <CheckRow
            label="Registration Ready"
            checked={!!deal.registration_ready}
            onChange={(checked) => updateField("registration_ready", checked)}
          />
          <CheckRow
            label="Handover Ready"
            checked={!!deal.handover_ready}
            onChange={(checked) => updateField("handover_ready", checked)}
          />
        </div>
      </div>

      <div style={card}>
        <h3 style={title}>Notes</h3>
        <textarea
          value={deal.notes || ""}
          onChange={(e) => updateField("notes", e.target.value)}
          style={textarea}
          placeholder="Add deal notes here..."
        />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={handleSave} style={primaryBtn} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>

        {deal.status === "approved" && (
          <button
            onClick={() => navigate("/motor/admin/approved-delivery?status=approved")}
            style={darkBtn}
          >
            Go to Approved Queue
          </button>
        )}

        {deal.status === "delivery" && (
          <button
            onClick={() => navigate("/motor/admin/approved-delivery?status=delivery")}
            style={darkBtn}
          >
            Go to Delivery Queue
          </button>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>{children}</label>;
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

const heroCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: 20,
  borderRadius: 12,
  background: "#f8f8f8",
  border: "1px solid #ddd",
  marginBottom: 22,
};

const statusBadge: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "black",
  color: "white",
  fontWeight: 700,
  textTransform: "capitalize",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  marginBottom: 16,
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 18,
};

const title: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 14,
};

const field: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  marginBottom: 12,
};

const textarea: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 120,
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  background: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const lightBtn: React.CSSProperties = {
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