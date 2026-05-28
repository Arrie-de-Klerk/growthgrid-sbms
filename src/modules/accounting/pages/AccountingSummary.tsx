import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

type TaskType = "bookkeeping" | "vat" | "paye" | "payroll" | "tax";

type TaskStatus =
  | "not_started"
  | "in_progress"
  | "waiting_documents"
  | "completed"
  | "submitted";

type DocumentType =
  | "bank_statements"
  | "invoices_receipts"
  | "vat_documents"
  | "payroll_documents"
  | "tax_documents";

type DocumentStatus = "needed" | "requested" | "received" | "filed";

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

type AccountingMonthlyTask = {
  id: string;
  business_id: string;
  client_id: string;
  month_start: string;
  task_type: TaskType;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;
};

type AccountingDocumentTask = {
  id: string;
  business_id: string;
  client_id: string;
  month_start: string;
  document_type: DocumentType;
  status: DocumentStatus;
  requested_at: string | null;
  received_at: string | null;
  filed_at: string | null;
};

type StaffSummaryRow = {
  staffName: string;
  clients: number;
  monthlyTasks: number;
  notStarted: number;
  inProgress: number;
  waitingDocs: number;
  completed: number;
  submitted: number;
  documents: number;
  needed: number;
  requested: number;
  received: number;
  filed: number;
};

export default function AccountingSummary() {
  const [businessName, setBusinessName] = useState("Accounting");
  const [clients, setClients] = useState<AccountingClient[]>([]);
  const [monthlyTasks, setMonthlyTasks] = useState<AccountingMonthlyTask[]>([]);
  const [documentTasks, setDocumentTasks] = useState<AccountingDocumentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const monthStart = getMonthStart();

  async function loadSummary() {
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

      const { data: businessData } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", profile.business_id)
        .maybeSingle();

      setBusinessName(businessData?.name || "Accounting");

      const { data: clientData, error: clientsError } = await supabase
        .from("accounting_clients")
        .select(
          "id, client_name, business_name, phone, email, is_vat_registered, is_paye_registered, has_payroll, financial_year_end, assigned_staff, status"
        )
        .eq("business_id", profile.business_id)
        .order("client_name", { ascending: true });

      if (clientsError) throw clientsError;

      const loadedClients = (clientData ?? []) as AccountingClient[];
      setClients(loadedClients);

      await createMissingMonthlyTasks(profile.business_id, loadedClients);
      await createMissingDocumentTasks(profile.business_id, loadedClients);

      const { data: monthlyData, error: monthlyError } = await supabase
        .from("accounting_monthly_tasks")
        .select("*")
        .eq("business_id", profile.business_id)
        .eq("month_start", monthStart);

      if (monthlyError) throw monthlyError;

      const { data: documentData, error: documentError } = await supabase
        .from("accounting_document_tasks")
        .select("*")
        .eq("business_id", profile.business_id)
        .eq("month_start", monthStart);

      if (documentError) throw documentError;

      setMonthlyTasks((monthlyData ?? []) as AccountingMonthlyTask[]);
      setDocumentTasks((documentData ?? []) as AccountingDocumentTask[]);
    } catch (err) {
      console.error(err);
      setError("Could not load accounting summary.");
    } finally {
      setLoading(false);
    }
  }

  async function createMissingMonthlyTasks(
    activeBusinessId: string,
    activeClients: AccountingClient[]
  ) {
    const rowsToCreate = activeClients.flatMap((client) => {
      const requiredTasks = getRequiredTaskTypes(client);

      return requiredTasks.map((taskType) => ({
        business_id: activeBusinessId,
        client_id: client.id,
        month_start: monthStart,
        task_type: taskType,
        status: "not_started" as TaskStatus,
      }));
    });

    if (rowsToCreate.length === 0) return;

    const { error: upsertError } = await supabase
      .from("accounting_monthly_tasks")
      .upsert(rowsToCreate, {
        onConflict: "business_id,client_id,month_start,task_type",
        ignoreDuplicates: true,
      });

    if (upsertError) throw upsertError;
  }

  async function createMissingDocumentTasks(
    activeBusinessId: string,
    activeClients: AccountingClient[]
  ) {
    const rowsToCreate = activeClients.flatMap((client) => {
      const requiredDocuments = getRequiredDocumentTypes(client);

      return requiredDocuments.map((documentType) => ({
        business_id: activeBusinessId,
        client_id: client.id,
        month_start: monthStart,
        document_type: documentType,
        status: "needed" as DocumentStatus,
      }));
    });

    if (rowsToCreate.length === 0) return;

    const { error: upsertError } = await supabase
      .from("accounting_document_tasks")
      .upsert(rowsToCreate, {
        onConflict: "business_id,client_id,month_start,document_type",
        ignoreDuplicates: true,
      });

    if (upsertError) throw upsertError;
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const summary = useMemo(() => {
    return {
      totalClients: clients.length,
      activeClients: clients.filter((client) => client.status === "active").length,
      vatClients: clients.filter((client) => client.is_vat_registered).length,
      payrollClients: clients.filter((client) => client.has_payroll).length,

      totalMonthlyTasks: monthlyTasks.length,
      notStarted: monthlyTasks.filter((task) => task.status === "not_started").length,
      inProgress: monthlyTasks.filter((task) => task.status === "in_progress").length,
      waitingDocs: monthlyTasks.filter((task) => task.status === "waiting_documents").length,
      completed: monthlyTasks.filter((task) => task.status === "completed").length,
      submitted: monthlyTasks.filter((task) => task.status === "submitted").length,

      totalDocuments: documentTasks.length,
      needed: documentTasks.filter((doc) => doc.status === "needed").length,
      requested: documentTasks.filter((doc) => doc.status === "requested").length,
      received: documentTasks.filter((doc) => doc.status === "received").length,
      filed: documentTasks.filter((doc) => doc.status === "filed").length,
    };
  }, [clients, monthlyTasks, documentTasks]);

  const staffRows = useMemo<StaffSummaryRow[]>(() => {
    const map = new Map<string, StaffSummaryRow>();

    clients.forEach((client) => {
      const staffName = client.assigned_staff?.trim() || "Unassigned";

      const row =
        map.get(staffName) ??
        {
          staffName,
          clients: 0,
          monthlyTasks: 0,
          notStarted: 0,
          inProgress: 0,
          waitingDocs: 0,
          completed: 0,
          submitted: 0,
          documents: 0,
          needed: 0,
          requested: 0,
          received: 0,
          filed: 0,
        };

      row.clients += 1;

      monthlyTasks
        .filter((task) => task.client_id === client.id)
        .forEach((task) => {
          row.monthlyTasks += 1;

          if (task.status === "not_started") row.notStarted += 1;
          if (task.status === "in_progress") row.inProgress += 1;
          if (task.status === "waiting_documents") row.waitingDocs += 1;
          if (task.status === "completed") row.completed += 1;
          if (task.status === "submitted") row.submitted += 1;
        });

      documentTasks
        .filter((doc) => doc.client_id === client.id)
        .forEach((doc) => {
          row.documents += 1;

          if (doc.status === "needed") row.needed += 1;
          if (doc.status === "requested") row.requested += 1;
          if (doc.status === "received") row.received += 1;
          if (doc.status === "filed") row.filed += 1;
        });

      map.set(staffName, row);
    });

    return Array.from(map.values()).sort((a, b) => {
      const totalA = a.monthlyTasks + a.documents;
      const totalB = b.monthlyTasks + b.documents;

      return totalB - totalA;
    });
  }, [clients, monthlyTasks, documentTasks]);

  const monthLabel = new Date().toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Accounting Summary</h1>
          <p style={subtitleStyle}>
            {businessName} — office overview for {monthLabel}.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link to="/accounting">
            <button type="button" style={secondaryButtonStyle}>
              Back to Dashboard
            </button>
          </Link>

          <button type="button" onClick={loadSummary} style={buttonStyle}>
            Refresh
          </button>
        </div>
      </header>

      {loading && <div style={infoStyle}>Loading accounting summary...</div>}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {!loading && !error && (
        <>
          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Business Overview</h2>

            <div style={summaryGridStyle}>
              <SummaryBox
                 label="Total Clients"
                 value={summary.totalClients.toString()}
                 to="/accounting/clients"
            />

              <SummaryBox
                 label="Active Clients"
                 value={summary.activeClients.toString()}
                 to="/accounting/clients?status=active"
            />

              <SummaryBox
                 label="VAT Clients"
                 value={summary.vatClients.toString()}
                 to="/accounting/clients?service=vat"
            />

              <SummaryBox
                 label="Payroll Clients"
                 value={summary.payrollClients.toString()}
                 to="/accounting/clients?service=payroll"
            />
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>Monthly Work</h2>

              <Link to="/accounting/monthly-work">
                <button type="button" style={smallButtonStyle}>
                  Open Monthly Work
                </button>
              </Link>
            </div>

            <div style={summaryGridStyle}>
              <SummaryBox
                 label="Total Tasks"
                 value={summary.totalMonthlyTasks.toString()}
                 to="/accounting/monthly-work"
            />

               <SummaryBox
                  label="Not Started"
                  value={summary.notStarted.toString()}
                  to="/accounting/monthly-work?status=not_started"
            />

               <SummaryBox
                  label="Started"
                  value={summary.inProgress.toString()}
                  to="/accounting/monthly-work?status=in_progress"
            />

               <SummaryBox
                  label="Waiting Docs"
                  value={summary.waitingDocs.toString()}
                  to="/accounting/monthly-work?status=waiting_documents"
            />

               <SummaryBox
                  label="Completed"
                  value={summary.completed.toString()}
                  to="/accounting/monthly-work?status=completed"
            />

              <SummaryBox
                 label="Submitted"
                 value={summary.submitted.toString()}
                 to="/accounting/monthly-work?status=submitted"
            />
            </div>
          </section>

          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>Documents</h2>

              <Link to="/accounting/documents">
                <button type="button" style={smallButtonStyle}>
                  Open Documents
                </button>
              </Link>
            </div>

            <div style={summaryGridStyle}>
              <SummaryBox
                 label="Total Documents"
                 value={summary.totalDocuments.toString()}
                 to="/accounting/documents"
           />

              <SummaryBox
                 label="Needed"
                 value={summary.needed.toString()}
                 to="/accounting/documents?status=needed"
           />

              <SummaryBox
                 label="Requested"
                 value={summary.requested.toString()}
                 to="/accounting/documents?status=requested"
           />

              <SummaryBox
                 label="Received"
                 value={summary.received.toString()}
                 to="/accounting/documents?status=received"
           />

              <SummaryBox
                 label="Filed"
                 value={summary.filed.toString()}
                 to="/accounting/documents?status=filed"
           />
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Staff Workload</h2>

            {staffRows.length === 0 ? (
              <div style={emptyStyle}>No staff workload yet.</div>
            ) : (
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Staff</th>
                      <th style={thStyle}>Clients</th>
                      <th style={thStyle}>Monthly Tasks</th>
                      <th style={thStyle}>Not Started</th>
                      <th style={thStyle}>Started</th>
                      <th style={thStyle}>Waiting Docs</th>
                      <th style={thStyle}>Completed</th>
                      <th style={thStyle}>Submitted</th>
                      <th style={thStyle}>Documents</th>
                      <th style={thStyle}>Needed</th>
                      <th style={thStyle}>Requested</th>
                      <th style={thStyle}>Received</th>
                      <th style={thStyle}>Filed</th>
                    </tr>
                  </thead>

                  <tbody>
                    {staffRows.map((row) => (
                      <tr key={row.staffName}>
                        <td style={tdStyle}>{row.staffName}</td>
                        <td style={tdStyle}>{row.clients}</td>
                        <td style={tdStyle}>{row.monthlyTasks}</td>
                        <td style={tdStyle}>{row.notStarted}</td>
                        <td style={tdStyle}>{row.inProgress}</td>
                        <td style={tdStyle}>{row.waitingDocs}</td>
                        <td style={tdStyle}>{row.completed}</td>
                        <td style={tdStyle}>{row.submitted}</td>
                        <td style={tdStyle}>{row.documents}</td>
                        <td style={tdStyle}>{row.needed}</td>
                        <td style={tdStyle}>{row.requested}</td>
                        <td style={tdStyle}>{row.received}</td>
                        <td style={tdStyle}>{row.filed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={noteStyle}>
            <strong>Demo value:</strong> This page shows the owner the whole
            accounting office at once — clients, monthly tasks, documents and
            staff workload.
          </section>
        </>
      )}
    </div>
  );
}

function SummaryBox({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to?: string;
}) {
  const box = (
    <div style={summaryBoxStyle}>
      <div style={summaryValueStyle}>{value}</div>
      <div style={summaryLabelStyle}>{label}</div>
    </div>
  );

  if (!to) return box;

  return (
    <Link to={to} style={summaryLinkStyle}>
      {box}
    </Link>
  );
}

function getMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getRequiredTaskTypes(client: AccountingClient): TaskType[] {
  const taskTypes: TaskType[] = ["bookkeeping"];

  if (client.is_vat_registered) taskTypes.push("vat");
  if (client.is_paye_registered) taskTypes.push("paye");
  if (client.has_payroll) taskTypes.push("payroll");
  if (client.financial_year_end) taskTypes.push("tax");

  return taskTypes;
}

function getRequiredDocumentTypes(client: AccountingClient): DocumentType[] {
  const documentTypes: DocumentType[] = ["bank_statements", "invoices_receipts"];

  if (client.is_vat_registered) documentTypes.push("vat_documents");

  if (client.has_payroll || client.is_paye_registered) {
    documentTypes.push("payroll_documents");
  }

  if (client.financial_year_end) documentTypes.push("tax_documents");

  return documentTypes;
}

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1500,
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

const sectionStyle: CSSProperties = {
  marginTop: 26,
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 14,
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 28,
  margin: 0,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 16,
};

const summaryLinkStyle: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  display: "block",
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

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 12,
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

const smallButtonStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};