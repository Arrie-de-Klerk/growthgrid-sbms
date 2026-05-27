import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

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
  notes: string | null;
};

type DocumentRow = {
  client: AccountingClient;
  documents: Partial<Record<DocumentType, AccountingDocumentTask>>;
};

const DOCUMENT_TYPES: DocumentType[] = [
  "bank_statements",
  "invoices_receipts",
  "vat_documents",
  "payroll_documents",
  "tax_documents",
];

export default function AccountingDocuments() {
  const [clients, setClients] = useState<AccountingClient[]>([]);
  const [documents, setDocuments] = useState<AccountingDocumentTask[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "needed" | "requested" | "received" | "filed"
  >("all");

  const [loading, setLoading] = useState(true);
  const [savingDocumentId, setSavingDocumentId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const monthStart = getMonthStart();

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

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

      await createMissingDocumentTasks(profile.business_id, loadedClients);

      const { data: documentData, error: documentsError } = await supabase
        .from("accounting_document_tasks")
        .select("*")
        .eq("business_id", profile.business_id)
        .eq("month_start", monthStart);

      if (documentsError) throw documentsError;

      setDocuments((documentData ?? []) as AccountingDocumentTask[]);
    } catch (err) {
      console.error(err);
      setError("Could not load accounting documents.");
    } finally {
      setLoading(false);
    }
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

  async function updateDocumentStatus(
    document: AccountingDocumentTask,
    nextStatus: DocumentStatus
  ) {
    try {
      setSavingDocumentId(document.id);
      setError("");

      const now = new Date().toISOString();

      const updatePayload: Partial<AccountingDocumentTask> = {
        status: nextStatus,
      };

      if (nextStatus === "requested" && !document.requested_at) {
        updatePayload.requested_at = now;
      }

      if (nextStatus === "received") {
        updatePayload.received_at = now;

        if (!document.requested_at) {
          updatePayload.requested_at = now;
        }
      }

      if (nextStatus === "filed") {
        updatePayload.filed_at = now;

        if (!document.received_at) {
          updatePayload.received_at = now;
        }

        if (!document.requested_at) {
          updatePayload.requested_at = now;
        }
      }

      if (nextStatus === "needed") {
        updatePayload.requested_at = null;
        updatePayload.received_at = null;
        updatePayload.filed_at = null;
      }

      const { error: updateError } = await supabase
        .from("accounting_document_tasks")
        .update(updatePayload)
        .eq("id", document.id);

      if (updateError) throw updateError;

      await loadDocuments();
    } catch (err) {
      console.error(err);
      setError("Could not update document status.");
    } finally {
      setSavingDocumentId(null);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  const rows = useMemo<DocumentRow[]>(() => {
    return clients.map((client) => {
      const clientDocuments = documents.filter(
        (document) => document.client_id === client.id
      );

      const documentMap: Partial<Record<DocumentType, AccountingDocumentTask>> =
        {};

      clientDocuments.forEach((document) => {
        documentMap[document.document_type] = document;
      });

      return {
        client,
        documents: documentMap,
      };
    });
  }, [clients, documents]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [
          row.client.client_name,
          row.client.business_name,
          row.client.phone,
          row.client.email,
          row.client.assigned_staff,
          row.client.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesFilter =
        filter === "all" ||
        Object.values(row.documents).some(
          (document) => document?.status === filter
        );

      return matchesSearch && matchesFilter;
    });
  }, [rows, search, filter]);

  const summary = useMemo(() => {
    return {
      totalClients: clients.length,
      needed: documents.filter((document) => document.status === "needed")
        .length,
      requested: documents.filter((document) => document.status === "requested")
        .length,
      received: documents.filter((document) => document.status === "received")
        .length,
      filed: documents.filter((document) => document.status === "filed").length,
    };
  }, [clients, documents]);

  const monthLabel = new Date().toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Documents</h1>
          <p style={subtitleStyle}>
            Real document tracker for {monthLabel}: bank statements, invoices,
            receipts, VAT, payroll and tax documents.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link to="/accounting">
            <button type="button" style={secondaryButtonStyle}>
              Back to Dashboard
            </button>
          </Link>

          <Link to="/accounting/monthly-work">
            <button type="button" style={buttonStyle}>
              Monthly Work
            </button>
          </Link>
        </div>
      </header>

      <section style={summaryGridStyle}>
        <SummaryBox label="Clients" value={summary.totalClients.toString()} />
        <SummaryBox label="Needed" value={summary.needed.toString()} />
        <SummaryBox label="Requested" value={summary.requested.toString()} />
        <SummaryBox label="Received" value={summary.received.toString()} />
        <SummaryBox label="Filed" value={summary.filed.toString()} />
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
            setFilter(
              e.target.value as
                | "all"
                | "needed"
                | "requested"
                | "received"
                | "filed"
            )
          }
          style={selectStyle}
        >
          <option value="all">All Documents</option>
          <option value="needed">Needed</option>
          <option value="requested">Requested</option>
          <option value="received">Received</option>
          <option value="filed">Filed</option>
        </select>

        <button type="button" onClick={loadDocuments} style={refreshButtonStyle}>
          Refresh
        </button>
      </section>

      {loading && <div style={infoStyle}>Loading documents...</div>}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div style={emptyStyle}>
          No accounting clients captured yet. Add a client first.
        </div>
      )}

      {!loading && !error && rows.length > 0 && filteredRows.length === 0 && (
        <div style={emptyStyle}>No documents match your filter.</div>
      )}

      {!loading && !error && filteredRows.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Business</th>
                <th style={thStyle}>Bank Statements</th>
                <th style={thStyle}>Invoices / Receipts</th>
                <th style={thStyle}>VAT</th>
                <th style={thStyle}>Payroll</th>
                <th style={thStyle}>Tax</th>
                <th style={thStyle}>Assigned</th>
                <th style={thStyle}>Open</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.client.id}>
                  <td style={tdStyle}>{row.client.client_name}</td>
                  <td style={tdStyle}>{row.client.business_name || "-"}</td>

                  {DOCUMENT_TYPES.map((documentType) => (
                    <td key={documentType} style={tdStyle}>
                      <DocumentCell
                        document={row.documents[documentType]}
                        savingDocumentId={savingDocumentId}
                        onStatusChange={updateDocumentStatus}
                      />
                    </td>
                  ))}

                  <td style={tdStyle}>{row.client.assigned_staff || "-"}</td>

                  <td style={tdStyle}>
                    <Link to={`/accounting/clients/${row.client.id}`}>
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
        <strong>Saved in Supabase:</strong> These document statuses are now
        real. When you click Request, Received, Filed, or Reopen, the status and
        date are stored in the accounting_document_tasks table.
      </section>
    </div>
  );
}

function DocumentCell({
  document,
  savingDocumentId,
  onStatusChange,
}: {
  document: AccountingDocumentTask | undefined;
  savingDocumentId: string | null;
  onStatusChange: (
    document: AccountingDocumentTask,
    nextStatus: DocumentStatus
  ) => void;
}) {
  if (!document) {
    return <span style={notApplicableStyle}>N/A</span>;
  }

  const isSaving = savingDocumentId === document.id;

  return (
    <div style={documentCellStyle}>
      <DocumentBadge status={document.status} />

      <div style={dateTextStyle}>{getDocumentDateText(document)}</div>

      <div style={miniButtonRowStyle}>
        {document.status === "needed" && (
          <>
            <button
              type="button"
              style={miniButtonStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(document, "requested")}
            >
              Request
            </button>

            <button
              type="button"
              style={miniButtonLightStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(document, "received")}
            >
              Received
            </button>
          </>
        )}

        {document.status === "requested" && (
          <button
            type="button"
            style={miniButtonStyle}
            disabled={isSaving}
            onClick={() => onStatusChange(document, "received")}
          >
            Received
          </button>
        )}

        {document.status === "received" && (
          <>
            <button
              type="button"
              style={miniButtonStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(document, "filed")}
            >
              Filed
            </button>

            <button
              type="button"
              style={miniButtonLightStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(document, "needed")}
            >
              Reopen
            </button>
          </>
        )}

        {document.status === "filed" && (
          <button
            type="button"
            style={miniButtonLightStyle}
            disabled={isSaving}
            onClick={() => onStatusChange(document, "received")}
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}

function DocumentBadge({ status }: { status: DocumentStatus }) {
  const styleByStatus: Record<DocumentStatus, CSSProperties> = {
    needed: {
      background: "#fee2e2",
      color: "#991b1b",
    },
    requested: {
      background: "#fff7ed",
      color: "#9a3412",
    },
    received: {
      background: "#e0f2fe",
      color: "#075985",
    },
    filed: {
      background: "#dcfce7",
      color: "#166534",
    },
  };

  return (
    <span style={{ ...documentBadgeStyle, ...styleByStatus[status] }}>
      {getDocumentStatusLabel(status)}
    </span>
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

function getMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getRequiredDocumentTypes(client: AccountingClient): DocumentType[] {
  const documentTypes: DocumentType[] = [
    "bank_statements",
    "invoices_receipts",
  ];

  if (client.is_vat_registered) documentTypes.push("vat_documents");

  if (client.has_payroll || client.is_paye_registered) {
    documentTypes.push("payroll_documents");
  }

  if (client.financial_year_end) documentTypes.push("tax_documents");

  return documentTypes;
}

function getDocumentStatusLabel(status: DocumentStatus) {
  switch (status) {
    case "needed":
      return "Needed";
    case "requested":
      return "Requested";
    case "received":
      return "Received";
    case "filed":
      return "Filed";
    default:
      return status;
  }
}

function getDocumentDateText(document: AccountingDocumentTask) {
  if (document.status === "filed" && document.filed_at) {
    return `Filed: ${formatDate(document.filed_at)}`;
  }

  if (document.status === "received" && document.received_at) {
    return `Received: ${formatDate(document.received_at)}`;
  }

  if (document.status === "requested" && document.requested_at) {
    return `Requested: ${formatDate(document.requested_at)}`;
  }

  return "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
  maxWidth: 820,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
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
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const documentCellStyle: CSSProperties = {
  display: "grid",
  gap: 7,
  minWidth: 135,
};

const documentBadgeStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  width: "fit-content",
};

const notApplicableStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#666",
  fontWeight: 800,
  fontSize: 12,
};

const dateTextStyle: CSSProperties = {
  fontSize: 12,
  color: "#555",
};

const miniButtonRowStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const miniButtonStyle: CSSProperties = {
  padding: "5px 8px",
  borderRadius: 7,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 12,
};

const miniButtonLightStyle: CSSProperties = {
  ...miniButtonStyle,
  background: "white",
  color: "black",
  border: "1px solid #ddd",
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
