// src/modules/gas/pages/OwnerMoney.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type MoneyState = {
  gasIncome: number;
  installIncome: number;
  counterSalesIncome: number;
  transportExpense: number;
};

const emptyMoney: MoneyState = {
  gasIncome: 0,
  installIncome: 0,
  counterSalesIncome: 0,
  transportExpense: 0,
};

export default function OwnerMoney() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Gas Business");

  const [moneyData, setMoneyData] = useState<MoneyState>(emptyMoney);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthInputValue());

  const monthStart = getMonthStartISO(selectedMonth);
  const monthEnd = getNextMonthStartISO(selectedMonth);
  const currentMonthLabel = getMonthLabel(selectedMonth);
  const monthFileLabel = selectedMonth;

  useEffect(() => {
  loadMoney();
  }, [selectedMonth]);

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

  async function loadMoney() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const activeBusinessId = await getBusinessId();
      setBusinessId(activeBusinessId);

      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", activeBusinessId)
        .maybeSingle();

      setBusinessName(
        business?.name ||
          business?.business_name ||
          business?.company_name ||
          "Gas Business"
      );

      const { data: gasData, error: gasError } = await supabase
        .from("orders")
        .select("quantity, unit_price, total_price, business_date, status, business_id")
        .eq("business_id", activeBusinessId)
        .eq("status", "completed")
        .gte("business_date", monthStart)
        .lt("business_date", monthEnd)

      if (gasError) throw gasError;

      const gasTotal =
        gasData?.reduce((sum: number, order: any) => {
          const totalPrice = Number(order.total_price || 0);
          if (totalPrice > 0) return sum + totalPrice;

          return sum + Number(order.quantity || 0) * Number(order.unit_price || 0);
        }, 0) || 0;

      const { data: installData, error: installError } = await supabase
        .from("installations")
        .select("quoted_amount, created_at, status, business_id")
        .eq("business_id", activeBusinessId)
        .eq("status", "completed")
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      if (installError) throw installError;

      const installTotal =
        installData?.reduce(
          (sum: number, item: any) => sum + Number(item.quoted_amount || 0),
          0
        ) || 0;

      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("id, created_at, business_id")
        .eq("business_id", activeBusinessId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      if (salesError) throw salesError;

      let counterTotal = 0;

      if (sales && sales.length > 0) {
        const saleIds = sales.map((sale: any) => sale.id);

        const { data: items, error: itemsError } = await supabase
          .from("sale_items")
          .select("total_price")
          .in("sale_id", saleIds);

        if (itemsError) throw itemsError;

        counterTotal =
          items?.reduce(
            (sum: number, item: any) => sum + Number(item.total_price || 0),
            0
          ) || 0;
      }

      const { data: vehicles, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id")
        .eq("business_id", activeBusinessId);

      if (vehicleError) throw vehicleError;

      let transportTotal = 0;

      const vehicleIds = vehicles?.map((v: any) => v.id) || [];

      if (vehicleIds.length > 0) {

        // 1. Maintenance / repairs / service expenses
        const { data: transportExpenses, error: transportExpenseError } =
          await supabase
            .from("vehicle_expenses")
            .select("cost, expense_date, created_at, vehicle_id")
            .in("vehicle_id", vehicleIds)
            .gte("expense_date", monthStart)
            .lt("expense_date", monthEnd);

        if (transportExpenseError) throw transportExpenseError;

        const maintenanceTotal =
          transportExpenses?.reduce(
            (sum: number, item: any) => sum + Number(item.cost || 0),
            0
          ) || 0;

        // 2. Fuel costs from daily vehicle logs
        const { data: vehicleLogs, error: vehicleLogsError } = await supabase
          .from("vehicle_logs")
          .select("fuel_amount, created_at, vehicle_id")
          .in("vehicle_id", vehicleIds)
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);

        if (vehicleLogsError) throw vehicleLogsError;

        const fuelTotal =
          vehicleLogs?.reduce(
            (sum: number, log: any) => sum + Number(log.fuel_amount || 0),
            0
          ) || 0;

        transportTotal = maintenanceTotal + fuelTotal;
      }
      setMoneyData({
        gasIncome: gasTotal,
        installIncome: installTotal,
        counterSalesIncome: counterTotal,
        transportExpense: transportTotal,
      });
    } catch (err: any) {
      console.error("OwnerMoney load error:", err.message);
      setErrorMsg(err.message || "Could not load money page.");
      setMoneyData(emptyMoney);
    } finally {
      setLoading(false);
    }
  }

  async function requireBusinessId() {
    if (businessId) return businessId;

    const activeBusinessId = await getBusinessId();
    setBusinessId(activeBusinessId);
    return activeBusinessId;
  }

  async function exportCustomers() {
    setExporting("customers");
    setErrorMsg(null);

    try {
      const activeBusinessId = await requireBusinessId();

      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, name, phone, address_line_1, address_line_2, area, is_active, created_at"
        )
        .eq("business_id", activeBusinessId)
        .order("name", { ascending: true });

      if (error) throw error;

      const rows = (data || []).map((c: any) => ({
        "Customer ID": c.id,
        "Customer Name": c.name || "",
        Phone: c.phone || "",
        "Address Line 1": c.address_line_1 || "",
        "Address Line 2": c.address_line_2 || "",
        Area: c.area || "",
        Active: c.is_active ? "Yes" : "No",
        "Created Date": formatDateForCSV(c.created_at),
      }));

      downloadCSV(`${safeFileName(businessName)}_customers_${monthFileLabel}.csv`, rows, [
        "Customer ID",
        "Customer Name",
        "Phone",
        "Address Line 1",
        "Address Line 2",
        "Area",
        "Active",
        "Created Date",
      ]);
    } catch (err: any) {
      console.error("Export customers error:", err.message);
      setErrorMsg(err.message || "Could not export customers.");
    } finally {
      setExporting(null);
    }
  }

  async function exportOrders() {
  setExporting("orders");
  setErrorMsg(null);

  try {
    const activeBusinessId = await requireBusinessId();

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, business_date, customer_name, phone, area, gas_cylinder, quantity, unit_price, total_price, status"
      )
      .eq("business_id", activeBusinessId)
      .gte("business_date", monthStart)
      .lt("business_date", monthEnd)
      .order("business_date", { ascending: true });

    if (error) throw error;

    const rows = (data || []).map((o: any) => ({
      "Order ID": o.id,
      Date: formatDateForCSV(o.business_date),
      Customer: o.customer_name || "",
      Phone: o.phone || "",
      Area: o.area || "",
      "Cylinder Size": o.gas_cylinder || "",
      Quantity: Number(o.quantity || 0),
      "Unit Price": Number(o.unit_price || 0).toFixed(2),
      "Total Price": Number(o.total_price || 0).toFixed(2),
      Status: o.status || "",
    }));

    downloadCSV(
      `${safeFileName(businessName)}_orders_${monthFileLabel}.csv`,
      rows,
      [
        "Order ID",
        "Date",
        "Customer",
        "Phone",
        "Area",
        "Cylinder Size",
        "Quantity",
        "Unit Price",
        "Total Price",
        "Status",
      ]
    );
  } catch (err: any) {
    console.error("Export orders error:", err.message);
    setErrorMsg(err.message || "Could not export orders.");
  } finally {
    setExporting(null);
  }
}

  async function exportCounterSales() {
  setExporting("sales");
  setErrorMsg(null);

  try {
    const activeBusinessId = await requireBusinessId();

    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("id, customer_name, payment_type, total_amount, created_at")
      .eq("business_id", activeBusinessId)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd)
      .order("created_at", { ascending: true });
       if (salesError) throw salesError;

    const fallbackHeaders = [
      "Sale ID",
      "Date",
      "Customer",
      "Payment Type",
      "Product",
      "Quantity",
      "Unit Price",
      "Line Total",
    ];

    if (!sales || sales.length === 0) {
      downloadCSV(
        `${safeFileName(businessName)}_counter_sales_${monthFileLabel}.csv`,
        [],
        fallbackHeaders
      );
      return;
    }

    const saleIds = sales.map((s: any) => s.id);

    const { data: items, error: itemsError } = await supabase
      .from("sale_items")
      .select("sale_id, product_name, quantity, unit_price, total_price")
      .in("sale_id", saleIds);

    if (itemsError) throw itemsError;

    const rows: any[] = [];

    sales.forEach((sale: any) => {
      const saleItems = (items || []).filter(
        (item: any) => item.sale_id === sale.id
      );

      if (saleItems.length === 0) {
        rows.push({
          "Sale ID": sale.id,
          Date: formatDateForCSV(sale.created_at),
          Customer: sale.customer_name || "",
          "Payment Type": sale.payment_type || "",
          Product: "",
          Quantity: "",
          "Unit Price": "",
          "Line Total": Number(sale.total_amount || 0).toFixed(2),
        });
      } else {
        saleItems.forEach((item: any) => {
          rows.push({
            "Sale ID": sale.id,
            Date: formatDateForCSV(sale.created_at),
            Customer: sale.customer_name || "",
            "Payment Type": sale.payment_type || "",
            Product: item.product_name || "",
            Quantity: Number(item.quantity || 0),
            "Unit Price": Number(item.unit_price || 0).toFixed(2),
            "Line Total": Number(item.total_price || 0).toFixed(2),
          });
        });
      }
    });

    downloadCSV(
      `${safeFileName(businessName)}_counter_sales_${monthFileLabel}.csv`,
      rows,
      fallbackHeaders
    );
  } catch (err: any) {
    console.error("Export counter sales error:", err.message);
    setErrorMsg(err.message || "Could not export counter sales.");
  } finally {
    setExporting(null);
  }
}

  async function exportMoneySummary() {
    setExporting("summary");
    setErrorMsg(null);

    try {
      const totalIncome =
        moneyData.gasIncome + moneyData.installIncome + moneyData.counterSalesIncome;

      const totalExpenses = moneyData.transportExpense;
      const netProfit = totalIncome - totalExpenses;

      const rows = [
        {
          Business: businessName,
          Month: currentMonthLabel,
          "Gas Sales": moneyData.gasIncome.toFixed(2),
          "Counter Sales": moneyData.counterSalesIncome.toFixed(2),
          Installations: moneyData.installIncome.toFixed(2),
          "Total Income": totalIncome.toFixed(2),
          "Transport Expense": totalExpenses.toFixed(2),
          "Net Profit": netProfit.toFixed(2),
        },
      ];

      downloadCSV(
        `${safeFileName(businessName)}_money_summary_${monthFileLabel}.csv`,
        rows
      );
    } catch (err: any) {
      console.error("Export summary error:", err.message);
      setErrorMsg(err.message || "Could not export money summary.");
    } finally {
      setExporting(null);
    }
  }

  const totalIncome =
    moneyData.gasIncome + moneyData.installIncome + moneyData.counterSalesIncome;

  const totalExpenses = moneyData.transportExpense;
  const netProfit = totalIncome - totalExpenses;

  if (loading) {
    return <div style={{ padding: 40 }}>Loading money page...</div>;
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>💰 Monthly Income Statement</h1>
          <p style={subtitleStyle}>
            {businessName} – month-to-date financial overview.
          </p>
          </div>

          <div style={monthBadgeStyle}>
             Selected Month: <b>{currentMonthLabel}</b>
          </div>

          <div style={monthSelectorStyle}>
             <label style={monthLabelStyle}>Choose month</label>
             <input
               type="month"
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               style={monthInputStyle}
            />
          </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas")} style={secondaryButtonStyle}>
            Back to Dashboard
          </button>

          <button onClick={loadMoney} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </header>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      <section style={summaryGridStyle}>
        <SummaryBox label="Gas Sales" value={money(moneyData.gasIncome)} />
        <SummaryBox label="Counter Sales" value={money(moneyData.counterSalesIncome)} />
        <SummaryBox label="Installations" value={money(moneyData.installIncome)} />
        <SummaryBox label="Transport Expense" value={money(moneyData.transportExpense)} />
      </section>
      <section style={exportCardStyle}>
        <div>
          <h3 style={sectionTitleStyle}>📤 Export to Pastel / Sage</h3>
          <p style={exportTextStyle}>
              Download CSV files for the selected month. These can be checked by the
              bookkeeper and imported into Pastel/Sage.
          </p>
        </div>

        <div style={exportButtonGridStyle}>
          <button onClick={exportCustomers} disabled={!!exporting} style={exportButtonStyle}>
            {exporting === "customers" ? "Exporting..." : "Export Customers CSV"}
          </button>

          <button onClick={exportOrders} disabled={!!exporting} style={exportButtonStyle}>
            {exporting === "orders" ? "Exporting..." : "Export Orders CSV"}
          </button>

          <button onClick={exportCounterSales} disabled={!!exporting} style={exportButtonStyle}>
            {exporting === "sales" ? "Exporting..." : "Export Counter Sales CSV"}
          </button>

          <button onClick={exportMoneySummary} disabled={!!exporting} style={exportButtonStyle}>
            {exporting === "summary" ? "Exporting..." : "Export Money Summary CSV"}
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>📈 Income</h3>

        <MoneyLine label="Gas Sales" value={moneyData.gasIncome} />
        <MoneyLine label="Counter Sales" value={moneyData.counterSalesIncome} />
        <MoneyLine label="Installations" value={moneyData.installIncome} />

        <div style={totalLineStyle}>
          <span>TOTAL INCOME</span>
          <span>{money(totalIncome)}</span>
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={sectionTitleStyle}>📉 Expenses</h3>

        <MoneyLine label="Transport" value={moneyData.transportExpense} />

        <div style={totalLineStyle}>
          <span>TOTAL EXPENSES</span>
          <span>{money(totalExpenses)}</span>
        </div>
      </section>

      <section
        style={{
          ...netCardStyle,
          background: netProfit >= 0 ? "#e8f5e9" : "#ffebee",
          color: netProfit >= 0 ? "#1b5e20" : "#b71c1c",
        }}
      >
        <div style={netLabelStyle}>NET PROFIT</div>
        <div style={netValueStyle}>{money(netProfit)}</div>
      </section>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

function MoneyLine({ label, value }: { label: string; value: number }) {
  return (
    <div style={moneyLineStyle}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  );
}

/* ================= CSV HELPERS ================= */

function downloadCSV(
  filename: string,
  rows: Record<string, any>[],
  fallbackHeaders: string[] = []
) {
  const headers = rows && rows.length > 0 ? Object.keys(rows[0]) : fallbackHeaders;

  if (!headers || headers.length === 0) {
    const blob = new Blob(["No data found\n"], {
      type: "text/csv;charset=utf-8;",
    });

    triggerDownload(filename, blob);
    return;
  }

  const csvLines = [
    headers.join(","),
    ...(rows || []).map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ];

  const csvContent = csvLines.join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  triggerDownload(filename, blob);
}

function csvEscape(value: any) {
  const text = String(value ?? "");

  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/* ================= HELPERS ================= */

function getCurrentMonthInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthStartISO(monthValue: string) {
  return `${monthValue}-01`;
}

function getNextMonthStartISO(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");
  let year = Number(yearText);
  let month = Number(monthText) + 1;

  if (month === 13) {
    year += 1;
    month = 1;
  }

  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function getMonthLabel(monthValue: string) {
  const [yearText, monthText] = monthValue.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  return new Date(year, month - 1, 1).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
}

function formatDateForCSV(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function money(n: number) {
  return `R ${Number(n || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ================= STYLES ================= */

const monthSelectorStyle: CSSProperties = {
  marginTop: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const monthLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#555",
};

const monthInputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontWeight: 700,
};

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1100,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 28,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 900,
};

const subtitleStyle: CSSProperties = {
  color: "#666",
  marginTop: 6,
};

const monthBadgeStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#e8f5e9",
  color: "#1b5e20",
  fontSize: 13,
  fontWeight: 700,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const refreshButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginBottom: 24,
};

const summaryBoxStyle: CSSProperties = {
  padding: 18,
  borderRadius: 14,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const summaryLabelStyle: CSSProperties = {
  color: "#666",
  fontSize: 13,
  fontWeight: 800,
};

const summaryValueStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  marginTop: 5,
};

const exportCardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 22,
  marginBottom: 20,
  background: "#fffdf5",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const exportTextStyle: CSSProperties = {
  color: "#666",
  marginTop: 0,
  marginBottom: 16,
};

const exportButtonGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const exportButtonStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #ccc",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
};

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  padding: 22,
  marginBottom: 20,
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 14,
};

const moneyLineStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  padding: "10px 0",
  borderBottom: "1px solid #f0f0f0",
};

const totalLineStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  marginTop: 14,
  paddingTop: 14,
  borderTop: "2px solid #111",
  fontWeight: 900,
  fontSize: 18,
};

const netCardStyle: CSSProperties = {
  borderRadius: 16,
  padding: 24,
  marginTop: 24,
  border: "1px solid #ddd",
};

const netLabelStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
};

const netValueStyle: CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  marginTop: 6,
};

const errorStyle: CSSProperties = {
  marginBottom: 20,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 800,
};