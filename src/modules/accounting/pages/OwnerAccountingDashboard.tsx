import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

type Business = {
  name: string;
  business_type: string;
  is_demo: boolean;
};

type Stats = {
  totalClients: number;
  activeClients: number;
  vatClients: number;
  payrollClients: number;
};

function OwnerAccountingDashboard() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    activeClients: 0,
    vatClients: 0,
    payrollClients: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setError("You are not signed in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, business_id")
        .eq("id", userData.user.id)
        .single();

      if (profileError || !profile?.business_id) {
        setError("Profile or business not found.");
        return;
      }

      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("name, business_type, is_demo")
        .eq("id", profile.business_id)
        .single();

      if (businessError || !businessData) {
        setError("Business not found.");
        return;
      }

      setBusiness(businessData);

      const businessId = profile.business_id;

      const totalClients = await countClients(businessId);
      const activeClients = await countClients(businessId, { status: "active" });
      const vatClients = await countClients(businessId, { is_vat_registered: true });
      const payrollClients = await countClients(businessId, { has_payroll: true });

      setStats({
        totalClients,
        activeClients,
        vatClients,
        payrollClients,
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading Accounting Dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function countClients(
    businessId: string,
    filters?: {
      status?: string;
      is_vat_registered?: boolean;
      has_payroll?: boolean;
    }
  ) {
    let query = supabase
      .from("accounting_clients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.is_vat_registered !== undefined) {
      query = query.eq("is_vat_registered", filters.is_vat_registered);
    }
    if (filters?.has_payroll !== undefined) {
      query = query.eq("has_payroll", filters.has_payroll);
    }

    const { count, error } = await query;

    if (error) {
      console.error(error);
      return 0;
    }

    return count ?? 0;
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading Accounting Dashboard...</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Accounting Dashboard</h1>
      <p>
        {business?.name ?? "Accounting"} — business overview{" "}
        {business?.is_demo && <strong style={{ color: "green" }}>(DEMO)</strong>}
      </p>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={gridStyle}>
        <StatCard
           title="Total Clients"
           value={stats.totalClients}
           to="/accounting/clients"
       />

        <StatCard
          title="Active Clients"
          value={stats.activeClients}
          to="/accounting/clients?status=active"
       />

        <StatCard
          title="VAT Clients"
          value={stats.vatClients}
          to="/accounting/clients?service=vat"
        />

        <StatCard
          title="Payroll Clients"
          value={stats.payrollClients}
          to="/accounting/clients?service=payroll"
        /> 
      </div>

      <div style={cardGridStyle}>
        <DashboardCard
          title="Clients"
          text="View and manage accounting clients."
          button="View Clients"
          to="/accounting/clients"
        />

        <DashboardCard
          title="Add Client"
          text="Capture a new accounting client."
          button="Add Client"
          to="/accounting/clients/new"
        />

        <DashboardCard
         title="Monthly Work"
         text="Bookkeeping, VAT, payroll and tax deadlines."
         button="Open Monthly Work"
         to="/accounting/monthly-work"
       />

        <DashboardCard
          title="Documents"
          text="Track documents still needed from clients."
          button="Open Documents"
          to="/accounting/documents"
       />

        <DashboardCard
          title="Summary"
          text="View client totals, monthly work, documents and staff workload."
          button="Open Summary"
          to="/accounting/summary"
       />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  to,
}: {
  title: string;
  value: number;
  to?: string;
}) {
  const content = (
    <div style={statCardStyle}>
      <h2>{title}</h2>
      <p>{value}</p>
    </div>
  );

  if (!to) return content;

  return (
    <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
}

function DashboardCard({
  title,
  text,
  button,
  to,
}: {
  title: string;
  text: string;
  button: string;
  to: string;
}) {
  return (
    <div style={dashboardCardStyle}>
      <h2>{title}</h2>
      <p>{text}</p>
      <Link to={to}>
        <button style={buttonStyle}>{button}</button>
      </Link>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginTop: 30,
};

const cardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 20,
  marginTop: 40,
};

const statCardStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 14,
  background: "#111",
  color: "white",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
};

const dashboardCardStyle: React.CSSProperties = {
  padding: 24,
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "white",
};

const buttonStyle: React.CSSProperties = {
  marginTop: 18,
  padding: "12px 18px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

export default OwnerAccountingDashboard;