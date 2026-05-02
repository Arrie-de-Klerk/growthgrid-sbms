import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";

type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  interested_vehicle: string | null;
  budget: number | null;
  status: string | null;
};

type VehicleOption = {
  id: string;
  make: string | null;
  model: string | null;
  vehicle_code: string | null;
  selling_price?: number | null;
};

type DealRow = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string | null;
  email: string | null;
  salesperson_code: string | null;
  vehicle_id: string | null;
  vehicle_name?: string | null;
  deposit: number | null;
  budget: number | null;
  financier: string | null;
  documents_received: boolean | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  date: string | null;
};

type DealForm = {
  date: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  email: string;
  salesperson_code: string;
  vehicle_id: string;
  deposit: string;
  budget: string;
  financier: string;
  documents_received: boolean;
  status: string;
  notes: string;
};

const financiers = [
  "WesBank",
  "MFC (Nedbank)",
  "ABSA Vehicle Finance",
  "Standard Bank Vehicle Finance",
  "Toyota Financial Services",
  "BMW Financial Services",
  "Cash",
];

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

function normalizePhone(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

export default function OwnerMotorDeals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [deals, setDeals] = useState<DealRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const [form, setForm] = useState<DealForm>({
    date: "",
    customer_id: "",
    customer_name: "",
    phone: "",
    email: "",
    salesperson_code: "",
    vehicle_id: "",
    deposit: "",
    budget: "",
    financier: "",
    documents_received: false,
    status: "new",
    notes: "",
  });

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
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

    const [dealsRes, vehiclesRes, customersRes] = await Promise.all([
      supabase
        .from("motor_deals")
        .select(`
          id,
          customer_id,
          customer_name,
          phone,
          email,
          salesperson_code,
          vehicle_id,
          vehicle_name,
          deposit,
          budget,
          financier,
          documents_received,
          status,
          notes,
          created_at,
          date
        `)
        .eq("business_id", bid)
        .order("created_at", { ascending: false }),

      supabase
        .from("motor_vehicles")
        .select("id, make, model, vehicle_code, selling_price")
        .eq("business_id", bid)
        .eq("status", "available")
        .order("make", { ascending: true }),

      supabase
        .from("motor_customers")
        .select("id, name, phone, email, interested_vehicle, budget, status")
        .eq("business_id", bid)
        .order("name", { ascending: true }),
    ]);

    if (dealsRes.error) {
      setErrorMsg(dealsRes.error.message);
      setDeals([]);
    } else {
      setDeals((dealsRes.data as DealRow[]) || []);
    }

    if (!vehiclesRes.error) {
      setVehicles((vehiclesRes.data as VehicleOption[]) || []);
    }

    if (!customersRes.error) {
      setCustomers((customersRes.data as CustomerOption[]) || []);
    }

    setLoading(false);
  }

  function getVehicleLabel(v: VehicleOption) {
    return [v.vehicle_code, v.make, v.model].filter(Boolean).join(" — ");
  }

  function handleCustomerPick(customerId: string) {
    setForm((prev) => {
      const picked = customers.find((c) => c.id === customerId);

      if (!picked) {
        return {
          ...prev,
          customer_id: "",
        };
      }

      return {
        ...prev,
        customer_id: picked.id,
        customer_name: picked.name || "",
        phone: picked.phone || "",
        email: picked.email || "",
        budget: picked.budget != null ? String(picked.budget) : prev.budget,
      };
    });
  }

  async function ensureCustomer(): Promise<string | null> {
    if (!businessId) return null;

    if (form.customer_id) return form.customer_id;

    const cleanName = form.customer_name.trim();
    const cleanPhone = form.phone.trim();
    const cleanEmail = form.email.trim();

    if (!cleanName) {
      setErrorMsg("Customer name is required.");
      return null;
    }

    if (!cleanPhone) {
      setErrorMsg("Customer phone is required.");
      return null;
    }

    const existing = customers.find(
      (c) =>
        c.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        normalizePhone(c.phone) === normalizePhone(cleanPhone)
    );

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from("motor_customers")
      .insert([
        {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail || null,
          interested_vehicle: selectedVehicle
            ? getVehicleLabel(selectedVehicle)
            : null,
          budget: form.budget ? Number(form.budget) : null,
          status: "lead",
          business_id: businessId,
        },
      ])
      .select("id, name, phone, email, interested_vehicle, budget, status")
      .single();

    if (error) {
      setErrorMsg(error.message);
      return null;
    }

    const newCustomer = data as CustomerOption;
    setCustomers((prev) => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
    return newCustomer.id;
  }

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === form.vehicle_id) || null,
    [vehicles, form.vehicle_id]
  );

  async function handleSave() {
    if (!businessId) {
      setErrorMsg("Business not loaded.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const customerId = await ensureCustomer();
    if (!customerId) {
      setSaving(false);
      return;
    }

    const payload = {
      business_id: businessId,
      customer_id: customerId,
      customer_name: form.customer_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      salesperson_code: form.salesperson_code.trim() || null,
      vehicle_id: form.vehicle_id || null,
      vehicle_name: selectedVehicle ? getVehicleLabel(selectedVehicle) : null,
      deposit: form.deposit ? Number(form.deposit) : null,
      budget: form.budget ? Number(form.budget) : null,
      financier: form.financier.trim() || null,
      documents_received: form.documents_received,
      status: form.status || "new",
      notes: form.notes.trim() || null,
      date: form.date || null,
    };

    const { error } = await supabase.from("motor_deals").insert([payload]);

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    setForm({
      date: "",
      customer_id: "",
      customer_name: "",
      phone: "",
      email: "",
      salesperson_code: "",
      vehicle_id: "",
      deposit: "",
      budget: "",
      financier: "",
      documents_received: false,
      status: "new",
      notes: "",
    });

    setShowForm(false);
    setSaving(false);
    await loadPage();
  }

  const counts = useMemo(() => {
    return {
      all: deals.length,
      new: deals.filter((d) => (d.status || "").toLowerCase() === "new").length,
      interested: deals.filter((d) => (d.status || "").toLowerCase() === "interested").length,
      negotiating: deals.filter((d) => (d.status || "").toLowerCase() === "negotiating").length,
      docs_pending: deals.filter((d) => (d.status || "").toLowerCase() === "docs_pending").length,
      submitted: deals.filter((d) => (d.status || "").toLowerCase() === "submitted").length,
      approved: deals.filter((d) => (d.status || "").toLowerCase() === "approved").length,
      delivery: deals.filter((d) => (d.status || "").toLowerCase() === "delivery").length,
      cancelled: deals.filter((d) => (d.status || "").toLowerCase() === "cancelled").length,
    };
  }, [deals]);

  const visibleDeals = useMemo(() => {
    return deals.filter((d) => {
      const statusOk =
        statusFilter === "all"
          ? true
          : (d.status || "").toLowerCase() === statusFilter.toLowerCase();

      const haystack = [
        d.customer_name,
        d.phone || "",
        d.email || "",
        d.salesperson_code || "",
        d.vehicle_name || "",
        d.financier || "",
        d.status || "",
      ]
        .join(" ")
        .toLowerCase();

      return statusOk && haystack.includes(search.toLowerCase());
    });
  }, [deals, search, statusFilter]);

  const filterBoxes = [
    { key: "all", label: "All", value: counts.all },
    { key: "new", label: "New", value: counts.new },
    { key: "interested", label: "Interested", value: counts.interested },
    { key: "negotiating", label: "Negotiating", value: counts.negotiating },
    { key: "docs_pending", label: "Docs", value: counts.docs_pending },
    { key: "submitted", label: "Submitted", value: counts.submitted },
    { key: "approved", label: "Approved", value: counts.approved },
    { key: "delivery", label: "Delivery", value: counts.delivery },
    { key: "cancelled", label: "Cancelled", value: counts.cancelled },
  ];

  if (loading) {
    return <div style={{ padding: 32 }}>Loading deals...</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 1250, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <button onClick={() => navigate("/motor")} style={backBtn}>
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/motor/customers")} style={lightBtn}>
            Open Customers
          </button>
          <button
            onClick={() => navigate("/motor/admin/approved-delivery")}
            style={darkBtn}
          >
            Approved / Delivery
          </button>
        </div>
      </div>

      <h1 style={{ marginBottom: 8 }}>Motor Deals</h1>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 20 }}>
        Capture and manage deals from first enquiry to handover.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        {filterBoxes.map((box) => (
          <div
            key={box.key}
            style={{
              minWidth: 105,
              padding: 12,
              borderRadius: 10,
              border:
                statusFilter === box.key ? "2px solid black" : "1px solid #ddd",
              background: statusFilter === box.key ? "#f2f2f2" : "white",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800 }}>{box.value}</div>
            <div style={{ fontSize: 12 }}>{box.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <input
          placeholder="Search by customer, phone, vehicle, financier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

        <button onClick={() => setShowForm((v) => !v)} style={primaryBtn}>
          {showForm ? "Close Form" : "+ New Deal"}
        </button>
      </div>

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

      {showForm && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Create Deal</h3>

          <div style={grid}>
            <div>
              <label style={label}>Existing Customer</label>
              <select
                value={form.customer_id}
                onChange={(e) => handleCustomerPick(e.target.value)}
                style={field}
              >
                <option value="">Select existing customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `— ${c.phone}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={label}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                style={field}
              />
            </div>

            <div>
              <label style={label}>Salesperson Code</label>
              <input
                value={form.salesperson_code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, salesperson_code: e.target.value }))
                }
                style={field}
              />
            </div>

            <div>
              <label style={label}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                style={field}
              >
                <option value="new">New</option>
                <option value="interested">Interested</option>
                <option value="negotiating">Negotiating</option>
                <option value="docs_pending">Docs Pending</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="delivery">Delivery</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label style={label}>Customer Name</label>
              <input
                value={form.customer_name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, customer_name: e.target.value }))
                }
                style={field}
              />
            </div>

            <div>
              <label style={label}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                style={field}
              />
            </div>

            <div>
              <label style={label}>Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                style={field}
              />
            </div>

            <div>
              <label style={label}>Vehicle</label>
              <select
                value={form.vehicle_id}
                onChange={(e) => setForm((p) => ({ ...p, vehicle_id: e.target.value }))}
                style={field}
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {getVehicleLabel(v)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={label}>Deposit</label>
              <input
                type="number"
                value={form.deposit}
                onChange={(e) => setForm((p) => ({ ...p, deposit: e.target.value }))}
                style={field}
              />
            </div>

            <div>
              <label style={label}>Budget</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                style={field}
              />
            </div>

            <div>
              <label style={label}>Financier</label>
              <select
                value={form.financier}
                onChange={(e) => setForm((p) => ({ ...p, financier: e.target.value }))}
                style={field}
              >
                <option value="">Select financier...</option>
                {financiers.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                id="documents_received"
                type="checkbox"
                checked={form.documents_received}
                onChange={(e) =>
                  setForm((p) => ({ ...p, documents_received: e.target.checked }))
                }
              />
              <label htmlFor="documents_received">Documents Received</label>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={label}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              style={textarea}
            />
          </div>

          <button onClick={handleSave} style={primaryBtn} disabled={saving}>
            {saving ? "Saving..." : "Save Deal"}
          </button>
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Customer</th>
              <th style={th}>Phone</th>
              <th style={th}>Vehicle</th>
              <th style={th}>Budget</th>
              <th style={th}>Deposit</th>
              <th style={th}>Financier</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleDeals.length === 0 ? (
              <tr>
                <td style={td} colSpan={8}>
                  No deals found.
                </td>
              </tr>
            ) : (
              visibleDeals.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => navigate(`/motor/deals/${deal.id}`)}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "white";
                  }}
                >
                  <td style={td}>{formatDate(deal.date || deal.created_at)}</td>
                  <td style={td}>{deal.customer_name}</td>
                  <td style={td}>{deal.phone || "—"}</td>
                  <td style={td}>{deal.vehicle_name || "—"}</td>
                  <td style={td}>{formatMoney(deal.budget)}</td>
                  <td style={td}>{formatMoney(deal.deposit)}</td>
                  <td style={td}>{deal.financier || "—"}</td>
                  <td style={td}>{deal.status || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#f9f9f9",
  padding: 20,
  borderRadius: 10,
  marginBottom: 20,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
};

const label: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
};

const field: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const textarea: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
  minHeight: 100,
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

const searchInput: React.CSSProperties = {
  flex: 1,
  minWidth: 260,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  background: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
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

const backBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
};