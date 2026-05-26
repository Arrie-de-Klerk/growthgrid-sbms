import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

function AccountingClientNew() {
  const navigate = useNavigate();

  const [clientName, setClientName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const [companyRegistrationNumber, setCompanyRegistrationNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [payeNumber, setPayeNumber] = useState("");
  const [incomeTaxNumber, setIncomeTaxNumber] = useState("");

  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [isPayeRegistered, setIsPayeRegistered] = useState(false);
  const [hasPayroll, setHasPayroll] = useState(false);

  const [financialYearEnd, setFinancialYearEnd] = useState("");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveClient(e: FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!clientName.trim()) {
        setError("Client name is required.");
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

      const { data: savedClient, error: insertError } = await supabase
        .from("accounting_clients")
        .insert({
          business_id: profile.business_id,

          client_name: clientName.trim(),
          business_name: businessName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,

          company_registration_number:
            companyRegistrationNumber.trim() || null,
          vat_number: vatNumber.trim() || null,
          paye_number: payeNumber.trim() || null,
          income_tax_number: incomeTaxNumber.trim() || null,

          is_vat_registered: isVatRegistered,
          is_paye_registered: isPayeRegistered,
          has_payroll: hasPayroll,

          financial_year_end: financialYearEnd.trim() || null,
          assigned_staff: assignedStaff.trim() || null,
          status: "active",
          notes: notes.trim() || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (!savedClient?.id) {
        throw new Error("Client was saved, but no client ID was returned.");
      }

      navigate(`/accounting/clients/${savedClient.id}`);
    } catch (err) {
      console.error(err);
      setError("Could not save client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Add Accounting Client</h1>
          <p style={subtitleStyle}>
            Capture a new accounting client, tax registrations, payroll setup
            and notes.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link to="/accounting">
            <button type="button" style={secondaryButtonStyle}>
              Back to Dashboard
            </button>
          </Link>

          <Link to="/accounting/clients">
            <button type="button" style={secondaryButtonStyle}>
              Back to Clients
            </button>
          </Link>
        </div>
      </header>

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      <form onSubmit={saveClient} style={formStyle}>
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Client Information</h2>

          <div style={gridStyle}>
            <input
              style={inputStyle}
              placeholder="Client Name *"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />

            <input
              style={inputStyle}
              placeholder="Business Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              type="email"
              style={inputStyle}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              style={{ ...inputStyle, gridColumn: "1 / -1" }}
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Registration Details</h2>

          <div style={gridStyle}>
            <input
              style={inputStyle}
              placeholder="Company Registration Number"
              value={companyRegistrationNumber}
              onChange={(e) => setCompanyRegistrationNumber(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="VAT Number"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="PAYE Number"
              value={payeNumber}
              onChange={(e) => setPayeNumber(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Income Tax Number"
              value={incomeTaxNumber}
              onChange={(e) => setIncomeTaxNumber(e.target.value)}
            />
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Services</h2>

          <div style={checkboxGridStyle}>
            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={isVatRegistered}
                onChange={(e) => setIsVatRegistered(e.target.checked)}
              />
              VAT Registered
            </label>

            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={isPayeRegistered}
                onChange={(e) => setIsPayeRegistered(e.target.checked)}
              />
              PAYE Registered
            </label>

            <label style={checkboxStyle}>
              <input
                type="checkbox"
                checked={hasPayroll}
                onChange={(e) => setHasPayroll(e.target.checked)}
              />
              Has Payroll
            </label>
          </div>

          <div style={gridStyle}>
            <input
              style={inputStyle}
              placeholder="Financial Year End e.g. February"
              value={financialYearEnd}
              onChange={(e) => setFinancialYearEnd(e.target.value)}
            />

            <input
              style={inputStyle}
              placeholder="Assigned Staff"
              value={assignedStaff}
              onChange={(e) => setAssignedStaff(e.target.value)}
            />
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Notes</h2>

          <textarea
            style={textareaStyle}
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <button type="submit" style={buttonStyle} disabled={saving}>
          {saving ? "Saving..." : "Save Client"}
        </button>
      </form>
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

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const formStyle: CSSProperties = {
  display: "grid",
  gap: 20,
};

const cardStyle: CSSProperties = {
  padding: 24,
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "white",
  boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 24,
  marginTop: 0,
  marginBottom: 18,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const checkboxGridStyle: CSSProperties = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 18,
};

const checkboxStyle: CSSProperties = {
  fontWeight: 700,
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const inputStyle: CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 16,
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  width: "100%",
  minHeight: 120,
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  padding: "14px 20px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 16,
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

const errorStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 700,
  marginBottom: 20,
};

export default AccountingClientNew;