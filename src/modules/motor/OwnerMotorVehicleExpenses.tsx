import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";

type Expense = {
  id: string;
  vehicle_name: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
  business_id: string;
};

type VehicleRow = {
  id: string;
  make: string | null;
  model: string | null;
  vehicle_code: string | null;
  status: string | null;
};

function formatMoney(value: number | null | undefined) {
  if (value == null) return "R 0.00";
  return "R " + value.toLocaleString("en-ZA", { minimumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

export default function OwnerMotorExpenses() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    vehicle_name: "",
    description: "",
    amount: "",
    expense_date: "",
  });

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
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

    await Promise.all([loadExpenses(bid), loadVehicles(bid)]);
    setLoading(false);
  }

  async function loadExpenses(bid: string) {
    const { data, error } = await supabase
      .from("motor_expenses")
      .select("*")
      .eq("business_id", bid)
      .order("expense_date", { ascending: false });

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      setExpenses([]);
      return;
    }

    setExpenses((data as Expense[]) || []);
  }

  async function loadVehicles(bid: string) {
    const { data, error } = await supabase
      .from("motor_vehicles")
      .select("id, make, model, vehicle_code, status")
      .eq("business_id", bid)
      .order("make", { ascending: true });

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      setVehicles([]);
      return;
    }

    setVehicles((data as VehicleRow[]) || []);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!businessId) {
      alert("Business not loaded yet.");
      return;
    }

    if (!form.vehicle_name) {
      alert("Please select a vehicle.");
      return;
    }

    if (!form.description.trim()) {
      alert("Please enter the expense description.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!form.expense_date) {
      alert("Please select the expense date.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const { error } = await supabase.from("motor_expenses").insert({
      business_id: businessId,
      vehicle_name: form.vehicle_name,
      description: form.description.trim(),
      amount: Number(form.amount),
      expense_date: form.expense_date,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setForm({
      vehicle_name: "",
      description: "",
      amount: "",
      expense_date: "",
    });

    await loadExpenses(businessId);
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  if (loading) {
    return <p style={{ padding: 32 }}>Loading expenses…</p>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <button onClick={() => navigate("/motor")} style={lightBtn}>
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/motor/money")} style={darkBtn}>
            Open Money
          </button>
          <button onClick={() => navigate("/motor/stock")} style={lightBtn}>
            Open Stock
          </button>
        </div>
      </div>

      <h1 style={{ marginBottom: 8 }}>Vehicle Expenses</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 22 }}>
        Record repairs, reconditioning, and other vehicle-related costs for your Motor business.
      </p>

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

      <div style={summaryCard}>
        <div>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>
            Total Expenses
          </div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {formatMoney(totalExpenses)}
          </div>
        </div>

        <div style={{ color: "#666", fontSize: 13 }}>
          Total Records: <b>{expenses.length}</b>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Add Expense</h3>

        <form
          onSubmit={handleSave}
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <div>
            <label style={label}>Vehicle</label>
            <select
              value={form.vehicle_name}
              onChange={(e) =>
                setForm({ ...form, vehicle_name: e.target.value })
              }
              style={field}
            >
              <option value="">Select Vehicle</option>

              {vehicles.map((v) => (
                <option
                  key={v.id}
                  value={`${v.make || ""} ${v.model || ""}${v.vehicle_code ? ` (${v.vehicle_code})` : ""}`.trim()}
                >
                  {v.make} {v.model} {v.vehicle_code ? `(${v.vehicle_code})` : ""}
                  {v.status ? ` — ${v.status}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Description</label>
            <input
              placeholder="Engine repair, service, tyres..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={field}
            />
          </div>

          <div>
            <label style={label}>Amount</label>
            <input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) =>
                setForm({ ...form, amount: e.target.value })
              }
              style={field}
            />
          </div>

          <div>
            <label style={label}>Expense Date</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) =>
                setForm({ ...form, expense_date: e.target.value })
              }
              style={field}
            />
          </div>

          <div style={{ alignSelf: "end" }}>
            <button type="submit" style={primaryBtn} disabled={saving}>
              {saving ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </form>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Expense List</h3>

        <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={th}>Vehicle</th>
                <th style={th}>Description</th>
                <th style={th}>Amount</th>
                <th style={th}>Date</th>
              </tr>
            </thead>

            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td style={td} colSpan={4}>
                    No expenses captured yet.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={td}>{e.vehicle_name}</td>
                    <td style={td}>{e.description}</td>
                    <td style={td}>{formatMoney(e.amount)}</td>
                    <td style={td}>{formatDate(e.expense_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const summaryCard: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 18,
  marginBottom: 20,
  background: "#fff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const card: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  background: "#fff",
};

const label: CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
};

const field: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const th: CSSProperties = {
  padding: "10px 12px",
  textAlign: "center",
};

const td: CSSProperties = {
  padding: "10px 12px",
  textAlign: "center",
};

const primaryBtn: CSSProperties = {
  padding: "10px 16px",
  background: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const lightBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const darkBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};