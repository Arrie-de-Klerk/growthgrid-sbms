// src/modules/gas/pages/OwnerCylinderMovement.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";

type OrderRow = {
  id: string;
  business_id: string;
  business_date: string;
  gas_cylinder: string | null;
  quantity: number | null;
  status: string | null;
};

type OpeningStock = Record<string, number>;

type MoveRow = {
  date: string;
  fullOut: number;
  emptyIn: number;
};

const cylinderOrder = ["9kg", "12kg", "14kg", "19kg", "48kg"];

function getDefaultOpeningStock(): OpeningStock {
  return {
    "9kg": 500,
    "12kg": 500,
    "14kg": 500,
    "19kg": 500,
    "48kg": 500,
  };
}

export default function OwnerCylinderMovement() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [openingStock, setOpeningStock] = useState<OpeningStock>(
    getDefaultOpeningStock()
  );
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!businessId) return;

    localStorage.setItem(
      getOpeningStockKey(businessId),
      JSON.stringify(openingStock)
    );
  }, [openingStock, businessId]);

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

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const activeBusinessId = await getBusinessId();
      setBusinessId(activeBusinessId);

      setOpeningStock(loadOpeningStock(activeBusinessId));

      const { data, error } = await supabase
        .from("orders")
        .select("id, business_id, business_date, gas_cylinder, quantity, status")
        .eq("business_id", activeBusinessId)
        .eq("status", "completed")
        .order("business_date", { ascending: true });

      if (error) throw error;

      setOrders((data || []) as OrderRow[]);
    } catch (err: any) {
      console.error("Cylinder movement load error:", err.message);
      setErrorMsg(err.message || "Could not load cylinder movements.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  const movementsBySize = useMemo(() => {
    const grouped: Record<string, Record<string, MoveRow>> = {};

    orders.forEach((order) => {
      const size = normalizeCylinderSize(order.gas_cylinder);
      if (!size) return;

      const qty = Number(order.quantity || 0);
      if (qty <= 0) return;

      const date = formatDateOnly(order.business_date);

      if (!grouped[size]) grouped[size] = {};

      if (!grouped[size][date]) {
        grouped[size][date] = {
          date,
          fullOut: 0,
          emptyIn: 0,
        };
      }

      grouped[size][date].fullOut += qty;
      grouped[size][date].emptyIn += qty;
    });

    const result: Record<string, MoveRow[]> = {};

    cylinderOrder.forEach((size) => {
      result[size] = Object.values(grouped[size] || {}).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    });

    return result;
  }, [orders]);

  const stockSummary = useMemo(() => {
    const summary: Record<
      string,
      {
        opening: number;
        fullOut: number;
        emptyIn: number;
        fullStock: number;
        totalCylinders: number;
      }
    > = {};

    cylinderOrder.forEach((size) => {
      const moves = movementsBySize[size] || [];
      const opening = openingStock[size] || 0;

      const fullOut = moves.reduce((sum, m) => sum + m.fullOut, 0);
      const emptyIn = moves.reduce((sum, m) => sum + m.emptyIn, 0);

      const fullStock = opening - fullOut;
      const totalCylinders = fullStock + emptyIn;

      summary[size] = {
        opening,
        fullOut,
        emptyIn,
        fullStock,
        totalCylinders,
      };
    });

    return summary;
  }, [movementsBySize, openingStock]);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Cylinder Movement Ledger</h1>
          <p style={subtitleStyle}>
            Tracks full cylinders out and empty cylinders back from completed Gas orders.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas")} style={secondaryButtonStyle}>
            Back to Dashboard
          </button>

          <button onClick={load} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      {loading && <p style={infoStyle}>Loading cylinder movements...</p>}

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      {!loading && !errorMsg && (
        <>
          {/* OPENING STOCK */}
          <section style={openingPanelStyle}>
            <h2 style={sectionTitleStyle}>Opening Stock</h2>
            <p style={smallTextStyle}>
              This is the starting full-cylinder stock for this business.
            </p>

            <div style={openingGridStyle}>
              {cylinderOrder.map((size) => (
                <label key={size} style={openingItemStyle}>
                  <span style={openingLabelStyle}>{size}</span>

                  <input
                    type="number"
                    min={0}
                    value={openingStock[size] ?? 0}
                    onChange={(e) =>
                      setOpeningStock({
                        ...openingStock,
                        [size]: Number(e.target.value),
                      })
                    }
                    style={inputStyle}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* STOCK STATUS */}
          <section style={statusPanelStyle}>
            <h2 style={sectionTitleStyle}>Cylinder Stock Status</h2>

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={headRowStyle}>
                    <th style={th}>Size</th>
                    <th style={th}>Opening Full</th>
                    <th style={th}>Full Out</th>
                    <th style={th}>Empty In</th>
                    <th style={th}>Full In Store</th>
                    <th style={th}>Total Cylinders</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {cylinderOrder.map((size) => {
                    const row = stockSummary[size];
                    const low = row.fullStock < 100;

                    return (
                      <tr key={size}>
                        <td style={tdStrong}>{size}</td>
                        <td style={td}>{row.opening}</td>
                        <td style={td}>{row.fullOut}</td>
                        <td style={td}>{row.emptyIn}</td>
                        <td style={td}>{row.fullStock}</td>
                        <td style={td}>{row.totalCylinders}</td>
                        <td style={td}>
                          <span
                            style={{
                              ...pillStyle,
                              background: low ? "#ffebee" : "#e8f5e9",
                              color: low ? "#b71c1c" : "#1b5e20",
                            }}
                          >
                            {low ? "LOW STOCK" : "OK"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* LEDGER TABLES */}
          <section style={{ marginTop: 36 }}>
            <h2 style={sectionTitleStyle}>Movement Ledger</h2>

            {orders.length === 0 && (
              <div style={emptyStyle}>
                No completed orders found yet. Cylinder movements will appear here once orders are completed.
              </div>
            )}

            {cylinderOrder.map((size) => {
              const moves = movementsBySize[size] || [];
              if (moves.length === 0) return null;

              let fullStock = openingStock[size] || 0;
              let emptyStock = 0;

              return (
                <div key={size} style={ledgerBlockStyle}>
                  <h3 style={ledgerTitleStyle}>{size} Cylinders</h3>

                  <div style={tableWrapStyle}>
                    <table style={ledgerTableStyle}>
                      <thead>
                        <tr style={headRowStyle}>
                          <th style={th}>Date</th>
                          <th style={th}>Opening</th>
                          <th style={th}>Full Out</th>
                          <th style={th}>Empty In</th>
                          <th style={th}>Full In Store</th>
                          <th style={th}>Total Cylinders</th>
                        </tr>
                      </thead>

                      <tbody>
                        {moves.map((move, index) => {
                          const opening = fullStock;

                          fullStock = fullStock - move.fullOut;
                          emptyStock = emptyStock + move.emptyIn;

                          const total = fullStock + emptyStock;

                          return (
                            <tr key={`${size}-${move.date}-${index}`}>
                              <td style={td}>{formatDate(move.date)}</td>
                              <td style={td}>{opening}</td>
                              <td style={td}>{move.fullOut}</td>
                              <td style={td}>{move.emptyIn}</td>
                              <td style={td}>{fullStock}</td>
                              <td style={td}>{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

/* ================= HELPERS ================= */

function getOpeningStockKey(businessId: string) {
  return `gas_opening_stock_${businessId}`;
}

function loadOpeningStock(businessId: string): OpeningStock {
  const saved = localStorage.getItem(getOpeningStockKey(businessId));

  if (!saved) return getDefaultOpeningStock();

  try {
    return {
      ...getDefaultOpeningStock(),
      ...JSON.parse(saved),
    };
  } catch {
    return getDefaultOpeningStock();
  }
}

function normalizeCylinderSize(value: string | null) {
  if (!value) return null;

  const cleaned = value.toLowerCase().replace(/\s/g, "");

  if (cleaned.includes("9kg")) return "9kg";
  if (cleaned.includes("12kg")) return "12kg";
  if (cleaned.includes("14kg")) return "14kg";
  if (cleaned.includes("19kg")) return "19kg";
  if (cleaned.includes("48kg")) return "48kg";

  return null;
}

function formatDateOnly(value: string) {
  if (!value) return "-";
  return value.split("T")[0];
}

function formatDate(value: string) {
  if (!value || value === "-") return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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
  alignItems: "center",
  gap: 16,
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

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 10,
};

const smallTextStyle: CSSProperties = {
  color: "#666",
  marginTop: 0,
};

const openingPanelStyle: CSSProperties = {
  background: "#fff8e1",
  padding: 20,
  borderRadius: 12,
  marginBottom: 28,
  border: "1px solid #ffe0a3",
};

const openingGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
  marginTop: 16,
};

const openingItemStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const openingLabelStyle: CSSProperties = {
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  width: "100%",
};

const statusPanelStyle: CSSProperties = {
  background: "#f7f7f7",
  padding: 20,
  borderRadius: 12,
  marginBottom: 30,
  border: "1px solid #e0e0e0",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  borderRadius: 12,
  border: "1px solid #eee",
  background: "#fff",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const ledgerTableStyle: CSSProperties = {
  width: "100%",
  minWidth: 780,
  borderCollapse: "collapse",
  fontSize: 14,
};

const headRowStyle: CSSProperties = {
  background: "#f5f5f5",
};

const th: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #ddd",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #eee",
  textAlign: "center",
  whiteSpace: "nowrap",
};

const tdStrong: CSSProperties = {
  ...td,
  fontWeight: 900,
};

const pillStyle: CSSProperties = {
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
};

const ledgerBlockStyle: CSSProperties = {
  marginBottom: 36,
};

const ledgerTitleStyle: CSSProperties = {
  marginBottom: 12,
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