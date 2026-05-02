// src/modules/gas/pages/OwnerTransport.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";

type VehicleRow = {
  id: string;
  business_id: string;
  registration: string;
  make: string | null;
  model: string | null;
  service_interval_km: number | null;
  odometer_start_km: number | null;
  status: string | null;
};

type VehicleLogRow = {
  id: string;
  business_id: string;
  vehicle_id: string | null;
  vehicle_reg: string | null;
  business_date: string;
  odometer_out: number | null;
  odometer_in: number | null;
  fuel_liters: number | null;
  fuel_amount: number | null;
};

type ExpenseType = "service" | "tires" | "battery" | "other";

type MaintenanceRow = {
  id: string;
  vehicle_id: string;
  expense_type: ExpenseType;
  description: string | null;
  expense_date: string | null;
  odometer_reading: number | null;
  cost: number | null;
};

type MaintenanceForm = {
  expense_type: ExpenseType;
  expense_date: string;
  odometer_reading: string;
  cost: string;
  description: string;
};

const defaultForm: MaintenanceForm = {
  expense_type: "service",
  expense_date: getTodayISO(),
  odometer_reading: "",
  cost: "",
  description: "",
};

export default function OwnerTransport() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [logs, setLogs] = useState<VehicleLogRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([]);
  const [forms, setForms] = useState<Record<string, MaintenanceForm>>({});
  const [openVehicle, setOpenVehicle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = getCurrentMonthLabel();

  useEffect(() => {
    loadAll();
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

  async function loadAll() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const businessId = await getBusinessId();

      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select(
          "id, business_id, registration, make, model, service_interval_km, odometer_start_km, status"
        )
        .eq("business_id", businessId)
        .order("registration", { ascending: true });

      if (vehicleError) throw vehicleError;

      const loadedVehicles = (vehicleData || []) as VehicleRow[];
      setVehicles(loadedVehicles);

      const { data: logData, error: logError } = await supabase
        .from("vehicle_logs")
        .select(
          "id, business_id, vehicle_id, vehicle_reg, business_date, odometer_out, odometer_in, fuel_liters, fuel_amount"
        )
        .eq("business_id", businessId)
        .order("business_date", { ascending: false });

      if (logError) throw logError;

      setLogs((logData || []) as VehicleLogRow[]);

      const vehicleIds = loadedVehicles.map((v) => v.id);

      if (vehicleIds.length === 0) {
        setMaintenance([]);
      } else {
        const { data: maintenanceData, error: maintenanceError } =
          await supabase
            .from("vehicle_expenses")
            .select(
              "id, vehicle_id, expense_type, description, expense_date, odometer_reading, cost"
            )
            .in("vehicle_id", vehicleIds)
            .order("expense_date", { ascending: false });

        if (maintenanceError) throw maintenanceError;

        setMaintenance((maintenanceData || []) as MaintenanceRow[]);
      }
    } catch (err: any) {
      console.error("OwnerTransport load error:", err.message);
      setErrorMsg(err.message || "Could not load transport data.");
      setVehicles([]);
      setLogs([]);
      setMaintenance([]);
    } finally {
      setLoading(false);
    }
  }

  function updateForm(vehicleId: string, patch: Partial<MaintenanceForm>) {
    setForms((prev) => ({
      ...prev,
      [vehicleId]: {
        ...(prev[vehicleId] || defaultForm),
        ...patch,
      },
    }));
  }

  async function saveMaintenance(vehicleId: string) {
    const form = forms[vehicleId] || defaultForm;

    if (!form.expense_date) {
      alert("Please add the expense date.");
      return;
    }

    const km = Number(form.odometer_reading || 0);
    const cost = Number(form.cost || 0);

    if (km <= 0) {
      alert("Please add the odometer reading.");
      return;
    }

    if (cost < 0) {
      alert("Cost cannot be negative.");
      return;
    }

    setSavingId(vehicleId);

    const { error } = await supabase.from("vehicle_expenses").insert({
      vehicle_id: vehicleId,
      expense_type: form.expense_type,
      expense_date: form.expense_date,
      odometer_reading: km,
      cost,
      description: form.description || null,
    });

    setSavingId(null);

    if (error) {
      console.error("Maintenance insert error:", error);
      alert(error.message);
      return;
    }

    setForms((prev) => ({
      ...prev,
      [vehicleId]: defaultForm,
    }));

    await loadAll();
  }

  const currentMonthLogs = useMemo(() => {
    return logs.filter((log) => getMonthKey(log.business_date) === currentMonthKey);
  }, [logs, currentMonthKey]);

  const currentMonthMaintenance = useMemo(() => {
    return maintenance.filter(
      (row) => getMonthKey(row.expense_date || "") === currentMonthKey
    );
  }, [maintenance, currentMonthKey]);

  const monthFuelCost = currentMonthLogs.reduce(
    (sum, log) => sum + Number(log.fuel_amount || 0),
    0
  );

  const monthMaintenanceCost = currentMonthMaintenance.reduce(
    (sum, row) => sum + Number(row.cost || 0),
    0
  );

  const monthDistance = currentMonthLogs.reduce(
    (sum, log) => sum + calculateDistance(log),
    0
  );

  const totalTransportCost = monthFuelCost + monthMaintenanceCost;

  if (loading) {
    return <div style={{ padding: 40 }}>Loading transport...</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🛣 Owner Transport</h1>
          <p style={subtitleStyle}>
            Fuel, maintenance, service intervals and transport cost per vehicle.
          </p>

          <div style={monthBadgeStyle}>
            Current Month: <b>{currentMonthLabel}</b>
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas")} style={secondaryButtonStyle}>
            Back to Dashboard
          </button>

          <button onClick={loadAll} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      <div style={summaryGridStyle}>
        <SummaryBox label="Vehicles" value={vehicles.length.toString()} />
        <SummaryBox label="Distance This Month" value={`${formatNumber(monthDistance)} km`} />
        <SummaryBox label="Fuel Cost This Month" value={formatMoney(monthFuelCost)} />
        <SummaryBox label="Maintenance This Month" value={formatMoney(monthMaintenanceCost)} />
        <SummaryBox label="Total Transport Cost" value={formatMoney(totalTransportCost)} />
      </div>

      {vehicles.length === 0 && (
        <div style={emptyStyle}>
          No vehicles found for this business yet.
        </div>
      )}

      <section style={vehicleGridStyle}>
        {vehicles.map((vehicle) => {
          const vehicleLogs = getVehicleLogs(vehicle, logs);
          const vehicleMonthLogs = getVehicleLogs(vehicle, currentMonthLogs);
          const vehicleMaintenance = maintenance.filter(
            (m) => m.vehicle_id === vehicle.id
          );
          const vehicleMonthMaintenance = currentMonthMaintenance.filter(
            (m) => m.vehicle_id === vehicle.id
          );

          const currentKm = getCurrentKm(vehicle, vehicleLogs);
          const serviceInfo = getServiceInfo(vehicle, vehicleMaintenance, currentKm);

          const totalFuelCost = vehicleMonthLogs.reduce(
            (sum, log) => sum + Number(log.fuel_amount || 0),
            0
          );

          const totalFuelLiters = vehicleMonthLogs.reduce(
            (sum, log) => sum + Number(log.fuel_liters || 0),
            0
          );

          const totalMaintenanceCost = vehicleMonthMaintenance.reduce(
            (sum, row) => sum + Number(row.cost || 0),
            0
          );

          const vehicleMonthDistance = vehicleMonthLogs.reduce(
            (sum, log) => sum + calculateDistance(log),
            0
          );

          const vehicleTotalCost = totalFuelCost + totalMaintenanceCost;
          const isOpen = openVehicle === vehicle.id;
          const form = forms[vehicle.id] || defaultForm;

          return (
            <div key={vehicle.id} style={vehicleCardStyle}>
              <div
                onClick={() => setOpenVehicle(isOpen ? null : vehicle.id)}
                style={vehicleHeaderStyle}
              >
                <div>
                  <h2 style={vehicleTitleStyle}>🚘 {vehicle.registration}</h2>
                  <p style={vehicleSubtitleStyle}>
                    {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"}
                  </p>
                </div>

                <span style={toggleStyle}>{isOpen ? "▲" : "▼"}</span>
              </div>

              <div style={vehicleStatsGridStyle}>
                <MiniStat label="Current KM" value={`${formatNumber(currentKm)} km`} />
                <MiniStat label="Service Due At" value={`${formatNumber(serviceInfo.serviceDueKm)} km`} />
                <MiniStat
                  label="KM Remaining"
                  value={
                    serviceInfo.kmRemaining <= 0
                      ? `Due (${formatNumber(Math.abs(serviceInfo.kmRemaining))} km over)`
                      : `${formatNumber(serviceInfo.kmRemaining)} km`
                  }
                  danger={serviceInfo.kmRemaining <= 0}
                />
                <MiniStat label="Month Distance" value={`${formatNumber(vehicleMonthDistance)} km`} />
                <MiniStat label="Fuel Litres" value={`${totalFuelLiters.toFixed(2)} L`} />
                <MiniStat label="Month Cost" value={formatMoney(vehicleTotalCost)} />
              </div>

              {isOpen && (
                <div style={openPanelStyle}>
                  <h3 style={sectionTitleStyle}>Add Maintenance / Expense</h3>

                  <div style={formGridStyle}>
                    <label style={labelStyle}>
                      Type
                      <select
                        value={form.expense_type}
                        onChange={(e) =>
                          updateForm(vehicle.id, {
                            expense_type: e.target.value as ExpenseType,
                          })
                        }
                        style={inputStyle}
                      >
                        <option value="service">Service</option>
                        <option value="tires">Tires</option>
                        <option value="battery">Battery</option>
                        <option value="other">Other / Repair</option>
                      </select>
                    </label>

                    <label style={labelStyle}>
                      Date
                      <input
                        type="date"
                        value={form.expense_date}
                        onChange={(e) =>
                          updateForm(vehicle.id, { expense_date: e.target.value })
                        }
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
                      Odometer Reading
                      <input
                        type="number"
                        value={form.odometer_reading}
                        onChange={(e) =>
                          updateForm(vehicle.id, {
                            odometer_reading: e.target.value,
                          })
                        }
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
                      Cost
                      <input
                        type="number"
                        value={form.cost}
                        onChange={(e) =>
                          updateForm(vehicle.id, { cost: e.target.value })
                        }
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                      Description
                      <input
                        value={form.description}
                        onChange={(e) =>
                          updateForm(vehicle.id, { description: e.target.value })
                        }
                        placeholder="Example: Front tires replaced"
                        style={inputStyle}
                      />
                    </label>
                  </div>

                  <button
                    onClick={() => saveMaintenance(vehicle.id)}
                    style={saveButtonStyle}
                    disabled={savingId === vehicle.id}
                  >
                    {savingId === vehicle.id ? "Saving..." : "Save Expense"}
                  </button>

                  <h3 style={{ ...sectionTitleStyle, marginTop: 26 }}>
                    Expense History
                  </h3>

                  {vehicleMaintenance.length === 0 ? (
                    <div style={smallEmptyStyle}>No expenses captured yet.</div>
                  ) : (
                    <div style={tableWrapStyle}>
                      <table style={tableStyle}>
                        <thead>
                          <tr style={headRowStyle}>
                            <th style={th}>Date</th>
                            <th style={th}>Type</th>
                            <th style={th}>KM</th>
                            <th style={th}>Cost</th>
                            <th style={th}>Description</th>
                          </tr>
                        </thead>

                        <tbody>
                          {vehicleMaintenance.map((row) => (
                            <tr key={row.id}>
                              <td style={td}>{formatDate(row.expense_date)}</td>
                              <td style={td}>{formatExpenseType(row.expense_type)}</td>
                              <td style={td}>{formatNumber(row.odometer_reading || 0)} km</td>
                              <td style={td}>{formatMoney(row.cost || 0)}</td>
                              <td style={td}>{row.description || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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

function MiniStat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div style={miniStatStyle}>
      <div style={miniLabelStyle}>{label}</div>
      <div style={{ ...miniValueStyle, color: danger ? "#b71c1c" : "#111" }}>
        {value}
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function getVehicleLogs(vehicle: VehicleRow, logs: VehicleLogRow[]) {
  return logs.filter((log) => {
    if (log.vehicle_id && log.vehicle_id === vehicle.id) return true;

    return (
      (log.vehicle_reg || "").trim().toLowerCase() ===
      (vehicle.registration || "").trim().toLowerCase()
    );
  });
}

function calculateDistance(log: VehicleLogRow) {
  const out = Number(log.odometer_out || 0);
  const inn = Number(log.odometer_in || 0);

  if (inn <= out) return 0;

  return inn - out;
}

function getCurrentKm(vehicle: VehicleRow, logs: VehicleLogRow[]) {
  let currentKm = Number(vehicle.odometer_start_km || 0);

  logs.forEach((log) => {
    currentKm = Math.max(
      currentKm,
      Number(log.odometer_out || 0),
      Number(log.odometer_in || 0)
    );
  });

  return currentKm;
}

function getServiceInfo(
  vehicle: VehicleRow,
  maintenanceRows: MaintenanceRow[],
  currentKm: number
) {
  const serviceRows = maintenanceRows
    .filter((m) => m.expense_type === "service")
    .sort((a, b) => Number(b.odometer_reading || 0) - Number(a.odometer_reading || 0));

  const lastServiceKm =
    Number(serviceRows[0]?.odometer_reading || 0) ||
    Number(vehicle.odometer_start_km || 0);

  const interval = Number(vehicle.service_interval_km || 10000);
  const serviceDueKm = lastServiceKm + interval;
  const kmRemaining = serviceDueKm - currentKm;

  return {
    lastServiceKm,
    serviceDueKm,
    kmRemaining,
  };
}

function getTodayISO() {
  const today = new Date();
  return today.toISOString().split("T")[0];
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
  return getMonthKey(new Date().toISOString());
}

function getCurrentMonthLabel() {
  return new Date().toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  });
}

function formatMoney(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatExpenseType(type: ExpenseType) {
  if (type === "service") return "Service";
  if (type === "tires") return "Tires";
  if (type === "battery") return "Battery";
  return "Other / Repair";
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1500,
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
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
  marginBottom: 28,
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
  fontSize: 24,
  fontWeight: 900,
  marginTop: 5,
};

const vehicleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
  gap: 20,
};

const vehicleCardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 16,
  background: "#fff",
  padding: 20,
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const vehicleHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  cursor: "pointer",
  marginBottom: 16,
};

const vehicleTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 900,
};

const vehicleSubtitleStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "#666",
};

const toggleStyle: CSSProperties = {
  fontWeight: 900,
};

const vehicleStatsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};

const miniStatStyle: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const miniLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#666",
  fontWeight: 800,
};

const miniValueStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  marginTop: 4,
};

const openPanelStyle: CSSProperties = {
  marginTop: 22,
  paddingTop: 20,
  borderTop: "1px solid #eee",
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
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
};

const saveButtonStyle: CSSProperties = {
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
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
};

const headRowStyle: CSSProperties = {
  background: "#f5f5f5",
};

const th: CSSProperties = {
  padding: "10px",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const errorStyle: CSSProperties = {
  marginBottom: 20,
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

const smallEmptyStyle: CSSProperties = {
  padding: 14,
  borderRadius: 10,
  background: "#f7f7f7",
  color: "#666",
  fontWeight: 700,
};