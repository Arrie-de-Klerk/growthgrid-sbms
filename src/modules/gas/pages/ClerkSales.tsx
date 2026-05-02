// src/modules/gas/pages/ClerkSales.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type SaleItem = {
  id: string;
  product: string;
  quantity: number;
  price: number;
};

function safeNum(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ClerkSales() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Gas Business");

  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadBusiness();
  }, []);

  async function loadBusiness() {
    setPageLoading(true);
    setErrorMsg(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error("You are not logged in.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        throw new Error("This clerk is not linked to a business yet.");
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
      console.error("ClerkSales load error:", err.message);
      setErrorMsg(err.message || "Could not load sales page.");
    } finally {
      setPageLoading(false);
    }
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product: "",
        quantity: 1,
        price: 0,
      },
    ]);
  }

  function updateItem(id: string, field: keyof SaleItem, value: any) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "product" ? value : safeNum(value),
            }
          : item
      )
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  async function saveSale() {
    if (saving) return;

    setErrorMsg(null);

    try {
      if (!businessId) {
        throw new Error("Business not loaded yet. Please refresh the page.");
      }

      if (items.length === 0) {
        throw new Error("Add at least one item first.");
      }

      const cleanItems = items.map((item) => ({
        ...item,
        product: item.product.trim(),
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
      }));

      const emptyProduct = cleanItems.find((item) => !item.product);
      if (emptyProduct) {
        throw new Error("Every sale item must have a product name.");
      }

      const invalidQty = cleanItems.find((item) => item.quantity <= 0);
      if (invalidQty) {
        throw new Error("Quantity must be more than 0.");
      }

      const invalidPrice = cleanItems.find((item) => item.price < 0);
      if (invalidPrice) {
        throw new Error("Price cannot be negative.");
      }

      setSaving(true);

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          business_id: businessId,
          customer_name: customer.trim() || null,
          payment_type: paymentType,
          total_amount: total,
        })
        .select("id")
        .single();

      if (saleError) throw saleError;

      const saleItems = cleanItems.map((item) => ({
        sale_id: sale.id,
        product_name: item.product,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.quantity * item.price,
      }));

      const { error: itemError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemError) throw itemError;

      alert("Sale saved successfully.");

      setItems([]);
      setCustomer("");
      setPaymentType("cash");
    } catch (err: any) {
      console.error("Counter sale save error:", err.message);
      setErrorMsg(err.message || "Could not save sale.");
    } finally {
      setSaving(false);
    }
  }

  if (pageLoading) {
    return <div style={{ padding: 32 }}>Loading counter sales...</div>;
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>💰 Counter Sales</h1>
          <p style={subtitleStyle}>
            {businessName} – gas, pipes, appliances and counter items.
          </p>
        </div>

        <button
          onClick={() => navigate("/gas/clerk")}
          style={secondaryButtonStyle}
        >
          Back to Clerk Dashboard
        </button>
      </header>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Sale Details</h2>

        <div style={topGridStyle}>
          <label style={labelStyle}>
            Customer Name
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Payment Type
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              style={inputStyle}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="account">Account</option>
            </select>
          </label>

          <div style={totalBoxStyle}>
            <div style={totalLabelStyle}>Sale Total</div>
            <div style={totalValueStyle}>{money(total)}</div>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={itemsHeaderStyle}>
          <h2 style={sectionTitleStyle}>Items</h2>

          <button onClick={addItem} style={addButtonStyle}>
            Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div style={emptyStyle}>
            No items added yet. Click “Add Item” to start a counter sale.
          </div>
        ) : (
          <div style={tableWrapStyle}>
            <div style={tableHeaderStyle}>
              <div>Product</div>
              <div>Qty</div>
              <div>Price</div>
              <div>Total</div>
              <div></div>
            </div>

            {items.map((item) => {
              const lineTotal = item.quantity * item.price;

              return (
                <div key={item.id} style={tableRowStyle}>
                  <input
                    value={item.product}
                    onChange={(e) =>
                      updateItem(item.id, "product", e.target.value)
                    }
                    placeholder="Product name"
                    style={inputStyle}
                  />

                  <input
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", e.target.value)
                    }
                    style={inputStyle}
                  />

                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(item.id, "price", e.target.value)
                    }
                    style={inputStyle}
                  />

                  <div style={lineTotalStyle}>{money(lineTotal)}</div>

                  <button
                    onClick={() => removeItem(item.id)}
                    style={removeButtonStyle}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <button
        onClick={saveSale}
        disabled={saving}
        style={completeButtonStyle}
      >
        {saving ? "Saving..." : "Complete Sale"}
      </button>
    </div>
  );
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

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 20,
  background: "#fff",
  marginBottom: 18,
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 16,
};

const topGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
  alignItems: "end",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 800,
  fontSize: 13,
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const totalBoxStyle: CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const totalLabelStyle: CSSProperties = {
  color: "#666",
  fontSize: 13,
  fontWeight: 800,
};

const totalValueStyle: CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  marginTop: 4,
};

const itemsHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const addButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const tableWrapStyle: CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  overflowX: "auto",
};

const tableHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr 90px",
  gap: 10,
  padding: 10,
  fontWeight: 900,
  borderBottom: "1px solid #eee",
  background: "#f7f7f7",
  minWidth: 780,
};

const tableRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr 90px",
  gap: 10,
  padding: 10,
  borderBottom: "1px solid #f0f0f0",
  alignItems: "center",
  minWidth: 780,
};

const lineTotalStyle: CSSProperties = {
  fontWeight: 900,
};

const removeButtonStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const completeButtonStyle: CSSProperties = {
  marginTop: 4,
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

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
  color: "#666",
  fontWeight: 700,
};