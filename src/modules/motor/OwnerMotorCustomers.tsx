import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";

type Customer = {
  id: string;
  business_id?: string;
  name: string;
  phone: string;
  email: string | null;
  interested_vehicle: string | null;
  budget: number | null;
  status: string | null;
  created_at: string;
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

export default function OwnerMotorCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get("status") || "all";

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
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

    const { data, error } = await supabase
      .from("motor_customers")
      .select("*")
      .eq("business_id", bid)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading motor customers:", error);
      setCustomers([]);
    } else {
      setCustomers((data as Customer[]) || []);
    }

    setLoading(false);
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: customers.length };

    for (const c of customers) {
      const key = (c.status || "unknown").toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  }, [customers]);

  const statusOptions = useMemo(() => {
    const dynamicStatuses = Object.keys(statusCounts)
      .filter((s) => s !== "all")
      .sort();
    return ["all", ...dynamicStatuses];
  }, [statusCounts]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : (c.status || "unknown").toLowerCase() === statusFilter.toLowerCase();

      const haystack = [
        c.name,
        c.phone,
        c.email || "",
        c.interested_vehicle || "",
        c.status || "",
        c.budget?.toString() || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [customers, search, statusFilter]);

  function setStatusFilter(next: string) {
    if (next === "all") {
      setSearchParams({});
      return;
    }
    setSearchParams({ status: next });
  }

  if (loading) {
    return <p style={{ padding: 32 }}>Loading customers…</p>;
  }

  const th: React.CSSProperties = {
    padding: "12px 10px",
    borderBottom: "1px solid #ddd",
    fontWeight: 800,
    fontSize: 14,
    background: "#f7f7f7",
  };

  const td: React.CSSProperties = {
    padding: "12px 10px",
    borderBottom: "1px solid #eee",
    fontSize: 14,
  };

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

      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 8 }}>Motor Customers</h1>
        <p style={{ color: "#666", margin: 0 }}>
          Manage buyers, leads, and customer enquiries.
        </p>
      </div>

      {/* STATUS STRIP */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {statusOptions.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border:
                statusFilter === status ? "2px solid black" : "1px solid #ddd",
              background: statusFilter === status ? "#f2f2f2" : "white",
              cursor: "pointer",
              minWidth: 110,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {statusCounts[status] || 0}
            </div>
            <div style={{ fontSize: 12, textTransform: "capitalize" }}>
              {status}
            </div>
          </button>
        ))}
      </div>

      {/* SEARCH + ACTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Search by name, phone, email, vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: 10,
            flex: 1,
            minWidth: 260,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />

        <button
          onClick={() => navigate("/motor/customers/new")}
          style={{
            padding: "10px 16px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontWeight: 700,
          }}
        >
          + Add Customer
        </button>
      </div>

      {/* TABLE / EMPTY */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 18,
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          No customers found.
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fff",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={th}>Name</th>
                <th style={th}>Phone</th>
                <th style={th}>Email</th>
                <th style={th}>Interested Vehicle</th>
                <th style={th}>Budget</th>
                <th style={th}>Status</th>
                <th style={th}>Created</th>
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#fafafa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "white")
                  }
                >
                  <td style={td} onClick={() => navigate(`/motor/customers/${c.id}`)}>
                    {c.name}
                  </td>
                  <td style={td} onClick={() => navigate(`/motor/customers/${c.id}`)}>
                    {c.phone}
                  </td>
                  <td style={td} onClick={() => navigate(`/motor/customers/${c.id}`)}>
                    {c.email || "—"}
                  </td>
                  <td style={td} onClick={() => navigate(`/motor/customers/${c.id}`)}>
                    {c.interested_vehicle || "—"}
                  </td>
                  <td style={td} onClick={() => navigate(`/motor/customers/${c.id}`)}>
                    {formatMoney(c.budget)}
                  </td>
                  <td style={td} onClick={() => navigate(`/motor/customers/${c.id}`)}>
                    {c.status || "—"}
                  </td>
                  <td style={td} onClick={() => navigate(`/motor/customers/${c.id}`)}>
                    {formatDate(c.created_at)}
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => navigate(`/motor/customers/${c.id}`)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SMALL FOOT NOTE */}
      {businessId && (
        <div style={{ marginTop: 12, color: "#777", fontSize: 12 }}>
          Business linked and filtered correctly.
        </div>
      )}
    </div>
  );
}