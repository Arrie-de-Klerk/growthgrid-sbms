import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

export default function OwnerMotorDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
  stock: 0,
  sold: 0,
  deals: 0,
  leads: 0,
});

const [pipeline, setPipeline] = useState({
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
  // Vehicles in stock
  const { count: stock } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("status", "available");

  // Sold this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);

  const { count: sold } = await supabase
    .from("motor_vehicles")
    .select("*", { count: "exact", head: true })
    .eq("status", "sold")
    .gte("sold_date", startOfMonth.toISOString());

  // Deals (placeholder for now)
  const { count: deals } = await supabase
    .from("motor_deals")
    .select("*", { count: "exact", head: true });

  // Leads (placeholder)
  const { count: leads } = await supabase
    .from("motor_customers")
    .select("*", { count: "exact", head: true });

  const { data: dealsData } = await supabase
    .from("motor_deals")
    .select("status");

  if (dealsData) {
    setPipeline({
      new: dealsData.filter(d => d.status === "new").length,
      docs: dealsData.filter(d => d.status === "collect_documents").length,
      submitted: dealsData.filter(d => d.status === "submit_to_bank").length,
      approved: dealsData.filter(d => d.status === "approved").length,
      delivery: dealsData.filter(d => d.status === "deliver_vehicle").length,
    });
  }

     setStats({
      stock: stock || 0,
      sold: sold || 0,
      deals: deals || 0,
      leads: leads || 0,
    });
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 20 }}>Motor Owner Dashboard</h1>

    <div style={{
       display: "flex",
       gap: 12,
       marginBottom: 20,
       flexWrap: "wrap"
   }}>
     <MiniBox title="Clients" value={pipeline.new} color="#1976d2" />
     <MiniBox title="Docs" value={pipeline.docs} color="#ed6c02" />
     <MiniBox title="Submitted" value={pipeline.submitted} color="#9c27b0" />
     <MiniBox title="Approved" value={pipeline.approved} color="#2e7d32" />
     <MiniBox title="Delivery" value={pipeline.delivery} color="#00897b" />
     </div>

      {/* TOP STATS */}
      <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
        <Stat title="Vehicles in Stock" value={stats.stock} color="#1976d2" />
        <Stat title="Sold This Month" value={stats.sold} color="#2e7d32" />
        <Stat title="Active Deals" value={stats.deals} color="#ed6c02" />
        <Stat title="New Leads" value={stats.leads} color="#9c27b0" />
      </div>

      {/* BLOCK GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        <Block
          title="Vehicle Stock"
          desc="Manage all vehicles for sale"
          emoji="🚗"
          onClick={() => navigate("/motor/stock")}
        />

        <Block
          title="Customers"
          desc="Buyers and enquiries"
          emoji="👤"
          onClick={() => navigate("/motor/customers")}
        />

        <Block
          title="Deals Pipeline"
          desc="Track deals from enquiry to sale"
          emoji="🤝"
          onClick={() => navigate("/motor/deals")}
        />

        <Block
          title="Money"
          desc="Sales revenue and profit"
          emoji="💰"
          onClick={() => navigate("/motor/money")}
        />

        <Block
          title="Vehicle Expenses"
          desc="Repairs and reconditioning"
          emoji="🔧"
          onClick={() => navigate("/motor/expenses")}
        />

        <Block
          title="Best Sellers"
          desc="Top performing vehicles"
          emoji="⭐"
          onClick={() => navigate("/motor/bestsellers")}
        />
      </div>
    </div>
  );
}

function Stat({ title, value, color }: any) {
  return (
    <div
      style={{
        flex: 1,
        padding: 20,
        background: color,
        color: "white",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

function Block({ title, desc, emoji, onClick }: any) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 20,
        borderRadius: 8,
        border: "1px solid #ddd",
        cursor: "pointer", // ✅ THIS is where it belongs
        background: "#fafafa",
      }}
    >
      <h3>
        {emoji} {title}
      </h3>
      <p>{desc}</p>
    </div>
  );
}

function MiniBox({ title, value, color, onClick }: any) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 10,
        borderRadius: 6,
        background: color,
        color: "white",
        minWidth: 90,
        textAlign: "center",
        fontWeight: "bold",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 11 }}>{title}</div>
      <div style={{ fontSize: 18 }}>{value}</div>
    </div>
  );
}