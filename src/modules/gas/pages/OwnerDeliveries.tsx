// src/modules/gas/pages/OwnerDeliveries.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type Order = {
  id: string;
  business_id: string;
  business_date: string;
  gas_cylinder: string | null;
  quantity: number | null;
  total_price: number | null;
  status: string | null;
};

type GroupedDay = {
  deliveries: number;
  kg: number;
  revenue: number;
  sizes: Record<string, number>;
};

export default function OwnerDeliveries() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const statusFilter = searchParams.get("status");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = getCurrentMonthLabel();

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

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

  async function loadOrders() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const businessId = await getBusinessId();

      let query = supabase
        .from("orders")
        .select(
          "id, business_id, business_date, gas_cylinder, quantity, total_price, status"
        )
        .eq("business_id", businessId);

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("business_date", {
        ascending: false,
      });

      if (error) throw error;

      setOrders((data || []) as Order[]);
    } catch (err: any) {
      console.error("OwnerDeliveries load error:", err.message);
      setErrorMsg(err.message || "Could not load delivery report.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const currentMonthOrders = useMemo(() => {
    return orders.filter(
      (order) => getMonthKey(order.business_date) === currentMonthKey
    );
  }, [orders, currentMonthKey]);

  const historyOrders = useMemo(() => {
    return orders.filter(
      (order) => getMonthKey(order.business_date) !== currentMonthKey
    );
  }, [orders, currentMonthKey]);

  const currentGrouped = useMemo(() => {
    return groupOrdersByDate(currentMonthOrders);
  }, [currentMonthOrders]);

  const historyGrouped = useMemo(() => {
    return groupOrdersByDate(historyOrders);
  }, [historyOrders]);

  const currentTotalDeliveries = currentMonthOrders.length;

  const currentTotalKg = currentMonthOrders.reduce((sum, order) => {
    const sizeKg = getCylinderKg(order.gas_cylinder || "");
    const qty = Number(order.quantity || 0);
    return sum + sizeKg * qty;
  }, 0);

  const currentTotalRevenue = currentMonthOrders.reduce(
    (sum, order) => sum + Number(order.total_price || 0),
    0
  );

  const currentGroupedEntries = Object.entries(currentGrouped);
  const historyGroupedEntries = Object.entries(historyGrouped);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🚚 Delivery Sales Report</h1>
          <p style={subtitleStyle}>
            Current month delivery performance from Clerk orders.
          </p>

          <div style={monthBadgeStyle}>
            Current Month: <b>{currentMonthLabel}</b>
          </div>

          {statusFilter && (
            <div style={filterBadgeStyle}>
              Showing status: <b>{formatStatus(statusFilter)}</b>
            </div>
          )}
        </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas")} style={secondaryButtonStyle}>
            Back to Dashboard
          </button>

          <button
            onClick={() => navigate("/gas/deliveries")}
            style={secondaryButtonStyle}
          >
            Show All Statuses
          </button>

          <button onClick={loadOrders} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      {/* CURRENT MONTH SUMMARY */}
      <div style={summaryStripStyle}>
        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Deliveries This Month</div>
          <div style={summaryNumberStyle}>{currentTotalDeliveries}</div>
        </div>

        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Gas Sold This Month</div>
          <div style={summaryNumberStyle}>{currentTotalKg} kg</div>
        </div>

        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Revenue This Month</div>
          <div style={summaryNumberStyle}>
            {formatMoney(currentTotalRevenue)}
          </div>
        </div>
      </div>

      {loading && <p style={infoStyle}>Loading delivery report...</p>}

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      {!loading && !errorMsg && (
        <>
          <section style={{ marginBottom: 30 }}>
            <h2 style={sectionTitleStyle}>This Month’s Orders</h2>

            {currentGroupedEntries.length === 0 && (
              <div style={emptyStyle}>
                No orders found for the current month.
              </div>
            )}

            {currentGroupedEntries.map(([date, data]) => (
              <DeliveryDayCard key={date} date={date} data={data} />
            ))}
          </section>

          <section style={historySectionStyle}>
            <div style={historyHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Previous Months</h2>
                <p style={historyTextStyle}>
                  Older delivery history is hidden to keep the page clean.
                </p>
              </div>

              <button
                onClick={() => setShowHistory((prev) => !prev)}
                style={historyButtonStyle}
              >
                {showHistory ? "Hide History" : "Show Previous Months"}
              </button>
            </div>

            {showHistory && historyGroupedEntries.length === 0 && (
              <div style={emptyStyle}>
                No previous month history found.
              </div>
            )}

            {showHistory &&
              historyGroupedEntries.map(([date, data]) => (
                <DeliveryDayCard key={date} date={date} data={data} muted />
              ))}
          </section>
        </>
      )}
    </div>
  );
}

/* ================= COMPONENT ================= */

function DeliveryDayCard({
  date,
  data,
  muted = false,
}: {
  date: string;
  data: GroupedDay;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        ...dayCardStyle,
        opacity: muted ? 0.88 : 1,
      }}
    >
      <div style={dateStyle}>{formatDate(date)}</div>
      <div style={smallTextStyle}>Daily delivery summary</div>

      <div style={dayStatsStyle}>
        <div style={miniStatStyle}>
          Deliveries
          <br />
          <b>{data.deliveries}</b>
        </div>

        <div style={miniStatStyle}>
          Gas Sold
          <br />
          <b>{data.kg} kg</b>
        </div>

        <div style={miniStatStyle}>
          Revenue
          <br />
          <b>{formatMoney(data.revenue)}</b>
        </div>
      </div>

      <div style={breakdownStyle}>
        {Object.entries(data.sizes).map(([size, qty]) => {
          const kg = getCylinderKg(size) * qty;

          return (
            <span key={size} style={sizePillStyle}>
              {size} × {qty} = {kg}kg
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function groupOrdersByDate(orders: Order[]) {
  return orders.reduce<Record<string, GroupedDay>>((acc, order) => {
    const date = formatDateOnly(order.business_date);

    if (!acc[date]) {
      acc[date] = {
        deliveries: 0,
        kg: 0,
        revenue: 0,
        sizes: {},
      };
    }

    const sizeLabel = order.gas_cylinder || "Unknown";
    const sizeKg = getCylinderKg(sizeLabel);
    const qty = Number(order.quantity || 0);
    const revenue = Number(order.total_price || 0);

    acc[date].deliveries += 1;
    acc[date].kg += sizeKg * qty;
    acc[date].revenue += revenue;

    if (!acc[date].sizes[sizeLabel]) {
      acc[date].sizes[sizeLabel] = 0;
    }

    acc[date].sizes[sizeLabel] += qty;

    return acc;
  }, {});
}

function getCylinderKg(value: string) {
  if (!value) return 0;

  const match = value.match(/\d+/);
  if (!match) return 0;

  return Number(match[0]) || 0;
}

function formatDateOnly(value: string) {
  if (!value) return "Unknown Date";
  return value.split("T")[0];
}

function getMonthKey(value: string) {
  if (!value) return "unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "unknown";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getCurrentMonthKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getCurrentMonthLabel() {
  const today = new Date();

  return today.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(value: string) {
  if (!value || value === "Unknown Date") return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatMoney(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

/* ================= STYLES ================= */

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
  fontSize: 30,
  fontWeight: 900,
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  color: "#666",
};

const monthBadgeStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  marginRight: 8,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#e8f5e9",
  color: "#1b5e20",
  fontSize: 13,
  fontWeight: 700,
};

const filterBadgeStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eef6ff",
  color: "#0d47a1",
  fontSize: 13,
  fontWeight: 700,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
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

const summaryStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 28,
};

const summaryBoxStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 13,
  color: "#666",
  fontWeight: 800,
};

const summaryNumberStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  marginTop: 5,
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 6,
};

const dayCardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const dateStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 4,
};

const smallTextStyle: CSSProperties = {
  fontSize: 13,
  color: "#777",
  marginBottom: 14,
};

const dayStatsStyle: CSSProperties = {
  display: "flex",
  gap: 40,
  flexWrap: "wrap",
  marginBottom: 14,
};

const miniStatStyle: CSSProperties = {
  fontSize: 14,
  minWidth: 110,
};

const breakdownStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  fontSize: 14,
};

const sizePillStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f1f1f1",
  fontWeight: 700,
};

const historySectionStyle: CSSProperties = {
  marginTop: 20,
  paddingTop: 20,
  borderTop: "1px solid #eee",
};

const historyHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 18,
};

const historyTextStyle: CSSProperties = {
  margin: 0,
  color: "#777",
  fontSize: 14,
};

const historyButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const infoStyle: CSSProperties = {
  color: "#666",
};

const errorStyle: CSSProperties = {
  marginTop: 20,
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