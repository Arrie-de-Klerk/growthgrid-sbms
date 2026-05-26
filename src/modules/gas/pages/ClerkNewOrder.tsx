// src/modules/gas/pages/ClerkNewOrder.tsx

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

type QuoteType =
  | "None"
  | "Geyser"
  | "Stove"
  | "Braai"
  | "Hob"
  | "Heater"
  | "Other";

const cylinderPrices: Record<string, number> = {
  "0": 0,
  "9kg": 450,
  "12kg": 480,
  "14kg": 520,
  "19kg": 600,
  "48kg": 1500,
};

const installationTypeMap: Record<QuoteType, string | null> = {
  None: null,
  Geyser: "gas_geyser",
  Stove: "gas_stove",
  Braai: "braai",
  Hob: "gas_stove",
  Heater: "repair",
  Other: "inspection",
};

export default function ClerkNewOrder() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Gas Business");

  const [customerName, setCustomerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [gasCylinder, setGasCylinder] = useState("14kg");
  const [unitPrice, setUnitPrice] = useState<number>(cylinderPrices["14kg"]);
  const [quantity, setQuantity] = useState<number>(1);

  const [quoteType, setQuoteType] = useState<QuoteType>("None");
  const [otherDescription, setOtherDescription] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGasOrder = gasCylinder !== "0";
  const finalQuantity = isGasOrder ? Number(quantity || 0) : 0;
  const finalUnitPrice = isGasOrder ? Number(unitPrice || 0) : 0;
  const totalPrice = finalQuantity * finalUnitPrice;

  useEffect(() => {
    loadBusiness();
  }, []);

  async function loadBusiness() {
    setPageLoading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error("You are not logged in.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, business_type, role")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        throw new Error("This clerk is not linked to a business yet.");
      }

      if (profile.business_type !== "gas") {
        throw new Error("This page is only for Gas businesses.");
      }

       setBusinessId(profile.business_id);

      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", profile.business_id)
        .maybeSingle();

      setBusinessName(
        business?.name ||
          business?.business_name ||
          business?.company_name ||
          "Gas Business"
      );
    } catch (err: any) {
      console.error("ClerkNewOrder business load error:", err.message);
      setError(err.message || "Could not load business.");
    } finally {
      setPageLoading(false);
    }
  }

  async function generateCustomerCode(activeBusinessId: string) {
    const { count, error: countError } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", activeBusinessId);

    if (countError) throw countError;

    const nextNumber = (count || 0) + 1;
    return `CUS-${String(nextNumber).padStart(4, "0")}`;
  }

  async function generateInvoiceNumber(activeBusinessId: string) {
  const year = new Date().getFullYear();

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", activeBusinessId)
    .gte("business_date", `${year}-01-01`)
    .lt("business_date", `${year + 1}-01-01`);

  if (error) throw error;

  const nextNumber = (count || 0) + 1;

  return `INV-${year}-${String(nextNumber).padStart(5, "0")}`;
}

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      if (!businessId) {
        throw new Error("Business not loaded yet. Please refresh the page.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You are not logged in.");

      if (!customerName.trim()) {
        throw new Error("Please add the customer name.");
      }

      if (!phone.trim()) {
        throw new Error("Please add the customer phone number.");
      }

      if (!address.trim()) {
        throw new Error("Please add the delivery address.");
      }

      if (!area.trim()) {
        throw new Error("Please add the area or town.");
      }

      if (!isGasOrder && quoteType === "None") {
        throw new Error("Please select gas or an installation request.");
      }

      if (quoteType === "Other" && !otherDescription.trim()) {
        throw new Error("Please describe the installation request.");
      }

      if (isGasOrder && finalQuantity <= 0) {
        throw new Error("Quantity must be more than 0.");
      }

      if (isGasOrder && finalUnitPrice <= 0) {
        throw new Error("Unit price must be more than 0.");
      }

      const cleanPhone = phone.trim();
      const cleanEmail = email.trim();
      const mappedInstallationType = installationTypeMap[quoteType];

        if (mappedInstallationType && !cleanEmail) {
        throw new Error("Please enter the customer's email address for installation quotes and invoices.");
      }

       console.log("EMAIL BEFORE CUSTOMER SAVE:", cleanEmail);

      const { data: existingCustomer, error: existingCustomerError } =
        await supabase
          .from("customers")
          .select("id")
          .eq("business_id", businessId)
          .eq("phone", cleanPhone)
          .maybeSingle();

      if (existingCustomerError) throw existingCustomerError;

      let customerId: string;

      if (!existingCustomer) {
        const customerCode = await generateCustomerCode(businessId);

        // create new customer with email
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            business_id: businessId,
            customer_code: customerCode,
            customer_type:
              contactName.trim() !== "" ? "business" : "residential",
            name: customerName.trim(),
            phone: cleanPhone,
            email: cleanEmail || null,
            address_line_1: address.trim(),
            area: area.trim(),
            is_active: true,
          })
          .select("id")
          .single();

        if (customerError) throw customerError;

        if (!newCustomer?.id) {
          throw new Error("Customer could not be created.");
        }

        customerId = newCustomer.id;
      } else {
        // update existing customer with email
        const { error: updateCustomerError } = await supabase
          .from("customers")
          .update({
            name: customerName.trim(),
            phone: cleanPhone,
            email: cleanEmail || null,
            address_line_1: address.trim(),
            area: area.trim(),
            is_active: true,
          })
          .eq("id", existingCustomer.id)
          .eq("business_id", businessId);

        if (updateCustomerError) throw updateCustomerError;

        customerId = existingCustomer.id;
      }
      

         if (mappedInstallationType && !email.trim()) {
           alert("Please enter the customer's email address for installation quotes and invoices.");
           setLoading(false);
           return;
       }

         if (mappedInstallationType) {
      const { error: instErr } = await supabase.from("installations").insert({
             business_id: businessId,
             customer_id: customerId,
             installation_type: mappedInstallationType,
             status: "planned",
             address: address.trim(),
             notes:
          quoteType === "Other"
              ? otherDescription.trim()
              : otherDescription.trim() || null,
           });

       if (instErr) throw instErr;
       }


      if (!isGasOrder) {
        alert("Installation request saved.");
        navigate("/gas/clerk/installations");
        return;
      }

      const invoiceNumber = await generateInvoiceNumber(businessId);

      const { data: savedOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          business_id: businessId,
          clerk_id: user.id,
          business_date: getTodayISO(),

          invoice_number: invoiceNumber,
          payment_method: "card_on_delivery",

          customer_id: customerId,
          customer_name: customerName.trim(),
          contact_name: contactName.trim() || null,

          gas_cylinder: isGasOrder ? gasCylinder : null,
          quantity: finalQuantity,
          unit_price: finalUnitPrice,
          total_price: totalPrice,

          status: "ordered",

          quote_type: quoteType === "None" ? null : quoteType,
          other_description:
            quoteType === "Other" ? otherDescription.trim() : null,

          phone: cleanPhone,
          email: cleanEmail || null,
          address: address.trim(),
          area: area.trim(),
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      navigate(`/gas/invoice/${savedOrder.id}?print=1`);
    } catch (err: any) {
      console.error("New order error:", err.message);
      setError(err.message || "Could not save order.");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return <div style={{ padding: 32 }}>Loading new order page...</div>;
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>📞 New Order</h1>
          <p style={subtitleStyle}>
            {businessName} – capture gas orders and installation requests.
          </p>
        </div>

        <button onClick={() => navigate("/gas/clerk")} style={backButtonStyle}>
          Back to Clerk Dashboard
        </button>
      </header>

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      <form onSubmit={handleSubmit} style={formStyle}>
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Customer Details</h2>

          <div style={gridStyle}>
            <label style={labelStyle}>
              Customer / Business Name
              <input
                placeholder="Customer Name / Business Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={inputStyle}
                required
              />
            </label>

            <label style={labelStyle}>
                 Business Contact Person
              <input
                 name="business_contact_person"
                 placeholder="Only for business deliveries"
                 value={contactName}
                 onChange={(e) => setContactName(e.target.value)}
                 style={inputStyle}
                 autoComplete="off"
             />
            </label>

            <label style={labelStyle}>
              Phone
              <input
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                required
              />
            </label>

            <label style={labelStyle}>
              Email
              <input
                 type="email"
                 placeholder="Email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Address
              <input
                placeholder="Delivery address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={inputStyle}
                required
              />
            </label>

            <label style={labelStyle}>
              Area / Town
              <input
                placeholder="Area or Town"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                style={inputStyle}
                required
              />
            </label>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Gas Order</h2>

          <div style={gridStyle}>
            <label style={labelStyle}>
              Cylinder Size
              <select
                value={gasCylinder}
                onChange={(e) => {
                  const selected = e.target.value;
                  setGasCylinder(selected);
                  setUnitPrice(cylinderPrices[selected] ?? 0);

                  if (selected === "0") {
                    setQuantity(0);
                  } else if (quantity <= 0) {
                    setQuantity(1);
                  }
                }}
                style={inputStyle}
              >
                <option value="0">0 - No Gas</option>
                <option value="9kg">9kg</option>
                <option value="12kg">12kg</option>
                <option value="14kg">14kg</option>
                <option value="19kg">19kg</option>
                <option value="48kg">48kg</option>
              </select>
            </label>

            <label style={labelStyle}>
              Price per Cylinder
              <input
                type="number"
                step="0.01"
                value={unitPrice}
                disabled={!isGasOrder}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                style={inputStyle}
                required={isGasOrder}
              />
            </label>

            <label style={labelStyle}>
              Quantity
              <input
                type="number"
                min="0"
                value={quantity}
                disabled={!isGasOrder}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={inputStyle}
                required={isGasOrder}
              />
            </label>

            <div style={totalBoxStyle}>
              <div style={totalLabelStyle}>Order Total</div>
              <div style={totalValueStyle}>{money(totalPrice)}</div>
            </div>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Installation Request</h2>

          <div style={gridStyle}>
            <label style={labelStyle}>
              Installation
              <select
                value={quoteType}
                onChange={(e) => setQuoteType(e.target.value as QuoteType)}
                style={inputStyle}
              >
                <option value="None">No Installation</option>
                <option value="Geyser">Geyser</option>
                <option value="Stove">Stove</option>
                <option value="Braai">Braai</option>
                <option value="Hob">Hob</option>
                <option value="Heater">Heater</option>
                <option value="Other">Other</option>
              </select>
            </label>

            {quoteType === "Other" && (
              <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                Describe Installation
                <input
                  placeholder="Describe installation"
                  value={otherDescription}
                  onChange={(e) => setOtherDescription(e.target.value)}
                  style={inputStyle}
                />
              </label>
            )}
          </div>
        </section>

        <button type="submit" disabled={loading} style={submitButtonStyle}>
         {loading
           ? "Saving..."
           : isGasOrder
           ? "Save & Print Invoice"
           : "Save Installation Request"}
       </button>
      </form>
    </div>
  );
}

/* ================= HELPERS ================= */

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function money(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 32,
  maxWidth: 1000,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 24,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 900,
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  color: "#666",
};

const backButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const formStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 20,
  background: "#fff",
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 16,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 800,
  fontSize: 13,
};

const inputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
};

const totalBoxStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const totalLabelStyle: CSSProperties = {
  fontSize: 13,
  color: "#666",
  fontWeight: 800,
};

const totalValueStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  marginTop: 4,
};

const submitButtonStyle: CSSProperties = {
  padding: "14px 18px",
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const errorStyle: CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 800,
};
