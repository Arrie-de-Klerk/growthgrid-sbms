import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Vehicle = {
  id: string;
  registration: string;
};

export default function ClerkVehicleOperations() {
  const navigate = useNavigate();
  const businessDate = new Date().toISOString().slice(0, 10);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const [driverName, setDriverName] = useState("");
  const [area, setArea] = useState("");
  const [odometerOut, setOdometerOut] = useState("");
  const [odometerIn, setOdometerIn] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoadingVehicles(true);

    const { data, error } = await supabase
      .from("vehicles")
      .select("id, registration")
      .order("registration");

    if (error) {
      console.error("Error loading vehicles:", error);
      setVehicles([]);
    } else {
      setVehicles(data || []);
    }

    setLoadingVehicles(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedVehicleId) {
      alert("Please select a vehicle.");
      return;
    }

    if (!driverName || !area || !odometerOut) {
      alert("Please complete all required fields.");
      return;
    }

    if (odometerIn && Number(odometerIn) < Number(odometerOut)) {
      alert("Odometer In cannot be less than Odometer Out.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      setLoading(false);
      return;
    }

    const selectedVehicle = vehicles.find(
      (v) => v.id === selectedVehicleId
    );

    const { error } = await supabase.from("vehicle_logs").insert({
      clerk_id: user.id,
      business_date: businessDate,
      captured_at: new Date().toISOString(),
      vehicle_id: selectedVehicleId,
      vehicle_reg: selectedVehicle?.registration,
      driver_name: driverName,
      area,
      odometer_out: Number(odometerOut),
      odometer_in: odometerIn ? Number(odometerIn) : null,
      fuel_amount: fuelAmount ? Number(fuelAmount) : null,
      fuel_liters: fuelLiters ? Number(fuelLiters) : null,
    });

    if (error) {
      console.error(error);
      alert("Error saving vehicle log.");
      setLoading(false);
      return;
    }

    alert("Vehicle log saved successfully.");

    // Reset form
    setSelectedVehicleId("");
    setDriverName("");
    setArea("");
    setOdometerOut("");
    setOdometerIn("");
    setFuelAmount("");
    setFuelLiters("");

    setLoading(false);
    navigate("/dashboard/clerk");
  }

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700 }}>
        🚚 Vehicle Operations
      </h1>

      <div style={{ marginBottom: "16px" }}>
        <strong>Date:</strong> {businessDate}
      </div>

      {loadingVehicles ? (
        <p>Loading vehicles...</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "16px",
            padding: "24px",
            border: "1px solid #ddd",
            borderRadius: "12px",
            background: "#fafafa",
          }}
        >
          <div>
            <label>Vehicle *</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
            >
              <option value="">Select vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Driver Name *</label>
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </div>

          <div>
            <label>Area *</label>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>

          <div>
            <label>Odometer (Out) *</label>
            <input
              type="number"
              value={odometerOut}
              onChange={(e) => setOdometerOut(e.target.value)}
            />
          </div>

          <div>
            <label>Odometer (In)</label>
            <input
              type="number"
              value={odometerIn}
              onChange={(e) => setOdometerIn(e.target.value)}
            />
          </div>

          <div>
            <label>Fuel Amount (R)</label>
            <input
              type="number"
              value={fuelAmount}
              onChange={(e) => setFuelAmount(e.target.value)}
            />
          </div>

          <div>
            <label>Fuel Liters (L)</label>
            <input
              type="number"
              value={fuelLiters}
              onChange={(e) => setFuelLiters(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Vehicle Log"}
          </button>
        </form>
      )}
    </div>
  );
}