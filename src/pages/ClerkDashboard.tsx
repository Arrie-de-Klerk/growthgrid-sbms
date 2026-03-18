// src/pages/ClerkDashboard.tsx
import { useNavigate } from "react-router-dom";

export default function ClerkDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* HEADER */}
      <header style={{ marginBottom: "36px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, marginBottom: "6px" }}>
          Clerk Dashboard
        </h1>
        <p style={{ color: "#666" }}>
          Hermanus Gas – daily operations
        </p>
      </header>

      {/* PRIMARY ACTIONS */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
        }}
      >
        {/* NEW ORDER */}
        <DashboardCard
          title="📞 New Order"
          description="Capture a gas order while on the phone with a customer"
          actionLabel="Start new order"
          primary
          onClick={() => navigate("/dashboard/clerk/new-order")}
        />

        {/* VEHICLE OPERATIONS (RENAMED) */}
        <DashboardCard
          title="🚚 Vehicle Operations"
          description="Daily vehicle logs: drivers, mileage, fuel and areas"
          actionLabel="Open Operations"
          onClick={() => navigate("/dashboard/clerk/vehicle-operations")}
        />

        {/* DELIVERIES */}
        <DashboardCard
          title="📦 Deliveries"
          description="Manage delivery log and update order status"
          actionLabel="Delivery Log"
          onClick={() => navigate("/dashboard/clerk/deliveries")}
        />

        {/* SALES */}
        <DashboardCard
          title="💰 Sales"
          description="Counter sales: gas, pipes, appliances"
          actionLabel="Counter Sales"
          onClick={() => navigate("/dashboard/clerk/sales")}
        />

         {/* INSTALLATIONS */}
        <DashboardCard
          title="🔧 Installations"
          description="Quotes, approvals and installation workflow"
          actionLabel="Open Installations"
          onClick={() => navigate("/dashboard/clerk/installations")}
       />
       </section>
    </div>
  );
}

/* ======================
   DASHBOARD CARD
====================== */

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
        border: "1px solid #ddd",
        borderRadius: "14px",
        padding: "24px",
        background: disabled ? "#f5f5f5" : "#fff",
        opacity: disabled ? 0.6 : 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "180px",
      }}
    >
      <div>
        <h2 style={{ fontSize: "22px", marginBottom: "10px" }}>
          {title}
        </h2>
        <p style={{ color: "#666", fontSize: "14px", lineHeight: 1.5 }}>
          {description}
        </p>
      </div>

      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          marginTop: "20px",
          padding: "12px 16px",
          borderRadius: "10px",
          border: primary ? "none" : "1px solid #ccc",
          background: primary ? "#000" : "#f9f9f9",
          color: primary ? "#fff" : "#000",
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
