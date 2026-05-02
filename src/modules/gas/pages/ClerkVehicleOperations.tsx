// src/modules/gas/pages/ClerkVehicleOperations.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CSSProperties, FormEvent } from "react";
import { supabase } from "../../../shared/lib/supabase";

type Vehicle = {
  id: string;
  business_id: string;
  registration: string;
  make: string | null;
  model: string | null;
};

export default function ClerkVehicleOperations() {
  const navigate = useNavigate();

  const businessDate = getTodayISO();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Gas Business");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  const [driverName, setDriverName] = useState("");
  const [area, setArea] = useState("");
  const [odometerOut, setOdometerOut] = useState("");
  const [odometerIn, setOdometerIn] = useState("");
  const [fuelAmount, setFuelAmount] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");

  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  async function getBusinessId() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error("You are not logged in.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", session.user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.business_id) {
      throw new Error("This clerk is not linked to a business yet.");
    }

    return profile.business_id as string;
  }

  async function loadPage() {
    setPageLoading(true);
    setErrorMsg(null);

    try {
      const activeBusinessId = await getBusinessId();
      setBusinessId(activeBusinessId);

      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", activeBusinessId)
        .maybeSingle();

      setBusinessName(
        business?.name ||
          business?.business_name ||
          business?.company_name ||
          "Gas Business"
      );

      const { data, error } = await supabase
        .from("vehicles")
        .select("id, business_id, registration, make, model")
        .eq("business_id", activeBusinessId)
        .order("registration", { ascending: true });

      if (error) throw error;

      setVehicles((data || []) as Vehicle[]);
    } catch (err: any) {
      console.error("ClerkVehicleOperations load error:", err.message);
      setErrorMsg(err.message || "Could not load vehicle operations page.");
      setVehicles([]);
    } finally {
      setPageLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (saving) return;

    setErrorMsg(null);

    try {
      if (!businessId) {
        throw new Error("Business not loaded yet. Please refresh the page.");
      }

      if (!selectedVehicleId) {
        throw new Error("Please select a vehicle.");
      }

      if (!driverName.trim()) {
        throw new Error("Please add the driver name.");
      }

      if (!area.trim()) {
        throw new Error("Please add the area.");
      }

      if (!odometerOut.trim()) {
        throw new Error("Please add Odometer Out.");
      }

      const outKm = Number(odometerOut);
      const inKm = odometerIn ? Number(odometerIn) : null;

      if (Number.isNaN(outKm) || outKm < 0) {
        throw new Error("Odometer Out must be a valid number.");
      }

      if (inKm !== null && (Number.isNaN(inKm) || inKm < outKm)) {
        throw new Error("Odometer In cannot be less than Odometer Out.");
      }

      const fuelAmountNumber = fuelAmount ? Number(fuelAmount) : null;
      const fuelLitersNumber = fuelLiters ? Number(fuelLiters) : null;

      if (fuelAmountNumber !== null && fuelAmountNumber < 0) {
        throw new Error("Fuel amount cannot be negative.");
      }

      if (fuelLitersNumber !== null && fuelLitersNumber < 0) {
        throw new Error("Fuel liters cannot be negative.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in.");

      const selectedVehicle = vehicles.find(
        (vehicle) => vehicle.id === selectedVehicleId
      );

      if (!selectedVehicle) {
        throw new Error("Selected vehicle was not found.");
      }

      setSaving(true);

      const { error } = await supabase.from("vehicle_logs").insert({
        business_id: businessId,
        clerk_id: user.id,
        business_date: businessDate,
        captured_at: new Date().toISOString(),

        vehicle_id: selectedVehicleId,
        vehicle_reg: selectedVehicle.registration,

        driver_name: driverName.trim(),
        area: area.trim(),

        odometer_out: outKm,
        odometer_in: inKm,

        fuel_amount: fuelAmountNumber,
        fuel_liters: fuelLitersNumber,
      });

      if (error) throw error;

      alert("Vehicle log saved successfully.");

      setSelectedVehicleId("");
      setDriverName("");
      setArea("");
      setOdometerOut("");
      setOdometerIn("");
      setFuelAmount("");
      setFuelLiters("");

      navigate("/gas/clerk");
    } catch (err: any) {
      console.error("Vehicle log save error:", err.message);
      setErrorMsg(err.message || "Could not save vehicle log.");
    } finally {
      setSaving(false);
    }
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  if (pageLoading) {
    return <div style={{ padding: 32 }}>Loading vehicle operations...</div>;
  }

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>🚚 Vehicle Operations</h1>
          <p style={subtitleStyle}>
            {businessName} – capture daily vehicle mileage, driver, area and fuel.
          </p>

          <div style={dateBadgeStyle}>
            Date: <b>{businessDate}</b>
          </div>
        </div>

        <div style={buttonRowStyle}>
          <button onClick={() => navigate("/gas/clerk")} style={secondaryButtonStyle}>
            Back to Clerk Dashboard
          </button>

          <button onClick={loadPage} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </header>

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      {vehicles.length === 0 ? (
        <div style={emptyStyle}>
          No vehicles found for this business. Add vehicles in Owner Vehicle Registry first.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={formStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Vehicle</h2>

            <label style={labelStyle}>
              Vehicle *
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select vehicle</option>

                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration}
                    {[vehicle.make, vehicle.model].filter(Boolean).length > 0
                      ? ` - ${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedVehicle && (
              <div style={selectedVehicleBoxStyle}>
                Selected: <b>{selectedVehicle.registration}</b>
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Trip Details</h2>

            <div style={gridStyle}>
              <label style={labelStyle}>
                Driver Name *
                <input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  style={inputStyle}
                  placeholder="Driver name"
                />
              </label>

              <label style={labelStyle}>
                Area *
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  style={inputStyle}
                  placeholder="Area / route"
                />
              </label>

              <label style={labelStyle}>
                Odometer Out *
                <input
                  type="number"
                  value={odometerOut}
                  onChange={(e) => setOdometerOut(e.target.value)}
                  style={inputStyle}
                  placeholder="Start km"
                />
              </label>

              <label style={labelStyle}>
                Odometer In
                <input
                  type="number"
                  value={odometerIn}
                  onChange={(e) => setOdometerIn(e.target.value)}
                  style={inputStyle}
                  placeholder="End km"
                />
              </label>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Fuel</h2>

            <div style={gridStyle}>
              <label style={labelStyle}>
                Fuel Amount (R)
                <input
                  type="number"
                  step="0.01"
                  value={fuelAmount}
                  onChange={(e) => setFuelAmount(e.target.value)}
                  style={inputStyle}
                  placeholder="Example: 750"
                />
              </label>

              <label style={labelStyle}>
                Fuel Liters (L)
                <input
                  type="number"
                  step="0.01"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  style={inputStyle}
                  placeholder="Example: 38.5"
                />
              </label>
            </div>
          </section>

          <button type="submit" disabled={saving} style={submitButtonStyle}>
            {saving ? "Saving..." : "Save Vehicle Log"}
          </button>
        </form>
      )}
    </div>
  );
}

/* ================= HELPERS ================= */

function getTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 32,
  maxWidth: 950,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 24,
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

const dateBadgeStyle: CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  padding: "6px 10px",
  borderRadius: 999,
  background: "#e8f5e9",
  color: "#1b5e20",
  fontSize: 13,
  fontWeight: 700,
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

const formStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

const cardStyle: CSSProperties = {
  padding: 22,
  border: "1px solid #ddd",
  borderRadius: 14,
  background: "#fff",
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 16,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 800,
  fontSize: 13,
};

const inputStyle: CSSProperties = {
  padding: "11px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
};

const selectedVehicleBoxStyle: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 10,
  background: "#f7f7f7",
  color: "#444",
};

const submitButtonStyle: CSSProperties = {
  padding: "14px 18px",
  borderRadius: 10,
  border: "none",
  background: "#111",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const errorStyle: CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 800,
};

const emptyStyle: CSSProperties = {
  padding: 18,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
  color: "#666",
  fontWeight: 700,
};