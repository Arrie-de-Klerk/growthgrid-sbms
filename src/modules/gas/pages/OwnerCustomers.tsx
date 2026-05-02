// src/modules/gas/pages/OwnerCustomers.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";

type Customer = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  area: string | null;
  is_active: boolean | null;
  created_at: string;
};

export default function OwnerCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function getBusinessId() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session?.user) throw new Error("No signed-in user found.");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", session.user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.business_id) {
      throw new Error("This user is not linked to a business yet.");
    }

    return profile.business_id as string;
  }

  async function loadCustomers() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const businessId = await getBusinessId();

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
    } catch (err: any) {
      console.error("OwnerCustomers load error:", err.message);
      setErrorMsg(err.message || "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return customers;

    return customers.filter((c) =>
      [
        c.name,
        c.phone,
        c.address_line_1,
        c.address_line_2,
        c.area,
        c.is_active ? "active yes" : "inactive no",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [customers, search]);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Customers</h1>
          <p style={subtitleStyle}>
            Customers created from Gas orders and customer records.
          </p>
        </div>

        <div style={headerButtonRowStyle}>
          <button
            onClick={() => navigate("/gas")}
            style={secondaryButtonStyle}
          >
            Back to Dashboard
          </button>

          <button onClick={loadCustomers} style={refreshButtonStyle}>
            Refresh
          </button>
        </div>
      </div>

      <div style={summaryStripStyle}>
        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Total Customers</div>
          <div style={summaryNumberStyle}>{customers.length}</div>
        </div>

        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Active Customers</div>
          <div style={summaryNumberStyle}>
            {customers.filter((c) => c.is_active).length}
          </div>
        </div>

        <div style={summaryBoxStyle}>
          <div style={summaryLabelStyle}>Inactive Customers</div>
          <div style={summaryNumberStyle}>
            {customers.filter((c) => !c.is_active).length}
          </div>
        </div>
      </div>

      <input
        placeholder="Search by name, phone, address, area..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchStyle}
      />

      {loading && <p style={infoStyle}>Loading customers...</p>}

      {errorMsg && <div style={errorStyle}>⚠️ {errorMsg}</div>}

      {!loading && !errorMsg && filtered.length === 0 && (
        <div style={emptyStyle}>
          No customers found.
        </div>
      )}

      {!loading && !errorMsg && filtered.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr style={headRowStyle}>
                <th style={th}>Name</th>
                <th style={th}>Phone</th>
                <th style={th}>Address Line 1</th>
                <th style={th}>Address Line 2</th>
                <th style={th}>Area</th>
                <th style={th}>Active</th>
                <th style={th}>Created</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/gas/customers/${c.id}`)}
                  style={rowStyle}
                >
                  <td style={tdStrong}>{c.name || "Unknown Name"}</td>
                  <td style={td}>{c.phone || "-"}</td>
                  <td style={td}>{c.address_line_1 || "-"}</td>
                  <td style={td}>{c.address_line_2 || "-"}</td>
                  <td style={td}>{c.area || "-"}</td>
                  <td style={td}>
                    <span
                      style={{
                        ...statusPillStyle,
                        background: c.is_active ? "#e8f5e9" : "#eeeeee",
                        color: c.is_active ? "#1b5e20" : "#555",
                      }}
                    >
                      {c.is_active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={td}>{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================= HELPERS ================= */

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/* ================= STYLES ================= */

const pageStyle: CSSProperties = {
  padding: 32,
  maxWidth: 1200,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 24,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 30,
  fontWeight: 800,
};

const subtitleStyle: CSSProperties = {
  marginTop: 6,
  color: "#666",
};

const headerButtonRowStyle: CSSProperties = {
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

const summaryStripStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 20,
};

const summaryBoxStyle: CSSProperties = {
  padding: 16,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
};

const summaryLabelStyle: CSSProperties = {
  fontSize: 13,
  color: "#666",
  fontWeight: 700,
};

const summaryNumberStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  marginTop: 4,
};

const searchStyle: CSSProperties = {
  padding: 12,
  width: "100%",
  marginBottom: 20,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #eee",
  borderRadius: 12,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  background: "#fff",
};

const headRowStyle: CSSProperties = {
  background: "#f5f5f5",
  textAlign: "left",
};

const th: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #eee",
  whiteSpace: "nowrap",
};

const tdStrong: CSSProperties = {
  ...td,
  fontWeight: 800,
};

const rowStyle: CSSProperties = {
  cursor: "pointer",
};

const statusPillStyle: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const infoStyle: CSSProperties = {
  marginTop: 20,
  color: "#666",
};

const errorStyle: CSSProperties = {
  marginTop: 20,
  padding: 14,
  borderRadius: 10,
  background: "#ffebee",
  color: "#b71c1c",
  fontWeight: 700,
};

const emptyStyle: CSSProperties = {
  marginTop: 20,
  padding: 20,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e0e0e0",
  color: "#666",
  fontWeight: 700,
};