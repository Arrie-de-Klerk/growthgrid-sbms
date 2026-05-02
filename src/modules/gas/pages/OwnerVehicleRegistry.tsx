// src/modules/gas/pages/OwnerVehicleRegistry.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";
import { supabase } from "../../../shared/lib/supabase";
import VehicleRegistryBlock from "../components/VehicleRegistryBlock";

type Vehicle = {
  id: string;
  business_id: string;
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
  created_at?: string | null;
};

export default function OwnerVehicleRegistry() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [openVehicleId, setOpenVehicleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  async function getBusinessId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("Not logged in.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.business_id) {
      throw new Error("No business linked to this user.");
    }

    return profile.business_id as string;
  }

  async function initialize() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const bid = await getBusinessId();
      setBusinessId(bid);

      const { data, error } = await supabase
        .from("vehicles")
        .select(
          `
          id,
          business_id,
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
          notes,
          created_at
          `
        )
        .eq("business_id", bid)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setVehicles((data || []) as Vehicle[]);
    } catch (err: any) {
      console.error("OwnerVehicleRegistry error:", err.message);
      setErrorMsg(err.message || "Could not load vehicle registry.");
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return vehicles;

    return vehicles.filter((v) =>
      [
        v.vehicle_code,
        v.registration,
        v.vehicle_type,
        v.make,
        v.model,
        v.year,
        v.vin_number,
        v.load_capacity,
        v.fuel_type,
        v.engine_capacity,
        v.status,
        v.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [vehicles, search]);

  const activeVehicles = vehicles.filter(
    (v) => (v.status || "").toLowerCase() !== "sold"
  ).length;

  const soldVehicles = vehicles.filter(
    (v) => (v.status || "").toLowerCase() === "sold"
  ).length;

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🗂 Vehicle Registry</h1>
          <p style={subtitleStyle}>
            Manage gas business vehicle profiles and asset details.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas")} style={secondaryButtonStyle}>
            Back to Dashboard
          </button>

          <button onClick={initialize} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </header>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      <div style={summaryGridStyle}>
        <SummaryBox label="Total Vehicles" value={vehicles.length.toString()} />
        <SummaryBox label="Active Vehicles" value={activeVehicles.toString()} />
        <SummaryBox label="Sold / Inactive" value={soldVehicles.toString()} />
      </div>

      {businessId && (
        <section style={createPanelStyle}>
          <VehicleRegistryBlock businessId={businessId} onCreated={initialize} />
        </section>
      )}

      <section style={listHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>Registered Vehicles</h2>
          <p style={smallTextStyle}>
            Click a vehicle card to open full details.
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search registration, make, model, VIN..."
          style={searchStyle}
        />
      </section>

      {loading ? (
        <div style={infoStyle}>Loading vehicles...</div>
      ) : filteredVehicles.length === 0 ? (
        <div style={emptyStyle}>
          {vehicles.length === 0
            ? "No vehicles registered yet."
            : "No vehicles match your search."}
        </div>
      ) : (
        <div style={vehicleGridStyle}>
          {filteredVehicles.map((v) => {
            const isOpen = openVehicleId === v.id;

            return (
              <div key={v.id} style={vehicleCardStyle}>
                <button
                  type="button"
                  onClick={() => setOpenVehicleId(isOpen ? null : v.id)}
                  style={vehicleHeaderButtonStyle}
                >
                  <div style={vehicleHeaderInnerStyle}>
                    <div>
                      <div style={vehicleCodeStyle}>
                        🚗 {v.vehicle_code || v.registration || "Vehicle"}
                      </div>

                      <div style={vehicleSubStyle}>
                        {v.registration || "No Registration"} —{" "}
                        {[v.make, v.model].filter(Boolean).join(" ") ||
                          "No make/model"}
                      </div>

                      <div style={statusLineStyle}>
                        Status:{" "}
                        <span style={statusPillStyle}>
                          {v.status || "Active"}
                        </span>
                      </div>
                    </div>

                    <div style={toggleStyle}>{isOpen ? "−" : "+"}</div>
                  </div>
                </button>

                {isOpen && (
                  <div style={detailsStyle}>
                    <Detail label="Type" value={v.vehicle_type} />
                    <Detail label="Year" value={v.year?.toString()} />
                    <Detail label="VIN" value={v.vin_number} />
                    <Detail label="Load Capacity" value={v.load_capacity} />
                    <Detail label="Fuel" value={v.fuel_type} />
                    <Detail label="Engine" value={v.engine_capacity} />
                    <Detail
                      label="Service Every"
                      value={
                        v.service_interval_km
                          ? `${formatNumber(v.service_interval_km)} km`
                          : null
                      }
                    />
                    <Detail label="Purchase Date" value={formatDate(v.purchase_date)} />
                    <Detail
                      label="Purchase Price"
                      value={
                        v.purchase_price != null
                          ? formatMoney(v.purchase_price)
                          : null
                      }
                    />
                    <Detail
                      label="Odometer Start"
                      value={
                        v.odometer_start_km != null
                          ? `${formatNumber(v.odometer_start_km)} km`
                          : null
                      }
                    />
                    <Detail label="Notes" value={v.notes} />
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

/* ================= SMALL COMPONENTS ================= */

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={detailRowStyle}>
      <b>{label}:</b> {value || "—"}
    </div>
  );
}

/* ================= HELPERS ================= */

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-ZA", {
    maximumFractionDigits: 0,
  });
}

function formatMoney(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1200,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 28,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 900,
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  color: "#666",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const refreshButtonStyle: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
  marginBottom: 24,
};

const summaryBoxStyle: CSSProperties = {
  padding: 18,
  borderRadius: 14,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const summaryLabelStyle: CSSProperties = {
  color: "#666",
  fontSize: 13,
  fontWeight: 800,
};

const summaryValueStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  marginTop: 5,
};

const createPanelStyle: CSSProperties = {
  marginBottom: 30,
};

const listHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 18,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  fontWeight: 900,
};

const smallTextStyle: CSSProperties = {
  margin: "5px 0 0",
  color: "#666",
  fontSize: 14,
};

const searchStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  minWidth: 320,
  fontSize: 14,
};

const vehicleGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
  gap: 20,
};

const vehicleCardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "#fff",
  overflow: "hidden",
  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
};

const vehicleHeaderButtonStyle: CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: 18,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const vehicleHeaderInnerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
};

const vehicleCodeStyle: CSSProperties = {
  fontWeight: 900,
  fontSize: 18,
};

const vehicleSubStyle: CSSProperties = {
  fontSize: 14,
  color: "#444",
  marginTop: 4,
};

const statusLineStyle: CSSProperties = {
  fontSize: 14,
  marginTop: 8,
};

const statusPillStyle: CSSProperties = {
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  background: "#e8f5e9",
  color: "#1b5e20",
  fontWeight: 800,
  fontSize: 12,
};

const toggleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  opacity: 0.65,
};

const detailsStyle: CSSProperties = {
  padding: "0 18px 18px",
  lineHeight: 1.7,
  fontSize: 14,
};

const detailRowStyle: CSSProperties = {
  borderTop: "1px solid #f0f0f0",
  paddingTop: 7,
  marginTop: 7,
};

const infoStyle: CSSProperties = {
  padding: 18,
  color: "#666",
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
  color: "#666",
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  marginBottom: 20,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 800,
};