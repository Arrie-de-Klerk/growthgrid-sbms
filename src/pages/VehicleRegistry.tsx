import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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
  const business_id = "YOUR_BUSINESS_ID";

  useEffect(() => {
    fetchVehicles();
  }, []);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.from("vehicles").insert({
      business_id,
      registration: form.registration,
      make: form.make,
      model: form.model,
      year: form.year ? Number(form.year) : null,
      engine_capacity: form.engine_capacity,
      load_capacity: form.load_capacity,
      fuel_type: form.fuel_type,
      service_interval_km: form.service_interval_km,
      current_km: form.current_km ? Number(form.current_km) : null,
      purchase_date: form.purchase_date || null,
      vin: form.vin || null,
      status: "active",
    });

    if (!error) {
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
    } else {
      alert(error.message);
    }
  }

  return (
    <div className="page-container">
      <h1>Vehicle Registry</h1>
      <p>Manage your business vehicles.</p>

      {/* ================= ADD VEHICLE BLOCK ================= */}

      <div className="card">
        <h3>Add Vehicle</h3>

        <form onSubmit={handleSave} className="grid-form">
          <input
            placeholder="Registration"
            value={form.registration}
            onChange={(e) =>
              setForm({ ...form, registration: e.target.value })
            }
            required
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
            placeholder="Engine Capacity (e.g. 2200cc)"
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
            placeholder="Service Interval KM"
            type="number"
            value={form.service_interval_km}
            onChange={(e) =>
              setForm({
                ...form,
                service_interval_km: Number(e.target.value),
              })
            }
          />

          <input
            placeholder="Current KM"
            type="number"
            value={form.current_km}
            onChange={(e) =>
              setForm({ ...form, current_km: e.target.value })
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
              <h3>{v.registration}</h3>
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
