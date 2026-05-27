import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();

  const statusFilter = searchParams.get("status");
  const serviceFilter = searchParams.get("service");

  async function loadClients() {
    try {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        setError("You are not signed in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, business_type")
        .eq("id", userData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        setError("Profile or business not found.");
        return;
      }

      if (profile.business_type !== "accounting") {
        setError("This page is only for Accounting businesses.");
        return;
      }

      const { data, error: clientsError } = await supabase
        .from("accounting_clients")
        .select(
          "id, client_name, business_name, phone, email, is_vat_registered, is_paye_registered, has_payroll, status"
        )
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;

      setClients((data ?? []) as AccountingClient[]);
    } catch (err) {
      console.error(err);
      setError("Could not load accounting clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
  const term = search.trim().toLowerCase();

  return clients.filter((client) => {
    const matchesSearch =
      !term ||
      [
        client.client_name,
        client.business_name,
        client.phone,
        client.email,
        client.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));

    const matchesStatus =
      !statusFilter || client.status === statusFilter;

    const matchesService =
      !serviceFilter ||
      (serviceFilter === "vat" && client.is_vat_registered) ||
      (serviceFilter === "paye" && client.is_paye_registered) ||
      (serviceFilter === "payroll" && client.has_payroll);

    return matchesSearch && matchesStatus && matchesService;
  });
}, [clients, search, statusFilter, serviceFilter]);

  const summary = useMemo(() => {
    return {
      total: clients.length,
      active: clients.filter((client) => client.status === "active").length,
      vat: clients.filter((client) => client.is_vat_registered).length,
      paye: clients.filter((client) => client.is_paye_registered).length,
      payroll: clients.filter((client) => client.has_payroll).length,
    };
  }, [clients]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Accounting Clients</h1>
          <p style={subtitleStyle}>
            View, search and manage clients linked to this Accounting business.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link to="/accounting">
            <button type="button" style={secondaryButtonStyle}>
              Back to Dashboard
            </button>
          </Link>

          <Link to="/accounting/clients/new">
            <button type="button" style={buttonStyle}>
              Add New Client
            </button>
          </Link>
        </div>
      </header>

      <section style={summaryGridStyle}>
        <SummaryBox label="Total Clients" value={summary.total.toString()} />
        <SummaryBox label="Active" value={summary.active.toString()} />
        <SummaryBox label="VAT" value={summary.vat.toString()} />
        <SummaryBox label="PAYE" value={summary.paye.toString()} />
        <SummaryBox label="Payroll" value={summary.payroll.toString()} />
      </section>

      <section style={toolbarStyle}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, business, phone, email, status..."
          style={searchStyle}
        />

        <button type="button" onClick={loadClients} style={refreshButtonStyle}>
          Refresh
        </button>
      </section>

      {loading && <div style={infoStyle}>Loading clients...</div>}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {!loading && !error && clients.length === 0 && (
        <div style={emptyStyle}>No accounting clients captured yet.</div>
      )}

      {!loading && !error && clients.length > 0 && filteredClients.length === 0 && (
        <div style={emptyStyle}>No clients match your search.</div>
      )}

      {!loading && !error && filteredClients.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Business</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>VAT</th>
                <th style={thStyle}>PAYE</th>
                <th style={thStyle}>Payroll</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td style={tdStyle}>{client.client_name}</td>
                  <td style={tdStyle}>{client.business_name || "-"}</td>
                  <td style={tdStyle}>{client.phone || "-"}</td>
                  <td style={tdStyle}>{client.email || "-"}</td>
                  <td style={tdStyle}>
                    {client.is_vat_registered ? "Yes" : "No"}
                  </td>
                  <td style={tdStyle}>
                    {client.is_paye_registered ? "Yes" : "No"}
                  </td>
                  <td style={tdStyle}>{client.has_payroll ? "Yes" : "No"}</td>
                  <td style={tdStyle}>
                    <span style={statusPillStyle}>{client.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <Link to={`/accounting/clients/${client.id}`}>
                      <button type="button" style={smallButtonStyle}>
                        Open
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryValueStyle}>{value}</div>
      <div style={summaryLabelStyle}>{label}</div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1400,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 30,
};

const titleStyle: CSSProperties = {
  fontSize: 42,
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  fontSize: 18,
  color: "#555",
  marginTop: 8,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const summaryBoxStyle: CSSProperties = {
  padding: 20,
  borderRadius: 14,
  background: "white",
  border: "1px solid #ddd",
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
};

const summaryValueStyle: CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
};

const summaryLabelStyle: CSSProperties = {
  color: "#555",
  marginTop: 6,
  fontWeight: 700,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 20,
};

const searchStyle: CSSProperties = {
  flex: 1,
  padding: 13,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 16,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 12,
  overflow: "hidden",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: 12,
  background: "#f2f2f2",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const statusPillStyle: CSSProperties = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  background: "#e8f5e9",
  color: "#166534",
  fontWeight: 800,
  textTransform: "uppercase",
  fontSize: 12,
};

const emptyStyle: CSSProperties = {
  marginTop: 20,
  padding: 24,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
};

const infoStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#f3f4f6",
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 700,
};

const buttonStyle: CSSProperties = {
  padding: "12px 18px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "white",
  color: "black",
  border: "1px solid #ddd",
};

const refreshButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#666",
};

const smallButtonStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

export default AccountingClients;