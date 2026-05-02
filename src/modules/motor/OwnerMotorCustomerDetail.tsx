import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate, useParams } from "react-router-dom";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  interested_vehicle: string | null;
  budget: number | null;
  status: string | null;
  business_id: string;
  created_at: string | null;
};

type DealRow = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  vehicle_name: string | null;
  budget: number | null;
  deposit: number | null;
  financier: string | null;
  status: string | null;
  date: string | null;
  created_at: string | null;
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

export default function OwnerMotorCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void loadCustomerDetail();
  }, [id]);

  async function loadCustomerDetail() {
    if (!id) {
      setErrorMsg("Customer ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const { data: customerData, error: customerError } = await supabase
      .from("motor_customers")
      .select("*")
      .eq("id", id)
      .single();

    if (customerError || !customerData) {
      setErrorMsg(customerError?.message || "Customer not found.");
      setLoading(false);
      return;
    }

    setCustomer(customerData as CustomerRow);

    const { data: dealsData, error: dealsError } = await supabase
      .from("motor_deals")
      .select(`
        id,
        customer_id,
        customer_name,
        vehicle_name,
        budget,
        deposit,
        financier,
        status,
        date,
        created_at
      `)
      .eq("customer_id", id)
      .order("created_at", { ascending: false });

    if (dealsError) {
      setErrorMsg(dealsError.message);
      setDeals([]);
    } else {
      setDeals((dealsData as DealRow[]) || []);
    }

    setLoading(false);
  }

  const latestStatus = useMemo(() => {
    if (deals.length === 0) return customer?.status || "—";
    return deals[0]?.status || customer?.status || "—";
  }, [deals, customer]);

  if (loading) {
    return <p style={{ padding: 32 }}>Loading customer...</p>;
  }

  if (errorMsg || !customer) {
    return (
      <div style={{ padding: 32 }}>
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
          {errorMsg || "Customer not found."}
        </div>

        <button onClick={() => navigate("/motor/customers")} style={lightBtn}>
          ← Back to Customers
        </button>
      </div>
    );
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
          marginBottom: 20,
        }}
      >
        <button onClick={() => navigate("/motor/customers")} style={lightBtn}>
          ← Back to Customers
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/motor/deals")} style={lightBtn}>
            Open Deals
          </button>
          <button
            onClick={() => navigate("/motor/admin/approved-delivery")}
            style={darkBtn}
          >
            Approved / Delivery
          </button>
        </div>
      </div>

      {/* CUSTOMER HEADER */}
      <div style={heroCard}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>{customer.name}</h1>
          <p style={{ marginTop: 0, color: "#666" }}>
            Customer profile linked to Motor deals.
          </p>
        </div>

        <div style={statusBadge}>
          {latestStatus || "—"}
        </div>
      </div>

      {/* CUSTOMER INFO */}
      <div style={infoGrid}>
        <InfoCard label="Phone" value={customer.phone || "—"} />
        <InfoCard label="Email" value={customer.email || "—"} />
        <InfoCard label="Interested Vehicle" value={customer.interested_vehicle || "—"} />
        <InfoCard label="Budget" value={formatMoney(customer.budget)} />
        <InfoCard label="Status" value={customer.status || "—"} />
        <InfoCard label="Created" value={formatDate(customer.created_at)} />
      </div>

      {/* DEAL SUMMARY */}
      <div style={{ marginTop: 28, marginBottom: 16 }}>
        <h2 style={{ marginBottom: 8 }}>Deals for this Customer</h2>
        <p style={{ color: "#666", marginTop: 0 }}>
          Every deal below is linked through <b>customer_id</b>.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <MiniStat title="Total Deals" value={deals.length} />
        <MiniStat
          title="Approved"
          value={deals.filter((d) => (d.status || "").toLowerCase() === "approved").length}
        />
        <MiniStat
          title="Delivery"
          value={deals.filter((d) => (d.status || "").toLowerCase() === "delivery").length}
        />
        <MiniStat
          title="Submitted"
          value={deals.filter((d) => (d.status || "").toLowerCase() === "submitted").length}
        />
      </div>

      {/* DEAL TABLE */}
      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Vehicle</th>
              <th style={th}>Budget</th>
              <th style={th}>Deposit</th>
              <th style={th}>Financier</th>
              <th style={th}>Status</th>
              <th style={th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td style={td} colSpan={7}>
                  No deals linked to this customer yet.
                </td>
              </tr>
            ) : (
              deals.map((deal) => (
                <tr key={deal.id}>
                  <td style={td}>{formatDate(deal.date || deal.created_at)}</td>
                  <td style={td}>{deal.vehicle_name || "—"}</td>
                  <td style={td}>{formatMoney(deal.budget)}</td>
                  <td style={td}>{formatMoney(deal.deposit)}</td>
                  <td style={td}>{deal.financier || "—"}</td>
                  <td style={td}>{deal.status || "—"}</td>
                  <td style={td}>
                    <button
                      onClick={() => navigate(`/motor/deals/${deal.id}`)}
                      style={smallBtn}
                    >
                      Open Deal
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 16,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>{value}</div>
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

const heroCard: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: 20,
  borderRadius: 12,
  background: "#f8f8f8",
  border: "1px solid #ddd",
  marginBottom: 22,
};

const statusBadge: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  background: "black",
  color: "white",
  fontWeight: 700,
  textTransform: "capitalize",
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const th: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #ddd",
  textAlign: "left",
  background: "#f7f7f7",
};

const td: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eee",
};

const smallBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const lightBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};

const darkBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};