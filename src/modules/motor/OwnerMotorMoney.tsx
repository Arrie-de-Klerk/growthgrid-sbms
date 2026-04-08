import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

function startOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

export default function OwnerMotorMoney() {
  const [salesIncome, setSalesIncome] = useState(0);
  const [vehicleCost, setVehicleCost] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMoney();
  }, []);

  async function loadMoney() {
    setLoading(true);

    const monthStart = startOfMonthISO();

    /* =========================
       SALES INCOME (SOLD VEHICLES)
    ========================= */

    const { data: soldVehicles } = await supabase
      .from("motor_vehicles")
      .select("selling_price")
      .eq("status", "sold")
      .gte("sold_date", monthStart);

    const salesTotal =
      soldVehicles?.reduce(
        (sum, v: any) => sum + (v.selling_price || 0),
        0
      ) || 0;

    /* =========================
       VEHICLE COST (PURCHASE PRICE)
    ========================= */

    const { data: costVehicles } = await supabase
      .from("motor_vehicles")
      .select("purchase_price")
      .eq("status", "sold")
      .gte("sold_date", monthStart);

    const costTotal =
      costVehicles?.reduce(
        (sum, v: any) => sum + (v.purchase_price || 0),
        0
      ) || 0;

    /* =========================
       OTHER EXPENSES
    ========================= */

    const { data: expenseData } = await supabase
      .from("motor_expenses")
      .select("amount")
      .gte("expense_date", monthStart);

    const expenseTotal =
      expenseData?.reduce(
        (sum, e: any) => sum + (e.amount || 0),
        0
      ) || 0;

    setSalesIncome(salesTotal);
    setVehicleCost(costTotal);
    setExpenses(expenseTotal);

    setLoading(false);
  }

  const grossProfit = salesIncome - vehicleCost;
  const netProfit = grossProfit - expenses;

  function money(n: number) {
    return "R " + n.toLocaleString(undefined, { minimumFractionDigits: 2 });
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>
        💰 Motor Income Statement
      </h1>
      <p style={{ color: "#666", marginBottom: 30 }}>
        Month-to-date financial overview.
      </p>

      {/* SALES */}
      <section style={card}>
        <h3>🚗 Sales</h3>
        <p>Total Sales: {money(salesIncome)}</p>
        <p>Vehicle Cost: {money(vehicleCost)}</p>
        <p style={bold}>GROSS PROFIT: {money(grossProfit)}</p>
      </section>

      {/* EXPENSES */}
      <section style={card}>
        <h3>🔧 Expenses</h3>
        <p>Repairs & Reconditioning: {money(expenses)}</p>
        <p style={bold}>TOTAL EXPENSES: {money(expenses)}</p>
      </section>

      {/* NET */}
      <section
        style={{
          ...card,
          background: netProfit >= 0 ? "#e8f5e9" : "#ffebee",
        }}
      >
        <h2 style={{ fontWeight: 900 }}>
          NET PROFIT: {money(netProfit)}
        </h2>
      </section>
    </div>
  );
}

const card = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  background: "#fff",
};

const bold = {
  fontWeight: 900,
  marginTop: 10,
};