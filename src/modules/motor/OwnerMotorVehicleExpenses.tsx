import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

type Expense = {
  id: string;
  vehicle_name: string;
  description: string;
  amount: number;
  expense_date: string;
  created_at: string;
};

export default function OwnerMotorExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    vehicle_name: "",
    description: "",
    amount: "",
    expense_date: "",
  });

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    const { data, error } = await supabase
      .from("motor_expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    if (!error && data) setExpenses(data);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.from("motor_expenses").insert({
      vehicle_name: form.vehicle_name,
      description: form.description,
      amount: Number(form.amount),
      expense_date: form.expense_date,
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Expense saved ✅");

    setForm({
      vehicle_name: "",
      description: "",
      amount: "",
      expense_date: "",
    });

    loadExpenses();
  }

  if (loading) return <p style={{ padding: 32 }}>Loading expenses…</p>;

  return (
    <div style={{ padding: 32 }}>
      <h1>Vehicle Expenses</h1>

      {/* ADD EXPENSE */}
      <div style={{ marginBottom: 30 }}>
        <h3>Add Expense</h3>

        <form onSubmit={handleSave} style={{ display: "grid", gap: 10, maxWidth: 400 }}>
          <input
            placeholder="Vehicle (e.g. Toyota Hilux)"
            value={form.vehicle_name}
            onChange={(e) =>
              setForm({ ...form, vehicle_name: e.target.value })
            }
          />

          <input
            placeholder="Description (e.g. Engine repair)"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <input
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
          />

          <input
            type="date"
            value={form.expense_date}
            onChange={(e) =>
              setForm({ ...form, expense_date: e.target.value })
            }
          />

          <button
            type="submit"
            style={{
              padding: 10,
              background: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Save Expense
          </button>
        </form>
      </div>

      {/* EXPENSE LIST */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={th}>Vehicle</th>
            <th style={th}>Description</th>
            <th style={th}>Amount</th>
            <th style={th}>Date</th>
          </tr>
        </thead>

        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={td}>{e.vehicle_name}</td>
              <td style={td}>{e.description}</td>
              <td style={td}>R {e.amount.toLocaleString()}</td>
              <td style={td}>
                {new Date(e.expense_date).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: 10, borderBottom: "1px solid #ddd" };
const td = { padding: 10 };