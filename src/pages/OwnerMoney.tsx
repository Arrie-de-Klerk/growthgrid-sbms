// src/pages/OwnerMoney.tsx

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function startOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

export default function OwnerMoney() {
  const [gasIncome, setGasIncome] = useState(0);
  const [installIncome, setInstallIncome] = useState(0);
  const [counterSalesIncome, setCounterSalesIncome] = useState(0);
  const [transportExpense, setTransportExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMoney();
  }, []);

  async function loadMoney() {
    setLoading(true);

    const monthStart = startOfMonthISO();

    /* =========================
       GAS INCOME
    ========================= */

    const { data: gasData } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("status", "completed")
      .gte("business_date", monthStart);

    const gasTotal =
      gasData?.reduce((sum, o: any) => sum + (o.total_amount || 0), 0) || 0;

      /* =========================
       INSTALLATION INCOME
       ========================= */

    const { data: installData } = await supabase
      .from("installations")
      .select("total_amount")
      .eq("status", "completed")
      .gte("completed_date", monthStart);

    const installTotal =
      installData?.reduce((sum, i: any) => sum + (i.total_amount || 0), 0) || 0;

      /* =========================
         COUNTER SALES INCOME
        ========================= */

    const { data: salesItems } = await supabase
      .from("sale_items")
      .select("total_price, sales!inner(sale_date)")
      .gte("sales.sale_date", monthStart);

    const counterTotal =
      salesItems?.reduce((sum, s: any) => sum + (s.total_price || 0), 0) || 0;

    /* =========================
       TRANSPORT EXPENSE
    ========================= */

    const { data: transportData } = await supabase
      .from("vehicle_expenses")
      .select("cost")
      .gte("expense_date", monthStart);

    const transportTotal =
      transportData?.reduce((sum, t: any) => sum + (t.cost || 0), 0) || 0;

    setGasIncome(gasTotal);
    setInstallIncome(installTotal);
    setCounterSalesIncome(counterTotal);
    setTransportExpense(transportTotal);

    setLoading(false);
  }

  const totalIncome = gasIncome + installIncome + counterSalesIncome;
  const totalExpenses = transportExpense;
  const netProfit = totalIncome - totalExpenses;

  function money(n: number) {
     return "R " + n.toLocaleString(undefined, { minimumFractionDigits: 2 });
  }

     if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>
        💰 Monthly Income Statement
      </h1>
      <p style={{ color: "#666", marginBottom: 30 }}>
        Month-to-date financial overview.
      </p>

      <section style={cardStyle}>
       <h3>📈 Income</h3>
       <p>Gas Sales: {money(gasIncome)}</p>
       <p>Counter Sales: {money(counterSalesIncome)}</p>
       <p>Installations: {money(installIncome)}</p>
       <p style={boldLine}>
          TOTAL INCOME: {money(totalIncome)}
       </p>
      </section>

      <section style={cardStyle}>
       <h3>📉 Expenses</h3>
       <p>Transport: {money(transportExpense)}</p>
       <p style={boldLine}>
          TOTAL EXPENSES: {money(totalExpenses)}
       </p>
      </section>

      <section style={{ ...cardStyle, background: netProfit >= 0 ? "#e8f5e9" : "#ffebee" }}>
        <h2 style={{ fontWeight: 900 }}>
           NET PROFIT: {money(netProfit)}
        </h2>
      </section>
    </div>
  );
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  background: "#fff",
};

const boldLine = {
  fontWeight: 900,
  marginTop: 10,
};
