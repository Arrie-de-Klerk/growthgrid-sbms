import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type AccountingClient = {
  id: string;
  client_name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_registration_number: string | null;
  vat_number: string | null;
  paye_number: string | null;
  income_tax_number: string | null;
  is_vat_registered: boolean;
  is_paye_registered: boolean;
  has_payroll: boolean;
  financial_year_end: string | null;
  assigned_staff: string | null;
  status: string;
  notes: string | null;
};

export default function AccountingClientDetail() {
  const { id } = useParams();

  const [client, setClient] = useState<AccountingClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadClient() {
    try {
      setLoading(true);
      setError("");

      if (!id) {
        setError("Client ID not found.");
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        setError("You are not signed in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", userData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        setError("Profile or business not found.");
        return;
      }

      const { data, error: clientError } = await supabase
        .from("accounting_clients")
        .select("*")
        .eq("id", id)
        .eq("business_id", profile.business_id)
        .single();

      if (clientError) throw clientError;

      if (!data) {
        setError("Client not found.");
        return;
      }

      setClient(data as AccountingClient);
    } catch (err) {
      console.error(err);
      setError("Could not load accounting client.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClient();
  }, [id]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Accounting Client Detail</h1>
          <p style={subtitleStyle}>
            Client profile, tax details, payroll setup and accounting notes.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link to="/accounting">
            <button style={secondaryButtonStyle}>Back to Dashboard</button>
          </Link>

          <Link to="/accounting/clients">
            <button style={buttonStyle}>Back to Clients</button>
          </Link>
        </div>
      </header>

      {loading && <div style={infoStyle}>Loading client...</div>}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {!loading && !error && client && (
        <>
          <section style={heroCardStyle}>
            <div>
              <h2 style={clientNameStyle}>
                {client.business_name || client.client_name}
              </h2>
              <p style={mutedTextStyle}>Contact: {client.client_name}</p>
            </div>

            <div style={statusPillStyle}>
              {client.status || "active"}
            </div>
          </section>

          <section style={gridStyle}>
            <Card title="Client Information">
              <Detail label="Phone" value={client.phone} />
              <Detail label="Email" value={client.email} />
              <Detail label="Address" value={client.address} />
              <Detail label="Assigned Staff" value={client.assigned_staff} />
            </Card>

            <Card title="Registration Details">
              <Detail
                label="Company Reg"
                value={client.company_registration_number}
              />
              <Detail label="VAT Number" value={client.vat_number} />
              <Detail label="PAYE Number" value={client.paye_number} />
              <Detail
                label="Income Tax Number"
                value={client.income_tax_number}
              />
            </Card>

            <Card title="Services">
              <Detail
                label="VAT Registered"
                value={client.is_vat_registered ? "Yes" : "No"}
              />
              <Detail
                label="PAYE Registered"
                value={client.is_paye_registered ? "Yes" : "No"}
              />
              <Detail
                label="Payroll"
                value={client.has_payroll ? "Yes" : "No"}
              />
              <Detail
                label="Financial Year End"
                value={client.financial_year_end}
              />
            </Card>

            <Card title="Notes">
              <p style={normalTextStyle}>{client.notes || "No notes yet."}</p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <h2 style={cardTitleStyle}>{title}</h2>
      {children}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <p style={detailLineStyle}>
      <strong>{label}:</strong> {value || "-"}
    </p>
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
  gap: 20,
  alignItems: "flex-start",
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

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
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

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 18px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  color: "black",
  fontWeight: 700,
  cursor: "pointer",
};

const heroCardStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 24,
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "#111",
  color: "white",
  marginBottom: 24,
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
};

const clientNameStyle: CSSProperties = {
  fontSize: 32,
  margin: 0,
};

const mutedTextStyle: CSSProperties = {
  color: "#ddd",
  fontSize: 17,
  marginTop: 8,
};

const statusPillStyle: CSSProperties = {
  background: "#e8f5e9",
  color: "#166534",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 800,
  textTransform: "uppercase",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 20,
};

const cardStyle: CSSProperties = {
  padding: 22,
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "white",
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
};

const cardTitleStyle: CSSProperties = {
  fontSize: 24,
  marginTop: 0,
  marginBottom: 18,
};

const detailLineStyle: CSSProperties = {
  fontSize: 17,
  margin: "10px 0",
};

const normalTextStyle: CSSProperties = {
  fontSize: 17,
  lineHeight: 1.5,
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