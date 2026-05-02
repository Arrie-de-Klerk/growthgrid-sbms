// src/modules/gas/pages/OwnerVehicleOperations.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type VehicleLog = {
  id: string;
  business_id: string;
  vehicle_reg: string | null;
  driver_name: string | null;
  area: string | null;
  business_date: string;
  odometer_out: number | null;
  odometer_in: number | null;
  fuel_amount: number | null;
  fuel_liters: number | null;
};

type VehicleTotals = {
  trips: number;
  distance: number;
  fuelLiters: number;
  fuelAmount: number;
};

export default function OwnerVehicleOperations() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = getCurrentMonthLabel();

  useEffect(() => {
    loadLogs();
  }, []);

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

  async function loadLogs() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const businessId = await getBusinessId();

      const { data, error } = await supabase
        .from("vehicle_logs")
        .select(
          "id, business_id, vehicle_reg, driver_name, area, business_date, odometer_out, odometer_in, fuel_amount, fuel_liters"
        )
        .eq("business_id", businessId)
        .order("business_date", { ascending: false });

      if (error) throw error;

      const loadedLogs = (data || []) as VehicleLog[];

      setLogs(loadedLogs);

      const uniqueVehicles = Array.from(
        new Set(
          loadedLogs
            .map((log) => log.vehicle_reg || "Unknown Vehicle")
            .filter(Boolean)
        )
      );

      setVehicles(uniqueVehicles);
    } catch (err: any) {
      console.error("OwnerVehicleOperations load error:", err.message);
      setErrorMsg(err.message || "Could not load vehicle operations.");
      setLogs([]);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  const visibleLogs = useMemo(() => {
    if (selectedVehicle === "all") return logs;

    return logs.filter(
      (log) => (log.vehicle_reg || "Unknown Vehicle") === selectedVehicle
    );
  }, [logs, selectedVehicle]);

  const currentMonthLogs = useMemo(() => {
    return visibleLogs.filter(
      (log) => getMonthKey(log.business_date) === currentMonthKey
    );
  }, [visibleLogs, currentMonthKey]);

  const historyLogs = useMemo(() => {
    return visibleLogs.filter(
      (log) => getMonthKey(log.business_date) !== currentMonthKey
    );
  }, [visibleLogs, currentMonthKey]);

  const currentTotals = useMemo(() => {
    return calculateTotals(currentMonthLogs);
  }, [currentMonthLogs]);

  const currentGrouped = useMemo(() => {
    return groupLogsByVehicle(currentMonthLogs);
  }, [currentMonthLogs]);

  const historyGrouped = useMemo(() => {
    return groupLogsByVehicle(historyLogs);
  }, [historyLogs]);

  const currentGroupedEntries = Object.entries(currentGrouped);
  const historyGroupedEntries = Object.entries(historyGrouped);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🚚 Vehicle Operations</h1>
          <p style={subtitleStyle}>
            Current month vehicle movement, fuel usage and operating cost.
          </p>

          <div style={monthBadgeStyle}>
            Current Month: <b>{currentMonthLabel}</b>
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas")} style={secondaryButtonStyle}>
            Back to Dashboard
          </button>

          <button onClick={loadLogs} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      {/* CURRENT MONTH SUMMARY */}
      <div style={summaryStripStyle}>
        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Trips This Month</div>
          <div style={summaryNumberStyle}>{currentTotals.trips}</div>
        </div>

        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Distance This Month</div>
          <div style={summaryNumberStyle}>{currentTotals.distance} km</div>
        </div>

        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Fuel This Month</div>
          <div style={summaryNumberStyle}>
            {currentTotals.fuelLiters.toFixed(2)} L
          </div>
        </div>

        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Fuel Cost This Month</div>
          <div style={summaryNumberStyle}>
            {formatMoney(currentTotals.fuelAmount)}
          </div>
        </div>
      </div>

      {/* VEHICLE FILTER */}
      <div style={filterPanelStyle}>
        <label style={filterLabelStyle}>Filter Vehicle:</label>

        <select
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Vehicles</option>

          {vehicles.map((vehicle) => (
            <option key={vehicle} value={vehicle}>
              {vehicle}
            </option>
          ))}
        </select>
      </div>

      {loading && <p style={infoStyle}>Loading vehicle operations...</p>}

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      {!loading && !errorMsg && (
        <>
          <section style={{ marginBottom: 30 }}>
            <h2 style={sectionTitleStyle}>This Month’s Vehicle Logs</h2>

            {currentGroupedEntries.length === 0 && (
              <div style={emptyStyle}>
                No vehicle logs found for the current month.
              </div>
            )}

            {currentGroupedEntries.map(([vehicle, vehicleLogs]) => (
              <VehicleLogTable
                key={vehicle}
                vehicle={vehicle}
                vehicleLogs={vehicleLogs}
              />
            ))}
          </section>

          <section style={historySectionStyle}>
            <div style={historyHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Previous Months</h2>
                <p style={historyTextStyle}>
                  Older vehicle history is hidden to keep the page clean.
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
                No previous vehicle history found.
              </div>
            )}

            {showHistory &&
              historyGroupedEntries.map(([vehicle, vehicleLogs]) => (
                <VehicleLogTable
                  key={vehicle}
                  vehicle={vehicle}
                  vehicleLogs={vehicleLogs}
                  muted
                />
              ))}
          </section>
        </>
      )}
    </div>
  );
}

/* ================= COMPONENT ================= */

function VehicleLogTable({
  vehicle,
  vehicleLogs,
  muted = false,
}: {
  vehicle: string;
  vehicleLogs: VehicleLog[];
  muted?: boolean;
}) {
  const totals = calculateTotals(vehicleLogs);

  const avgKmPerLiter =
    totals.fuelLiters > 0 ? totals.distance / totals.fuelLiters : 0;

  const avgCostPerKm =
    totals.distance > 0 ? totals.fuelAmount / totals.distance : 0;

  return (
    <div
      style={{
        ...vehicleBlockStyle,
        opacity: muted ? 0.88 : 1,
      }}
    >
      <h3 style={vehicleTitleStyle}>🚘 {vehicle}</h3>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr style={headRowStyle}>
              <th style={th}>Date</th>
              <th style={th}>Driver</th>
              <th style={th}>Area</th>
              <th style={th}>Odo Out</th>
              <th style={th}>Odo In</th>
              <th style={th}>Distance</th>
              <th style={th}>Fuel</th>
              <th style={th}>Fuel Cost</th>
            </tr>
          </thead>

          <tbody>
            {vehicleLogs.map((log) => (
              <tr key={log.id}>
                <td style={td}>{formatDate(log.business_date)}</td>
                <td style={td}>{log.driver_name || "-"}</td>
                <td style={td}>{log.area || "-"}</td>
                <td style={td}>{formatNumber(log.odometer_out)}</td>
                <td style={td}>{formatNumber(log.odometer_in)}</td>
                <td style={td}>{calculateDistance(log)} km</td>
                <td style={td}>{formatLiters(log.fuel_liters)}</td>
                <td style={td}>{formatMoney(log.fuel_amount || 0)}</td>
              </tr>
            ))}

            <tr style={totalRowStyle}>
              <td style={tdStrong} colSpan={5}>
                TOTAL
              </td>
              <td style={tdStrong}>{totals.distance} km</td>
              <td style={tdStrong}>{totals.fuelLiters.toFixed(2)} L</td>
              <td style={tdStrong}>{formatMoney(totals.fuelAmount)}</td>
            </tr>

            <tr style={averageRowStyle}>
              <td style={tdStrong} colSpan={5}>
                AVERAGES
              </td>
              <td style={td}>-</td>
              <td style={td}>{avgKmPerLiter.toFixed(2)} km/L</td>
              <td style={td}>{formatMoney(avgCostPerKm)} / km</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function calculateDistance(log: VehicleLog) {
  const odoOut = Number(log.odometer_out || 0);

  if (log.odometer_in === null || log.odometer_in === undefined) return 0;

  const odoIn = Number(log.odometer_in || 0);
  const distance = odoIn - odoOut;

  return distance > 0 ? distance : 0;
}

function calculateTotals(logs: VehicleLog[]): VehicleTotals {
  return logs.reduce<VehicleTotals>(
    (acc, log) => {
      acc.trips += 1;
      acc.distance += calculateDistance(log);
      acc.fuelLiters += Number(log.fuel_liters || 0);
      acc.fuelAmount += Number(log.fuel_amount || 0);

      return acc;
    },
    {
      trips: 0,
      distance: 0,
      fuelLiters: 0,
      fuelAmount: 0,
    }
  );
}

function groupLogsByVehicle(logs: VehicleLog[]) {
  return logs.reduce<Record<string, VehicleLog[]>>((acc, log) => {
    const vehicle = log.vehicle_reg || "Unknown Vehicle";

    if (!acc[vehicle]) acc[vehicle] = [];

    acc[vehicle].push(log);

    return acc;
  }, {});
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
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return "-";
  return Number(value).toLocaleString("en-ZA");
}

function formatLiters(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `${Number(value).toFixed(2)} L`;
}

function formatMoney(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1400,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  marginBottom: 24,
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
  fontSize: 24,
  fontWeight: 900,
  marginTop: 5,
};

const filterPanelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 30,
  padding: 14,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const filterLabelStyle: CSSProperties = {
  fontWeight: 800,
};

const selectStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  minWidth: 220,
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
};

const vehicleBlockStyle: CSSProperties = {
  marginBottom: 40,
};

const vehicleTitleStyle: CSSProperties = {
  marginBottom: 14,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #eee",
  borderRadius: 12,
  background: "#fff",
};

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: 900,
  borderCollapse: "collapse",
  fontSize: 14,
};

const headRowStyle: CSSProperties = {
  background: "#f5f5f5",
};

const th: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const tdStrong: CSSProperties = {
  ...td,
  fontWeight: 900,
};

const totalRowStyle: CSSProperties = {
  borderTop: "2px solid #000",
  background: "#fafafa",
  fontWeight: 800,
};

const averageRowStyle: CSSProperties = {
  background: "#f5f5f5",
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