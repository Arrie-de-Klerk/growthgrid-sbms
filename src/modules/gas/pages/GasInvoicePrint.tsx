// src/modules/gas/pages/GasInvoicePrint.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type OrderRow = {
  id: string;
  business_id: string;
  invoice_number: string | null;
  business_date: string;
  customer_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  area: string | null;
  gas_cylinder: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  status: string | null;
  payment_method: string | null;
};

export default function GasInvoicePrint() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const shouldAutoPrint = searchParams.get("print") === "1";

  const [businessName, setBusinessName] = useState("Gas Business");
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
  loadInvoice();
}, [orderId]);

  useEffect(() => {
    if (!order || !shouldAutoPrint) return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 500);

  return () => window.clearTimeout(timer);
}, [order, shouldAutoPrint]);

  async function getBusinessId() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error("No signed-in user found.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", session.user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.business_id) {
      throw new Error("This user is not linked to a business yet.");
    }

    return profile.business_id as string;
  }

  async function loadInvoice() {
    setLoading(true);
    setErrorMsg(null);

    try {
      if (!orderId) throw new Error("No order ID found.");

      const businessId = await getBusinessId();

      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .maybeSingle();

      setBusinessName(
        business?.name ||
          business?.business_name ||
          business?.company_name ||
          "Gas Business"
      );

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          business_id,
          invoice_number,
          business_date,
          customer_name,
          contact_name,
          phone,
          email,
          address,
          area,
          gas_cylinder,
          quantity,
          unit_price,
          total_price,
          status,
          payment_method
        `
        )
        .eq("id", orderId)
        .eq("business_id", businessId)
        .single();

      if (error) throw error;

      setOrder(data as OrderRow);
    } catch (err: any) {
      console.error("Invoice load error:", err.message);
      setErrorMsg(err.message || "Could not load invoice.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading invoice...</div>;
  }

  if (errorMsg) {
    return (
      <div style={{ padding: 40 }}>
        <div style={errorStyle}>⚠️ {errorMsg}</div>
        <button onClick={() => navigate("/gas/clerk")} style={buttonStyle}>
          Back to Clerk Dashboard
        </button>
      </div>
    );
  }

  if (!order) {
    return <div style={{ padding: 40 }}>Invoice not found.</div>;
  }

  return (
     <div style={pageStyle} className="invoice-page">
      <div style={toolbarStyle} className="no-print">
        <button
          onClick={() => navigate("/gas/clerk")}
          style={secondaryButtonStyle}
        >
          Back to Clerk Dashboard
        </button>

        <button onClick={() => window.print()} style={buttonStyle}>
          Print 2 Invoice Copies
        </button>
      </div>

      <style>
       {`
          @page {
           size: A4 portrait;
            margin: 10mm;
         }

          @media print {
            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            .invoice-page {
              padding: 0 !important;
              background: white !important;
            }

            .invoice-copy {
              width: 100% !important;
              min-height: auto !important;
              margin: 0 !important;
              padding: 10mm !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .invoice-copy:not(:last-child) {
              page-break-after: always !important;
              break-after: page !important;
            }

            .invoice-copy:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          }
        `}
      </style>

      <InvoiceCopy
        copyLabel="OFFICE COPY - CUSTOMER MUST SIGN"
        businessName={businessName}
        order={order}
      />

      <InvoiceCopy
        copyLabel="CUSTOMER COPY"
        businessName={businessName}
        order={order}
      />
    </div>
  );
}

function InvoiceCopy({
  copyLabel,
  businessName,
  order,
}: {
  copyLabel: string;
  businessName: string;
  order: OrderRow;
}) {
  const quantity = Number(order.quantity || 0);
  const unitPrice = Number(order.unit_price || 0);
  const total = Number(order.total_price || quantity * unitPrice || 0);

  const itemDescription = order.gas_cylinder
    ? `${order.gas_cylinder} Gas Cylinder`
    : "Gas Service";

  return (
    <section className="invoice-copy" style={invoiceStyle}>
      <header style={invoiceHeaderStyle}>
        <div>
          <h1 style={businessTitleStyle}>{businessName}</h1>
          <div style={copyBadgeStyle}>{copyLabel}</div>
        </div>

        <div style={invoiceMetaStyle}>
          <h2 style={{ margin: 0 }}>TAX INVOICE</h2>
          <div>Invoice: {order.invoice_number || order.id.slice(0, 8)}</div>
          <div>Date: {formatDate(order.business_date)}</div>
        </div>
      </header>

      <section style={customerBoxStyle}>
        <h3 style={sectionTitleStyle}>Customer</h3>
        <div>
          <b>Name:</b> {order.customer_name || "-"}
        </div>
        <div>
          <b>Phone:</b> {order.phone || "-"}
        </div>
        <div>
          <b>Address:</b>{" "}
          {[order.address, order.area].filter(Boolean).join(", ") || "-"}
        </div>
        {order.contact_name && (
          <div>
            <b>Contact:</b> {order.contact_name}
          </div>
        )}
      </section>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={th}>Description</th>
            <th style={thRight}>Qty</th>
            <th style={thRight}>Unit Price</th>
            <th style={thRight}>Total</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={td}>{itemDescription}</td>
            <td style={tdRight}>{quantity}</td>
            <td style={tdRight}>{money(unitPrice)}</td>
            <td style={tdRight}>{money(total)}</td>
          </tr>
        </tbody>

        <tfoot>
          <tr>
            <td style={totalCellStyle} colSpan={3}>
              TOTAL DUE
            </td>
            <td style={totalAmountStyle}>{money(total)}</td>
          </tr>
        </tfoot>
      </table>

      <section style={paymentBoxStyle}>
        <div>
          <b>Payment:</b> Card / Cash / Account on delivery
        </div>
        <div>
          <b>Status:</b> {formatStatus(order.status || "ordered")}
        </div>
      </section>

      <section style={signatureGridStyle}>
        <div style={signatureBoxStyle}>
          <div style={signatureLineStyle}></div>
          <b>Customer Signature</b>
        </div>

        <div style={signatureBoxStyle}>
          <div style={signatureLineStyle}></div>
          <b>Driver Name / Signature</b>
        </div>
      </section>
    </section>
  );
}

/* ================= HELPERS ================= */

function formatDate(value: string) {
  if (!value) return "-";

  const clean = value.split("T")[0];
  const [year, month, day] = clean.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ").toUpperCase();
}

function money(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 30,
  background: "#f5f5f5",
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 20,
};

const buttonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const invoiceStyle: CSSProperties = {
  maxWidth: 850,
  margin: "0 auto 24px auto",
  padding: 34,
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  boxSizing: "border-box",
};

const invoiceHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  borderBottom: "2px solid #111",
  paddingBottom: 18,
  marginBottom: 24,
};

const businessTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 900,
};

const copyBadgeStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#fff4e5",
  color: "#8a4b00",
  fontWeight: 900,
  fontSize: 13,
};

const invoiceMetaStyle: CSSProperties = {
  textAlign: "right",
  lineHeight: 1.7,
};

const customerBoxStyle: CSSProperties = {
  padding: 14,
  borderRadius: 10,
  background: "#f7f7f7",
  marginBottom: 22,
  lineHeight: 1.7,
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: 22,
};

const th: CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "2px solid #111",
};

const thRight: CSSProperties = {
  ...th,
  textAlign: "right",
};

const td: CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #ddd",
};

const tdRight: CSSProperties = {
  ...td,
  textAlign: "right",
};

const totalCellStyle: CSSProperties = {
  padding: 12,
  textAlign: "right",
  fontWeight: 900,
};

const totalAmountStyle: CSSProperties = {
  padding: 12,
  textAlign: "right",
  fontWeight: 900,
  fontSize: 18,
};

const paymentBoxStyle: CSSProperties = {
  padding: 14,
  borderRadius: 10,
  background: "#f7f7f7",
  lineHeight: 1.7,
  marginBottom: 50,
};

const signatureGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 40,
  marginTop: 30,
};

const signatureBoxStyle: CSSProperties = {
  textAlign: "center",
};

const signatureLineStyle: CSSProperties = {
  borderTop: "1px solid #111",
  marginBottom: 8,
  height: 30,
};

const errorStyle: CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 800,
};