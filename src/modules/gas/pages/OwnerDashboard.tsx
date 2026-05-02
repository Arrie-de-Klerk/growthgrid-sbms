// src/modules/gas/pages/OwnerDashboard.tsx

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type SummaryState = {
  ordered: number;
  inProgress: number;
  completedToday: number;

  quote: number;
  pending: number;
  approved: number;
  installInProgress: number;
  installCompleted: number;
};

const emptySummary: SummaryState = {
  ordered: 0,
  inProgress: 0,
  completedToday: 0,

  quote: 0,
  pending: 0,
  approved: 0,
  installInProgress: 0,
  installCompleted: 0,
};

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("Gas Business");
  const [summary, setSummary] = useState<SummaryState>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

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

  async function countRows(
    table: string,
    businessId: string,
    statuses: string[],
    todayOnly = false
  ) {
    let query = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .in("status", statuses);

    if (todayOnly) {
      query = query.eq("business_date", getTodayISO());
    }

    const { count, error } = await query;

    if (error) {
      console.error(`Count error on ${table}:`, error.message);
      return 0;
    }

    return count || 0;
  }

  async function loadSummary() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const businessId = await getBusinessId();

      const { data: business } = await supabase
         .from("businesses")
         .select("*")
         .eq("id", businessId)
         .maybeSingle();

       setBusinessName(
         business?.name ||
          business?.business_name ||
          business?.company_name ||
          "Gas Business"
      );

      const [
        ordered,
        inProgress,
        completedToday,
        quote,
        pending,
        approved,
        installInProgress,
        installCompleted,
      ] = await Promise.all([
        countRows("orders", businessId, ["ordered"]),
        countRows("orders", businessId, ["in_progress"]),
        countRows("orders", businessId, ["completed"], true),

        countRows("installations", businessId, ["quote", "quote_pending", "planned"]),
        countRows("installations", businessId, ["pending"]),
        countRows("installations", businessId, ["approved"]),
        countRows("installations", businessId, ["in_progress"]),
        countRows("installations", businessId, ["completed"]),
      ]);

      setSummary({
        ordered,
        inProgress,
        completedToday,
        quote,
        pending,
        approved,
        installInProgress,
        installCompleted,
      });
    } catch (err: any) {
      console.error("OwnerDashboard load error:", err.message);
      setErrorMsg(err.message || "Could not load dashboard summary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Owner Dashboard</h1>
          <p style={subtitleStyle}>{businessName} – business overview</p>
        </div>

        <button onClick={loadSummary} style={refreshBtnStyle}>
          Refresh
        </button>
      </div>

      {loading && <p style={infoStyle}>Loading dashboard...</p>}

      {errorMsg && (
        <div style={errorStyle}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* GAS STRIP */}
      <section style={{ marginTop: 30 }}>
        <h3 style={sectionTitleStyle}>🟢 Gas Operations</h3>

        <div style={stripStyle}>
          {renderStatusBox(
            "Ordered",
            summary.ordered,
            "#d32f2f",
            () => navigate("/gas/deliveries?status=ordered")
          )}

          {renderStatusBox(
            "In Progress",
            summary.inProgress,
            "#f57c00",
            () => navigate("/gas/deliveries?status=in_progress")
          )}

          {renderStatusBox(
            "Completed Today",
            summary.completedToday,
            "#388e3c",
            () => navigate("/gas/deliveries?status=completed")
          )}
        </div>
      </section>

      {/* INSTALLATIONS STRIP */}
      <section style={{ marginTop: 40 }}>
        <h3 style={sectionTitleStyle}>🔧 Installations Operations</h3>

        <div style={stripStyle}>
          {renderStatusBox(
            "Quote",
            summary.quote,
            "#eeeeee",
            () => navigate("/gas/installations?status=quote"),
            true
          )}

          {renderStatusBox(
            "Pending",
            summary.pending,
            "#d32f2f",
            () => navigate("/gas/installations?status=pending")
          )}

          {renderStatusBox(
            "Approved",
            summary.approved,
            "#f57c00",
            () => navigate("/gas/installations?status=approved")
          )}

          {renderStatusBox(
            "In Progress",
            summary.installInProgress,
            "#1976d2",
            () => navigate("/gas/installations?status=in_progress")
          )}

          {renderStatusBox(
            "Completed",
            summary.installCompleted,
            "#388e3c",
            () => navigate("/gas/installations?status=completed")
          )}
        </div>
      </section>

      {/* MAIN MODULES */}
      <section style={gridStyle}>
        {renderCard(
          "👥 Customers",
          "Customers captured from clerk orders",
          "View customers",
          () => navigate("/gas/customers")
        )}

        {renderCard(
          "🛢️ Cylinder Movements",
          "Track full, empty, damaged & supplier stock",
          "Open Movements",
          () => navigate("/gas/cylinder-movements")
        )}

        {renderCard(
          "📦 Deliveries",
          "Orders, pending and completed deliveries",
          "View deliveries",
          () => navigate("/gas/deliveries")
        )}

        {renderCard(
          "🚚 Vehicle Operations",
          "Daily vehicle logs from clerks",
          "Open Operations",
          () => navigate("/gas/vehicle-operations")
        )}

        {renderCard(
          "🔧 Installations",
          "Quotations and gas installations",
          "View installations",
          () => navigate("/gas/installations")
        )}

        {renderCard(
          "🛣 Transport",
          "Transport totals, fuel and costing",
          "Open Transport",
          () => navigate("/gas/transport")
        )}

        {renderCard(
          "💰 Money",
          "Income, expenses and monthly totals",
          "Open Money",
          () => navigate("/gas/money")
        )}

        {renderCard(
          "🗂 Vehicle Registry",
          "Register and manage business vehicles",
          "Open Registry",
          () => navigate("/gas/vehicle-registry")
        )}
      </section>
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

function renderStatusBox(
  label: string,
  value: number,
  color: string,
  onClick: () => void,
  lightText = false
) {
  return (
    <button
      onClick={onClick}
      style={{
        ...boxStyle,
        background: color,
        color: lightText ? "#111" : "#fff",
        border: "none",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </button>
  );
}

function renderCard(
  title: string,
  description: string,
  actionLabel: string,
  onClick: () => void
) {
  return (
    <div style={cardStyle}>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardTextStyle}>{description}</p>

      <button onClick={onClick} style={cardButtonStyle}>
        {actionLabel}
      </button>
    </div>
  );
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1200,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
};

const titleStyle: CSSProperties = {
  fontSize: 32,
  fontWeight: 800,
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: "#666",
  marginTop: 6,
};

const sectionTitleStyle: CSSProperties = {
  marginBottom: 12,
};

const stripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px",
  marginTop: "40px",
};

const boxStyle: CSSProperties = {
  padding: "16px",
  borderRadius: "12px",
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 22,
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: 18,
  marginTop: 0,
};

const cardTextStyle: CSSProperties = {
  fontSize: 14,
  color: "#666",
  minHeight: 40,
};

const cardButtonStyle: CSSProperties = {
  marginTop: 12,
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const refreshBtnStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const infoStyle: CSSProperties = {
  marginTop: 20,
  color: "#666",
};

const errorStyle: CSSProperties = {
  marginTop: 20,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 700,
};