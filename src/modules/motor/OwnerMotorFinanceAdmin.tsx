import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";

type Deal = {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string;
  vehicle_name: string | null;
  status: string | null;

  wesbank_sent: boolean | null;
  mfc_sent: boolean | null;
  absa_sent: boolean | null;
  standard_sent: boolean | null;

  wesbank_rate: number | null;
  mfc_rate: number | null;
  absa_rate: number | null;
  standard_rate: number | null;

  approved_bank: string | null;
};

export default function OwnerMotorFinanceAdmin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const statusFilter = searchParams.get("status") || "all";

  useEffect(() => {
    void loadDeals();
  }, []);

  async function loadDeals() {
    setLoading(true);
    setErrorMsg(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMsg("You are not logged in.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      setErrorMsg("No business linked to this user.");
      setLoading(false);
      return;
    }

    const bid = profile.business_id as string;
    setBusinessId(bid);

    const { data, error } = await supabase
      .from("motor_deals")
      .select(`
        id,
        business_id,
        customer_id,
        customer_name,
        vehicle_name,
        status,
        wesbank_sent,
        mfc_sent,
        absa_sent,
        standard_sent,
        wesbank_rate,
        mfc_rate,
        absa_rate,
        standard_rate,
        approved_bank
      `)
      .eq("business_id", bid)
      .in("status", ["submitted", "approved", "delivery"])
      .order("customer_name", { ascending: true });

    if (error) {
      console.error("Finance load error:", error);
      setErrorMsg(error.message);
      setDeals([]);
    } else {
      setDeals((data as Deal[]) || []);
    }

    setLoading(false);
  }

  async function updateDeal(id: string, updates: Partial<Deal>) {
    const { error } = await supabase
      .from("motor_deals")
      .update(updates)
      .eq("id", id)
      .eq("business_id", businessId!);

    if (error) {
      console.error("Finance update error:", error);
      setErrorMsg(error.message);
      return;
    }

    await loadDeals();
  }

  const counts = useMemo(() => {
    return {
      all: deals.length,
      submitted: deals.filter((d) => (d.status || "").toLowerCase() === "submitted").length,
      approved: deals.filter((d) => (d.status || "").toLowerCase() === "approved").length,
      delivery: deals.filter((d) => (d.status || "").toLowerCase() === "delivery").length,
    };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    if (statusFilter === "all") return deals;
    return deals.filter(
      (d) => (d.status || "").toLowerCase() === statusFilter.toLowerCase()
    );
  }, [deals, statusFilter]);

  function setStatusFilter(next: string) {
    if (next === "all") {
      setSearchParams({});
      return;
    }
    setSearchParams({ status: next });
  }

  if (loading) {
    return <p style={{ padding: 32 }}>Loading finance…</p>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      {/* TOP NAV */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <button onClick={() => navigate("/motor")} style={lightBtn}>
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/motor/team")} style={lightBtn}>
            Team
          </button>
          <button onClick={() => navigate("/motor/admin/documents")} style={lightBtn}>
            Documents
          </button>
          <button onClick={() => navigate("/motor/admin/finance")} style={lightBtn}>
            Bank / Finance
          </button>
          <button onClick={() => navigate("/motor/admin/approved-delivery")} style={darkBtn}>
            Delivery
          </button>
        </div>
      </div>

      <h1 style={{ marginBottom: 8 }}>🏦 Finance Admin</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 20 }}>
        Manage bank submissions, approval rates, and move deals into delivery.
      </p>

      {errorMsg && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#fff3f3",
            border: "1px solid #f0caca",
            color: "#9b1c1c",
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={statsRow}>
        <FilterBox
          title="All"
          value={counts.all}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <FilterBox
          title="Submitted"
          value={counts.submitted}
          active={statusFilter === "submitted"}
          onClick={() => setStatusFilter("submitted")}
        />
        <FilterBox
          title="Approved"
          value={counts.approved}
          active={statusFilter === "approved"}
          onClick={() => setStatusFilter("approved")}
        />
        <FilterBox
          title="Delivery"
          value={counts.delivery}
          active={statusFilter === "delivery"}
          onClick={() => setStatusFilter("delivery")}
        />
      </div>

      {filteredDeals.length === 0 ? (
        <p style={{ marginTop: 24 }}>No finance deals in this filter yet.</p>
      ) : (
        filteredDeals.map((deal) => (
          <div key={deal.id} style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <h3 style={{ margin: 0 }}>
                {deal.customer_name} – {deal.vehicle_name || "No vehicle"}
              </h3>

              <div style={statusBadge}>{deal.status || "—"}</div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 14,
              }}
            >
              {deal.customer_id && (
                <button
                  onClick={() => navigate(`/motor/customers/${deal.customer_id}`)}
                  style={smallBtn}
                >
                  Customer
                </button>
              )}

              <button
                onClick={() => navigate(`/motor/deals/${deal.id}`)}
                style={smallBtn}
              >
                Deal
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <BankRow
                label="WesBank"
                checked={!!deal.wesbank_sent}
                rate={deal.wesbank_rate}
                onToggle={(checked) =>
                  void updateDeal(deal.id, { wesbank_sent: checked })
                }
                onRateChange={(value) =>
                  void updateDeal(deal.id, { wesbank_rate: value })
                }
              />

              <BankRow
                label="MFC"
                checked={!!deal.mfc_sent}
                rate={deal.mfc_rate}
                onToggle={(checked) =>
                  void updateDeal(deal.id, { mfc_sent: checked })
                }
                onRateChange={(value) =>
                  void updateDeal(deal.id, { mfc_rate: value })
                }
              />

              <BankRow
                label="ABSA"
                checked={!!deal.absa_sent}
                rate={deal.absa_rate}
                onToggle={(checked) =>
                  void updateDeal(deal.id, { absa_sent: checked })
                }
                onRateChange={(value) =>
                  void updateDeal(deal.id, { absa_rate: value })
                }
              />

              <BankRow
                label="Standard Bank"
                checked={!!deal.standard_sent}
                rate={deal.standard_rate}
                onToggle={(checked) =>
                  void updateDeal(deal.id, { standard_sent: checked })
                }
                onRateChange={(value) =>
                  void updateDeal(deal.id, { standard_rate: value })
                }
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ fontWeight: 600, marginRight: 10 }}>
                Approved Bank:
              </label>

              <select
                value={deal.approved_bank ?? ""}
                onChange={(e) => {
                  const bank = e.target.value;
                  void updateDeal(deal.id, {
                    approved_bank: bank || null,
                    status: bank ? "approved" : deal.status,
                  });
                }}
                style={selectField}
              >
                <option value="">Select Approved Bank</option>
                <option value="wesbank">WesBank</option>
                <option value="mfc">MFC</option>
                <option value="absa">ABSA</option>
                <option value="standard">Standard Bank</option>
              </select>
            </div>

            {deal.approved_bank && (
              <div style={{ marginTop: 10, color: "green", fontWeight: 700 }}>
                ✅ Approved: {deal.approved_bank.toUpperCase()}
              </div>
            )}

            {deal.status === "approved" && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => void updateDeal(deal.id, { status: "delivery" })}
                  style={moveBtn}
                >
                  Move to Delivery
                </button>
              </div>
            )}

            {deal.status === "delivery" && (
              <div style={{ marginTop: 10, color: "#0a7", fontWeight: 700 }}>
                🚗 Ready for Delivery
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function BankRow({
  label,
  checked,
  rate,
  onToggle,
  onRateChange,
}: {
  label: string;
  checked: boolean;
  rate: number | null;
  onToggle: (checked: boolean) => void;
  onRateChange: (value: number | null) => void;
}) {
  return (
    <label style={row}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
      />
      <span style={{ minWidth: 110 }}>{label}</span>
      <input
        type="number"
        placeholder="Rate %"
        value={rate ?? ""}
        onChange={(e) =>
          onRateChange(e.target.value ? Number(e.target.value) : null)
        }
        style={rateInput}
      />
    </label>
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

const statsRow: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 20,
};

const card: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 16,
  marginBottom: 16,
  background: "#fff",
};

const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
  flexWrap: "wrap",
};

const rateInput: CSSProperties = {
  width: 90,
  padding: 8,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const selectField: CSSProperties = {
  padding: 8,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const statusBadge: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "black",
  color: "white",
  fontWeight: 700,
  textTransform: "capitalize",
};

const moveBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const smallBtn: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const lightBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const darkBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};