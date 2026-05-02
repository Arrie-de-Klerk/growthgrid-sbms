import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";

export default function OwnerMotorTeam() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
      {/* TOP NAV */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <button onClick={() => navigate("/motor")} style={lightBtn}>
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/motor/team")} style={lightBtn}>
            Team
          </button>
          <button onClick={() => navigate("/motor/admin/documents")} style={lightBtn}>
            Documents
          </button>
          <button onClick={() => navigate("/motor/admin/finance")} style={lightBtn}>
            Bank / Finance
          </button>
          <button onClick={() => navigate("/motor/admin/approved-delivery")} style={darkBtn}>
            Delivery
          </button>
        </div>
      </div>

      <h1 style={{ marginBottom: 8 }}>Team Dashboard</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 24 }}>
        Sales and administration workflow for the Motor team.
      </p>

      {/* SALES SECTION */}
      <h2 style={{ marginBottom: 12 }}>Sales</h2>

      <div style={grid}>
        <Block
          title="Customers / Leads"
          desc="Capture and manage client enquiries"
          emoji="👤"
          onClick={() => navigate("/motor/customers")}
        />

        <Block
          title="Vehicle Stock"
          desc="View all available vehicles"
          emoji="🚗"
          onClick={() => navigate("/motor/stock")}
        />

        <Block
          title="Deals"
          desc="Create and manage deals"
          emoji="🤝"
          onClick={() => navigate("/motor/deals")}
        />
      </div>

      {/* ADMIN SECTION */}
      <h2 style={{ marginTop: 30, marginBottom: 12 }}>Administration</h2>

      <div style={grid}>
        <Block
          title="Documents"
          desc="Collect and track paperwork"
          emoji="📄"
          onClick={() => navigate("/motor/admin/documents")}
        />

        <Block
          title="Submitted to Bank"
          desc="Finance and bank submission workflow"
          emoji="🏦"
          onClick={() => navigate("/motor/admin/finance")}
        />

        <Block
          title="Approved / Delivery"
          desc="Move approved deals into delivery"
          emoji="✅"
          onClick={() => navigate("/motor/admin/approved-delivery")}
        />
      </div>
    </div>
  );
}

function Block({
  title,
  desc,
  emoji,
  onClick,
}: {
  title: string;
  desc: string;
  emoji: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        borderRadius: 10,
        border: "1px solid #ddd",
        cursor: "pointer",
        background: "#fafafa",
        transition: "0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#f0f0f0";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#fafafa";
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>
        {emoji} {title}
      </h3>
      <p style={{ margin: 0, color: "#444" }}>{desc}</p>
    </div>
  );
}

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 20,
};

const lightBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const darkBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};