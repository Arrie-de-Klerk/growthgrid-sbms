import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

type Stats = {
  stock: number;
  sold: number;
  deals: number;
  leads: number;
};

type Pipeline = {
  new: number;
  docs: number;
  submitted: number;
  approved: number;
  delivery: number;
};

type CardProps = {
  title: string;
  value?: number | string;
  color?: string;
  desc?: string;
  emoji?: string;
  onClick?: () => void;
};

export default function OwnerMotorDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
    stock: 0,
    sold: 0,
    deals: 0,
    leads: 0,
  });

  const [pipeline, setPipeline] = useState<Pipeline>({
    new: 0,
    docs: 0,
    submitted: 0,
    approved: 0,
    delivery: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const [
      stockRes,
      soldRes,
      dealsRes,
      leadsRes,
      dealsStatusRes,
    ] = await Promise.all([
      supabase
        .from("motor_vehicles")
        .select("*", { count: "exact", head: true })
        .eq("status", "available"),

      supabase
        .from("motor_vehicles")
        .select("*", { count: "exact", head: true })
        .eq("status", "sold")
        .gte("sold_date", startOfMonth.toISOString()),

      supabase
        .from("motor_deals")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("motor_customers")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("motor_deals")
        .select("status"),
    ]);

    const dealsData = dealsStatusRes.data || [];

    setPipeline({
      new: dealsData.filter((d) => d.status === "new").length,
      docs: dealsData.filter((d) => d.status === "docs_pending").length,
      submitted: dealsData.filter((d) => d.status === "submitted").length,
      approved: dealsData.filter((d) => d.status === "approved").length,
      delivery: dealsData.filter((d) => d.status === "delivery").length,
    });

    setStats({
      stock: stockRes.count || 0,
      sold: soldRes.count || 0,
      deals: dealsRes.count || 0,
      leads: leadsRes.count || 0,
    });
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 20 }}>Motor Owner Dashboard</h1>

      {/* PIPELINE STRIP */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <MiniBox
          title="New"
          value={pipeline.new}
          color="#1976d2"
          onClick={() => navigate("/motor/deals?status=new")}
        />

        <MiniBox
          title="Docs"
          value={pipeline.docs}
          color="#ed6c02"
          onClick={() => navigate("/motor/deals?status=docs_pending")}
        />

        <MiniBox
          title="Submitted"
          value={pipeline.submitted}
          color="#9c27b0"
          onClick={() => navigate("/motor/deals?status=submitted")}
        />

        <MiniBox
          title="Approved"
          value={pipeline.approved}
          color="#2e7d32"
          onClick={() => navigate("/motor/admin/approved-delivery?status=approved")}
        />

        <MiniBox
          title="Delivery"
          value={pipeline.delivery}
          color="#00897b"
          onClick={() => navigate("/motor/admin/approved-delivery?status=delivery")}
        />
      </div>

      {/* TOP STATS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          marginBottom: 30,
        }}
      >
        <StatCard
          title="Vehicles in Stock"
          value={stats.stock}
          color="#1976d2"
          onClick={() => navigate("/motor/stock")}
        />

        <StatCard
          title="Sold This Month"
          value={stats.sold}
          color="#2e7d32"
          onClick={() => navigate("/motor/stock?status=sold")}
        />

        <StatCard
          title="Active Deals"
          value={stats.deals}
          color="#ed6c02"
          onClick={() => navigate("/motor/deals")}
        />

        <StatCard
          title="New Leads"
          value={stats.leads}
          color="#9c27b0"
          onClick={() => navigate("/motor/customers")}
        />
      </div>

      {/* MAIN BLOCKS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
        }}
      >
        <BlockCard
          title="Customers"
          desc="Buyers and enquiries"
          emoji="👤"
          onClick={() => navigate("/motor/customers")}
        />

        <BlockCard
          title="Vehicle Stock"
          desc="Manage all vehicles for sale"
          emoji="🚗"
          onClick={() => navigate("/motor/stock")}
        />

        <BlockCard
          title="Deals Pipeline"
          desc="Track deals from enquiry to sale"
          emoji="🤝"
          onClick={() => navigate("/motor/deals")}
        />

        <BlockCard
          title="Approved / Delivery"
          desc="Move approved deals into delivery workflow"
          emoji="📦"
          onClick={() => navigate("/motor/admin/approved-delivery")}
        />

        <BlockCard
          title="Admin Documents"
          desc="Deal paperwork and supporting docs"
          emoji="📄"
          onClick={() => navigate("/motor/admin/documents")}
        />

        <BlockCard
          title="Finance Admin"
          desc="Submitted finance and approvals"
          emoji="🏦"
          onClick={() => navigate("/motor/admin/finance")}
        />

        <BlockCard
          title="Vehicle Expenses"
          desc="Repairs and reconditioning"
          emoji="🔧"
          onClick={() => navigate("/motor/expenses")}
        />

        <BlockCard
          title="Best Sellers"
          desc="Top performing vehicles"
          emoji="⭐"
          onClick={() => navigate("/motor/bestsellers")}
        />

        <BlockCard
          title="Money"
          desc="Sales revenue and profit"
          emoji="💰"
          onClick={() => navigate("/motor/money")}
        />

        <BlockCard
          title="Team Dashboard"
          desc="Salesman and admin workflow"
          emoji="🧑‍💼"
          onClick={() => navigate("/motor/team")}
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, color = "#1976d2", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        background: color,
        color: "white",
        borderRadius: 10,
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold", marginTop: 6 }}>{value}</div>
    </div>
  );
}

function BlockCard({ title, desc, emoji, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        borderRadius: 10,
        border: "1px solid #ddd",
        cursor: "pointer",
        background: "#fafafa",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>
        {emoji} {title}
      </h3>
      <p style={{ margin: 0, color: "#444" }}>{desc}</p>
    </div>
  );
}

function MiniBox({ title, value, color = "#1976d2", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        minWidth: 100,
        padding: 12,
        borderRadius: 8,
        background: color,
        color: "white",
        cursor: "pointer",
        fontWeight: 700,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 20 }}>{value}</div>
      <div style={{ fontSize: 12 }}>{title}</div>
    </div>
  );
}