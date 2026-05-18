import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

function AccountingClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState<AccountingClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadClient() {
    try {
      setLoading(true);
      setError("");

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setError("You are not signed in.");
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

      const { data, error } = await supabase
        .from("accounting_clients")
        .select("*")
        .eq("id", id)
        .eq("business_id", profile.business_id)
        .single();

      if (error || !data) {
        console.error(error);
        setError("Client not found.");
        return;
      }

      setClient(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClient();
  }, [id]);

  return (
    <div style={{ padding: 40 }}>
      <Link to="/accounting/clients">
        <button style={buttonStyle}>Back to Clients</button>
      </Link>

      {loading && <p>Loading client...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {client && (
        <>
          <h1>{client.business_name || client.client_name}</h1>
          <p>Contact: {client.client_name}</p>

          <div style={cardStyle}>
            <h2>Client Information</h2>
            <p><strong>Phone:</strong> {client.phone || "-"}</p>
            <p><strong>Email:</strong> {client.email || "-"}</p>
            <p><strong>Address:</strong> {client.address || "-"}</p>
            <p><strong>Status:</strong> {client.status}</p>
          </div>

          <div style={cardStyle}>
            <h2>Registration Details</h2>
            <p><strong>Company Reg:</strong> {client.company_registration_number || "-"}</p>
            <p><strong>VAT Number:</strong> {client.vat_number || "-"}</p>
            <p><strong>PAYE Number:</strong> {client.paye_number || "-"}</p>
            <p><strong>Income Tax Number:</strong> {client.income_tax_number || "-"}</p>
          </div>

          <div style={cardStyle}>
            <h2>Services</h2>
            <p><strong>VAT Registered:</strong> {client.is_vat_registered ? "Yes" : "No"}</p>
            <p><strong>PAYE Registered:</strong> {client.is_paye_registered ? "Yes" : "No"}</p>
            <p><strong>Payroll:</strong> {client.has_payroll ? "Yes" : "No"}</p>
            <p><strong>Financial Year End:</strong> {client.financial_year_end || "-"}</p>
            <p><strong>Assigned Staff:</strong> {client.assigned_staff || "-"}</p>
          </div>

          <div style={cardStyle}>
            <h2>Notes</h2>
            <p>{client.notes || "No notes yet."}</p>
          </div>
        </>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 20,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

export default AccountingClientDetail;