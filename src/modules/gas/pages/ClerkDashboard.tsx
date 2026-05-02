// src/modules/gas/pages/ClerkDashboard.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type DashboardCounts = {
  ordered: number;
  inProgress: number;
  completedToday: number;
};

const emptyCounts: DashboardCounts = {
  ordered: 0,
  inProgress: 0,
  completedToday: 0,
};

export default function ClerkDashboard() {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("Gas Business");
  const [counts, setCounts] = useState<DashboardCounts>(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
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
      .select("business_id, role")
      .eq("id", session.user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.business_id) {
      throw new Error("This clerk is not linked to a business yet.");
    }

    return profile.business_id as string;
  }

  async function loadDashboard() {
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

      const today = getTodayISO();

      const [ordered, inProgress, completedToday] = await Promise.all([
        countOrders(businessId, ["ordered"]),
        countOrders(businessId, ["in_progress"]),
        countOrders(businessId, ["completed"], today),
      ]);

      setCounts({
        ordered,
        inProgress,
        completedToday,
      });
    } catch (err: any) {
      console.error("ClerkDashboard load error:", err.message);
      setErrorMsg(err.message || "Could not load clerk dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function countOrders(
    businessId: string,
    statuses: string[],
    todayOnly?: string
  ) {
    let query = supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .in("status", statuses);

    if (todayOnly) {
      query = query.eq("business_date", todayOnly);
    }

    const { count, error } = await query;

    if (error) {
      console.error("ClerkDashboard count error:", error.message);
      return 0;
    }

    return count || 0;
  }

  return (
    <div style={pageStyle}>
      {/* HEADER */}
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Clerk Dashboard</h1>

          <p style={subtitleStyle}>
            {businessName} – daily operations
          </p>

          {loading && <p style={smallTextStyle}>Loading dashboard...</p>}
        </div>

        <button onClick={loadDashboard} style={refreshButtonStyle}>
          Refresh
        </button>
      </header>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      {/* STATUS STRIP */}
      <section style={statusStripStyle}>
        <StatusBox
          label="Ordered"
          value={counts.ordered}
          color="#d32f2f"
          onClick={() => navigate("/gas/clerk/deliveries?status=ordered")}
        />

        <StatusBox
          label="In Progress"
          value={counts.inProgress}
          color="#f57c00"
          onClick={() => navigate("/gas/clerk/deliveries?status=in_progress")}
        />

        <StatusBox
          label="Completed Today"
          value={counts.completedToday}
          color="#388e3c"
          onClick={() => navigate("/gas/clerk/deliveries?status=completed")}
        />
      </section>

      {/* PRIMARY ACTIONS */}
      <section style={cardGridStyle}>
        <DashboardCard
          title="📞 New Order"
          description="Capture a gas order while on the phone with a customer."
          actionLabel="Start New Order"
          primary
          onClick={() => navigate("/gas/clerk/new-order")}
        />

        <DashboardCard
          title="🚚 Vehicle Operations"
          description="Daily vehicle logs: drivers, mileage, fuel and areas."
          actionLabel="Open Operations"
          onClick={() => navigate("/gas/clerk/vehicle-operations")}
        />

        <DashboardCard
          title="📦 Deliveries"
          description="Manage delivery log and update order status."
          actionLabel="Delivery Log"
          onClick={() => navigate("/gas/clerk/deliveries")}
        />

        <DashboardCard
          title="💰 Sales"
          description="Counter sales: gas, pipes, appliances and accessories."
          actionLabel="Counter Sales"
          onClick={() => navigate("/gas/clerk/sales")}
        />

        <DashboardCard
          title="🔧 Installations"
          description="Quotes, approvals and installation workflow."
          actionLabel="Open Installations"
          onClick={() => navigate("/gas/clerk/installations")}
        />
      </section>
    </div>
  );
}

/* ======================
   SMALL COMPONENTS
====================== */

function StatusBox({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...statusBoxStyle,
        background: color,
      }}
    >
      <div style={statusLabelStyle}>{label}</div>
      <div style={statusNumberStyle}>{value}</div>
    </button>
  );
}

function DashboardCard({
  title,
  description,
  actionLabel,
  onClick,
  primary = false,
  disabled = false,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        background: disabled ? "#f5f5f5" : "#fff",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div>
        <h2 style={cardTitleStyle}>{title}</h2>
        <p style={cardTextStyle}>{description}</p>
      </div>

      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          ...cardButtonStyle,
          border: primary ? "none" : "1px solid #ccc",
          background: primary ? "#000" : "#f9f9f9",
          color: primary ? "#fff" : "#000",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

/* ======================
   HELPERS
====================== */

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ======================
   STYLES
====================== */

const pageStyle: CSSProperties = {
  padding: "32px",
  maxWidth: "1100px",
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: "28px",
};

const titleStyle: CSSProperties = {
  fontSize: "32px",
  fontWeight: 900,
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: "#666",
  marginTop: 6,
};

const smallTextStyle: CSSProperties = {
  color: "#777",
  fontSize: 14,
  marginTop: 8,
};

const refreshButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};

const statusStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 30,
};

const statusBoxStyle: CSSProperties = {
  border: "none",
  borderRadius: 14,
  padding: 18,
  color: "#fff",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const statusLabelStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
};

const statusNumberStyle: CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
  marginTop: 6,
};

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "24px",
};

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "14px",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: "180px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: "22px",
  marginBottom: "10px",
  marginTop: 0,
};

const cardTextStyle: CSSProperties = {
  color: "#666",
  fontSize: "14px",
  lineHeight: 1.5,
};

const cardButtonStyle: CSSProperties = {
  marginTop: "20px",
  padding: "12px 16px",
  borderRadius: "10px",
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  marginBottom: 22,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 800,
};