import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";

type SoldDealRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  price: number | null;
  deposit: number | null;
  financier: string | null;
  status: string | null;
  date: string | null;
  created_at: string | null;
};

type VehicleRow = {
  id: string;
  make: string | null;
  model: string | null;
  vehicle_code: string | null;
  purchase_price: number | null;
  selling_price: number | null;
};

type ExpenseRow = {
  id: string;
  amount: number | null;
  expense_date: string | null;
  category: string | null;
  description: string | null;
};

type SoldDealView = {
  id: string;
  date: string | null;
  customer_name: string;
  vehicle_label: string;
  financier: string | null;
  sale_value: number;
  vehicle_cost: number;
  gross_profit: number;
  deposit: number;
};

function startOfMonthISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function formatMoney(n: number) {
  return "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

function getDealDateISO(row: { date: string | null; created_at: string | null }) {
  if (row.date) return row.date;
  if (row.created_at) return row.created_at.slice(0, 10);
  return null;
}

export default function OwnerMotorMoney() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [salesIncome, setSalesIncome] = useState(0);
  const [vehicleCost, setVehicleCost] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [depositTotal, setDepositTotal] = useState(0);

  const [soldDealsView, setSoldDealsView] = useState<SoldDealView[]>([]);

  useEffect(() => {
    void loadMoney();
  }, []);

  async function loadMoney() {
    setLoading(true);
    setErrorMsg(null);

    const monthStart = startOfMonthISO();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMsg("You are not logged in.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      setErrorMsg("No business linked to this user.");
      setLoading(false);
      return;
    }

    const bid = profile.business_id as string;
    setBusinessId(bid);

    const [{ data: dealsData, error: dealsError }, { data: expenseData, error: expenseError }] =
      await Promise.all([
        supabase
          .from("motor_deals")
          .select(`
            id,
            business_id,
            customer_id,
            customer_name,
            vehicle_id,
            vehicle_name,
            price,
            deposit,
            financier,
            status,
            date,
            created_at
          `)
          .eq("business_id", bid)
          .eq("status", "sold")
          .order("created_at", { ascending: false }),

        supabase
          .from("motor_expenses")
          .select("id, amount, expense_date, description")
          .eq("business_id", bid)
          .gte("expense_date", monthStart),
      ]);

    if (dealsError) {
      setErrorMsg(dealsError.message);
      setLoading(false);
      return;
    }

    if (expenseError) {
      setErrorMsg(expenseError.message);
      setLoading(false);
      return;
    }

    const soldDeals = ((dealsData as SoldDealRow[]) || []).filter((d) => {
      const dealDate = getDealDateISO(d);
      return !!dealDate && dealDate >= monthStart;
    });

    const vehicleIds = [...new Set(soldDeals.map((d) => d.vehicle_id).filter(Boolean))] as string[];

    let vehicleMap = new Map<string, VehicleRow>();

    if (vehicleIds.length > 0) {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("motor_vehicles")
        .select("id, make, model, vehicle_code, purchase_price, selling_price")
        .in("id", vehicleIds);

      if (vehicleError) {
        setErrorMsg(vehicleError.message);
        setLoading(false);
        return;
      }

      vehicleMap = new Map(
        ((vehicleData as VehicleRow[]) || []).map((v) => [v.id, v])
      );
    }

    const soldRows: SoldDealView[] = soldDeals.map((deal) => {
      const vehicle = deal.vehicle_id ? vehicleMap.get(deal.vehicle_id) : undefined;

      const vehicleLabel =
        deal.vehicle_name ||
        [vehicle?.vehicle_code, vehicle?.make, vehicle?.model].filter(Boolean).join(" — ") ||
        "—";

      const saleValue =
        deal.price ??
        vehicle?.selling_price ??
        0;

      const costValue =
        vehicle?.purchase_price ??
        0;

      const depositValue = deal.deposit ?? 0;

      return {
        id: deal.id,
        date: getDealDateISO(deal),
        customer_name: deal.customer_name || "—",
        vehicle_label: vehicleLabel,
        financier: deal.financier || null,
        sale_value: saleValue,
        vehicle_cost: costValue,
        gross_profit: saleValue - costValue,
        deposit: depositValue,
      };
    });

    const salesTotal = soldRows.reduce((sum, row) => sum + row.sale_value, 0);
    const costTotal = soldRows.reduce((sum, row) => sum + row.vehicle_cost, 0);
    const depositsTotal = soldRows.reduce((sum, row) => sum + row.deposit, 0);
    const expenseTotal =
      ((expenseData as ExpenseRow[]) || []).reduce(
        (sum, e) => sum + (e.amount || 0),
        0
      ) || 0;

    setSoldDealsView(soldRows);
    setSalesIncome(salesTotal);
    setVehicleCost(costTotal);
    setExpenses(expenseTotal);
    setDepositTotal(depositsTotal);

    setLoading(false);
  }

  const grossProfit = useMemo(() => salesIncome - vehicleCost, [salesIncome, vehicleCost]);
  const netProfit = useMemo(() => grossProfit - expenses, [grossProfit, expenses]);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading money page...</div>;
  }

  return (
    <div style={{ padding: 40, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <button onClick={() => navigate("/motor")} style={lightBtn}>
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/motor/deals")} style={lightBtn}>
            Open Deals
          </button>
          <button onClick={() => navigate("/motor/expenses")} style={darkBtn}>
            Open Expenses
          </button>
        </div>
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>
        💰 Motor Income Statement
      </h1>
      <p style={{ color: "#666", marginBottom: 26 }}>
        Month-to-date financial overview for your Motor business.
      </p>

      {errorMsg && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fff3f3",
            border: "1px solid #f0caca",
            color: "#9b1c1c",
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={summaryGrid}>
        <SummaryCard title="Sales Income" value={formatMoney(salesIncome)} />
        <SummaryCard title="Vehicle Cost" value={formatMoney(vehicleCost)} />
        <SummaryCard title="Gross Profit" value={formatMoney(grossProfit)} />
        <SummaryCard title="Expenses" value={formatMoney(expenses)} />
        <SummaryCard title="Deposits" value={formatMoney(depositTotal)} />
        <SummaryCard
          title="Net Profit"
          value={formatMoney(netProfit)}
          highlight={netProfit >= 0 ? "#e8f5e9" : "#ffebee"}
        />
      </div>

      <section style={card}>
        <h3 style={{ marginTop: 0 }}>Income Summary</h3>
        <p>Total Sales: {formatMoney(salesIncome)}</p>
        <p>Vehicle Cost: {formatMoney(vehicleCost)}</p>
        <p style={bold}>GROSS PROFIT: {formatMoney(grossProfit)}</p>
      </section>

      <section style={card}>
        <h3 style={{ marginTop: 0 }}>Expenses</h3>
        <p>Repairs & Reconditioning: {formatMoney(expenses)}</p>
        <p style={bold}>TOTAL EXPENSES: {formatMoney(expenses)}</p>
      </section>

      <section
        style={{
          ...card,
          background: netProfit >= 0 ? "#e8f5e9" : "#ffebee",
        }}
      >
        <h2 style={{ fontWeight: 900, margin: 0 }}>
          NET PROFIT: {formatMoney(netProfit)}
        </h2>
      </section>

      <section style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <h3 style={{ margin: 0 }}>Sold Deals This Month</h3>
            <p style={{ color: "#666", marginTop: 6 }}>
              Business linked: {businessId || "—"}
            </p>
          </div>
          <div style={{ fontWeight: 700 }}>
            Total Sold Deals: {soldDealsView.length}
          </div>
        </div>

        <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Customer</th>
                <th style={th}>Vehicle</th>
                <th style={th}>Financier</th>
                <th style={th}>Sale Value</th>
                <th style={th}>Vehicle Cost</th>
                <th style={th}>Gross</th>
              </tr>
            </thead>
            <tbody>
              {soldDealsView.length === 0 ? (
                <tr>
                  <td style={td} colSpan={7}>
                    No sold deals this month yet.
                  </td>
                </tr>
              ) : (
                soldDealsView.map((row) => (
                  <tr key={row.id}>
                    <td style={td}>{formatDate(row.date)}</td>
                    <td style={td}>{row.customer_name}</td>
                    <td style={td}>{row.vehicle_label}</td>
                    <td style={td}>{row.financier || "—"}</td>
                    <td style={td}>{formatMoney(row.sale_value)}</td>
                    <td style={td}>{formatMoney(row.vehicle_cost)}</td>
                    <td style={td}>{formatMoney(row.gross_profit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 18,
        background: highlight || "#fff",
      }}
    >
      <div style={{ color: "#666", fontSize: 13, marginBottom: 8 }}>{title}</div>
      <div style={{ fontWeight: 900, fontSize: 22 }}>{value}</div>
    </div>
  );
}

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 22,
};

const card: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  background: "#fff",
};

const bold: CSSProperties = {
  fontWeight: 900,
  marginTop: 10,
};

const th: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  background: "#f7f7f7",
};

const td: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eee",
};

const lightBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const darkBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};