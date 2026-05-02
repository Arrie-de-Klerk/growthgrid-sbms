import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";

type DealRow = {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string;
  vehicle_name: string | null;
  status: string | null;
  id_copy: boolean | null;
  proof_of_address: boolean | null;
  payslip: boolean | null;
  bank_statements: boolean | null;
  drivers_license: boolean | null;
  documents_received: boolean | null;
};

export default function OwnerMotorAdminDocuments() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        id_copy,
        proof_of_address,
        payslip,
        bank_statements,
        drivers_license,
        documents_received
      `)
      .eq("business_id", bid)
      .in("status", ["new", "docs_pending"])
      .order("customer_name", { ascending: true });

    if (error) {
      console.error("Documents load error:", error);
      setErrorMsg(error.message);
      setDeals([]);
    } else {
      setDeals((data as DealRow[]) || []);
    }

    setLoading(false);
  }

  async function toggleDoc(
    deal: DealRow,
    field:
      | "id_copy"
      | "proof_of_address"
      | "payslip"
      | "bank_statements"
      | "drivers_license",
    checked: boolean
  ) {
    const next = {
      id_copy: field === "id_copy" ? checked : !!deal.id_copy,
      proof_of_address:
        field === "proof_of_address" ? checked : !!deal.proof_of_address,
      payslip: field === "payslip" ? checked : !!deal.payslip,
      bank_statements:
        field === "bank_statements" ? checked : !!deal.bank_statements,
      drivers_license:
        field === "drivers_license" ? checked : !!deal.drivers_license,
    };

    const allDone =
      next.id_copy &&
      next.proof_of_address &&
      next.payslip &&
      next.bank_statements &&
      next.drivers_license;

    const nextStatus = allDone ? "submitted" : "docs_pending";

    const { error } = await supabase
      .from("motor_deals")
      .update({
        ...next,
        documents_received: allDone,
        status: nextStatus,
      })
      .eq("id", deal.id)
      .eq("business_id", businessId!);

    if (error) {
      console.error("Document update error:", error);
      setErrorMsg(error.message);
      return;
    }

    if (allDone) {
      setDeals((prev) => prev.filter((d) => d.id !== deal.id));
    } else {
      setDeals((prev) =>
        prev.map((d) =>
          d.id === deal.id
            ? {
                ...d,
                ...next,
                documents_received: allDone,
                status: nextStatus,
              }
            : d
        )
      );
    }
  }

  const counts = useMemo(() => {
    return {
      total: deals.length,
      new: deals.filter((d) => (d.status || "").toLowerCase() === "new").length,
      docs: deals.filter((d) => (d.status || "").toLowerCase() === "docs_pending").length,
    };
  }, [deals]);

  if (loading) {
    return <div style={{ padding: 32 }}>Loading documents...</div>;
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

      <h1 style={{ marginBottom: 8 }}>Documents</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 20 }}>
        Collect and complete required paperwork before deals move to bank submission.
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
        <MiniStat title="Waiting" value={counts.total} />
        <MiniStat title="New" value={counts.new} />
        <MiniStat title="Docs Pending" value={counts.docs} />
      </div>

      {deals.length === 0 ? (
        <div style={emptyCard}>No deals waiting for documents.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={th}>Customer</th>
                <th style={th}>Vehicle</th>
                <th style={th}>ID Copy</th>
                <th style={th}>Proof of Address</th>
                <th style={th}>Payslip</th>
                <th style={th}>Bank Statements</th>
                <th style={th}>Driver License</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td style={td}>{deal.customer_name}</td>
                  <td style={td}>{deal.vehicle_name || "—"}</td>

                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={!!deal.id_copy}
                      onChange={(e) => toggleDoc(deal, "id_copy", e.target.checked)}
                    />
                  </td>

                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={!!deal.proof_of_address}
                      onChange={(e) =>
                        toggleDoc(deal, "proof_of_address", e.target.checked)
                      }
                    />
                  </td>

                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={!!deal.payslip}
                      onChange={(e) => toggleDoc(deal, "payslip", e.target.checked)}
                    />
                  </td>

                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={!!deal.bank_statements}
                      onChange={(e) =>
                        toggleDoc(deal, "bank_statements", e.target.checked)
                      }
                    />
                  </td>

                  <td style={td}>
                    <input
                      type="checkbox"
                      checked={!!deal.drivers_license}
                      onChange={(e) =>
                        toggleDoc(deal, "drivers_license", e.target.checked)
                      }
                    />
                  </td>

                  <td style={td}>{deal.status || "new"}</td>

                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div
      style={{
        minWidth: 120,
        padding: 14,
        borderRadius: 10,
        border: "1px solid #ddd",
        background: "#fff",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#555" }}>{title}</div>
    </div>
  );
}

const statsRow: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 20,
};

const emptyCard: CSSProperties = {
  padding: 18,
  border: "1px solid #ddd",
  borderRadius: 10,
  background: "#fff",
};

const th: CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #ddd",
  textAlign: "center",
  background: "#f7f7f7",
};

const td: CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #eee",
  textAlign: "center",
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