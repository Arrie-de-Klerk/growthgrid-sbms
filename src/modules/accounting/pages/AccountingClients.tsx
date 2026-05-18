import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

type AccountingClient = {
  id: string;
  client_name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  is_vat_registered: boolean;
  is_paye_registered: boolean;
  has_payroll: boolean;
  status: string;
};

function AccountingClients() {
  const [clients, setClients] = useState<AccountingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadClients() {
    try {
      setLoading(true);
      setError("");

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setError("You are not signed in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", userData.user.id)
        .single();

      if (profileError || !profile?.business_id) {
        setError("Profile or business not found.");
        return;
      }

      const { data, error } = await supabase
        .from("accounting_clients")
        .select(
          "id, client_name, business_name, phone, email, is_vat_registered, is_paye_registered, has_payroll, status"
        )
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("Could not load accounting clients.");
        return;
      }

      setClients(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h1>Accounting Clients</h1>
      <p>Clients linked to this Accounting business.</p>

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <Link to="/accounting">
          <button style={secondaryButtonStyle}>Back to Dashboard</button>
        </Link>

        <Link to="/accounting/clients/new" style={{ marginLeft: 12 }}>
          <button style={buttonStyle}>Add New Client</button>
        </Link>
      </div>

      {loading && <p>Loading clients...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && clients.length === 0 && (
        <div style={emptyStyle}>No accounting clients captured yet.</div>
      )}

      {clients.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Client</th>
              <th style={thStyle}>Business</th>
              <th style={thStyle}>Phone</th>
              <th style={thStyle}>VAT</th>
              <th style={thStyle}>Payroll</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td style={tdStyle}>{client.client_name}</td>
                <td style={tdStyle}>{client.business_name || "-"}</td>
                <td style={tdStyle}>{client.phone || "-"}</td>
                <td style={tdStyle}>{client.is_vat_registered ? "Yes" : "No"}</td>
                <td style={tdStyle}>{client.has_payroll ? "Yes" : "No"}</td>
                <td style={tdStyle}>{client.status}</td>
                <td style={tdStyle}>
                  <Link to={`/accounting/clients/${client.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
  background: "white",
  border: "1px solid #ddd",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  background: "#f2f2f2",
  borderBottom: "1px solid #ddd",
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eee",
};

const emptyStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#666",
};

export default AccountingClients;