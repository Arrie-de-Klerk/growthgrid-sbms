// src/pages/OwnerVehicleOperations.tsx

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type VehicleLog = {
  id: string;
  vehicle_reg: string;
  driver_name: string;
  area: string;
  business_date: string;
  odometer_out: number;
  odometer_in: number | null;
  fuel_amount: number | null;
  fuel_liters: number | null;
};

export default function OwnerVehicleOperations() {
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const { data, error } = await supabase
      .from("vehicle_logs")
      .select("*")
      .order("business_date", { ascending: false });

    if (error) {
      console.error("Error loading vehicle logs:", error);
      return;
    }

    const loadedLogs = (data as VehicleLog[]) || [];
    setLogs(loadedLogs);

    // Extract unique vehicles
    const uniqueVehicles = Array.from(
      new Set(loadedLogs.map((log) => log.vehicle_reg))
    );
    setVehicles(uniqueVehicles);
  }

  function calculateDistance(log: VehicleLog) {
    if (!log.odometer_in) return 0;
    const distance = log.odometer_in - log.odometer_out;
    return distance > 0 ? distance : 0;
  }

  // Filter logs by selected vehicle
  const filteredLogs =
    selectedVehicle === "all"
      ? logs
      : logs.filter((log) => log.vehicle_reg === selectedVehicle);

  // Group logs by vehicle
  const grouped = filteredLogs.reduce(
    (acc: Record<string, VehicleLog[]>, log) => {
      if (!acc[log.vehicle_reg]) acc[log.vehicle_reg] = [];
      acc[log.vehicle_reg].push(log);
      return acc;
    },
    {}
  );

  return (
    <div style={{ padding: 40, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 20 }}>🚚 Vehicle Operations</h1>
      <p style={{ color: "#666", marginBottom: 30 }}>
        Detailed vehicle movement, fuel usage and cost tracking.
      </p>

      {/* VEHICLE FILTER */}
      <div style={{ marginBottom: 30 }}>
        <label style={{ marginRight: 10 }}>Filter Vehicle:</label>
        <select
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
        >
          <option value="all">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {Object.entries(grouped).map(([vehicle, vehicleLogs]) => {
        let totalDistance = 0;
        let totalFuelLiters = 0;
        let totalFuelAmount = 0;

        vehicleLogs.forEach((log) => {
          const distance = calculateDistance(log);
          totalDistance += distance;
          totalFuelLiters += log.fuel_liters || 0;
          totalFuelAmount += log.fuel_amount || 0;
        });

        const avgKmPerLiter =
          totalFuelLiters > 0
            ? totalDistance / totalFuelLiters
            : 0;

        const avgCostPerKm =
          totalDistance > 0
            ? totalFuelAmount / totalDistance
            : 0;

        return (
          <div key={vehicle} style={{ marginBottom: 60 }}>
            <h2 style={{ marginBottom: 15 }}>🚘 {vehicle}</h2>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid #ddd",
                    textAlign: "left",
                  }}
                >
                  <th>Date</th>
                  <th>Driver</th>
                  <th>Area</th>
                  <th>Odo Out</th>
                  <th>Odo In</th>
                  <th>Distance (km)</th>
                  <th>Fuel (L)</th>
                  <th>Fuel (R)</th>
                </tr>
              </thead>

              <tbody>
                {vehicleLogs.map((log) => (
                  <tr
                    key={log.id}
                    style={{ borderBottom: "1px solid #eee" }}
                  >
                    <td>{log.business_date}</td>
                    <td>{log.driver_name}</td>
                    <td>{log.area}</td>
                    <td>{log.odometer_out}</td>
                    <td>{log.odometer_in ?? "-"}</td>
                    <td>{calculateDistance(log)}</td>
                    <td>{log.fuel_liters ?? "-"}</td>
                    <td>{log.fuel_amount ?? "-"}</td>
                  </tr>
                ))}

                {/* TOTAL ROW */}
                <tr
                  style={{
                    borderTop: "2px solid #000",
                    fontWeight: 700,
                    background: "#fafafa",
                  }}
                >
                  <td colSpan={5}>TOTAL</td>
                  <td>{totalDistance}</td>
                  <td>{totalFuelLiters.toFixed(2)}</td>
                  <td>{totalFuelAmount.toFixed(2)}</td>
                </tr>

                {/* AVERAGE ROW */}
                <tr
                  style={{
                    fontWeight: 600,
                    background: "#f5f5f5",
                  }}
                >
                  <td colSpan={5}>AVERAGES</td>
                  <td>-</td>
                  <td>{avgKmPerLiter.toFixed(2)} km/L</td>
                  <td>{avgCostPerKm.toFixed(2)} R/km</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
