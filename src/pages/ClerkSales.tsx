import { useState } from "react";
import { supabase } from "../lib/supabase";

type SaleItem = {
  id: string;
  product: string;
  quantity: number;
  price: number;
};

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return `R ${n.toFixed(2)}`;
}

export default function ClerkSales() {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [saving, setSaving] = useState(false);

  function addItem() {
    setItems((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        product: "",
        quantity: 1,
        price: 0,
      },
    ]);
  }

  function updateItem(id: string, field: keyof SaleItem, value: any) {
    setItems((p) =>
      p.map((i) =>
        i.id === id ? { ...i, [field]: field === "product" ? value : safeNum(value) } : i
      )
    );
  }

  function removeItem(id: string) {
    setItems((p) => p.filter((x) => x.id !== id));
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.price, 0);

  async function saveSale() {
    if (items.length === 0) {
      alert("Add items first");
      return;
    }

    setSaving(true);

    try {
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          customer_name: customer || null,
          payment_type: paymentType,
          total_amount: total,
        })
        .select()
        .single();

      if (saleErr) throw saleErr;

      const saleItems = items.map((i) => ({
        sale_id: sale.id,
        product_name: i.product,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: i.quantity * i.price,
      }));

      const { error: itemErr } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemErr) throw itemErr;

      alert("Sale saved!");

      setItems([]);
      setCustomer("");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 30, maxWidth: 900, margin: "0 auto" }}>
      <h1>Clerk Counter Sales</h1>

      <div style={{ marginBottom: 20 }}>
        <label>Customer Name</label>
        <input
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>Payment Type</label>
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="account">Account</option>
        </select>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
            gap: 10,
            padding: 10,
            fontWeight: 700,
            borderBottom: "1px solid #eee",
          }}
        >
          <div>Product</div>
          <div>Qty</div>
          <div>Price</div>
          <div>Total</div>
          <div></div>
        </div>

        {items.map((i) => {
          const lineTotal = i.quantity * i.price;

          return (
            <div
              key={i.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                gap: 10,
                padding: 10,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <input
                value={i.product}
                onChange={(e) => updateItem(i.id, "product", e.target.value)}
              />

              <input
                type="number"
                value={i.quantity}
                onChange={(e) => updateItem(i.id, "quantity", e.target.value)}
              />

              <input
                type="number"
                value={i.price}
                onChange={(e) => updateItem(i.id, "price", e.target.value)}
              />

              <div>{money(lineTotal)}</div>

              <button onClick={() => removeItem(i.id)}>Remove</button>
            </div>
          );
        })}
      </div>

      <button onClick={addItem} style={{ marginTop: 15 }}>
        Add Item
      </button>

      <h2 style={{ marginTop: 20 }}>Total: {money(total)}</h2>

      <button
        onClick={saveSale}
        disabled={saving}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          background: "black",
          color: "white",
          borderRadius: 8,
        }}
      >
        {saving ? "Saving..." : "Complete Sale"}
      </button>
    </div>
  );
}