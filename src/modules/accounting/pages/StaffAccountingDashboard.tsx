import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  business_id: string | null;
  business_type: string | null;
};

type Stats = {
  myClients: number;
  myMonthlyTasks: number;
  myOpenDocuments: number;
};

export default function StaffAccountingDashboard() {
  const [staffName, setStaffName] = useState("Staff");
  const [stats, setStats] = useState<Stats>({
    myClients: 0,
    myMonthlyTasks: 0,
    myOpenDocuments: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        setError("You are not signed in.");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, role, business_id, business_type")
        .eq("id", userData.user.id)
        .single();

      if (profileError) throw profileError;

      const profile = profileData as Profile;

      if (!profile?.business_id) {
        setError("Profile or business not found.");
        return;
      }

      if (profile.business_type !== "accounting") {
        setError("This page is only for Accounting businesses.");
        return;
      }

      const name = profile.first_name?.trim() || "Staff";
      setStaffName(name);

      const { data: clientsData, error: clientsError } = await supabase
        .from("accounting_clients")
        .select("id")
        .eq("business_id", profile.business_id)
        .eq("assigned_staff", name);

      if (clientsError) throw clientsError;

      const clientIds = (clientsData ?? []).map((client) => client.id);

      if (clientIds.length === 0) {
        setStats({
          myClients: 0,
          myMonthlyTasks: 0,
          myOpenDocuments: 0,
        });
        return;
      }

      const { count: monthlyCount, error: monthlyError } = await supabase
        .from("accounting_monthly_tasks")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .neq("status", "submitted");

      if (monthlyError) throw monthlyError;

      const { count: documentCount, error: documentError } = await supabase
        .from("accounting_document_tasks")
        .select("id", { count: "exact", head: true })
        .in("client_id", clientIds)
        .neq("status", "filed");

      if (documentError) throw documentError;

      setStats({
        myClients: clientIds.length,
        myMonthlyTasks: monthlyCount ?? 0,
        myOpenDocuments: documentCount ?? 0,
      });
    } catch (err) {
      console.error(err);
      setError("Could not load staff dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Staff Dashboard</h1>
          <p style={subtitleStyle}>
            Welcome {staffName}. These are your assigned accounting clients and
            tasks.
          </p>
        </div>

        <button type="button" onClick={loadDashboard} style={buttonStyle}>
          Refresh
        </button>
      </header>

      {loading && <div style={infoStyle}>Loading staff dashboard...</div>}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {!loading && !error && (
        <>
          <section style={statsGridStyle}>
            <StatCard title="My Clients" value={stats.myClients} />
            <StatCard title="Open Monthly Tasks" value={stats.myMonthlyTasks} />
            <StatCard title="Open Documents" value={stats.myOpenDocuments} />
          </section>

          <section style={cardGridStyle}>
            <DashboardCard
              title="My Clients"
              text="View only the clients assigned to you."
              button="Open Clients"
              to="/accounting/clients"
            />

            <DashboardCard
              title="My Monthly Work"
              text="Bookkeeping, VAT, PAYE, payroll and tax tasks assigned to you."
              button="Open Monthly Work"
              to="/accounting/monthly-work"
            />

            <DashboardCard
              title="My Documents"
              text="Track bank statements, invoices, VAT, payroll and tax documents."
              button="Open Documents"
              to="/accounting/documents"
            />
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={statCardStyle}>
      <h2 style={statTitleStyle}>{title}</h2>
      <div style={statValueStyle}>{value}</div>
    </div>
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
    <div style={cardStyle}>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardTextStyle}>{text}</p>

      <Link to={to}>
        <button type="button" style={buttonStyle}>
          {button}
        </button>
      </Link>
    </div>
  );
}

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
  marginBottom: 30,
};

const titleStyle: CSSProperties = {
  fontSize: 42,
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  fontSize: 18,
  color: "#555",
  marginTop: 8,
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 20,
  marginBottom: 30,
};

const statCardStyle: CSSProperties = {
  padding: 24,
  borderRadius: 14,
  background: "#111",
  color: "white",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
};

const statTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
};

const statValueStyle: CSSProperties = {
  marginTop: 24,
  fontSize: 38,
  fontWeight: 900,
};

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 20,
};

const cardStyle: CSSProperties = {
  padding: 24,
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "white",
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: 26,
  marginTop: 0,
};

const cardTextStyle: CSSProperties = {
  fontSize: 17,
  color: "#555",
  minHeight: 55,
};

const buttonStyle: CSSProperties = {
  padding: "12px 18px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const infoStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#f3f4f6",
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 700,
};