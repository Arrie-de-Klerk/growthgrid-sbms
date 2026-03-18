import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Installation = {
  id: string;
  status: string;
  scheduled_date: string | null;
  appliance_make: string | null;
  appliance_model: string | null;
  quoted_amount: number | null;
  coc_required: boolean | null;
  coc_number: string | null;
  coc_issued_date: string | null;
  customer: { name: string } | null;
};

export default function ClerkInstallations() {
  const [rows, setRows] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("installations")
      .select(`
        id,
        status,
        scheduled_date,
        appliance_make,
        appliance_model,
        quoted_amount,
        coc_required,
        coc_number,
        coc_issued_date,
        customer:customers(name)
      `)
      .in("status", ["approved", "in_progress"])
      .order("created_at", { ascending: false });

    if (!error && data) setRows(data as any);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function startJob(id: string) {
    setSavingId(id);

    const { error } = await supabase
      .from("installations")
      .update({ status: "in_progress" })
      .eq("id", id);

    if (!error) await load();

    setSavingId(null);
  }

  async function completeJob(row: Installation) {
    let cocNumber = null;
    let cocDate = null;

    if (row.coc_required) {
      cocNumber = prompt("Enter COC Number:");
      if (!cocNumber) return;

      cocDate = prompt("Enter COC Issued Date (YYYY-MM-DD):");
      if (!cocDate) return;
    }

    setSavingId(row.id);

    const { error } = await supabase
      .from("installations")
      .update({
        status: "completed",
        coc_number: cocNumber,
        coc_issued_date: cocDate,
      })
      .eq("id", row.id);

    if (!error) await load();

    setSavingId(null);
  }

  function statusColor(status: string) {
    if (status === "approved") return "#f39c12";
    if (status === "in_progress") return "#3498db";
    if (status === "completed") return "#2ecc71";
    return "#999";
  }

  if (loading) return <div style={{ padding: 30 }}>Loading installations…</div>;

  return (
    <div style={{ padding: 30 }}>
      <h1>Installer Jobs</h1>

      {rows.length === 0 && <p>No installations ready.</p>}

      <div style={{ display: "grid", gap: 16 }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 18,
              background: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>
                {row.customer?.name || "Customer"}
              </div>

              <div style={{ fontSize: 12, color: "#666" }}>
                {row.appliance_make} {row.appliance_model}
              </div>

              <div style={{ fontSize: 13 }}>
                Quote: R {Number(row.quoted_amount || 0).toFixed(2)}
              </div>

              {row.scheduled_date && (
                <div style={{ fontSize: 12 }}>
                  Date: {row.scheduled_date}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: statusColor(row.status),
                  color: "#fff",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {row.status}
              </div>

              {row.status === "approved" && (
                <button
                  onClick={() => startJob(row.id)}
                  disabled={savingId === row.id}
                >
                  Start Job
                </button>
              )}

              {row.status === "in_progress" && (
                <button
                  onClick={() => completeJob(row)}
                  disabled={savingId === row.id}
                >
                  Complete Job
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}