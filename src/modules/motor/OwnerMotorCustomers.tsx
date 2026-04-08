import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  interested_vehicle: string | null;
  budget: number | null;
  status: string;
  created_at: string;
};

export default function OwnerMotorCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("motor_customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setCustomers(data);
    setLoading(false);
  }

  const filtered = customers.filter((c) =>
    Object.values(c)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) return <p style={{ padding: 32 }}>Loading customers…</p>;

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 20 }}>Motor Customers</h1>

      <input
        placeholder="Search by name, vehicle, phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: 10,
          width: "100%",
          marginBottom: 20,
          borderRadius: 4,
          border: "1px solid #ccc",
        }}
      />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={th}>Name</th>
            <th style={th}>Phone</th>
            <th style={th}>Email</th>
            <th style={th}>Interested Vehicle</th>
            <th style={th}>Budget</th>
            <th style={th}>Status</th>
            <th style={th}>Created</th>
          </tr>
        </thead>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h1>Motor Customers</h1>

        <button
          onClick={() => navigate("/motor/customers/new")}
          style={{
           padding: "10px 16px",
           background: "#1976d2",
           color: "white",
           border: "none",
           borderRadius: 4,
           cursor: "pointer",
         }}
       >
       + Add Customer
     </button>
     </div>

        <tbody>
          {filtered.map((c) => (
            <tr
              key={c.id}
              onClick={() => navigate(`/motor/customers/${c.id}`)}
              style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
            >
              <td style={td}>{c.name}</td>
              <td style={td}>{c.phone}</td>
              <td style={td}>{c.email}</td>
              <td style={td}>{c.interested_vehicle}</td>
              <td style={td}>
                {c.budget ? `R ${c.budget.toLocaleString()}` : "-"}
              </td>
              <td style={td}>{c.status}</td>
              <td style={td}>
                {new Date(c.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: "10px", borderBottom: "1px solid #ddd" };
const td = { padding: "10px" };