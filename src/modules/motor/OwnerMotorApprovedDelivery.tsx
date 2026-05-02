import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";

type Deal = {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string;
  vehicle_id: string | null;
  vehicle_name: string | null;
  status: string | null;
  approved_bank: string | null;
  vehicle_ready: boolean | null;
  registration_ready: boolean | null;
  handover_ready: boolean | null;
  created_at: string | null;
  date: string | null;
};

function prettyStatus(status: string | null) {
  if (status === "approved") return "Approved";
  if (status === "delivery") return "Delivery";
  if (status === "sold") return "Sold";
  if (status === "cancelled") return "Cancelled";
  return status || "-";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB");
}

export default function OwnerMotorApprovedDelivery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);
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
        vehicle_id,
        vehicle_name,
        status,
        approved_bank,
        vehicle_ready,
        registration_ready,
        handover_ready,
        created_at,
        date
      `)
      .eq("business_id", bid)
      .in("status", ["approved", "delivery"])
      .order("customer_name", { ascending: true });

    if (error) {
      console.error("Approved/Delivery load error:", error);
      setErrorMsg(error.message);
      setDeals([]);
    } else {
      setDeals((data as Deal[]) || []);
    }

    setLoading(false);
  }

  async function updateDeal(id: string, updates: Partial<Deal>) {
    if (!businessId) return;

    const { error } = await supabase
      .from("motor_deals")
      .update(updates)
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Approved/Delivery update error:", error);
      setErrorMsg(error.message);
      return;
    }

    await loadDeals();
  }

  async function markSold(deal: Deal) {
    if (!businessId) return;

    setErrorMsg(null);

    const { error: dealError } = await supabase
      .from("motor_deals")
      .update({ status: "sold" })
      .eq("id", deal.id)
      .eq("business_id", businessId);

    if (dealError) {
      console.error("Mark sold deal error:", dealError);
      setErrorMsg(dealError.message);
      return;
    }

    if (deal.vehicle_id) {
      const { error: vehicleError } = await supabase
        .from("motor_vehicles")
        .update({ status: "sold" })
        .eq("id", deal.vehicle_id)
        .eq("business_id", businessId);

      if (vehicleError) {
        console.error("Mark sold vehicle error:", vehicleError);
        setErrorMsg(vehicleError.message);
        return;
      }
    }

    await loadDeals();
  }

  const counts = useMemo(() => {
    return {
      all: deals.length,
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
    return <div style={{ padding: 32 }}>Loading approved / delivery...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1150, margin: "0 auto" }}>
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

      <h1 style={{ marginBottom: 8 }}>Approved / Delivery</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 20 }}>
        Manage approved finance deals and move them through delivery and handover.
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

      {/* FILTER STRIP */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 22,
        }}
      >
        <FilterBox
          title="All"
          value={counts.all}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
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
        <div style={emptyCard}>No approved or delivery deals yet.</div>
      ) : (
        filteredDeals.map((deal) => {
          const readyToSell =
            !!deal.vehicle_ready &&
            !!deal.registration_ready &&
            !!deal.handover_ready;

          return (
            <div key={deal.id} style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <h3 style={{ marginBottom: 8, marginTop: 0 }}>
                  {deal.customer_name} – {deal.vehicle_name || "No vehicle"}
                </h3>

                <div style={statusBadge}>{prettyStatus(deal.status)}</div>
              </div>

              <p style={{ margin: "4px 0", color: "#555" }}>
                Date: <strong>{formatDate(deal.date || deal.created_at)}</strong>
              </p>

              <p style={{ margin: "4px 0", color: "#555" }}>
                Approved Bank: <strong>{deal.approved_bank || "-"}</strong>
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 12,
                  marginBottom: 8,
                }}
              >
                {deal.customer_id && (
                  <button
                    onClick={() => navigate(`/motor/customers/${deal.customer_id}`)}
                    style={lightBtn}
                  >
                    Open Customer
                  </button>
                )}

                <button
                  onClick={() => navigate(`/motor/deals/${deal.id}`)}
                  style={lightBtn}
                >
                  Open Deal
                </button>

                <button
                  onClick={() => navigate("/motor/money")}
                  style={lightBtn}
                >
                  Open Money
                </button>
              </div>

              {deal.status === "approved" && (
                <div style={{ marginTop: 12 }}>
                  <button
                    onClick={() => void updateDeal(deal.id, { status: "delivery" })}
                    style={blackBtn}
                  >
                    Move to Delivery
                  </button>
                </div>
              )}

              {deal.status === "delivery" && (
                <>
                  <div style={{ marginTop: 16 }}>
                    <label style={row}>
                      <input
                        type="checkbox"
                        checked={!!deal.vehicle_ready}
                        onChange={(e) =>
                          void updateDeal(deal.id, {
                            vehicle_ready: e.target.checked,
                          })
                        }
                      />
                      Vehicle Ready
                    </label>

                    <label style={row}>
                      <input
                        type="checkbox"
                        checked={!!deal.registration_ready}
                        onChange={(e) =>
                          void updateDeal(deal.id, {
                            registration_ready: e.target.checked,
                          })
                        }
                      />
                      Registration Ready
                    </label>

                    <label style={row}>
                      <input
                        type="checkbox"
                        checked={!!deal.handover_ready}
                        onChange={(e) =>
                          void updateDeal(deal.id, {
                            handover_ready: e.target.checked,
                          })
                        }
                      />
                      Handover Ready
                    </label>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginTop: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => void markSold(deal)}
                      style={{
                        ...greenBtn,
                        opacity: readyToSell ? 1 : 0.6,
                        cursor: readyToSell ? "pointer" : "not-allowed",
                      }}
                      disabled={!readyToSell}
                    >
                      Mark Sold
                    </button>

                    <button
                      onClick={() =>
                        void updateDeal(deal.id, {
                          status: "cancelled",
                          vehicle_ready: false,
                          registration_ready: false,
                          handover_ready: false,
                        })
                      }
                      style={redBtn}
                    >
                      Cancel Deal
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })
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

const emptyCard: CSSProperties = {
  padding: 18,
  border: "1px solid #ddd",
  borderRadius: 10,
  background: "#fff",
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
  marginBottom: 10,
};

const statusBadge: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "black",
  color: "white",
  fontWeight: 700,
  textTransform: "capitalize",
};

const blackBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
};

const greenBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#2e7d32",
  color: "white",
  fontWeight: 600,
};

const redBtn: CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#c62828",
  color: "white",
  fontWeight: 600,
  cursor: "pointer",
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