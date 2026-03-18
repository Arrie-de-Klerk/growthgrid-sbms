// src/pages/OwnerInstallationsDetail.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function money(v?: number | null) {
  const n = Number(v ?? 0);

  return "R " + n.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const th = {
  padding: 8,
  borderBottom: "1px solid #ddd",
  textAlign: "left" as const,
};

const td = {
  padding: 8,
  borderBottom: "1px solid #eee",
};

type InstallationStatus =
  | "planned"
  | "pending"
  | "approved"
  | "in_progress"
  | "completed";

type InstallationRow = {
  id: string;
  business_id: string;
  created_at: string;
  installation_type: string;
  status: InstallationStatus;
  scheduled_date: string | null;
  notes: string | null;

  // existing
  total_material_cost: number | null;
  labour_cost: number | null;
  quoted_amount: number | null;
  total_install_cost: number | null;
  profit: number | null;

  // NEW (added by SQL above)
  appliance_make: string | null;
  appliance_model: string | null;
  appliance_size: string | null;
  appliance_price: number | null;

  profit_override: number | null;

  coc_required: boolean | null;
  coc_cost: number | null;
  coc_number: string | null;
  coc_issued_date: string | null; // date string

  km_estimated: number | null;
  km_actual: number | null;
  travel_cost_to_quote: number | null;
  travel_cost_actual: number | null;

  customer: { name: string } | null;

     /* ⭐ NEW SELLING SLOT FIELDS (VERY IMPORTANT) */
  appliance_profit_slot: number | null
  material_profit_slot: number | null
  labour_profit_slot: number | null
  transport_profit_slot: number | null
  coc_profit_slot: number | null

  }

type MaterialRow = {
  id: string;
  installation_id: string;
  description: string;
  quantity: number;
  unit_cost: number;
};

export default function OwnerInstallationsDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [row, setRow] = useState<InstallationRow | null>(null);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [materialLines, setMaterialLines] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState({
    appliance: false,
    materials: false,
    labour: false,
    travel: false,
    coc: false,
    profit: false,
    notes: false,
    timeline: false,
 });

  const [edit, setEdit] = useState<Partial<InstallationRow>>({});

  // local edit buffers

   useEffect(() => {
    if (!id) return;
    loadAll(id);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll(installationId: string) {
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
        total_material_cost,
        labour_cost,
        quoted_amount,
        total_install_cost,
        profit,

        appliance_make,
        appliance_model,
        appliance_size,
        appliance_price,

        appliance_profit_slot,
        material_profit_slot,
        labour_profit_slot,
        transport_profit_slot,
        coc_profit_slot,

        profit_override,
        coc_required,
        coc_cost,
        coc_number,
        coc_issued_date,
        km_estimated,
        km_actual,
        travel_cost_to_quote,
        travel_cost_actual,

        customer:customers!installations_customer_id_fkey ( name )
     `)
      .eq("id", installationId)
      .single();

    if (error) {
      console.error("Load installation error:", error);
      alert(error.message);
      setLoading(false);
      return;
    }
    
    const { data: mats, error: matsErr } = await supabase
      .from("installation_materials")
      .select("id, installation_id, description, quantity, unit_cost")
      .eq("installation_id", installationId)
      .order("created_at", { ascending: true });

    if (matsErr) {
      console.error("Load materials error:", matsErr);
      alert(matsErr.message);
      setLoading(false);
      return;
    }

      setRow(data as unknown as InstallationRow);
      setMaterials((mats as MaterialRow[]) || []);
      setMaterialLines((mats as MaterialRow[]) || []);
      setEdit({});
      setLoading(false);
     }     

    function patch(changes: Partial<InstallationRow>) {
       setEdit((p) => ({ ...p, ...changes }));
      }

    function get<T extends keyof InstallationRow>(key: T) {
       if (!row) return undefined as any;
       return (edit[key] ?? row[key]) as InstallationRow[T];
      }

      function addMaterialLine() {
  if (!row) return;

  setMaterialLines((prev) => [
    ...prev,
    {
      id: `new_${crypto.randomUUID()}`,
      installation_id: row.id,
      description: "",
      quantity: 1,
      unit_cost: 0,
    },
  ]);
}

function removeMaterialLine(index: number) {
  setMaterialLines((prev) => {
    const next = prev.filter((_, i) => i !== index);

    if (next.length === 0 && row) {
      return [
        {
          id: `new_${crypto.randomUUID()}`,
          installation_id: row.id,
          description: "",
          quantity: 1,
          unit_cost: 0,
        },
      ];
    }

    return next;
  });
}

function updateMaterial(
  index: number,
  field: keyof MaterialRow,
  value: string | number
) {
  setMaterialLines((prev) => {
    const copy = [...prev];
    copy[index] = { ...copy[index], [field]: value };
    return copy;
  });
}

  const materialCost = useMemo(() => {
  return materialLines.reduce(
    (sum, m) => sum + Number(m.quantity || 0) * Number(m.unit_cost || 0),
    0
  );
}, [materialLines]);

const computed = useMemo(() => {

  const applianceCost = Number(get("appliance_price") || 0)
  const applianceSell = Number(get("appliance_profit_slot") || 0)

  const materialCost = materialLines.reduce(
    (s, m) => s + Number(m.quantity || 0) * Number(m.unit_cost || 0),
    0
  )
  const materialSell = Number(get("material_profit_slot") || 0)

  const labourCost = Number(get("labour_cost") || 0)
  const labourSell = Number(get("labour_profit_slot") || 0)

  const transportCost = Number(get("travel_cost_to_quote") || 0)
  const transportSell = Number(get("transport_profit_slot") || 0)

  const cocCost = Number(get("coc_cost") || 0)
  const cocSell = Number(get("coc_profit_slot") || 0)

  // ⭐ PROFIT PER SECTION
  const applianceProfit = applianceSell - applianceCost
  const materialProfit = materialSell - materialCost
  const labourProfit = labourSell - labourCost
  const transportProfit = transportSell - transportCost
  const cocProfit = cocSell - cocCost

  // ⭐ TOTAL COST
  const totalCost =
    applianceCost +
    materialCost +
    labourCost +
    transportCost +
    cocCost

  // ⭐ TOTAL SELLING (QUOTE TOTAL)
  const totalSelling =
    applianceSell +
    materialSell +
    labourSell +
    transportSell +
    cocSell

  // ⭐ TOTAL PROFIT (REAL)
  const totalProfit =
    applianceProfit +
    materialProfit +
    labourProfit +
    transportProfit +
    cocProfit

  return {
    applianceCost,
    materialCost,
    labourCost,
    transportCost,
    cocCost,

    applianceSell,
    materialSell,
    labourSell,
    transportSell,
    cocSell,

    applianceProfit,
    materialProfit,
    labourProfit,
    transportProfit,
    cocProfit,

    totalCost,
    totalSelling,
    totalProfit
  }

}, [materialLines, edit, row])

    async function saveAll(nextStatus?: InstallationStatus) {
        if (!row || !id) return;
        setSaving(true);

         try {
    
          
      // 1) Save materials cleanly from materialLines
const cleanLines = materialLines
  .map((m) => ({
    ...m,
    description: (m.description || "").trim(),
    quantity: Number(m.quantity || 0),
    unit_cost: Number(m.unit_cost || 0),
  }))
  .filter((m) => m.description.length > 0);

const originalIds = materials.map((m) => m.id);

const keptExistingIds = cleanLines
  .filter((m) => !m.id.startsWith("new_"))
  .map((m) => m.id);

const deletedIds = originalIds.filter((id) => !keptExistingIds.includes(id));

const upsertPayload = cleanLines
  .filter((m) => !m.id.startsWith("new_"))
  .map((m) => ({
    id: m.id,
    business_id: row.business_id,
    installation_id: row.id,
    description: m.description,
    quantity: m.quantity,
    unit_cost: m.unit_cost,
    item_type: "material",
  }));

const insertPayload = cleanLines
  .filter((m) => m.id.startsWith("new_"))
  .map((m) => ({
    business_id: row.business_id,
    installation_id: row.id,
    description: m.description,
    quantity: m.quantity,
    unit_cost: m.unit_cost,
    item_type: "material",   // ← fix next error also
  }));

if (upsertPayload.length > 0) {
  const { error } = await supabase
    .from("installation_materials")
    .upsert(upsertPayload);

  if (error) throw error;
}

if (insertPayload.length > 0) {
  const { error } = await supabase
    .from("installation_materials")
    .insert(insertPayload);

  if (error) throw error;
}

if (deletedIds.length > 0) {
  const { error } = await supabase
    .from("installation_materials")
    .delete()
    .in("id", deletedIds);

  if (error) throw error;
}

      // 2) Save header fields (owner editable)
      const payload: Partial<InstallationRow> = {
  installation_type: (get("installation_type") || "").trim(),
  scheduled_date: get("scheduled_date") ?? null,
  notes: get("notes") ?? null,

  appliance_make: (get("appliance_make") ?? "") || null,
  appliance_model: (get("appliance_model") ?? "") || null,
  appliance_size: (get("appliance_size") ?? "") || null,

  coc_required: !!get("coc_required"),
  km_estimated: Number(get("km_estimated") ?? 0),

  // PROFIT SLOTS
  appliance_profit_slot: Number(get("appliance_profit_slot") ?? 0),
  material_profit_slot: Number(get("material_profit_slot") ?? 0),
  labour_profit_slot: Number(get("labour_profit_slot") ?? 0),
  transport_profit_slot: Number(get("transport_profit_slot") ?? 0),
  coc_profit_slot: Number(get("coc_profit_slot") ?? 0),

  // COSTS FROM COMPUTED
  total_material_cost: Number(computed.materialCost.toFixed(2)),
  labour_cost: Number(computed.labourCost.toFixed(2)),
  travel_cost_to_quote: Number(computed.transportCost.toFixed(2)),
  coc_cost: Number(computed.cocCost.toFixed(2)),

  total_install_cost: Number(computed.totalCost.toFixed(2)),
  quoted_amount: Number(computed.totalSelling.toFixed(2)),
  profit: Number(computed.totalProfit.toFixed(2)),

  ...(nextStatus ? { status: nextStatus } : {}),
};

      const { error: upErr } = await supabase.from("installations").update(payload).eq("id", row.id);
      if (upErr) throw upErr;

      await loadAll(row.id);
    } catch (e: any) {
      console.error("SaveAll error:", e);
      alert(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function statusLabel(s: InstallationStatus) {
    if (s === "planned") return "Draft";
    if (s === "pending") return "Pending (Follow-up)";
    if (s === "approved") return "Approved (Sent to Clerk)";
    if (s === "in_progress") return "In Progress";
    if (s === "completed") return "Completed";
    return s;
  }

  if (loading) return <p style={{ padding: 32 }}>Loading installation…</p>;
  if (!row) return <p style={{ padding: 32 }}>Installation not found.</p>;

  const customerName =
  row.customer?.name || "Customer not linked";

  const status = (get("status") ?? row.status) as InstallationStatus;

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button onClick={() => nav(-1)} style={{ padding: "8px 10px", borderRadius: 8 }}>
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>Installation Detail</h1>
      </div>

      {/* TOP (always visible) */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 14,
          padding: 16,
          background: "#fff",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{customerName}</div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Created: {new Date(row.created_at).toLocaleString()}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900 }}>{statusLabel(status)}</div>
            <div style={{ fontSize: 12, color: "#666" }}>ID: {row.id}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 4 }}>
         <div style={{ fontSize: 20, fontWeight: 900 }}>
            Quote Total: {money(computed.totalSelling)}
         </div>
        </div>

        {/* MAIN ACTIONS */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          <button
            disabled={saving}
            onClick={() => saveAll()}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: "#000",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>

          {/* Save Quote → Pending */}
          {status === "planned" && (
            <button
              disabled={saving}
              onClick={() => saveAll("pending")}
              style={{ padding: "10px 12px", borderRadius: 10 }}
            >
              Save Quote (Pending)
            </button>
          )}

          {/* Approve → Approved (send to clerk) */}
          {(status === "pending" || status === "planned") && (
            <button
              disabled={saving}
              onClick={() => saveAll("approved")}
              style={{ padding: "10px 12px", borderRadius: 10 }}
            >
              Approve (Send to Clerk)
            </button>
          )}

          {/* Clerk will do these statuses, but owner can still see them */}
          {status === "approved" && (
            <span style={{ fontSize: 12, color: "#666", alignSelf: "center" }}>
              Waiting for Clerk to start job…
            </span>
          )}
        </div>
      </div>

      {/* COLLAPSIBLE SECTIONS */}
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {/* Appliance */}
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, background: "#fff" }}>
          <button
            onClick={() => setOpen((p) => ({ ...p, appliance: !p.appliance }))}
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              border: "none",
              background: "transparent",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Appliance (Make / Model / Size / Price)
          </button>
          {open.appliance && (
            <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Type</span>
                <input
                  value={String(get("installation_type") ?? "")}
                  onChange={(e) => patch({ installation_type: e.target.value })}
                  placeholder="geyser / stove / braai / hob / heater / other"
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Make</span>
                  <input
                    value={String(get("appliance_make") ?? "")}
                    onChange={(e) => patch({ appliance_make: e.target.value })}
                    placeholder="Cadac / Dewhot / etc"
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Model</span>
                  <input
                    value={String(get("appliance_model") ?? "")}
                    onChange={(e) => patch({ appliance_model: e.target.value })}
                    placeholder="Model number"
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Size</span>
                  <input
                    value={String(get("appliance_size") ?? "")}
                    onChange={(e) => patch({ appliance_size: e.target.value })}
                    placeholder="20L / 16L / 4-plate / etc"
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Appliance Cost Price</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={Number(get("appliance_price") ?? 0)}
                    onChange={(e) => patch({ appliance_price: Number(e.target.value || 0) })}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Appliance Cost + Profit</span>
                  <input
                   type="number"
                   step="0.01"
                   value={Number(get("appliance_profit_slot") ?? 0)}
                   onChange={(e) =>
               patch({ appliance_profit_slot: Number(e.target.value || 0) })
             }
             />
              </label>
              </div>
            </div>
          )}
        </div>

        {/* Materials */}
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, background: "#fff" }}>
  <button
    onClick={() => setOpen((p) => ({ ...p, materials: !p.materials }))}
    style={{
      width: "100%",
      textAlign: "left",
      padding: 14,
      border: "none",
      background: "transparent",
      fontWeight: 900,
      cursor: "pointer",
    }}
  >
    Materials (Manual Lines + Totals)
  </button>

  {open.materials && (
  <div style={{ padding: "0 14px 14px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
      <button onClick={addMaterialLine} style={{ padding: "8px 10px", borderRadius: 10 }}>
        + Add line
      </button>

      <div style={{ fontWeight: 900 }}>
        Materials Cost Total: {money(materialCost)}
      </div>
    </div>

    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "#f5f5f5" }}>
          <th style={th}>Description</th>
          <th style={th}>Qty</th>
          <th style={th}>Unit Price</th>
          <th style={th}>Line Total</th>
          <th style={th}>Action</th>
        </tr>
      </thead>

      <tbody>
        {materialLines.map((m: MaterialRow, i: number) => {
          const lineTotal =
            Number(m.quantity || 0) * Number(m.unit_cost || 0);

          return (
            <tr key={m.id}>
              <td style={td}>
                <input
                  value={m.description}
                  onChange={(e) =>
                    updateMaterial(i, "description", e.target.value)
                  }
                  style={{ width: "100%" }}
                />
              </td>

              <td style={td}>
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={m.quantity}
                  onChange={(e) =>
                    updateMaterial(i, "quantity", Number(e.target.value || 0))
                  }
                  style={{ width: 90 }}
                />
              </td>

              <td style={td}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={m.unit_cost}
                  onChange={(e) =>
                    updateMaterial(i, "unit_cost", Number(e.target.value || 0))
                  }
                  style={{ width: 120 }}
                />
              </td>

              <td style={{ ...td, fontWeight: 800 }}>
                {money(lineTotal)}
              </td>

              <td style={td}>
                <button onClick={() => removeMaterialLine(i)}>
                  Remove
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>

    {/* ⭐ SINGLE MATERIAL PROFIT */}
    <div style={{ marginTop: 14, display: "grid", gap: 6, maxWidth: 260 }}>
      <span style={{ fontWeight: 700 }}>Material Cost + Profit</span>
      <input
        type="number"
        step="0.01"
        value={Number(get("material_profit_slot") ?? 0)}
        onChange={(e) =>
          patch({ material_profit_slot: Number(e.target.value || 0) })
        }
  />
</div>

</div>   
)}       
</div>   

{/* Labour */}
<div style={{ border: "1px solid #e5e5e5", borderRadius: 14, background: "#fff" }}>
  <button
    onClick={() => setOpen((p) => ({ ...p, labour: !p.labour }))}
    style={{
      width: "100%",
      textAlign: "left",
      padding: 14,
      border: "none",
      background: "transparent",
      fontWeight: 900,
      cursor: "pointer",
    }}
  >
    Labour (Owner editable)
  </button>

  {open.labour && (
    <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700 }}>Labour cost</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={Number(get("labour_cost") ?? 0)}
          onChange={(e) => patch({ labour_cost: Number(e.target.value || 0) })}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 700 }}>Labour Cost + Profit</span>
        <input
          type="number"
          step="0.01"
          value={Number(get("labour_profit_slot") ?? 0)}
          onChange={(e) =>
          patch({ labour_profit_slot: Number(e.target.value || 0) })
       }
      />
      </label>

      </div>
      )}
      </div>
        {/* Travel / KM */}
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, background: "#fff" }}>
          <button
            onClick={() => setOpen((p) => ({ ...p, travel: !p.travel }))}
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              border: "none",
              background: "transparent",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Travel / KM (Estimated vs Actual)
          </button>
          {open.travel && (
            <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Estimated KM (Owner guess)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={Number(get("km_estimated") ?? 0)}
                    onChange={(e) => patch({ km_estimated: Number(e.target.value || 0) })}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Travel cost to charge on quote</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={Number(get("travel_cost_to_quote") ?? 0)}
                    onChange={(e) => patch({ travel_cost_to_quote: Number(e.target.value || 0) })}
                  />
                </label>
              </div>

              <div style={{ fontSize: 13, color: "#666" }}>
                <div>
                  <b>Actual KM:</b> {Number(row.km_actual ?? 0).toFixed(1)} km
                </div>
                <div>
                  <b>Actual travel cost:</b> {money(Number(row.travel_cost_actual ?? 0))}
                </div>
                <div style={{ marginTop: 6 }}>
                  (We’ll wire this from ClerkVehicleOperations by linking logs to installation_id.)
                
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Transport Cost + Profit</span>
                  <input
                    type="number"
                    step="0.01"
                    value={Number(get("transport_profit_slot") ?? 0)}
                    onChange={(e) =>
                    patch({ transport_profit_slot: Number(e.target.value || 0) })
                 }
              />
                 </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COC */}
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, background: "#fff" }}>
          <button
            onClick={() => setOpen((p) => ({ ...p, coc: !p.coc }))}
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              border: "none",
              background: "transparent",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            COC (Required? Cost? Issued number/date)
          </button>

          {open.coc && (
            <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={!!get("coc_required")}
                  onChange={(e) => patch({ coc_required: e.target.checked })}
                />
                <span style={{ fontWeight: 800 }}>COC required</span>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 700 }}>COC Cost</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={Number(get("coc_cost") ?? 0)}
                  onChange={(e) => patch({ coc_cost: Number(e.target.value || 0) })}
                  disabled={!get("coc_required")}
                />
              </label>

              <div style={{ fontSize: 13, color: "#666" }}>
                <div>
                  <b>COC Number:</b> {row.coc_number || "—"}
                </div>
                <div>
                  <b>COC Issued Date:</b> {row.coc_issued_date || "—"}
                </div>
                <div style={{ marginTop: 6 }}>
                  (Clerk fills this when job is complete.)
               
               <label style={{ display: "grid", gap: 6 }}>
                 <span style={{ fontWeight: 700 }}>COC Cost + Profit</span>
                 <input
                  type="number"
                  step="0.01"
                  value={Number(get("coc_profit_slot") ?? 0)}
                  onChange={(e) =>
                   patch({ coc_profit_slot: Number(e.target.value || 0) })
                }
              />
            </label>
            </div>
              </div>
            </div>
          )}
        </div>

        {/* ⭐ PROFIT SECTION HEADER — SAME STYLE AS OTHERS */}
         <div
          onClick={() => setOpen(p => ({ ...p, profit: !p.profit }))}
          style={{
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: "14px",
            fontWeight: 700,
            fontSize: 18,
            cursor: "pointer",
            background: "#fafafa",
            marginTop: 12
        }}
       >
         Profit control (Owner decides)
      </div>

        {/* Profit control */}
         
         {open.profit && (
           <div style={{ padding: "0 14px 14px", display: "grid", gap: 12 }}>

           <label style={{ display: "grid", gap: 6 }}>
             <span style={{ fontWeight: 700 }}>Total Profit (internal)</span>
           <input
              type="text"
              value={money(computed.totalProfit)}
              readOnly
              style={{ background: "#f5f5f5", fontWeight: 800 }}
          />
        </label>

      </div>
     )}

         {/* Notes */}
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, background: "#fff" }}>
          <button
            onClick={() => setOpen((p) => ({ ...p, notes: !p.notes }))}
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              border: "none",
              background: "transparent",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Notes
          </button>
          {open.notes && (
            <div style={{ padding: "0 14px 14px" }}>
              <textarea
                rows={4}
                value={String(get("notes") ?? "")}
                onChange={(e) => patch({ notes: e.target.value })}
                placeholder="Make/model details, job notes, client notes, etc."
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>


        {/* Timeline */}
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, background: "#fff" }}>
          <button
            onClick={() => setOpen((p) => ({ ...p, timeline: !p.timeline }))}
            style={{
              width: "100%",
              textAlign: "left",
              padding: 14,
              border: "none",
              background: "transparent",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Timeline
          </button>
          {open.timeline && (
            <div style={{ padding: "0 14px 14px", fontSize: 13, color: "#444" }}>
              <div><b>Created:</b> {new Date(row.created_at).toLocaleString()}</div>
              <div><b>Scheduled date:</b> {get("scheduled_date") || "—"}</div>
              <div><b>Status:</b> {statusLabel(status)}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "#777" }}>
        Note: “Pending” and “Approved” require the SQL status upgrade above. If your status column is plain text,
        it will work immediately.
      </div>
      </div>
    )

   }
