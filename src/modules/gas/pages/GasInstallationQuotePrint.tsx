import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

type InstallationRow = Record<string, any>;

type BusinessRow = {
  name?: string;
  business_type?: string;
  is_demo?: boolean;
};

function money(value: any) {
  const num = Number(value || 0);
  return `R ${num.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function text(value: any, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function GasInstallationQuotePrint() {
  const { installationId } = useParams();

  const [installation, setInstallation] = useState<InstallationRow | null>(null);
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadQuote() {
    try {
      setLoading(true);
      setError("");

      if (!installationId) {
        setError("Installation ID missing.");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setError("No signed-in user found.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", userData.user.id)
        .single();

      if (profileError || !profile?.business_id) {
        setError("Profile or business not found.");
        return;
      }

      const { data: businessData } = await supabase
        .from("businesses")
        .select("name, business_type, is_demo")
        .eq("id", profile.business_id)
        .single();

      setBusiness(businessData ?? null);

      const { data: installationData, error: installationError } = await supabase
        .from("installations")
        .select("*")
        .eq("id", installationId)
        .eq("business_id", profile.business_id)
        .single();

      if (installationError || !installationData) {
        console.error(installationError);
        setError("Installation quote could not be loaded.");
        return;
      }

      setInstallation(installationData);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading the quote.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuote();
  }, [installationId]);

  const quoteLines = useMemo(() => {
    if (!installation) return [];

    const applianceTotal =
      installation.appliance_profit_slot ??
      installation.appliance_selling_price ??
      installation.appliance_cost ??
      0;

    const materialTotal =
      installation.material_profit_slot ??
      installation.material_selling_total ??
      installation.material_total ??
      0;

    const labourTotal =
      installation.labour_profit_slot ??
      installation.labour_selling_total ??
      installation.labour_cost ??
      0;

    const transportTotal =
      installation.transport_profit_slot ??
      installation.travel_cost_to_quote ??
      installation.transport_cost ??
      0;

    const cocTotal =
      installation.coc_profit_slot ??
      installation.coc_cost ??
      0;

    return [
      {
        description: `Appliance / Installation: ${text(
          installation.installation_type ||
            installation.appliance_type ||
            installation.type,
          "Gas installation"
        )}`,
        amount: applianceTotal,
      },
      {
        description: "Materials",
        amount: materialTotal,
      },
      {
        description: "Labour",
        amount: labourTotal,
      },
      {
        description: "Transport / Travel",
        amount: transportTotal,
      },
      {
        description: "COC",
        amount: installation.coc_required ? cocTotal : 0,
      },
    ].filter((line) => Number(line.amount || 0) > 0);
  }, [installation]);

  const quoteTotal = quoteLines.reduce(
    (sum, line) => sum + Number(line.amount || 0),
    0
  );

  if (loading) {
    return <div style={{ padding: 40 }}>Loading installation quote...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: "red" }}>{error}</p>
        <Link to="/gas/installations">Back to Installations</Link>
      </div>
    );
  }

  if (!installation) {
    return (
      <div style={{ padding: 40 }}>
        <p>Installation not found.</p>
        <Link to="/gas/installations">Back to Installations</Link>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle} className="no-print">
        <Link to="/gas/installations">
          <button style={secondaryButtonStyle}>Back to Installations</button>
        </Link>

        <button onClick={() => window.print()} style={buttonStyle}>
          Print Quote
        </button>
      </div>

      <div style={quoteStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0 }}>{business?.name ?? "Gas Business"}</h1>
            <p style={{ margin: "6px 0", color: "#555" }}>
              Gas Installation Quote
            </p>
            {business?.is_demo && (
              <strong style={{ color: "green" }}>DEMO QUOTE</strong>
            )}
          </div>

          <div style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0 }}>QUOTE</h2>
            <p style={{ margin: "6px 0" }}>
              Quote No: QUO-{String(installation.id).slice(0, 8)}
            </p>
            <p style={{ margin: "6px 0" }}>
              Date:{" "}
              {new Date(
                installation.created_at || Date.now()
              ).toLocaleDateString("en-ZA")}
            </p>
            <p style={{ margin: "6px 0" }}>
              Status: {text(installation.status)}
            </p>
          </div>
        </div>

        <hr style={hrStyle} />

        <div style={sectionGridStyle}>
          <div>
            <h3>Customer</h3>
            <p style={infoLineStyle}>
              <strong>Name:</strong>{" "}
              {text(
                installation.customer_name ||
                  installation.client_name ||
                  installation.name
              )}
            </p>
            <p style={infoLineStyle}>
              <strong>Phone:</strong> {text(installation.phone)}
            </p>
            <p style={infoLineStyle}>
              <strong>Address:</strong>{" "}
              {text(installation.address || installation.installation_address)}
            </p>
          </div>

          <div>
            <h3>Installation Details</h3>
            <p style={infoLineStyle}>
              <strong>Type:</strong>{" "}
              {text(
                installation.installation_type ||
                  installation.appliance_type ||
                  installation.type,
                "Gas installation"
              )}
            </p>
            <p style={infoLineStyle}>
              <strong>Make:</strong> {text(installation.appliance_make)}
            </p>
            <p style={infoLineStyle}>
              <strong>Model:</strong> {text(installation.appliance_model)}
            </p>
            <p style={infoLineStyle}>
              <strong>COC Required:</strong>{" "}
              {installation.coc_required ? "Yes" : "No"}
            </p>
          </div>
        </div>

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thLeftStyle}>Description</th>
              <th style={thRightStyle}>Quoted Amount</th>
            </tr>
          </thead>

          <tbody>
            {quoteLines.map((line, index) => (
              <tr key={index}>
                <td style={tdLeftStyle}>{line.description}</td>
                <td style={tdRightStyle}>{money(line.amount)}</td>
              </tr>
            ))}

            {quoteLines.length === 0 && (
              <tr>
                <td style={tdLeftStyle}>Gas installation quote</td>
                <td style={tdRightStyle}>{money(0)}</td>
              </tr>
            )}
          </tbody>

          <tfoot>
            <tr>
              <td style={totalLabelStyle}>Quote Total</td>
              <td style={totalValueStyle}>{money(quoteTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={notesStyle}>
          <h3>Notes</h3>
          <p>
            This quote is valid subject to final inspection, material
            availability, and approval by the customer.
          </p>
          <p>
            Final invoice may change if extra materials, labour, travel, or COC
            requirements are added.
          </p>
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  padding: 30,
  background: "#f4f4f4",
  minHeight: "100vh",
};

const toolbarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 20,
};

const quoteStyle: React.CSSProperties = {
  background: "white",
  maxWidth: 900,
  margin: "0 auto",
  padding: 40,
  borderRadius: 12,
  boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
};

const hrStyle: React.CSSProperties = {
  margin: "24px 0",
  border: "none",
  borderTop: "1px solid #ddd",
};

const sectionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 30,
  marginBottom: 30,
};

const infoLineStyle: React.CSSProperties = {
  margin: "6px 0",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
};

const thLeftStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  borderBottom: "2px solid #222",
};

const thRightStyle: React.CSSProperties = {
  textAlign: "right",
  padding: 12,
  borderBottom: "2px solid #222",
};

const tdLeftStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #ddd",
};

const tdRightStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #ddd",
  textAlign: "right",
};

const totalLabelStyle: React.CSSProperties = {
  padding: 14,
  textAlign: "right",
  fontWeight: 700,
  fontSize: 18,
};

const totalValueStyle: React.CSSProperties = {
  padding: 14,
  textAlign: "right",
  fontWeight: 700,
  fontSize: 18,
};

const notesStyle: React.CSSProperties = {
  marginTop: 35,
  color: "#444",
};

const buttonStyle: React.CSSProperties = {
  background: "#111",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#666",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: 8,
  cursor: "pointer",
};