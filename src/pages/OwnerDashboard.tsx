// src/pages/OwnerDashboard.tsx

import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function OwnerDashboard() {
  const navigate = useNavigate();

  // GAS
  const [ordered, setOrdered] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);

  // INSTALLATIONS
  const [quote, setQuote] = useState(0);
  const [pending, setPending] = useState(0);
  const [approved, setApproved] = useState(0);
  const [installInProgress, setInstallInProgress] = useState(0);
  const [installCompleted, setInstallCompleted] = useState(0);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // GAS COUNTS
    const { count: orderedCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "ordered");

    const { count: inProgressCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress");

    const { count: completedTodayCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("business_date", today.toISOString());

    setOrdered(orderedCount || 0);
    setInProgress(inProgressCount || 0);
    setCompletedToday(completedTodayCount || 0);

    // INSTALLATIONS COUNTS
    const { count: quoteCount } = await supabase
      .from("installations")
      .select("*", { count: "exact", head: true })
      .eq("status", "quote");

    const { count: pendingCount } = await supabase
      .from("installations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: approvedCount } = await supabase
      .from("installations")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    const { count: installInProgressCount } = await supabase
      .from("installations")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress");

    const { count: installCompletedCount } = await supabase
      .from("installations")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    setQuote(quoteCount || 0);
    setPending(pendingCount || 0);
    setApproved(approvedCount || 0);
    setInstallInProgress(installInProgressCount || 0);
    setInstallCompleted(installCompletedCount || 0);
  }

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>Owner Dashboard</h1>
      <p style={{ color: "#666" }}>Hermanus Gas – business overview</p>

      {/* GAS STRIP */}
      <section style={{ marginTop: 30 }}>
        <h3>🟢 Gas Operations</h3>

        <div style={stripStyle}>
          {renderStatusBox(
            "Ordered",
            ordered,
            "#d32f2f",
            () => navigate("/dashboard/owner/deliveries?status=ordered")
          )}

          {renderStatusBox(
            "In Progress",
            inProgress,
            "#f57c00",
            () => navigate("/dashboard/owner/deliveries?status=in_progress")
          )}

          {renderStatusBox(
            "Completed Today",
            completedToday,
            "#388e3c",
            () => navigate("/dashboard/owner/deliveries?status=completed")
          )}
        </div>
      </section>

      {/* INSTALLATIONS STRIP */}
      <section style={{ marginTop: 40 }}>
        <h3>🔴 Installations Operations</h3>

        <div style={stripStyle}>
          {renderStripBox("Quote", quote, "#eeeeee")}
          {renderStripBox("Pending", pending, "#d32f2f")}
          {renderStripBox("Approved", approved, "#f57c00")}
          {renderStripBox("In Progress", installInProgress, "#1976d2")}
          {renderStripBox("Completed", installCompleted, "#388e3c")}
      </div>
       </section>

      {/* MAIN MODULES */}
      <section style={gridStyle}>
        {renderCard(
          "👥 Customers",
          "Customers captured from clerk orders",
          "View customers",
          () => navigate("/dashboard/owner/customers")
        )}

        {renderCard(
          "🛢️ Cylinder Movements",
          "Track full, empty, damage & supplier stock",
          "Open Movements",
          () => navigate("/dashboard/owner/cylinder-movements")
        )}

        {renderCard(
          "📦 Deliveries",
          "Orders, pending & completed deliveries",
          "View deliveries",
          () => navigate("/dashboard/owner/deliveries")
        )}

        {renderCard(
          "🚚 Vehicle Operations",
          "Daily vehicle logs",
          "Open Operations",
          () => navigate("/dashboard/owner/vehicle-operations")
        )}

        {renderCard(
          "🔧 Installations",
          "Quotations & gas installations",
          "View installations",
          () => navigate("/dashboard/owner/installations")
        )}

        {renderCard(
          "🛣 Transport",
          "Transport totals and costing",
          "Open Transport",
          () => navigate("/dashboard/owner/transport")
        )}

        {renderCard(
          "💰 Money",
          "Full income statement",
          "Open Money",
          () => navigate("/dashboard/owner/money")
        )}

        {renderCard(
          "🗂 Vehicle Registry",
          "Register and manage business vehicles",
          "Open Registry",
          () => navigate("/dashboard/owner/vehicle-registry")
        )}
      </section>
    </div>
  );
}


/* ================= HELPERS ================= */

const stripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "20px",
  marginTop: "40px",
};

const boxStyle = {
  padding: "14px",
  borderRadius: "10px",
  textAlign: "center" as const,
};

function renderStripBox(label: string, value: number, color = "#f5f5f5") {
  return (
    <div style={{ ...boxStyle, background: color, color: color === "#f5f5f5" || color === "#eeeeee" ? "#000" : "#fff" }}>
      <div style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function renderStatusBox(
  label: string,
  value: number,
  color: string,
  onClick: () => void
) {
  return (
    <div
      onClick={onClick}
      style={{
        ...boxStyle,
        background: color,
        color: "#fff",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function renderCard(
  title: string,
  description: string,
  actionLabel: string,
  onClick: () => void
) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 20,
        background: "#fff",
      }}
    >
      <h2 style={{ fontSize: 18 }}>{title}</h2>
      <p style={{ fontSize: 14, color: "#666" }}>{description}</p>
      <button onClick={onClick} style={{ marginTop: 10 }}>
        {actionLabel}
      </button>
    </div>
  );
}