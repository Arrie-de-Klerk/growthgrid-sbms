import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type AccountingClient = {
  id: string;
  client_name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_registration_number: string | null;
  vat_number: string | null;
  paye_number: string | null;
  income_tax_number: string | null;
  is_vat_registered: boolean;
  is_paye_registered: boolean;
  has_payroll: boolean;
  financial_year_end: string | null;
  assigned_staff: string | null;
  status: string;
  notes: string | null;
};

type AccountingMonthlyTask = {
  id: string;
  task_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;
};

type AccountingDocumentTask = {
  id: string;
  document_type: string;
  status: string;
  requested_at: string | null;
  received_at: string | null;
  filed_at: string | null;
};

export default function AccountingClientDetail() {
  const { id } = useParams();

  const [client, setClient] = useState<AccountingClient | null>(null);
  const [monthlyTasks, setMonthlyTasks] = useState<AccountingMonthlyTask[]>([]);
  const [documentTasks, setDocumentTasks] = useState<AccountingDocumentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

  async function loadClient() {
    try {
      setLoading(true);
      setError("");

      if (!id) {
        setError("Client ID not found.");
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        setError("You are not signed in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", userData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        setError("Profile or business not found.");
        return;
      }

      const { data, error: clientError } = await supabase
        .from("accounting_clients")
        .select("*")
        .eq("id", id)
        .eq("business_id", profile.business_id)
        .single();

      if (clientError) throw clientError;

      if (!data) {
        setError("Client not found.");
        return;
      }

      const loadedClient = data as AccountingClient;
        setClient(loadedClient);

      const monthStart = getMonthStart();

      const { data: monthlyData, error: monthlyError } = await supabase
        .from("accounting_monthly_tasks")
        .select("id, task_type, status, started_at, completed_at, submitted_at")
        .eq("business_id", profile.business_id)
        .eq("client_id", loadedClient.id)
        .eq("month_start", monthStart);

      if (monthlyError) throw monthlyError;

      const { data: documentData, error: documentError } = await supabase
        .from("accounting_document_tasks")
        .select("id, document_type, status, requested_at, received_at, filed_at")
        .eq("business_id", profile.business_id)
        .eq("client_id", loadedClient.id)
        .eq("month_start", monthStart);

      if (documentError) throw documentError;

      setMonthlyTasks(monthlyData ?? []);
      setDocumentTasks(documentData ?? []);
          } catch (err) {
            console.error(err);
            setError("Could not load accounting client.");
          } finally {
            setLoading(false);
          }
        }

        useEffect(() => {
            loadClient();
          }, [id]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Accounting Client Detail</h1>
          <p style={subtitleStyle}>
            Client profile, tax details, payroll setup and accounting notes.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link to="/accounting">
            <button style={secondaryButtonStyle}>Back to Dashboard</button>
          </Link>

          <Link to="/accounting/clients">
            <button style={buttonStyle}>Back to Clients</button>
          </Link>
        </div>
      </header>

      {loading && <div style={infoStyle}>Loading client...</div>}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {!loading && !error && client && (
        <>
          <section style={heroCardStyle}>
            <div>
              <h2 style={clientNameStyle}>
                {client.business_name || client.client_name}
              </h2>
              <p style={mutedTextStyle}>Contact: {client.client_name}</p>
            </div>

            <div style={statusPillStyle}>
              {client.status || "active"}
            </div>
          </section>

          <section style={gridStyle}>
            <Card title="Client Information">
              <Detail label="Phone" value={client.phone} />
              <Detail label="Email" value={client.email} />
              <Detail label="Address" value={client.address} />
              <Detail label="Assigned Staff" value={client.assigned_staff} />
            </Card>

            <Card title="Registration Details">
              <Detail
                label="Company Reg"
                value={client.company_registration_number}
              />
              <Detail label="VAT Number" value={client.vat_number} />
              <Detail label="PAYE Number" value={client.paye_number} />
              <Detail
                label="Income Tax Number"
                value={client.income_tax_number}
              />
            </Card>

            <Card title="Services">
              <Detail
                label="VAT Registered"
                value={client.is_vat_registered ? "Yes" : "No"}
              />
              <Detail
                label="PAYE Registered"
                value={client.is_paye_registered ? "Yes" : "No"}
              />
              <Detail
                label="Payroll"
                value={client.has_payroll ? "Yes" : "No"}
              />
              <Detail
                label="Financial Year End"
                value={client.financial_year_end}
              />
            </Card>

            <Card title="Notes">
              <p style={normalTextStyle}>{client.notes || "No notes yet."}</p>
            </Card>

            <Card title="This Month’s Work">
              {monthlyTasks.length === 0 ? (
                <p style={normalTextStyle}>
                  No monthly work created yet. Open Monthly Work once to generate tasks.
                </p>
              ) : (
                <table style={tableStyle}>
                  <thead>
                    <tr>
                     <th style={thStyle}>Work</th>
                     <th style={thStyle}>Status</th>
                     <th style={thStyle}>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                   {monthlyTasks.map((task) => (
                     <tr key={task.id}>
                        <td style={tdStyle}>{formatTaskType(task.task_type)}</td>
                        <td style={tdStyle}>{formatStatus(task.status)}</td>
                        <td style={tdStyle}>{formatTaskDate(task)}</td>
                     </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            <Card title="This Month’s Documents">
  {documentTasks.length === 0 ? (
    <p style={normalTextStyle}>
      No document tasks created yet. Open Documents once to generate tasks.
    </p>
  ) : (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={thStyle}>Document</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Date</th>
        </tr>
      </thead>

      <tbody>
        {documentTasks.map((doc) => (
          <tr key={doc.id}>
            <td style={tdStyle}>{formatDocumentType(doc.document_type)}</td>
            <td style={tdStyle}>{formatStatus(doc.status)}</td>
            <td style={tdStyle}>{formatDocumentDate(doc)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
           </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <h2 style={cardTitleStyle}>{title}</h2>
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <p style={detailLineStyle}>
      <strong>{label}:</strong> {value || "-"}
    </p>
  );
}

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1300,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
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
  padding: "12px 18px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  color: "black",
  fontWeight: 700,
  cursor: "pointer",
};

const heroCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 24,
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "#111",
  color: "white",
  marginBottom: 24,
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
};

const clientNameStyle: CSSProperties = {
  fontSize: 32,
  margin: 0,
};

const mutedTextStyle: CSSProperties = {
  color: "#ddd",
  fontSize: 17,
  marginTop: 8,
};

const statusPillStyle: CSSProperties = {
  background: "#e8f5e9",
  color: "#166534",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 800,
  textTransform: "uppercase",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 20,
};

function formatTaskType(value: string) {
  return value
    .replace("bookkeeping", "Bookkeeping")
    .replace("vat", "VAT")
    .replace("paye", "PAYE")
    .replace("payroll", "Payroll")
    .replace("tax", "Tax");
}

function formatDocumentType(value: string) {
  return value
    .replace("bank_statements", "Bank Statements")
    .replace("invoices_receipts", "Invoices / Receipts")
    .replace("vat_documents", "VAT Documents")
    .replace("payroll_documents", "Payroll Documents")
    .replace("tax_documents", "Tax Documents");
}

function formatStatus(value: string) {
  return value
    .replace("not_started", "Not Started")
    .replace("in_progress", "Started")
    .replace("waiting_documents", "Waiting Documents")
    .replace("needed", "Needed")
    .replace("requested", "Requested")
    .replace("received", "Received")
    .replace("completed", "Completed")
    .replace("submitted", "Submitted")
    .replace("filed", "Filed");
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTaskDate(task: AccountingMonthlyTask) {
  if (task.submitted_at) return formatDate(task.submitted_at);
  if (task.completed_at) return formatDate(task.completed_at);
  if (task.started_at) return formatDate(task.started_at);

  return "-";
}

function formatDocumentDate(doc: AccountingDocumentTask) {
  if (doc.filed_at) return formatDate(doc.filed_at);
  if (doc.received_at) return formatDate(doc.received_at);
  if (doc.requested_at) return formatDate(doc.requested_at);

  return "-";
}

const cardStyle: CSSProperties = {
  padding: 22,
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "white",
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: 24,
  marginTop: 0,
  marginBottom: 18,
};

const detailLineStyle: CSSProperties = {
  fontSize: 17,
  margin: "10px 0",
};

const normalTextStyle: CSSProperties = {
  fontSize: 17,
  lineHeight: 1.5,
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

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 12,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: 10,
  background: "#f2f2f2",
  borderBottom: "1px solid #ddd",
};

const tdStyle: CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #eee",
};