import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type VehicleRow = {
  id: string;
  registration: string;
  service_interval_km: number | null;
  odometer_start_km: number | null;
};

type VehicleLogRow = {
  vehicle_id: string | null;
  vehicle_reg: string | null;
  odometer_out: number;
  odometer_in: number | null;
  fuel_liters: number | null;
  fuel_amount: number | null;
};

type MaintenanceRow = {
  id: string;
  vehicle_id: string;
  expense_type: "service" | "tires" | "battery" | "other";
  description: string | null;
  expense_date: string | null;
  odometer_reading: number | null;
  cost: number | null;
};

function fmt(n: number) {
  return Math.round(n).toString();
}

export default function OwnerTransport() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [logs, setLogs] = useState<VehicleLogRow[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openVehicle, setOpenVehicle] = useState<string | null>(null);
  
  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);

    const { data: v } = await supabase.from("vehicles").select("*");
    const { data: l } = await supabase.from("vehicle_logs").select("*");
    const { data: m } = await supabase
      .from("vehicle_expenses")
      .select("*")
      .order("expense_date", { ascending: false });

    setVehicles(v || []);
    setLogs(l || []);
    setMaintenance(m || []);
    setLoading(false);
  }

  const logsGrouped = useMemo(() => {
    const map = new Map<string, VehicleLogRow[]>();

    logs.forEach((log) => {
      let key = "";

      if (log.vehicle_id) {
        key = log.vehicle_id;
      } else if (log.vehicle_reg) {
        const vehicle = vehicles.find(
          (v) => v.registration === log.vehicle_reg
        );
        if (vehicle) key = vehicle.id;
      }

      if (!key) return;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    });

    return map;
  }, [logs, vehicles]);

  async function saveMaintenance(
  vehicleId: string,
  type: MaintenanceRow["expense_type"],
  date: string,
  km: number,
  cost: number,
  description: string
) {
  if (!date || !km) {
    alert("Date and KM required.");
    return;
  }

  const { error } = await supabase.from("vehicle_expenses").insert({
    vehicle_id: vehicleId,
    expense_type: type,
    expense_date: date,
    odometer_reading: km,
    cost,
    description: type === "other" ? description : null,
  });

  if (error) {
    console.error("Maintenance insert error:", error);
    alert(error.message);
    return;
  }

  await loadAll();
}

  if (loading) return <div style={{ padding: 30 }}>Loading...</div>;

  return (
  <div style={{ padding: 32, maxWidth: 1500, margin: "0 auto" }}>
    <h1 style={{ fontSize: 30, fontWeight: 900 }}>🛣 Owner Transport</h1>

    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 20,
        marginTop: 24,
      }}
    >
      {vehicles.map((v) => {
        const serviceRow = maintenance.find(
          (m) => m.vehicle_id === v.id && m.expense_type === "service"
        );

        const tiresRow = maintenance.find(
          (m) => m.vehicle_id === v.id && m.expense_type === "tires"
        );

        const batteryRow = maintenance.find(
          (m) => m.vehicle_id === v.id && m.expense_type === "battery"
        );

        const repairRow = maintenance.find(
          (m) => m.vehicle_id === v.id && m.expense_type === "other"
        );

        const vLogs = logsGrouped.get(v.id) || [];

     // Current KM
        let currentKm = v.odometer_start_km ?? 0;

         vLogs.forEach((l) => {
           currentKm = Math.max(
             currentKm,
             l.odometer_in ?? 0,
             l.odometer_out
         );
       });

      // Fuel totals
        let totalLiters = 0;
        let totalFuelCost = 0;

      vLogs.forEach((l) => {
         totalLiters += l.fuel_liters ?? 0;
         totalFuelCost += l.fuel_amount ?? 0;
      });

     // Maintenance rows
         const vehicleMaintenance = maintenance.filter(
         (m) => m.vehicle_id === v.id
      );

         let totalMaintenanceCost = 0;

         vehicleMaintenance.forEach((m) => {
         totalMaintenanceCost += m.cost ?? 0;
      });

          const totalVehicleCost = totalFuelCost + totalMaintenanceCost;

      // Service interval
          const interval = v.service_interval_km ?? 10000;

          const lastServiceKm =
             serviceRow?.odometer_reading ?? v.odometer_start_km ?? 0;

          const serviceDueKm = lastServiceKm + interval;

          const kmRemaining = serviceDueKm - currentKm;

        return (
          <div
            key={v.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 16,
              background: "#fff",
              padding: 20,
            }}
          >
            <div
              onClick={() =>
                setOpenVehicle(openVehicle === v.id ? null : v.id)
              }
              style={{
                fontWeight: 900,
                cursor: "pointer",
                fontSize: 18,
              }}
            >
              🚘 {v.registration}
            </div>

            <div>
             <strong>Current KM:</strong> {fmt(currentKm)}
          </div>

          <div>
            <strong>Service Due At:</strong> {fmt(serviceDueKm)} km
          </div>

          <div>
            <strong>KM remaining:</strong>{" "}
            {kmRemaining <= 0
            ? `Due (${Math.abs(kmRemaining)} km over)`
            : `${fmt(kmRemaining)} km`}
         </div>

        <hr />

         <div>
          <strong>Total Fuel (L):</strong> {totalLiters.toFixed(2)}
         </div>

         <div>
           <strong>Total Fuel Cost:</strong> R {totalFuelCost.toFixed(2)}
         </div>

         <div>
           <strong>Total Maintenance Cost:</strong> R {totalMaintenanceCost.toFixed(2)}
         </div>

         <div>
           <strong>Total Vehicle Running Cost:</strong> R {totalVehicleCost.toFixed(2)}
         </div>

         <hr />

            {openVehicle === v.id && (
              <>
                <MaintenanceEditor
                  vehicleId={v.id}
                  type="service"
                  row={serviceRow}
                  onSave={saveMaintenance}
                />

                <MaintenanceEditor
                  vehicleId={v.id}
                  type="tires"
                  row={tiresRow}
                  onSave={saveMaintenance}
                />

                <MaintenanceEditor
                  vehicleId={v.id}
                  type="battery"
                  row={batteryRow}
                  onSave={saveMaintenance}
                />

                <MaintenanceEditor
                  vehicleId={v.id}
                  type="other"
                  row={repairRow}
                  onSave={saveMaintenance}
                />
              </>
            )}
          </div>
        );
      })}
    </section>
  </div>
);

}
/* ============================= */

function MaintenanceEditor({
  vehicleId,
  type,
  row,
  onSave,
}: {
  vehicleId: string;
  type: MaintenanceRow["expense_type"];
  row?: MaintenanceRow;
  onSave: (
    vehicleId: string,
    type: MaintenanceRow["expense_type"],
    date: string,
    km: number,
    cost: number,
    description: string
  ) => void;
}) {
  const [date, setDate] = useState(row?.expense_date ?? "");
  const [km, setKm] = useState(row?.odometer_reading?.toString() ?? "");
  const [cost, setCost] = useState(row?.cost?.toString() ?? "");
  const [description, setDescription] = useState(row?.description ?? "");
 

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 700, textTransform: "capitalize" }}>
        {type}
      </div>

      <div>
        Date:{" "}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        KM:{" "}
        <input
          type="number"
          value={km}
          onChange={(e) => setKm(e.target.value)}
        />
      </div>

      <div>
        Cost:{" "}
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </div>

      {type === "other" && (
        <div>
          Description:{" "}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Engine change / diesel pump / gearbox etc"
            style={{ width: "220px" }}
          />
        </div>
      )}

      <button
        style={{ marginTop: 6 }}
        onClick={() =>
          onSave(
            vehicleId,
            type,
            date,
            Number(km),
            Number(cost),
            description
          )
        }
      >
        Save
      </button>
    </div>
 );
}
