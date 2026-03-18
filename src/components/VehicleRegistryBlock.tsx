import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type VehicleStatus = "available" | "sold" | "inactive" | "maintenance";
type FuelType = "Diesel" | "Petrol" | "Other";
type VehicleType =
  | "Car"
  | "Bakkie Single Cab"
  | "Bakkie King Cab"
  | "Bakkie Double Cab"
  | "Van"
  | "Combi"
  | "SUV"
  | "Station Wagon"
  | "Truck"
  | "Trailer";

type Props = {
  businessId: string;
  onCreated: () => Promise<void>;
};

export default function VehicleRegistryBlock({ businessId, onCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    registration: "",
    vehicle_type: "Car" as VehicleType,
    make: "",
    model: "",
    year: "",
    vin_number: "",
    load_capacity: "",
    fuel_type: "Diesel" as FuelType,
    engine_capacity: "",
    service_interval_km: "10000",
    purchase_date: "",
    purchase_price: "",
    odometer_start_km: "",
    status: "available" as VehicleStatus,
    notes: "",
  });

  useEffect(() => {
    // nothing needed here
  }, []);

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault();

    if (!businessId) {
      alert("No business linked.");
      return;
    }

    setSaving(true);

    // Next code number per business
    const { count, error: countError } = await supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (countError) {
      setSaving(false);
      alert(countError.message);
      return;
    }

    const nextNumber = (count ?? 0) + 1;
    const vehicleCode = `HG-TR-${String(nextNumber).padStart(3, "0")}`;

    const payload = {
      business_id: businessId,
      vehicle_code: vehicleCode,
      registration: form.registration.trim() || null,
      vehicle_type: form.vehicle_type,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      year: form.year ? Number(form.year) : null,
      vin_number: form.vin_number.trim() || null,
      load_capacity: form.load_capacity.trim() || null,
      fuel_type: form.fuel_type,
      engine_capacity: form.engine_capacity.trim() || null,
      service_interval_km: Number(form.service_interval_km || 10000),
      purchase_date: form.purchase_date || null,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      odometer_start_km: form.odometer_start_km ? Number(form.odometer_start_km) : 0,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    const { error } = await supabase.from("vehicles").insert(payload);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    // reset + refresh parent list
    setCreating(false);
    setForm({
      registration: "",
      vehicle_type: "Car",
      make: "",
      model: "",
      year: "",
      vin_number: "",
      load_capacity: "",
      fuel_type: "Diesel",
      engine_capacity: "",
      service_interval_km: "10000",
      purchase_date: "",
      purchase_price: "",
      odometer_start_km: "",
      status: "available",
      notes: "",
    });

    await onCreated();
  }

  return (
    <div style={{ padding: 30 }}>
      <button
        onClick={() => setCreating(!creating)}
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          background: "#000",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          marginBottom: 20,
        }}
      >
        {creating ? "Close Create Vehicle" : "➕ Create Vehicle"}
      </button>

      {creating && (
        <form
          onSubmit={createVehicle}
          style={{
            background: "#fafafa",
            padding: 20,
            borderRadius: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 30,
          }}
        >
          <input
            placeholder="Registration"
            value={form.registration}
            onChange={(e) => setForm({ ...form, registration: e.target.value })}
          />

          <select
            value={form.vehicle_type}
            onChange={(e) =>
              setForm({ ...form, vehicle_type: e.target.value as VehicleType })
            }
          >
            <option>Car</option>
            <option>Bakkie Single Cab</option>
            <option>Bakkie King Cab</option>
            <option>Bakkie Double Cab</option>
            <option>Van</option>
            <option>Combi</option>
            <option>SUV</option>
            <option>Station Wagon</option>
            <option>Truck</option>
            <option>Trailer</option>
          </select>

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
            type="number"
            placeholder="Year"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />

          <input
            placeholder="VIN (optional)"
            value={form.vin_number}
            onChange={(e) => setForm({ ...form, vin_number: e.target.value })}
          />

          <input
            placeholder="Load Capacity"
            value={form.load_capacity}
            onChange={(e) => setForm({ ...form, load_capacity: e.target.value })}
          />

          <select
            value={form.fuel_type}
            onChange={(e) => setForm({ ...form, fuel_type: e.target.value as FuelType })}
          >
            <option>Diesel</option>
            <option>Petrol</option>
            <option>Other</option>
          </select>

          <input
            placeholder="Engine Capacity"
            value={form.engine_capacity}
            onChange={(e) => setForm({ ...form, engine_capacity: e.target.value })}
          />

          <select
            value={form.service_interval_km}
            onChange={(e) => setForm({ ...form, service_interval_km: e.target.value })}
          >
            <option value="10000">10,000 km</option>
            <option value="15000">15,000 km</option>
            <option value="20000">20,000 km</option>
          </select>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: 13, marginBottom: 4 }}>Purchase Date</label>
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
            />
          </div>

          <input
            type="number"
            placeholder="Purchase Price"
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
          />

          <input
            type="number"
            placeholder="Odometer Start KM"
            value={form.odometer_start_km}
            onChange={(e) => setForm({ ...form, odometer_start_km: e.target.value })}
          />

          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })}
          >
            <option value="available">available</option>
            <option value="sold">sold</option>
            <option value="inactive">inactive</option>
            <option value="maintenance">maintenance</option>
          </select>

          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={{ gridColumn: "1 / -1", minHeight: 80 }}
          />

          <button
            type="submit"
            disabled={saving}
            style={{
              gridColumn: "1 / -1",
              padding: 14,
              background: "#000",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Vehicle"}
          </button>
        </form>
      )}
    </div>
  );
}
