import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import VehicleRegistryBlock from "../../shared/components/VehicleRegistryBlock";


type Vehicle = {
  id: string;
  vehicle_code: string | null;
  registration: string | null;
  type: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  colour: string | null;
  fuel_type: string | null;
  current_km: number | null;
  load_capacity: string | null;
  vin_number: string | null;
  engine_capacity: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  purchase_source: string | null;
  bought_from: string | null;
  selling_price: number | null;
  status: string | null;
  notes: string | null;
};

export default function OwnerMotorStock() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // ✅ This is what was missing / breaking
  const [openVehicleId, setOpenVehicleId] = useState<string | null>(null);

  useEffect(() => {
    void initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initialize() {
    setLoading(true);

   
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Not logged in.");
      setLoading(false);
      return;
    }

    // ✅ IMPORTANT: profiles.id must match auth.user.id in your schema (yours does)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

     
    if (profileError || !profile?.business_id) {
      alert("No business linked to this user.");
      setLoading(false);
      return;
    }

    const bid = profile.business_id as string;
    setBusinessId(bid);

    const { data: vehiclesData, error: vehiclesError } = await supabase
       .from("motor_vehicles")
       .select("*")
       .eq("business_id", bid)
       .order("created_at", { ascending: false });

    console.log("Fetched vehicles:", vehiclesData);
        
      
    if (vehiclesError) {
      console.error(vehiclesError);
      setVehicles([]);
    } else {
      setVehicles((vehiclesData as Vehicle[]) || []);
    }

    setLoading(false);
  }

  return (
    <div style={{ padding: 40, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>🚗 Motor Stock</h1>
        <p style={{ color: "#666" }}></p><p>Manage dealership vehicles and sales stock.</p>
      </header>
    
      {/* ✅ Create Vehicle stays at the top (as your screenshot shows) */}
      {businessId && (
        <VehicleRegistryBlock businessId={businessId} onCreated={initialize} />
      )}

       
      {/* ✅ Stored vehicles below */}
      
      {loading ? (
        <div>Loading vehicles...</div>
      ) : vehicles.length === 0 ? (

        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          No vehicles registered yet.
        </div>
      ) : (
        <div
  style={{
    marginTop: 24,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  }}
>
  {vehicles.map((v) => {
    const isOpen = openVehicleId === v.id;

    return (
      <div
        key={v.id}
        style={{
          border: "1px solid #ddd",
          borderRadius: 10,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        {/* HEADER */}
        <button
          type="button"
          onClick={() => setOpenVehicleId(isOpen ? null : v.id)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: 18,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                🚗 {v.vehicle_code || "Vehicle"}
              </div>

              <div style={{ fontSize: 14, color: "#444", marginTop: 4 }}>
                {v.registration || "No Reg"} — {v.make} {v.model}
              </div>

              <div style={{ marginTop: 6 }}>
                Status: <b>{v.status || "—"}</b>
              </div>
            </div>

            <div style={{ fontSize: 18 }}>
              {isOpen ? "−" : "+"}
            </div>
          </div>
        </button>

        {/* DETAILS */}
        {isOpen && (
          <div style={{ padding: 18 }}>
            <div><b>Type:</b> {v.type || "—"}</div>
            <div><b>Year:</b> {v.year ?? "—"}</div>
            <div><b>Fuel:</b> {v.fuel_type || "—"}</div>
            <div><b>KM:</b> {v.current_km ?? 0} km</div>
            <div><b>Colour:</b> {v.colour || "—"}</div>
            <div><b>Bought From:</b> {v.bought_from || "—"}</div>
            <div><b>Purchase Price:</b> {v.purchase_price ? `R ${v.purchase_price}` : "—"}</div>
            <div><b>Purchase Date:</b> {v.purchase_date || "—"}</div>
            <div><b>VIN:</b> {v.vin_number || "—"}</div>

            {v.load_capacity && <div><b>Load Capacity:</b> {v.load_capacity}</div>}
            {v.engine_capacity && <div><b>Engine:</b> {v.engine_capacity}</div>}
            {v.notes && <div><b>Notes:</b> {v.notes}</div>}
          </div>
       )}
        </div>
      );
    })}
  </div>
)}
</div>
);
}