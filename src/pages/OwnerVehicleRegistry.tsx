import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import VehicleRegistryBlock from "../components/VehicleRegistryBlock";

type Vehicle = {
  id: string;
  vehicle_code: string | null;
  registration: string | null;
  vehicle_type: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  vin_number: string | null;
  load_capacity: string | null;
  fuel_type: string | null;
  engine_capacity: string | null;
  service_interval_km: number | null;
  purchase_date: string | null;
  purchase_price: number | null;
  odometer_start_km: number | null;
  status: string | null;
  notes: string | null;
};

export default function OwnerVehicleRegistry() {
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
      .from("vehicles")
      .select(
        `
        id,
        vehicle_code,
        registration,
        vehicle_type,
        make,
        model,
        year,
        vin_number,
        load_capacity,
        fuel_type,
        engine_capacity,
        service_interval_km,
        purchase_date,
        purchase_price,
        odometer_start_km,
        status,
        notes
        `
      )
      .eq("business_id", bid)
      .order("created_at", { ascending: false });

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
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>🗂 Vehicle Registry</h1>
        <p style={{ color: "#666" }}>Manage vehicle profiles and asset details.</p>
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
                  borderRadius: 12,
                  background: "#fff",
                  overflow: "hidden",
                }}
              >
                {/* ✅ Compact header (always visible) */}
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
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>
                        🚗 {v.vehicle_code || "Vehicle"}
                      </div>
                      <div style={{ fontSize: 14, color: "#444", marginTop: 4 }}>
                        {v.registration || "No Registration"} —{" "}
                        {(v.make || "") + " " + (v.model || "")}
                      </div>
                      <div style={{ fontSize: 14, marginTop: 6 }}>
                        Status: <b>{v.status || "—"}</b>
                      </div>
                    </div>

                    <div style={{ fontSize: 18, fontWeight: 900, opacity: 0.6 }}>
                      {isOpen ? "−" : "+"}
                    </div>
                  </div>
                </button>

                {/* ✅ Expanded details (only visible when open) */}
                {isOpen && (
                  <div style={{ padding: "0 18px 18px 18px", lineHeight: 1.7 }}>
                    <div><b>Type:</b> {v.vehicle_type || "—"}</div>
                    <div><b>Year:</b> {v.year ?? "—"}</div>
                    <div><b>VIN:</b> {v.vin_number || "—"}</div>
                    <div><b>Load Capacity:</b> {v.load_capacity || "—"}</div>
                    <div><b>Fuel:</b> {v.fuel_type || "—"}</div>
                    <div><b>Engine:</b> {v.engine_capacity || "—"}</div>
                    <div>
                      <b>Service Interval:</b>{" "}
                      {v.service_interval_km ? `${v.service_interval_km} km` : "—"}
                    </div>
                    <div><b>Purchase Date:</b> {v.purchase_date || "—"}</div>
                    <div>
                      <b>Purchase Price:</b>{" "}
                      {v.purchase_price != null ? `R ${v.purchase_price}` : "—"}
                    </div>
                    <div>
                      <b>Odometer Start:</b>{" "}
                      {v.odometer_start_km != null ? `${v.odometer_start_km} km` : "—"}
                    </div>
                    {v.notes ? <div><b>Notes:</b> {v.notes}</div> : null}
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
