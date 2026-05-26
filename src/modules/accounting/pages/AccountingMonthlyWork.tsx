import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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
  financial_year_end: string | null;
  assigned_staff: string | null;
  status: string;
};

type MonthlyWorkRow = {
  clientId: string;
  clientName: string;
  businessName: string;
  phone: string;
  email: string;
  assignedStaff: string;
  bookkeeping: string;
  vat: string;
  paye: string;
  payroll: string;
  tax: string;
  overallStatus: string;
};

function AccountingMonthlyWork() {
  const [clients, setClients] = useState<AccountingClient[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "vat" | "payroll" | "paye" | "tax">("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          "id, client_name, business_name, phone, email, is_vat_registered, is_paye_registered, has_payroll, financial_year_end, assigned_staff, status"
        )
        .eq("business_id", profile.business_id)
        .order("client_name", { ascending: true });

      if (clientsError) throw clientsError;

      setClients((data ?? []) as AccountingClient[]);
    } catch (err) {
      console.error(err);
      setError("Could not load monthly accounting work.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const workRows = useMemo<MonthlyWorkRow[]>(() => {
    return clients.map((client) => {
      const hasVat = client.is_vat_registered;
      const hasPaye = client.is_paye_registered;
      const hasPayroll = client.has_payroll;

      return {
        clientId: client.id,
        clientName: client.client_name,
        businessName: client.business_name || "-",
        phone: client.phone || "-",
        email: client.email || "-",
        assignedStaff: client.assigned_staff || "-",

        bookkeeping: "Not Started",
        vat: hasVat ? "Not Started" : "N/A",
        paye: hasPaye ? "Not Started" : "N/A",
        payroll: hasPayroll ? "Not Started" : "N/A",
        tax: client.financial_year_end ? "Monitor" : "N/A",

        overallStatus:
          hasVat || hasPaye || hasPayroll || client.financial_year_end
            ? "Work Required"
            : "Basic Client",
      };
    });
  }, [clients]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return workRows.filter((row) => {
      const matchesSearch =
        !term ||
        [
          row.clientName,
          row.businessName,
          row.phone,
          row.email,
          row.assignedStaff,
          row.overallStatus,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesFilter =
        filter === "all" ||
        (filter === "vat" && row.vat !== "N/A") ||
        (filter === "payroll" && row.payroll !== "N/A") ||
        (filter === "paye" && row.paye !== "N/A") ||
        (filter === "tax" && row.tax !== "N/A");

      return matchesSearch && matchesFilter;
    });
  }, [workRows, search, filter]);

  const summary = useMemo(() => {
    return {
      total: workRows.length,
      vat: workRows.filter((row) => row.vat !== "N/A").length,
      paye: workRows.filter((row) => row.paye !== "N/A").length,
      payroll: workRows.filter((row) => row.payroll !== "N/A").length,
      tax: workRows.filter((row) => row.tax !== "N/A").length,
    };
  }, [workRows]);

  const monthLabel = new Date().toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Monthly Work</h1>
          <p style={subtitleStyle}>
            Accounting work overview for {monthLabel}: bookkeeping, VAT, PAYE,
            payroll and tax monitoring.
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
              Add Client
            </button>
          </Link>
        </div>
      </header>

      <section style={summaryGridStyle}>
        <SummaryBox label="Total Clients" value={summary.total.toString()} />
        <SummaryBox label="VAT Work" value={summary.vat.toString()} />
        <SummaryBox label="PAYE Work" value={summary.paye.toString()} />
        <SummaryBox label="Payroll Work" value={summary.payroll.toString()} />
        <SummaryBox label="Tax Monitor" value={summary.tax.toString()} />
      </section>

      <section style={toolbarStyle}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, business, phone, email, staff..."
          style={searchStyle}
        />

        <select
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value as "all" | "vat" | "payroll" | "paye" | "tax")
          }
          style={selectStyle}
        >
          <option value="all">All Work</option>
          <option value="vat">VAT Clients</option>
          <option value="payroll">Payroll Clients</option>
          <option value="paye">PAYE Clients</option>
          <option value="tax">Tax Monitor</option>
        </select>

        <button type="button" onClick={loadClients} style={refreshButtonStyle}>
          Refresh
        </button>
      </section>

      {loading && <div style={infoStyle}>Loading monthly work...</div>}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {!loading && !error && workRows.length === 0 && (
        <div style={emptyStyle}>
          No accounting clients captured yet. Add a client first.
        </div>
      )}

      {!loading && !error && workRows.length > 0 && filteredRows.length === 0 && (
        <div style={emptyStyle}>No monthly work matches your search.</div>
      )}

      {!loading && !error && filteredRows.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Business</th>
                <th style={thStyle}>Bookkeeping</th>
                <th style={thStyle}>VAT</th>
                <th style={thStyle}>PAYE</th>
                <th style={thStyle}>Payroll</th>
                <th style={thStyle}>Tax</th>
                <th style={thStyle}>Assigned</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.clientId}>
                  <td style={tdStyle}>{row.clientName}</td>
                  <td style={tdStyle}>{row.businessName}</td>
                  <td style={tdStyle}>
                    <StatusBadge value={row.bookkeeping} />
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge value={row.vat} />
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge value={row.paye} />
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge value={row.payroll} />
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge value={row.tax} />
                  </td>
                  <td style={tdStyle}>{row.assignedStaff}</td>
                  <td style={tdStyle}>
                    <span style={overallPillStyle}>{row.overallStatus}</span>
                  </td>
                  <td style={tdStyle}>
                    <Link to={`/accounting/clients/${row.clientId}`}>
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

      <section style={noteStyle}>
        <strong>Note:</strong> This first version calculates monthly work from
        each client’s service setup. Later we can add a real monthly work table
        where each task can be marked as submitted, completed, waiting for
        documents, or paid.
      </section>
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

function StatusBadge({ value }: { value: string }) {
  const isNotApplicable = value === "N/A";
  const isMonitor = value === "Monitor";

  return (
    <span
      style={{
        ...statusBadgeStyle,
        background: isNotApplicable ? "#f3f4f6" : isMonitor ? "#fff7ed" : "#e0f2fe",
        color: isNotApplicable ? "#666" : isMonitor ? "#9a3412" : "#075985",
      }}
    >
      {value}
    </span>
  );
}

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1450,
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
  maxWidth: 780,
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
  background: "#111",
  color: "white",
  border: "1px solid #111",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
};

const summaryValueStyle: CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
};

const summaryLabelStyle: CSSProperties = {
  marginTop: 6,
  fontWeight: 700,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 20,
  flexWrap: "wrap",
};

const searchStyle: CSSProperties = {
  flex: 1,
  minWidth: 280,
  padding: 13,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 16,
};

const selectStyle: CSSProperties = {
  padding: 13,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 16,
  background: "white",
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

const statusBadgeStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
};

const overallPillStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#e8f5e9",
  color: "#166534",
  fontWeight: 800,
  fontSize: 12,
};

const infoStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#f3f4f6",
  fontWeight: 700,
};

const emptyStyle: CSSProperties = {
  marginTop: 20,
  padding: 24,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
};

const errorStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 700,
};

const noteStyle: CSSProperties = {
  marginTop: 24,
  padding: 18,
  borderRadius: 12,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
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

export default AccountingMonthlyWork;