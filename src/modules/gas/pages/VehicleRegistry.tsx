import { useEffect, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";

type Vehicle = {
  id: string;
  business_id: string;
  registration: string;
  make: string | null;
  model: string | null;
  year: number | null;
  engine_capacity: string | null;
  load_capacity: string | null;
  fuel_type: string | null;
  service_interval_km: number | null;
  current_km: number | null;
  purchase_date: string | null;
  vin: string | null;
  status: string;
  assigned_driver_id: string | null;
  created_at: string;
};

export default function VehicleRegistry() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    registration: "",
    make: "",
    model: "",
    year: "",
    engine_capacity: "",
    load_capacity: "",
    fuel_type: "Diesel",
    service_interval_km: 10000,
    current_km: "",
    purchase_date: "",
    vin: "",
  });

  // 🔹 Replace with real business id from auth/profile
  const business_id = "fc0e1122-d99e-424c-aebb-a84c55048444";

  useEffect(() => {
  fetchVehicles();
}, []);

// ✅ 🔥 INSERT HERE

async function fetchVehicles() {
    setLoading(true);

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVehicles(data);
    }

    setLoading(false);
  }
  
    // 🔥 2. SAVE VEHICLE
  async function handleSave(e: React.FormEvent) {
  e.preventDefault();

  // 🔥 1. Get existing stock codes
  const { data } = await supabase
    .from("vehicles")
    .select("stock_code")
    .eq("business_id", business_id);

  const numbers = (data || [])
    .map((v) => {
      if (!v.stock_code?.startsWith("AUTO-")) return null;
      return parseInt(v.stock_code.replace("AUTO-", ""));
    })
    .filter((n): n is number => typeof n === "number" && !isNaN(n));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

  const stock_code = `AUTO-${String(nextNumber).padStart(5, "0")}`;

  // 🔥 2. SAVE VEHICLE
  const { error } = await supabase
    .from("vehicles")
    .insert({
      business_id,
      stock_code, // ✅ YOUR NEW PRIMARY KEY
      registration: form.registration || null, // optional
      make: form.make,
      model: form.model,
      year: form.year ? Number(form.year) : null,
      engine_capacity: form.engine_capacity,
      load_capacity: form.load_capacity,
      fuel_type: form.fuel_type,
      service_interval_km: form.service_interval_km,
      purchase_date: form.purchase_date || null,
      vin_number: form.vin || null,
      status: "in_stock",
    });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  alert(`Vehicle saved as ${stock_code} ✅`);

  // 🔄 RESET FORM
  setForm({
    registration: "",
    make: "",
    model: "",
    year: "",
    engine_capacity: "",
    load_capacity: "",
    fuel_type: "Diesel",
    service_interval_km: 10000,
    current_km: "",
    purchase_date: "",
    vin: "",
  });

  fetchVehicles();
}
 
  return (
  <div className="page-container">
    <h1>Vehicle Registry</h1>
    <p>Manage your business vehicles.</p>

    {/* ================= ADD VEHICLE ================= */}
    <div className="card">
      <h3>Add Vehicle</h3>

      <form onSubmit={handleSave} className="grid-form">
        <input
          placeholder="Registration"
          value={form.registration}
          onChange={(e) =>
            setForm({ ...form, registration: e.target.value })
          }
        />

        <input
          placeholder="Make"
          value={form.make}
          onChange={(e) => setForm({ ...form, make: e.target.value })}
        />

        <input
          placeholder="Model"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />

        <input
          placeholder="Year"
          type="number"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
        />

        <input
          placeholder="Engine Capacity"
          value={form.engine_capacity}
          onChange={(e) =>
            setForm({ ...form, engine_capacity: e.target.value })
          }
        />

        <input
          placeholder="Load Capacity"
          value={form.load_capacity}
          onChange={(e) =>
            setForm({ ...form, load_capacity: e.target.value })
          }
        />

        <select
          value={form.fuel_type}
          onChange={(e) =>
            setForm({ ...form, fuel_type: e.target.value })
          }
        >
          <option>Diesel</option>
          <option>Petrol</option>
          <option>Electric</option>
          <option>Hybrid</option>
        </select>

        <input
          type="number"
          placeholder="Service Interval KM"
          value={form.service_interval_km}
          onChange={(e) =>
            setForm({
              ...form,
              service_interval_km: Number(e.target.value),
            })
          }
        />

        <input
          type="date"
          value={form.purchase_date}
          onChange={(e) =>
            setForm({ ...form, purchase_date: e.target.value })
          }
        />

        <input
          placeholder="VIN / Chassis"
          value={form.vin}
          onChange={(e) =>
            setForm({ ...form, vin: e.target.value })
          }
        />

        <button type="submit" className="primary-btn">
          Save Vehicle
        </button>
      </form>
    </div>

    {/* ================= VEHICLE LIST ================= */}
    <div className="vehicle-grid">
      {loading && <p>Loading vehicles...</p>}

      {!loading &&
        vehicles.map((v) => (
          <div key={v.id} className="vehicle-card">
            <h3>{v.registration || "No Reg"}</h3>
            <p>{v.make} {v.model}</p>
            <p>Year: {v.year}</p>
            <p>Engine: {v.engine_capacity}</p>
            <p>Fuel: {v.fuel_type}</p>
            <p>Status: {v.status}</p>
          </div>
        ))}
    </div>
  </div>
);
}