import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return `R ${value.toLocaleString("en-ZA")}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

export default function OwnerMotorStock() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [openVehicleId, setOpenVehicleId] = useState<string | null>(null);

  const statusFilter = searchParams.get("status") || "all";

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

    if (vehiclesError) {
      console.error("Error loading motor vehicles:", vehiclesError);
      setVehicles([]);
    } else {
      setVehicles((vehiclesData as Vehicle[]) || []);
    }

    setLoading(false);
  }

  const filteredVehicles = useMemo(() => {
    if (statusFilter === "all") return vehicles;
    return vehicles.filter((v) => (v.status || "").toLowerCase() === statusFilter.toLowerCase());
  }, [vehicles, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: vehicles.length,
      available: vehicles.filter((v) => (v.status || "").toLowerCase() === "available").length,
      sold: vehicles.filter((v) => (v.status || "").toLowerCase() === "sold").length,
      reserved: vehicles.filter((v) => (v.status || "").toLowerCase() === "reserved").length,
    };
  }, [vehicles]);

  function setStatusFilter(next: string) {
    if (next === "all") {
      setSearchParams({});
      return;
    }
    setSearchParams({ status: next });
  }

  return (
    <div style={{ padding: 40, maxWidth: 1150, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <button
            onClick={() => navigate("/motor")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Back to Dashboard
          </button>

          <button
            onClick={() => navigate("/motor/deals")}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: "black",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Open Deals
          </button>
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>🚗 Motor Stock</h1>
        <p style={{ color: "#666", margin: 0 }}>
          Manage dealership vehicles and sales stock.
        </p>
      </header>

      {/* TOP FILTER STRIP */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <FilterBox
          title="All"
          value={counts.all}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <FilterBox
          title="Available"
          value={counts.available}
          active={statusFilter === "available"}
          onClick={() => setStatusFilter("available")}
        />
        <FilterBox
          title="Sold"
          value={counts.sold}
          active={statusFilter === "sold"}
          onClick={() => setStatusFilter("sold")}
        />
        <FilterBox
          title="Reserved"
          value={counts.reserved}
          active={statusFilter === "reserved"}
          onClick={() => setStatusFilter("reserved")}
        />
      </div>

      {/* CREATE VEHICLE BLOCK */}
      {businessId && (
        <div style={{ marginBottom: 28 }}>
          <VehicleRegistryBlock businessId={businessId} onCreated={initialize} />
        </div>
      )}

      {/* VEHICLE LIST */}
      {loading ? (
        <div>Loading vehicles...</div>
      ) : filteredVehicles.length === 0 ? (
        <div
          style={{
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fff",
          }}
        >
          No vehicles found for this filter.
        </div>
      ) : (
        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {filteredVehicles.map((v) => {
            const isOpen = openVehicleId === v.id;

            return (
              <div
                key={v.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
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
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>
                        🚗 {v.vehicle_code || "Vehicle"}
                      </div>

                      <div style={{ fontSize: 14, color: "#444", marginTop: 4 }}>
                        {v.registration || "No Reg"} — {v.make || "—"} {v.model || ""}
                      </div>

                      <div style={{ marginTop: 8, fontSize: 14 }}>
                        <b>Status:</b> {v.status || "—"}
                      </div>

                      <div style={{ marginTop: 6, fontSize: 14 }}>
                        <b>Selling:</b> {formatMoney(v.selling_price)}
                      </div>
                    </div>

                    <div style={{ fontSize: 22, fontWeight: 700 }}>
                      {isOpen ? "−" : "+"}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 18px 18px 18px", lineHeight: 1.7 }}>
                    <div><b>Type:</b> {v.type || "—"}</div>
                    <div><b>Year:</b> {v.year ?? "—"}</div>
                    <div><b>Fuel:</b> {v.fuel_type || "—"}</div>
                    <div><b>KM:</b> {v.current_km ?? 0} km</div>
                    <div><b>Colour:</b> {v.colour || "—"}</div>
                    <div><b>Purchase Source:</b> {v.purchase_source || "—"}</div>
                    <div><b>Bought From:</b> {v.bought_from || "—"}</div>
                    <div><b>Purchase Price:</b> {formatMoney(v.purchase_price)}</div>
                    <div><b>Selling Price:</b> {formatMoney(v.selling_price)}</div>
                    <div><b>Purchase Date:</b> {formatDate(v.purchase_date)}</div>
                    <div><b>VIN:</b> {v.vin_number || "—"}</div>

                    {v.load_capacity && <div><b>Load Capacity:</b> {v.load_capacity}</div>}
                    {v.engine_capacity && <div><b>Engine:</b> {v.engine_capacity}</div>}
                    {v.notes && <div><b>Notes:</b> {v.notes}</div>}

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 14,
                      }}
                    >
                      <button
                        onClick={() => navigate("/motor/deals")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid #ccc",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        View Deals
                      </button>

                      <button
                        onClick={() => navigate("/motor/customers")}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid #ccc",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        View Customers
                      </button>
                    </div>
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

function FilterBox({
  title,
  value,
  active,
  onClick,
}: {
  title: string;
  value: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 110,
        padding: 14,
        borderRadius: 10,
        border: active ? "2px solid black" : "1px solid #ddd",
        background: active ? "#f3f3f3" : "white",
        cursor: "pointer",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#444" }}>{title}</div>
    </button>
  );
}