// src/modules/gas/pages/GasSalesInvoicePrint.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type SaleRow = {
  id: string;
  business_id: string;
  invoice_number: string | null;
  customer_name: string | null;
  payment_type: string | null;
  total_amount: number | null;
  created_at: string;
};

type SaleItemRow = {
  id?: string;
  sale_id: string;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
};

export default function GasSalesInvoicePrint() {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const shouldAutoPrint = searchParams.get("print") === "1";

  const [businessName, setBusinessName] = useState("Gas Business");
  const [sale, setSale] = useState<SaleRow | null>(null);
  const [items, setItems] = useState<SaleItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [saleId]);

  useEffect(() => {
    if (!sale || !shouldAutoPrint) return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [sale, shouldAutoPrint]);

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
      if (!saleId) throw new Error("No sale ID found.");

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

      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .select("id, business_id, invoice_number, customer_name, payment_type, total_amount, created_at")
        .eq("id", saleId)
        .eq("business_id", businessId)
        .single();

      if (saleError) throw saleError;

      const { data: itemData, error: itemError } = await supabase
        .from("sale_items")
        .select("id, sale_id, product_name, quantity, unit_price, total_price")
        .eq("sale_id", saleId);

      if (itemError) throw itemError;

      setSale(saleData as SaleRow);
      setItems((itemData || []) as SaleItemRow[]);
    } catch (err: any) {
      console.error("Counter sale invoice load error:", err.message);
      setErrorMsg(err.message || "Could not load counter sale invoice.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading counter sale invoice...</div>;
  }

  if (errorMsg) {
    return (
      <div style={{ padding: 40 }}>
        <div style={errorStyle}>⚠️ {errorMsg}</div>
        <button onClick={() => navigate("/gas/clerk/sales")} style={buttonStyle}>
          Back to Sales
        </button>
      </div>
    );
  }

  if (!sale) {
    return <div style={{ padding: 40 }}>Invoice not found.</div>;
  }

  return (
    <div style={pageStyle} className="invoice-page">
      <div style={toolbarStyle} className="no-print">
        <button onClick={() => navigate("/gas/clerk/sales")} style={secondaryButtonStyle}>
          Back to Sales
        </button>

        <button onClick={() => window.print()} style={buttonStyle}>
          Print Receipt / Tax Invoice
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
              margin: 0 !important;
              padding: 10mm !important;
              border: none !important;
              box-shadow: none !important;
              box-sizing: border-box !important;
            }
          }
        `}
      </style>

      <section className="invoice-copy" style={invoiceStyle}>
        <header style={invoiceHeaderStyle}>
          <div>
            <h1 style={businessTitleStyle}>{businessName}</h1>
            <div style={copyBadgeStyle}>COUNTER SALE</div>
          </div>

          <div style={invoiceMetaStyle}>
            <h2 style={{ margin: 0 }}>TAX INVOICE / RECEIPT</h2>
            <div>Invoice: {sale.invoice_number || sale.id.slice(0, 8)}</div>
            <div>Date: {formatDate(sale.created_at)}</div>
          </div>
        </header>

        <section style={customerBoxStyle}>
          <h3 style={sectionTitleStyle}>Customer</h3>
          <div>
            <b>Name:</b> {sale.customer_name || "Counter Customer"}
          </div>
          <div>
            <b>Payment:</b> {formatPayment(sale.payment_type || "-")}
          </div>
        </section>

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={th}>Product</th>
              <th style={thRight}>Qty</th>
              <th style={thRight}>Unit Price</th>
              <th style={thRight}>Line Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || `${item.sale_id}-${index}`}>
                <td style={td}>{item.product_name || "-"}</td>
                <td style={tdRight}>{Number(item.quantity || 0)}</td>
                <td style={tdRight}>{money(Number(item.unit_price || 0))}</td>
                <td style={tdRight}>{money(Number(item.total_price || 0))}</td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <td style={totalCellStyle} colSpan={3}>
                TOTAL PAID
              </td>
              <td style={totalAmountStyle}>
                {money(Number(sale.total_amount || 0))}
              </td>
            </tr>
          </tfoot>
        </table>

        <section style={thankYouStyle}>
          Thank you for your purchase.
        </section>
      </section>
    </div>
  );
}

/* ================= HELPERS ================= */

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatPayment(value: string) {
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
  background: "#e8f5e9",
  color: "#1b5e20",
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

const thankYouStyle: CSSProperties = {
  marginTop: 30,
  padding: 14,
  borderRadius: 10,
  background: "#f7f7f7",
  fontWeight: 800,
};

const errorStyle: CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 800,
};