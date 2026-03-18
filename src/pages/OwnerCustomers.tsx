import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

type Customer = {
  id: string;
  name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string | null;
  area: string;
  is_active: boolean;
  created_at: string;
};

export default function OwnerCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
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
      <h1 style={{ marginBottom: 20 }}>Customers</h1>

      <input
        placeholder="Search by name, phone, area..."
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

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
              <th style={th}>Name</th>
              <th style={th}>Phone</th>
              <th style={th}>Address Line 1</th>
              <th style={th}>Address Line 2</th>
              <th style={th}>Area</th>
              <th style={th}>Active</th>
              <th style={th}>Created</th>
            </tr>
          </thead>

          <tbody>
         {filtered.map((c) => (
           <tr
           key={c.id}
           onClick={() =>
           navigate(`/dashboard/owner/customers/${c.id}`)
         }
           style={{
           borderBottom: "1px solid #eee",
           cursor: "pointer",
        }}
       >
           <td style={td}>{c.name}</td>
           <td style={td}>{c.phone}</td>
           <td style={td}>{c.address_line_1}</td>
           <td style={td}>{c.address_line_2}</td>
           <td style={td}>{c.area}</td>
           <td style={td}>{c.is_active ? "Yes" : "No"}</td>
           <td style={td}>
           {new Date(c.created_at).toLocaleDateString()}
           </td>
            </tr>
        ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  padding: "10px",
  borderBottom: "1px solid #ddd",
};

const td = {
  padding: "10px",
};