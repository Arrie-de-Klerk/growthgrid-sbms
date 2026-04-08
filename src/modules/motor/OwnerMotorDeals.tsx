import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";
import { useNavigate } from "react-router-dom";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  registration?: string | null;
  vehicle_code?: string | null; // ✅ ADD THIS LINE
};

type Deal = {
  id: string;
  customer_name: string;
  deposit: number | null;
  status: string;
  salesperson_code: string;
  date?: string;

  vehicle?: {
    make?: string;
    model?: string;
    vehicle_code?: string;
  } | null;
};

export default function OwnerMotorDeals() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    salesperson_code: "",
    date: "",
    customer_name: "",
    phone: "",
    email: "",
    vehicle_id: "",
    deposit: "",
    budget: "",
    financier: "",
    documents_received: false,
    status: "new",
    notes: "",
  });

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user?.id)
      .single();

    const bid = profile?.business_id;
    setBusinessId(bid);

    // 🔹 Load available vehicles
    const { data: vehicleData } = await supabase
      .from("motor_vehicles")
      .select("id, make, model, registration, vehicle_code")
      .eq("business_id", bid)
      .eq("status", "available");

    setVehicles(vehicleData || []);

    // 🔹 Load deals
    const { data } = await supabase
        .from("motor_deals")
        .select(`
          *,
        vehicle:motor_vehicles (
          make,
          model,
          vehicle_code
       )
      `)
       .order("created_at", { ascending: false });

       setDeals(data || []);

       setLoading(false);
     }

  async function handleSave() {
    if (!form.customer_name || !form.phone || !form.vehicle_id) {
      alert("Customer name, phone and vehicle required");
      return;
    }

    const payload = {
      business_id: businessId,
      salesperson_code: form.salesperson_code,
      date: form.date || null,

      customer_name: form.customer_name,
      phone: form.phone,
      email: form.email || null,

      vehicle_id: form.vehicle_id,

      deposit: form.deposit ? Number(form.deposit) : null,
      budget: form.budget ? Number(form.budget) : null,
      financier: form.financier || null,

      documents_received: form.documents_received,
      status: form.status,
      notes: form.notes || null,
    };

    const { error } = await supabase.from("motor_deals").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    // 🔥 RESERVE VEHICLE
    await supabase
      .from("motor_vehicles")
      .update({ status: "reserved" })
      .eq("id", form.vehicle_id);

    // reset form
    setForm({
      salesperson_code: "",
      date: "",
      customer_name: "",
      phone: "",
      email: "",
      vehicle_id: "",
      deposit: "",
      budget: "",
      financier: "",
      documents_received: false,
      status: "new",
      notes: "",
    });

    initialize();
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <h1>Customer Deals</h1>

      {/* 🔼 FORM */}

    <button
       onClick={() => setShowForm(!showForm)}
       style={{
         padding: "10px 16px",
         background: "#000",
         color: "#fff",
         borderRadius: 6,
         marginBottom: 20,
         cursor: "pointer",
      }}
     >
       {showForm ? "Close Deal Form" : "+ Create Deal"}
    </button>

{showForm && (
  <div style={{
    background: "#f5f5f5",
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  }}
>
  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>

    <input
      placeholder="Salesperson Code"
      value={form.salesperson_code}
      onChange={(e) => setForm({ ...form, salesperson_code: e.target.value })}
    />

    <input
      type="date"
      value={form.date}
      onChange={(e) => setForm({ ...form, date: e.target.value })}
    />

    <input
      placeholder="Customer Name"
      value={form.customer_name}
      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
    />

    <input
      placeholder="Phone"
      value={form.phone}
      onChange={(e) => setForm({ ...form, phone: e.target.value })}
    />

    <input
      placeholder="Email"
      value={form.email}
      onChange={(e) => setForm({ ...form, email: e.target.value })}
    />

    {/* 🚗 VEHICLE */}
    <select
      value={form.vehicle_id}
      onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
    >
      <option value="">Select Vehicle</option>
      {vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {v.make} {v.model} ({v.vehicle_code})
        </option>
      ))}
    </select>

    <input
      placeholder="Deposit"
      value={form.deposit}
      onChange={(e) => setForm({ ...form, deposit: e.target.value })}
    />

    <input
      placeholder="Budget"
      value={form.budget}
      onChange={(e) => setForm({ ...form, budget: e.target.value })}
    />

    <input
      placeholder="Financier"
      value={form.financier}
      onChange={(e) => setForm({ ...form, financier: e.target.value })}
    />

    {/* 📄 DOCUMENTS DROPDOWN */}
    <select
      value={form.documents_received ? "yes" : "no"}
      onChange={(e) =>
        setForm({ ...form, documents_received: e.target.value === "yes" })
      }
    >
      <option value="no">Documents Missing</option>
      <option value="yes">Documents Received</option>
    </select>

    {/* 📊 STATUS (PIPELINE) */}
    <select
      value={form.status}
      onChange={(e) => setForm({ ...form, status: e.target.value })}
    >
      <option value="new">New</option>
      <option value="docs_pending">Docs Pending</option>
      <option value="submitted">Submitted</option>
      <option value="approved">Approved</option>
      <option value="delivery">Delivery</option>
      <option value="sold">Sold</option>
      <option value="cancelled">Cancelled</option>
    </select>

    <input
      placeholder="Notes"
      value={form.notes}
      onChange={(e) => setForm({ ...form, notes: e.target.value })}
    />

  </div>

  <button
    onClick={handleSave}
    style={{
      marginTop: 15,
      width: "100%",
      padding: 14,
      background: "black",
      color: "white",
      border: "none",
      borderRadius: 6,
      fontWeight: "bold",
    }}
  >
    + Save Deal
  </button>
</div>
)}

      {/* 🔽 LIST */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%" }}>          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Vehicle</th>
              <th>Deposit</th>
              <th>Status</th>
              <th>Salesperson</th>
            </tr>
          </thead>

          <tbody>
            {deals.map((d) => (
              <tr
                key={d.id}
                onClick={() => navigate(`/motor/deals/${d.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td>{d.date}</td>
                <td>{d.customer_name}</td>
                <td>{d.vehicle
                       ? `${d.vehicle.make ?? ""} ${d.vehicle.model ?? ""} (${d.vehicle.vehicle_code ?? ""})`
                       : "—"}
               </td>
                <td>{d.deposit ? `R ${d.deposit}` : "-"}</td>
                <td>{d.status}</td>
                <td>{d.salesperson_code}</td>
                <td style={{ fontWeight: 600 }}></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}