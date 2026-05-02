// src/modules/gas/pages/ClerkDeliveries.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type Status = "ordered" | "in_progress" | "completed";

type Order = {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string | null;
  phone: string | null;
  business_date: string;
  gas_cylinder: string | null;
  area: string | null;
  status: Status;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  quote_type: string | null;
  other_description: string | null;
};

export default function ClerkDeliveries() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get("status") as Status | null;

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Gas Business");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"today" | "all">("today");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [filter, statusFilter]);

  async function getBusinessId() {
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

    return profile.business_id as string;
  }

  async function loadOrders() {
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

      let query = supabase
        .from("orders")
        .select(
          `
          id,
          business_id,
          customer_id,
          customer_name,
          phone,
          business_date,
          gas_cylinder,
          area,
          status,
          quantity,
          unit_price,
          total_price,
          quote_type,
          other_description
          `
        )
        .eq("business_id", activeBusinessId)
        .order("business_date", { ascending: false })
        .order("area", { ascending: true });

      if (filter === "today") {
        query = query.eq("business_date", getTodayISO());
      }

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setOrders((data || []) as Order[]);
    } catch (err: any) {
      console.error("ClerkDeliveries load error:", err.message);
      setErrorMsg(err.message || "Could not load deliveries.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(order: Order, newStatus: Status) {
    if (!businessId) {
      alert("Business not loaded yet. Please refresh.");
      return;
    }

    if (order.status === "completed") return;

    setUpdatingId(order.id);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id)
      .eq("business_id", businessId);

    if (updateError) {
      console.error("Order update error:", updateError);
      alert(updateError.message);
      setUpdatingId(null);
      return;
    }

    if (newStatus === "completed") {
      await insertCylinderMovement(order, businessId);
    }

    setUpdatingId(null);
    await loadOrders();
  }

  async function insertCylinderMovement(order: Order, activeBusinessId: string) {
    if (!order.gas_cylinder) return;

    const qty = Number(order.quantity || 0);
    if (qty <= 0) return;

    const { data: existingMovement, error: existingError } = await supabase
      .from("cylinder_movements")
      .select("id")
      .eq("business_id", activeBusinessId)
      .eq("related_order_id", order.id)
      .maybeSingle();

    if (existingError) {
      console.error("Movement check error:", existingError);
      alert(existingError.message);
      return;
    }

    if (existingMovement?.id) {
      return;
    }

    const { data: sizeRow, error: sizeError } = await supabase
      .from("cylinder_sizes")
      .select("id")
      .eq("label", order.gas_cylinder)
      .maybeSingle();

    if (sizeError || !sizeRow?.id) {
      console.error("Cylinder size lookup failed:", sizeError);
      alert(`Cylinder size not found for "${order.gas_cylinder}".`);
      return;
    }

    const movementRow = {
      business_id: activeBusinessId,
      customer_id: order.customer_id,
      delivery_id: null,
      cylinder_size_id: sizeRow.id,

      full_out: qty,
      empty_in: qty,

      movement_type: "delivery_exchange",
      movement_date: new Date().toISOString(),
      related_order_id: order.id,
    };

    const { error: movementError } = await supabase
      .from("cylinder_movements")
      .insert([movementRow]);

    if (movementError) {
      console.error("Movement insert error:", movementError);
      alert(movementError.message);
    }
  }

  async function cycleStatus(order: Order) {
    let newStatus: Status = order.status;

    if (order.status === "ordered") newStatus = "in_progress";
    else if (order.status === "in_progress") newStatus = "completed";
    else return;

    await updateStatus(order, newStatus);
  }

  const grouped = useMemo(() => {
    return orders.reduce<Record<string, Order[]>>((acc, order) => {
      const dateKey = formatDateOnly(order.business_date);

      if (!acc[dateKey]) acc[dateKey] = [];

      acc[dateKey].push(order);

      return acc;
    }, {});
  }, [orders]);

  const summary = useMemo(() => {
    return {
      total: orders.length,
      ordered: orders.filter((o) => o.status === "ordered").length,
      inProgress: orders.filter((o) => o.status === "in_progress").length,
      completed: orders.filter((o) => o.status === "completed").length,
    };
  }, [orders]);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>📦 Delivery Log</h1>
          <p style={subtitleStyle}>
            {businessName} – update gas orders from ordered to delivered.
          </p>

          {statusFilter && (
            <div style={filterBadgeStyle}>
              Showing Status: <b>{formatStatus(statusFilter)}</b>
            </div>
          )}
        </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas/clerk")} style={secondaryButtonStyle}>
            Back to Clerk Dashboard
          </button>

          <button onClick={loadOrders} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </header>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      <section style={summaryGridStyle}>
        <SummaryBox label="Visible Orders" value={summary.total.toString()} />
        <SummaryBox label="Ordered" value={summary.ordered.toString()} />
        <SummaryBox label="In Progress" value={summary.inProgress.toString()} />
        <SummaryBox label="Completed" value={summary.completed.toString()} />
      </section>

      <section style={filterPanelStyle}>
        <button
          onClick={() => setFilter("today")}
          style={{
            ...filterButtonStyle,
            background: filter === "today" ? "#000" : "#fff",
            color: filter === "today" ? "#fff" : "#000",
          }}
        >
          Today
        </button>

        <button
          onClick={() => setFilter("all")}
          style={{
            ...filterButtonStyle,
            background: filter === "all" ? "#000" : "#fff",
            color: filter === "all" ? "#fff" : "#000",
          }}
        >
          All
        </button>

        <button
          onClick={() => setSearchParams({})}
          style={{
            ...filterButtonStyle,
            background: !statusFilter ? "#e8f5e9" : "#fff",
            color: "#111",
          }}
        >
          All Statuses
        </button>

        <button
          onClick={() => setSearchParams({ status: "ordered" })}
          style={filterButtonStyle}
        >
          Ordered
        </button>

        <button
          onClick={() => setSearchParams({ status: "in_progress" })}
          style={filterButtonStyle}
        >
          In Progress
        </button>

        <button
          onClick={() => setSearchParams({ status: "completed" })}
          style={filterButtonStyle}
        >
          Completed
        </button>
      </section>

      {loading && <p style={infoStyle}>Loading deliveries...</p>}

      {!loading && !errorMsg && Object.entries(grouped).length === 0 && (
        <div style={emptyStyle}>
          No deliveries found for this view.
        </div>
      )}

      {!loading &&
        !errorMsg &&
        Object.entries(grouped).map(([date, dateOrders]) => (
          <div key={date} style={dateBlockStyle}>
            <h3 style={dateTitleStyle}>📅 {formatDate(date)}</h3>

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={headRowStyle}>
                    <th style={th}>Name</th>
                    <th style={th}>Phone</th>
                    <th style={th}>Date</th>
                    <th style={th}>Gas</th>
                    <th style={th}>Installation</th>
                    <th style={th}>Area</th>
                    <th style={th}>Amount</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {dateOrders.map((order) => {
                    const isUpdating = updatingId === order.id;

                    return (
                      <tr key={order.id} style={rowStyle}>
                        <td style={tdStrong}>
                          {order.customer_name || "Unknown Customer"}
                        </td>

                        <td style={td}>{order.phone || "-"}</td>

                        <td style={td}>{formatDate(order.business_date)}</td>

                        <td style={td}>
                          {order.gas_cylinder
                            ? `${order.gas_cylinder} × ${order.quantity ?? 1}`
                            : "-"}
                        </td>

                        <td style={td}>
                          {order.quote_type
                            ? order.quote_type
                            : !order.gas_cylinder
                            ? "Installation"
                            : "-"}
                        </td>

                        <td style={td}>{order.area || "-"}</td>

                        <td style={td}>{money(order.total_price || 0)}</td>

                        <td style={td}>
                          <button
                            onClick={() => cycleStatus(order)}
                            disabled={order.status === "completed" || isUpdating}
                            style={{
                              ...statusButtonStyle,
                              ...getStatusStyle(order.status),
                              cursor:
                                order.status === "completed" || isUpdating
                                  ? "default"
                                  : "pointer",
                            }}
                            title={
                              order.status === "ordered"
                                ? "Click to move to In Progress"
                                : order.status === "in_progress"
                                ? "Click to complete delivery"
                                : "Completed"
                            }
                          >
                            {isUpdating ? "Updating..." : formatStatus(order.status)}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
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

/* ================= HELPERS ================= */

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateOnly(value: string) {
  if (!value) return "Unknown Date";
  return value.split("T")[0];
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

function formatStatus(status: Status | string) {
  return status.replace(/_/g, " ").toUpperCase();
}

function money(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStatusStyle(status: Status): CSSProperties {
  if (status === "ordered") {
    return { background: "#fdecea", color: "#c62828" };
  }

  if (status === "in_progress") {
    return { background: "#fff4e5", color: "#ef6c00" };
  }

  return { background: "#edf7ed", color: "#2e7d32" };
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1200,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
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

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
  marginBottom: 20,
};

const summaryBoxStyle: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 13,
  color: "#666",
  fontWeight: 800,
};

const summaryValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  marginTop: 4,
};

const filterPanelStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 28,
};

const filterButtonStyle: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  cursor: "pointer",
  fontWeight: 700,
};

const dateBlockStyle: CSSProperties = {
  marginBottom: 40,
};

const dateTitleStyle: CSSProperties = {
  marginBottom: 14,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #eee",
  borderRadius: 12,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  background: "#fff",
};

const headRowStyle: CSSProperties = {
  textAlign: "left",
  background: "#f5f5f5",
};

const th: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const tdStrong: CSSProperties = {
  ...td,
  fontWeight: 800,
};

const rowStyle: CSSProperties = {
  borderBottom: "1px solid #eee",
};

const statusButtonStyle: CSSProperties = {
  padding: "6px 12px",
  borderRadius: 20,
  border: "none",
  fontWeight: 800,
  fontSize: 13,
};

const infoStyle: CSSProperties = {
  color: "#666",
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