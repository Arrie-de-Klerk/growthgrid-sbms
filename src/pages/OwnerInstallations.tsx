// src/pages/OwnerInstallations.tsx

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

type InstallationStatus =
  | "planned"
  | "pending"
  | "approved"
  | "in_progress"
  | "completed";

type InstallationRow = {
  id: string;
  created_at: string;
  installation_type: string;
  status: InstallationStatus;
  scheduled_date: string | null;
  notes: string | null;

  quoted_amount: number | null;
  
  coc_number: string | null;
  coc_issued_date: string | null;

  appliance_profit_slot: number | null;
  material_profit_slot: number | null;
  labour_profit_slot: number | null;
  transport_profit_slot: number | null;
  coc_profit_slot: number | null;

 customers: {
  name: string;
  phone?: string;
  email?: string;
}[] | null;

};

  // ✅ NEW: joined materials rows (only fetching total_cost)
  
function money(n: number | null | undefined) {
  const safe = Number(n ?? 0);
  return `R ${safe.toFixed(2)}`;
}

export default function OwnerInstallations() {
  const nav = useNavigate();

  const [items, setItems] = useState<InstallationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
  .from("installations")
  .select(`
  id,
  business_id,
  created_at,
  installation_type,
  status,
  scheduled_date,
  notes,

  quoted_amount,

  appliance_profit_slot,
  material_profit_slot,
  labour_profit_slot,
  transport_profit_slot,
  coc_profit_slot,

  coc_number,
  coc_issued_date,

  customers ( name, phone, email )
`)
  .order("created_at", { ascending: false });
      
      
    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setItems((data as InstallationRow[]) || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: InstallationStatus) {
    const { error } = await supabase
      .from("installations")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await load();
  }
  
  if (loading) return <p style={{ padding: 32 }}>Loading installations…</p>;

return (
  <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
    <h1 style={{ marginBottom: 20 }}>Installations</h1>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 18,
      }}
    >
      {items.map((i) => {
        const customerName =
          Array.isArray(i.customers)
            ? i.customers[0]?.name
            : (i.customers as any)?.name ?? "Unknown Customer";

        const phone =
          Array.isArray(i.customers)
            ? i.customers[0]?.phone
            : undefined;

        const email =
          Array.isArray(i.customers)
            ? i.customers[0]?.email
            : undefined;

        const isOpen = openId === i.id;

        return (
          <div
            key={i.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 14,
              background: "#fff",
            }}
          >
            {/* HEADER */}
            <div
              onClick={() => setOpenId(isOpen ? null : i.id)}
              style={{
                padding: 16,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: 600,
              }}
            >
              <div>
                {customerName}
                <div style={{ fontSize: 12, color: "#666" }}>
                  {new Date(i.created_at).toLocaleString()}
                </div>
              </div>

              <div>{isOpen ? "▲ Hide" : "▼ Show"}</div>
            </div>

            {isOpen && (
              <div style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 13 }}>
                  {phone && (
                    <div>
                      <b>Phone:</b> {phone}
                    </div>
                  )}
                  {email && (
                    <div>
                      <b>Email:</b> {email}
                    </div>
                  )}
                </div>

                <div>
                  <b>What to Install:</b> {i.installation_type}
                </div>

                <div style={{ display: "grid", gap: 4 }}>

                <div>
                  <b>Appliance:</b> {money(i.appliance_profit_slot)}
                </div>

                <div>
                  <b>Material:</b> {money(i.material_profit_slot)}
                </div>

                <div>
                  <b>Labour:</b> {money(i.labour_profit_slot)}
                </div>

                <div>
                  <b>Transport:</b> {money(i.transport_profit_slot)}
                </div>

                <div>
                  <b>COC:</b> {money(i.coc_profit_slot)}
                </div>

                <div style={{ fontWeight: 700 }}>
                  <b>Total:</b> {money(i.quoted_amount)}
                </div>

               </div>

                {i.coc_number && (
                  <div style={{ fontSize: 13 }}>
                    <b>COC Number:</b> {i.coc_number}
                    <br />
                    <b>Issued:</b> {i.coc_issued_date || "—"}
                  </div>
                )}

                <div style={{ fontSize: 13 }}>
                  <b>Status:</b> {i.status}
                  <br />
                  <b>Scheduled:</b> {i.scheduled_date || "Not set"}
                </div>

                {i.notes && (
                  <div>
                    <b>Notes:</b>
                    <div style={{ fontSize: 13, color: "#555" }}>{i.notes}</div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    onClick={() =>
                      nav(`/dashboard/owner/installations/${i.id}`)
                    }
                    style={{ padding: "8px 12px", borderRadius: 8 }}
                  >
                    Open Detail
                  </button>

                  <button
                    onClick={() => updateStatus(i.id, "pending")}
                    style={{ padding: "8px 12px", borderRadius: 8 }}
                  >
                    Save Quote
                  </button>

                  <button
                    onClick={() => updateStatus(i.id, "approved")}
                    style={{ padding: "8px 12px", borderRadius: 8 }}
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>

)};