import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function OwnerCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  <button
  onClick={() => navigate("/dashboard/owner/customers")}
  style={{
    marginBottom: 20,
    padding: "6px 12px",
    cursor: "pointer"
  }}
>
</button>

  useEffect(() => {
    async function loadData() {
      if (!id) return;

      const { data: customerData } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", id)
        .order("business_date", { ascending: false });

      setCustomer(customerData);
      setOrders(ordersData || []);
      setLoading(false);
    }

    loadData();
  }, [id]);

  const totalOrders = orders.length;

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === "completed").length,
    [orders]
  );

 const totalRevenue = useMemo(
  () =>
    orders
      .filter((o) => o.status === "completed")
      .reduce(
        (sum, o) => sum + (o.quantity || 0) * (o.unit_price || 0),
        0
      ),
  [orders]
);

  const lastOrderDate =
    orders.length > 0
      ? new Date(orders[0].business_date).toLocaleDateString()
      : "—";

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;
  if (!customer) return <div style={{ padding: 32 }}>Customer not found</div>;

  return (
    <div style={{ padding: 32 }}>

      {/* HEADER */}
      <h1 style={{ marginBottom: 24 }}>{customer.name}</h1>
      <button
       onClick={() => navigate("/dashboard/owner/customers")}
      style={{
       marginBottom: 20,
       padding: "6px 12px",
       cursor: "pointer",
     }}
  >
       ← Back to Customers
      </button>

      {/* PROFILE + KPI SECTION */}
      <div style={{ display: "flex", gap: 40, marginBottom: 40 }}>

        {/* PROFILE CARD */}
        <div style={{ flex: 1 }}>
          <h3>Customer Profile</h3>
          <p><strong>Phone:</strong> {customer.phone}</p>
          <p><strong>Email:</strong> {customer.email || "—"}</p>
          <p><strong>Address:</strong> {customer.address_line_1}</p>
          <p><strong>Area:</strong> {customer.area}</p>
          <p><strong>Type:</strong> {customer.customer_type}</p>
          <p><strong>Active:</strong> {customer.is_active ? "Yes" : "No"}</p>
          <p>
            <strong>Created:</strong>{" "}
            {new Date(customer.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* KPI CARD */}
        <div style={{ flex: 1 }}>
          <h3>Customer Summary</h3>
          <p><strong>Total Orders:</strong> {totalOrders}</p>
          <p><strong>Completed Orders:</strong> {completedOrders}</p>
          <p><strong>Total Revenue:</strong> R {totalRevenue.toLocaleString()}</p>
          <p><strong>Last Order:</strong> {lastOrderDate}</p>
        </div>
      </div>

      {/* ORDER HISTORY */}
      <h2>Order History</h2>

      <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead style={{ borderBottom: "1px solid #ccc" }}>
          <tr>
            <th align="left">Date</th>
            <th align="left">Gas</th>
            <th align="left">Qty</th>
            <th align="left">Unit Price</th>
            <th align="left">Total</th>
            <th align="left">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{new Date(o.business_date).toLocaleDateString()}</td>
              <td>{o.gas_cylinder}</td>
              <td>{o.quantity}</td>
              <td>R {o.unit_price}</td>
              <td>R {(o.quantity * o.unit_price).toLocaleString()}</td>
              <td>
          <span
            style={{
            padding: "4px 8px",
            borderRadius: 12,
            background:
            o.status === "completed"
             ? "#d4edda"
             : o.status === "in progress"
             ? "#fff3cd"
             : "#f8d7da",
        }}
      >
           {o.status}
          </span>
          </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}

