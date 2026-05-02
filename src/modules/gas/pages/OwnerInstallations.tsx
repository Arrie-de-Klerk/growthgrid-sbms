// src/modules/gas/pages/OwnerInstallations.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CSSProperties } from "react";

type InstallationStatus =
  | "planned"
  | "quote"
  | "quote_pending"
  | "pending"
  | "approved"
  | "in_progress"
  | "completed";

type CustomerLink = {
  name: string | null;
  phone?: string | null;
  email?: string | null;
};

type InstallationRow = {
  id: string;
  business_id: string;
  created_at: string;
  installation_type: string | null;
  status: InstallationStatus | null;
  scheduled_date: string | null;
  notes: string | null;
  quoted_amount: number | null;
  coc_number: string | null;
  coc_issued_date: string | null;
  customers: CustomerLink | CustomerLink[] | null;
};

export default function OwnerInstallations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const statusFilter = searchParams.get("status");

  const [items, setItems] = useState<InstallationRow[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function getBusinessId() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error("No signed-in user found.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", session.user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.business_id) {
      throw new Error("This user is not linked to a business yet.");
    }

    return profile.business_id as string;
  }

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const activeBusinessId = await getBusinessId();
      setBusinessId(activeBusinessId);

      let query = supabase
        .from("installations")
        .select(
          `
          id,
          business_id,
          created_at,
          installation_type,
          status,
          scheduled_date,
          notes,
          quoted_amount,
          coc_number,
          coc_issued_date,
          customers ( name, phone, email )
        `
        )
        .eq("business_id", activeBusinessId);

      if (statusFilter) {
        if (statusFilter === "quote") {
          query = query.in("status", ["planned", "quote", "quote_pending"]);
        } else {
          query = query.eq("status", statusFilter);
        }
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      setItems((data || []) as InstallationRow[]);
    } catch (err: any) {
      console.error("OwnerInstallations load error:", err.message);
      setErrorMsg(err.message || "Could not load installations.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: InstallationStatus) {
    if (!businessId) {
      alert("Business not loaded yet. Please refresh.");
      return;
    }

    const { error } = await supabase
      .from("installations")
      .update({ status })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      alert(error.message);
      return;
    }

    await load();
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return items;

    return items.filter((item) => {
      const customer = getCustomer(item.customers);

      return [
        customer.name,
        customer.phone,
        customer.email,
        item.installation_type,
        item.status,
        item.scheduled_date,
        item.notes,
        item.quoted_amount,
        item.coc_number,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [items, search]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      quote: items.filter((i) =>
        ["planned", "quote", "quote_pending"].includes(i.status || "")
      ).length,
      pending: items.filter((i) => i.status === "pending").length,
      approved: items.filter((i) => i.status === "approved").length,
      inProgress: items.filter((i) => i.status === "in_progress").length,
      completed: items.filter((i) => i.status === "completed").length,
    };
  }, [items]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🔧 Installations</h1>
          <p style={subtitleStyle}>
            Gas installation quotes, approvals, scheduled work and completed jobs.
          </p>

          {statusFilter && (
            <div style={filterBadgeStyle}>
              Showing: <b>{formatStatusLabel(statusFilter)}</b>
            </div>
          )}
        </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas")} style={secondaryButtonStyle}>
            Back to Dashboard
          </button>

          <button onClick={load} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </header>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      <div style={summaryGridStyle}>
        <SummaryBox label="Total" value={summary.total.toString()} />
        <SummaryBox label="Quote" value={summary.quote.toString()} />
        <SummaryBox label="Pending" value={summary.pending.toString()} />
        <SummaryBox label="Approved" value={summary.approved.toString()} />
        <SummaryBox label="In Progress" value={summary.inProgress.toString()} />
        <SummaryBox label="Completed" value={summary.completed.toString()} />
      </div>

      <div style={filterRowStyle}>
        <button onClick={() => navigate("/gas/installations")} style={filterButtonStyle}>
          All
        </button>

        <button
          onClick={() => navigate("/gas/installations?status=quote")}
          style={filterButtonStyle}
        >
          Quote
        </button>

        <button
          onClick={() => navigate("/gas/installations?status=pending")}
          style={filterButtonStyle}
        >
          Pending
        </button>

        <button
          onClick={() => navigate("/gas/installations?status=approved")}
          style={filterButtonStyle}
        >
          Approved
        </button>

        <button
          onClick={() => navigate("/gas/installations?status=in_progress")}
          style={filterButtonStyle}
        >
          In Progress
        </button>

        <button
          onClick={() => navigate("/gas/installations?status=completed")}
          style={filterButtonStyle}
        >
          Completed
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customer, phone, type, status, COC..."
        style={searchStyle}
      />

      {loading && <p style={infoStyle}>Loading installations...</p>}

      {!loading && !errorMsg && filteredItems.length === 0 && (
        <div style={emptyStyle}>No installations found.</div>
      )}

      {!loading && !errorMsg && filteredItems.length > 0 && (
        <div style={gridStyle}>
          {filteredItems.map((item) => {
            const customer = getCustomer(item.customers);
            const isOpen = openId === item.id;

            return (
              <div key={item.id} style={cardStyle}>
                <div
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  style={cardHeaderStyle}
                >
                  <div>
                    <div style={customerNameStyle}>
                      {customer.name || "Unknown Customer"}
                    </div>

                    <div style={smallTextStyle}>
                      Created: {formatDateTime(item.created_at)}
                    </div>

                    <div style={smallTextStyle}>
                      Type: {item.installation_type || "Not selected"}
                    </div>
                  </div>

                  <div style={rightHeaderStyle}>
                    <span style={getStatusPillStyle(item.status)}>
                      {formatStatusLabel(item.status || "planned")}
                    </span>

                    <span style={toggleStyle}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                <div style={quickInfoStyle}>
                  <div>
                    <b>Total Quote:</b> {money(item.quoted_amount)}
                  </div>

                  <div>
                    <b>Scheduled:</b>{" "}
                    {item.scheduled_date ? formatDate(item.scheduled_date) : "Not set"}
                  </div>
                </div>

                {isOpen && (
                  <div style={openPanelStyle}>
                    <div style={detailGridStyle}>
                      <Detail label="Phone" value={customer.phone} />
                      <Detail label="Email" value={customer.email} />
                      <Detail label="What to Install" value={item.installation_type} />
                      <Detail label="Status" value={formatStatusLabel(item.status || "planned")} />
                      <Detail
                        label="Scheduled Date"
                        value={
                          item.scheduled_date
                            ? formatDate(item.scheduled_date)
                            : "Not set"
                        }
                      />
                      <Detail label="COC Number" value={item.coc_number} />
                      <Detail
                        label="COC Issued"
                        value={
                          item.coc_issued_date
                            ? formatDate(item.coc_issued_date)
                            : null
                        }
                      />
                    </div>

                    {item.notes && (
                      <div style={notesStyle}>
                        <b>Notes:</b>
                        <div>{item.notes}</div>
                      </div>
                    )}

                    <div style={actionRowStyle}>
                      <button
                        onClick={() => navigate(`/gas/installations/${item.id}`)}
                        style={primaryActionStyle}
                      >
                        Open Detail
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "pending")}
                        style={actionButtonStyle}
                      >
                        Save Quote
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "approved")}
                        style={actionButtonStyle}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "in_progress")}
                        style={actionButtonStyle}
                      >
                        Start Job
                      </button>

                      <button
                        onClick={() => updateStatus(item.id, "completed")}
                        style={completeButtonStyle}
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <b>{label}:</b> {value || "—"}
    </div>
  );
}

/* ================= HELPERS ================= */

function getCustomer(customers: CustomerLink | CustomerLink[] | null): CustomerLink {
  if (Array.isArray(customers)) {
    return customers[0] || { name: "Unknown Customer" };
  }

  return customers || { name: "Unknown Customer" };
}

function money(value: number | null | undefined) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatusLabel(status: string) {
  if (["planned", "quote", "quote_pending"].includes(status)) return "QUOTE";
  return status.replace(/_/g, " ").toUpperCase();
}

function getStatusPillStyle(status: InstallationStatus | null): CSSProperties {
  const base: CSSProperties = {
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };

  if (["planned", "quote", "quote_pending"].includes(status || "")) {
    return { ...base, background: "#eeeeee", color: "#333" };
  }

  if (status === "pending") {
    return { ...base, background: "#ffebee", color: "#b71c1c" };
  }

  if (status === "approved") {
    return { ...base, background: "#e3f2fd", color: "#0d47a1" };
  }

  if (status === "in_progress") {
    return { ...base, background: "#fff8e1", color: "#8a5a00" };
  }

  if (status === "completed") {
    return { ...base, background: "#e8f5e9", color: "#1b5e20" };
  }

  return { ...base, background: "#eeeeee", color: "#333" };
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1300,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 26,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 900,
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  color: "#666",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const refreshButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const filterBadgeStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eef6ff",
  color: "#0d47a1",
  fontSize: 13,
  fontWeight: 700,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
  marginBottom: 18,
};

const summaryBoxStyle: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const summaryLabelStyle: CSSProperties = {
  color: "#666",
  fontSize: 13,
  fontWeight: 800,
};

const summaryValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  marginTop: 4,
};

const filterRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
};

const filterButtonStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const searchStyle: CSSProperties = {
  padding: "12px",
  width: "100%",
  borderRadius: 8,
  border: "1px solid #ccc",
  marginBottom: 22,
  fontSize: 14,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 18,
};

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  overflow: "hidden",
};

const cardHeaderStyle: CSSProperties = {
  padding: 16,
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  borderBottom: "1px solid #f0f0f0",
};

const customerNameStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 900,
};

const smallTextStyle: CSSProperties = {
  fontSize: 12,
  color: "#666",
  marginTop: 4,
};

const rightHeaderStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 8,
};

const toggleStyle: CSSProperties = {
  fontSize: 13,
  color: "#666",
  fontWeight: 800,
};

const quickInfoStyle: CSSProperties = {
  padding: "12px 16px",
  display: "grid",
  gap: 6,
  fontSize: 14,
};

const openPanelStyle: CSSProperties = {
  padding: "0 16px 16px",
  display: "grid",
  gap: 12,
};

const detailGridStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 14,
};

const notesStyle: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: "#f7f7f7",
  color: "#555",
  fontSize: 14,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 4,
};

const primaryActionStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const actionButtonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const completeButtonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "none",
  background: "#1b5e20",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const infoStyle: CSSProperties = {
  color: "#666",
};

const errorStyle: CSSProperties = {
  marginBottom: 20,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 800,
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
  color: "#666",
  fontWeight: 700,
};