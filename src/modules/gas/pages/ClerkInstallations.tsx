// src/modules/gas/pages/ClerkInstallations.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type InstallationStatus = "approved" | "in_progress" | "completed";

type CustomerInfo = {
  name: string | null;
  phone: string | null;
  address_line_1: string | null;
  area: string | null;
};

type Installation = {
  id: string;
  business_id: string;
  status: InstallationStatus;
  scheduled_date: string | null;
  installation_type: string | null;
  appliance_make: string | null;
  appliance_model: string | null;
  quoted_amount: number | null;
  coc_required: boolean | null;
  coc_number: string | null;
  coc_issued_date: string | null;
  notes: string | null;
  customer: CustomerInfo | null;
};

export default function ClerkInstallations() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Gas Business");

  const [rows, setRows] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function getBusinessId() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error("You are not logged in.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", session.user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.business_id) {
      throw new Error("This clerk is not linked to a business yet.");
    }

    return profile.business_id as string;
  }

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const activeBusinessId = await getBusinessId();
      setBusinessId(activeBusinessId);

      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", activeBusinessId)
        .maybeSingle();

      setBusinessName(
        business?.name ||
          business?.business_name ||
          business?.company_name ||
          "Gas Business"
      );

      const { data, error } = await supabase
        .from("installations")
        .select(
          `
          id,
          business_id,
          status,
          scheduled_date,
          installation_type,
          appliance_make,
          appliance_model,
          quoted_amount,
          coc_required,
          coc_number,
          coc_issued_date,
          notes,
          customer:customers(name, phone, address_line_1, area)
        `
        )
        .eq("business_id", activeBusinessId)
        .in("status", ["approved", "in_progress"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalizedRows = (data || []).map((row: any) => ({
        ...row,
        customer: Array.isArray(row.customer)
          ? row.customer[0] || null
          : row.customer || null,
      }));

      setRows(normalizedRows as Installation[]);
    } catch (err: any) {
      console.error("ClerkInstallations load error:", err.message);
      setErrorMsg(err.message || "Could not load installer jobs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function startJob(row: Installation) {
    if (!businessId) {
      alert("Business not loaded yet. Please refresh.");
      return;
    }

    setSavingId(row.id);

    const { error } = await supabase
      .from("installations")
      .update({ status: "in_progress" })
      .eq("id", row.id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Start job error:", error.message);
      alert(error.message);
      setSavingId(null);
      return;
    }

    await load();
    setSavingId(null);
  }

  async function completeJob(row: Installation) {
    if (!businessId) {
      alert("Business not loaded yet. Please refresh.");
      return;
    }

    let cocNumber: string | null = row.coc_number || null;
    let cocDate: string | null = row.coc_issued_date || null;

    if (row.coc_required) {
      const numberInput = window.prompt("Enter COC Number:", cocNumber || "");
      if (!numberInput?.trim()) return;

      const dateInput = window.prompt(
        "Enter COC Issued Date (YYYY-MM-DD):",
        cocDate || getTodayISO()
      );
      if (!dateInput?.trim()) return;

      cocNumber = numberInput.trim();
      cocDate = dateInput.trim();
    }

    setSavingId(row.id);

    const { error } = await supabase
      .from("installations")
      .update({
        status: "completed",
        coc_number: cocNumber,
        coc_issued_date: cocDate,
      })
      .eq("id", row.id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Complete job error:", error.message);
      alert(error.message);
      setSavingId(null);
      return;
    }

    await load();
    setSavingId(null);
  }

  const summary = useMemo(() => {
    return {
      total: rows.length,
      approved: rows.filter((row) => row.status === "approved").length,
      inProgress: rows.filter((row) => row.status === "in_progress").length,
    };
  }, [rows]);

  if (loading) {
    return <div style={{ padding: 30 }}>Loading installations...</div>;
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🔧 Installer Jobs</h1>
          <p style={subtitleStyle}>
            {businessName} – approved and active installation work.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <button
            onClick={() => navigate("/gas/clerk")}
            style={secondaryButtonStyle}
          >
            Back to Clerk Dashboard
          </button>

          <button onClick={load} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </header>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      <section style={summaryGridStyle}>
        <SummaryBox label="Ready / Active Jobs" value={summary.total.toString()} />
        <SummaryBox label="Approved" value={summary.approved.toString()} />
        <SummaryBox label="In Progress" value={summary.inProgress.toString()} />
      </section>

      {rows.length === 0 && (
        <div style={emptyStyle}>No installations ready for the clerk yet.</div>
      )}

      <div style={jobGridStyle}>
        {rows.map((row) => {
          const isSaving = savingId === row.id;

          return (
            <div key={row.id} style={jobCardStyle}>
              <div style={jobInfoStyle}>
                <div style={customerStyle}>
                  {row.customer?.name || "Unknown Customer"}
                </div>

                <div style={smallTextStyle}>
                  Phone: {row.customer?.phone || "-"}
                </div>

                <div style={smallTextStyle}>
                  Address:{" "}
                  {[row.customer?.address_line_1, row.customer?.area]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </div>

                <div style={smallTextStyle}>
                  Type: {formatType(row.installation_type)}
                </div>

                <div style={smallTextStyle}>
                  Appliance:{" "}
                  {[row.appliance_make, row.appliance_model]
                    .filter(Boolean)
                    .join(" ") || "-"}
                </div>

                <div style={quoteStyle}>Quote: {money(row.quoted_amount)}</div>

                {row.scheduled_date && (
                  <div style={smallTextStyle}>
                    Date: {formatDate(row.scheduled_date)}
                  </div>
                )}

                {row.coc_required && (
                  <div style={cocBadgeStyle}>COC Required</div>
                )}

                {row.notes && (
                  <div style={notesStyle}>
                    <b>Notes:</b> {row.notes}
                  </div>
                )}
              </div>

              <div style={actionPanelStyle}>
                <div
                  style={{
                    ...statusPillStyle,
                    background: statusColor(row.status),
                  }}
                >
                  {formatStatus(row.status)}
                </div>

                {row.status === "approved" && (
                  <button
                    onClick={() => startJob(row)}
                    disabled={isSaving}
                    style={actionButtonStyle}
                  >
                    {isSaving ? "Saving..." : "Start Job"}
                  </button>
                )}

                {row.status === "in_progress" && (
                  <button
                    onClick={() => completeJob(row)}
                    disabled={isSaving}
                    style={completeButtonStyle}
                  >
                    {isSaving ? "Saving..." : "Complete Job"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
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

/* ================= HELPERS ================= */

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

function formatType(value: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ").toUpperCase();
}

function statusColor(status: string) {
  if (status === "approved") return "#f39c12";
  if (status === "in_progress") return "#3498db";
  if (status === "completed") return "#2ecc71";
  return "#999";
}

function money(value: number | null) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 30,
  maxWidth: 1100,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 24,
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

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 24,
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

const jobGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
};

const jobCardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 18,
  background: "#fff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 18,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const jobInfoStyle: CSSProperties = {
  flex: 1,
};

const customerStyle: CSSProperties = {
  fontWeight: 900,
  fontSize: 17,
  marginBottom: 4,
};

const smallTextStyle: CSSProperties = {
  fontSize: 13,
  color: "#666",
  marginTop: 4,
};

const quoteStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  marginTop: 8,
};

const cocBadgeStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  padding: "5px 9px",
  borderRadius: 999,
  background: "#fff8e1",
  color: "#8a5a00",
  fontSize: 12,
  fontWeight: 900,
};

const notesStyle: CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "#f7f7f7",
  color: "#555",
  fontSize: 13,
};

const actionPanelStyle: CSSProperties = {
  textAlign: "right",
  minWidth: 150,
};

const statusPillStyle: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 8,
  color: "#fff",
  fontWeight: 800,
  marginBottom: 10,
  fontSize: 13,
};

const actionButtonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
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

const errorStyle: CSSProperties = {
  marginBottom: 18,
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