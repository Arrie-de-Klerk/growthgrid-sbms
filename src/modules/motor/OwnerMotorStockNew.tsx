import { useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function StockNew() {
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(true);

  const [form, setForm] = useState({
    type: "Car",
    make: "",
    model: "",
    year: "",
    colour: "",
    fuel_type: "Petrol",
    current_km: "",
    load_capacity: "",
    registration: "",
    vin_number: "",
    bought_from: "",
    purchase_source: "",
    supplier_name: "",
    purchase_price: "",
    selling_price: "",
    purchase_date: "",
    status: "available",
    notes: "",
  });
    
    const handleChange = (field: string, value: string) => {
  setForm((prev) => ({
    ...prev,
    [field]: value,
  }));
      };
        async function handleSave(e: React.FormEvent) {
        e.preventDefault();

    const { error } = await supabase.from("motor_vehicles").insert({
      registration: form.registration || null,
      type: form.type,
      make: form.make,
      model: form.model,
      year: form.year ? Number(form.year) : null,
      colour: form.colour,
      fuel_type: form.fuel_type,
      current_km: form.current_km ? Number(form.current_km) : null,
      load_capacity: form.load_capacity || null,
      vin_number: form.vin_number || null,
      bought_from: form.bought_from,
      purchase_price: form.purchase_price
        ? Number(form.purchase_price)
        : null,
      selling_price: form.selling_price
        ? Number(form.selling_price)
        : null,
      purchase_date: form.purchase_date || null,
      status: form.status,
      notes: form.notes,
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    alert("Vehicle added ✅");
    navigate("/motor/stock");
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 20 }}>Add Vehicle</h1>

      {/* TOGGLE */}
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          marginBottom: 20,
          padding: "10px 16px",
          background: "black",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {showForm ? "Close Create Vehicle" : "+ Create Vehicle"}
      </button>

      {showForm && (
        <form
          onSubmit={handleSave}
          style={{
            background: "#f9f9f9",
            padding: 20,
            borderRadius: 8,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {/* 🔹 BASIC INFO */}
          <input
             name="registration"
             placeholder="Registration (optional)"
             value={form.registration}
             onChange={(e) => handleChange("registration", e.target.value)}
         />

           <select
              name="type"
              value={form.type}
              onChange={(e) => handleChange("type", e.target.value)}
         >
            <option value="">Select Type</option>
            <option value="Car">Car</option>
            <option value="Bakkie Single Cab">Bakkie Single Cab</option>
            <option value="Bakkie King Cab">Bakkie King Cab</option>
            <option value="Bakkie Double Cab">Bakkie Double Cab</option>
            <option value="Van">Van</option>
            <option value="Station Wagon">Station Wagon</option>
            <option value="Combi">Combi</option>
            <option value="SUV">SUV</option>
            <option value="Truck">Truck</option>
            <option value="Trailer">Trailer</option>
            <option value="Caravan">Caravan</option>
          </select>

            <input
                name="make"
                placeholder="Make"
                value={form.make}
                onChange={(e) => handleChange("make", e.target.value)}
           />

             <input
                 name="model"
                 placeholder="Model"
                 value={form.model}
                 onChange={(e) => handleChange("model", e.target.value)}
            />

             <input
                 name="year"
                 placeholder="Year"
                 value={form.year}
                 onChange={(e) => handleChange("year", e.target.value)}
            />

             <input
                 name="colour"
                 placeholder="Colour"
                 value={form.colour}
                 onChange={(e) => handleChange("colour", e.target.value)}
             />

          {/* 🔹 VEHICLE DETAILS */}
          <select
             name="fuel_type"
             value={form.type}
             onChange={(e) => handleChange("fuel_type", e.target.value)}
        >
           <option value="">Select Fuel Type</option>
           <option value="Petrol">Petrol</option>
           <option value="Diesel">Diesel</option>
           <option value="Electric">Electric</option>
           <option value="Hybrid">Hybrid</option>
          </select>

          <input
            name="current_km"
            placeholder="Odometer (km)"
            onChange={(e) => handleChange("current_km", e.target.value)}
          />

          <input
            name="load_capacity"
            placeholder="Load Capacity (kg)"
            onChange={(e) => handleChange("load_capacity", e.target.value)}
          />

          <input
            name="vin_number"
            placeholder="VIN (optional)"
            onChange={(e) => handleChange("vin_number", e.target.value)}
          />

          {/* 🔹 BUSINESS INFO */}
          <input
            name="purchase_price"
            placeholder="Purchase Price"
            onChange={(e) => handleChange("purchase_price", e.target.value)}
          />

          {/* Purchase Date */}
          <div>
            <label>Purchase Date</label>
            <input
              type="date"
              value={form.purchase_date}
              onChange={(e) => handleChange("purchase_date", e.target.value)}
        />
          </div>

         {/* Purchase Source */}
           <select
              value={form.purchase_source}
             onChange={(e) => handleChange("purchase_source", e.target.value)}
            >
            <option value="">Purchase Source</option>
            <option>Dealer</option>
            <option>Private</option>
            <option>Auction</option>
            <option>Trade-in</option>
           </select>

        {/* Supplier */}
        <input
           placeholder="Supplier / Seller Name"
           value={form.supplier_name}
           onChange={(e) => handleChange("supplier_name", e.target.value)}
       />

        {/* Selling Price */}
        <input
           placeholder="Selling Price"
           value={form.selling_price}
           onChange={(e) => handleChange("selling_price", e.target.value)}
        />
          {/* 🔹 STATUS */}
<        select
            name="status"
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
       >
         <option value="available">Available</option>
         <option value="reserved">Reserved</option>
         <option value="sold">Sold</option>
        </select>

          {/* 🔹 NOTES */}
          <textarea
            name="notes"
            placeholder="Notes"
            style={{ gridColumn: "span 4", height: 80 }}
            onChange={(e) => handleChange("notes", e.target.value)}
          />

          {/* 🔹 SAVE BUTTON */}
          <button
            type="submit"
            style={{
              gridColumn: "span 4",
              padding: 14,
              background: "black",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Save Vehicle
          </button>
        </form>
      )}
    </div>
  );
}
