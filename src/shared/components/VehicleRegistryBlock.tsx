import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";


type VehicleStatus = "available" | "sold" | "inactive" | "maintenance";
type FuelType = "Diesel" | "Petrol" | "Electric"| "Hybrid";
type VehicleType =
  | "Car"
  | "Bakkie Single Cab"
  | "Bakkie King Cab"
  | "Bakkie Double Cab"
  | "Caravan"
  | "Combi"
  | "SUV"
  | "Station Wagon"
  | "Truck"
  | "Trailer"
  | "Van";

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
    colour: "",
    fuel_type: "Diesel" as FuelType,
    current_km: "",
    load_capacity: "",
    vin_number: "",
    engine_capacity: "",
    purchase_price: "",
    purchase_date: "",
    purchase_source: "",
    supplier_name: "",
    selling_price: "",
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
       .from("motor_vehicles")
       .select("id", { count: "exact", head: true })
       .eq("business_id", businessId);

     if (countError) {
        setSaving(false);
        alert(countError.message);
     return;
}

    const nextNumber = (count ?? 0) + 1;

    const vehicleCode = `AH-${String(nextNumber).padStart(5, "0")}`;

    const payload = {
       business_id: businessId,
       vehicle_code: vehicleCode,
      
      registration: form.registration.trim() || null,

      type: form.vehicle_type, // ✅ FIXED
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      year: form.year ? Number(form.year) : null,

      colour: form.colour.trim() || null,
      fuel_type: form.fuel_type,

      current_km: form.current_km ? Number(form.current_km) : 0,
      load_capacity: form.load_capacity.trim() || null,
      vin_number: form.vin_number.trim() || null,

      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      purchase_date: form.purchase_date || null,

      purchase_source: form.purchase_source || null,
      supplier_name: form.supplier_name || null,

  // 👇 THIS IS CRITICAL FOR YOUR TABLE
      bought_from: form.supplier_name || null,

      selling_price: form.selling_price ? Number(form.selling_price) : null,
      status: form.status,

      notes: form.notes.trim() || null,
   };

    const { error } = await supabase.from("motor_vehicles").insert(payload);

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
      colour: "",
      fuel_type: "Diesel",
      current_km: "",
      load_capacity: "",
      vin_number: "",
      engine_capacity: "",
      purchase_price: "",
      purchase_date: "",
      purchase_source: "",
      supplier_name: "",
      selling_price: "",
      status: "available",
      notes: "",
    });

    console.log("Refreshing list...");
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
            <option>Caravan</option>
            <option>Combi</option>
            <option>SUV</option>
            <option>Station Wagon</option>
            <option>Truck</option>
            <option>Trailer</option>
            <option>Van</option>
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
            placeholder="Colour"
            value={form.colour}
            onChange={(e) => setForm({ ...form, colour: e.target.value })} 
         />

         <select
            value={form.fuel_type}
            onChange={(e) => setForm({ ...form, fuel_type: e.target.value as FuelType })}
          >
            <option>Diesel</option>
            <option>Petrol</option>
            <option>Electric</option>
            <option>Hybrid</option>
          </select>

          <input
            placeholder="Current KM"
            value={form.current_km}
            onChange={(e) => setForm({ ...form, current_km: e.target.value })}
          />

          <input
            placeholder="Load Capacity"
            value={form.load_capacity}
            onChange={(e) => setForm({ ...form, load_capacity: e.target.value })}
          />

          <input
            placeholder="VIN (optional)"
            value={form.vin_number}
            onChange={(e) => setForm({ ...form, vin_number: e.target.value })}
          />

           <input
            placeholder="Engine Capacity"
            value={form.engine_capacity}
            onChange={(e) => setForm({ ...form, engine_capacity: e.target.value })}
          />

          <input
            type="number"
            placeholder="Purchase Price"
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
          />

          <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
            />

          <select
               value={form.purchase_source}
               onChange={(e) => setForm({ ...form, purchase_source: e.target.value })}
          >
              <option value="">Select Source</option>
              <option value="Dealer">Dealer</option>
              <option value="Private">Private</option>
              <option value="Auction">Auction</option>
              <option value="Trade-In">Trade-In</option>
          </select>

          <input
            placeholder="Supplier/Seller's Name"
            value={form.supplier_name}
            onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
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
