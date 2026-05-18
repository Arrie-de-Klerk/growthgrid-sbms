import { useState } from "react";
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

  async function saveClient() {
    try {
      setSaving(true);
      setError("");

      if (!clientName.trim()) {
        setError("Client name is required.");
        return;
      }

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

      const { error: insertError } = await supabase.from("accounting_clients").insert({
        business_id: profile.business_id,
        client_name: clientName.trim(),
        business_name: businessName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        company_registration_number: companyRegistrationNumber.trim() || null,
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
      });

      if (insertError) {
        console.error(insertError);
        setError("Could not save client.");
        return;
      }

      navigate("/accounting/clients");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Accounting Client</h1>
      <p>Capture a new client for the Accounting Demo business.</p>

      <Link to="/accounting/clients">
        <button style={secondaryButtonStyle}>Back to Clients</button>
      </Link>

      {error && <p style={{ color: "red", marginTop: 20 }}>{error}</p>}

      <div style={formStyle}>
        <input style={inputStyle} placeholder="Client Name *" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        <input style={inputStyle} placeholder="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        <input style={inputStyle} placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input style={inputStyle} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={inputStyle} placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />

        <input style={inputStyle} placeholder="Company Registration Number" value={companyRegistrationNumber} onChange={(e) => setCompanyRegistrationNumber(e.target.value)} />
        <input style={inputStyle} placeholder="VAT Number" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} />
        <input style={inputStyle} placeholder="PAYE Number" value={payeNumber} onChange={(e) => setPayeNumber(e.target.value)} />
        <input style={inputStyle} placeholder="Income Tax Number" value={incomeTaxNumber} onChange={(e) => setIncomeTaxNumber(e.target.value)} />

        <label>
          <input type="checkbox" checked={isVatRegistered} onChange={(e) => setIsVatRegistered(e.target.checked)} /> VAT Registered
        </label>

        <label>
          <input type="checkbox" checked={isPayeRegistered} onChange={(e) => setIsPayeRegistered(e.target.checked)} /> PAYE Registered
        </label>

        <label>
          <input type="checkbox" checked={hasPayroll} onChange={(e) => setHasPayroll(e.target.checked)} /> Has Payroll
        </label>

        <input style={inputStyle} placeholder="Financial Year End e.g. February" value={financialYearEnd} onChange={(e) => setFinancialYearEnd(e.target.value)} />
        <input style={inputStyle} placeholder="Assigned Staff" value={assignedStaff} onChange={(e) => setAssignedStaff(e.target.value)} />

        <textarea
          style={{ ...inputStyle, minHeight: 100 }}
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button style={buttonStyle} onClick={saveClient} disabled={saving}>
          {saving ? "Saving..." : "Save Client"}
        </button>
      </div>
    </div>
  );
}

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  maxWidth: 650,
  marginTop: 24,
};

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 16,
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

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#666",
};

export default AccountingClientNew;