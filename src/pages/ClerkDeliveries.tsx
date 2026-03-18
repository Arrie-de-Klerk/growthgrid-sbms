import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Status = "ordered" | "in_progress" | "completed";

type Order = {
  id: string;
  business_id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  business_date: string;
  gas_cylinder: string; // currently "12kg" etc (LABEL)
  area: string;
  status: Status;
  quantity: number | null;
  unit_price: number | null;
};

export default function ClerkDeliveries() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"today" | "all">("today");

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadOrders() {
    let query = supabase
      .from("orders")
      .select("*")
      .order("business_date", { ascending: false })
      .order("area", { ascending: true });

    if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("business_date", today.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error("Load orders error:", error);
      return;
    }
    setOrders((data as Order[]) || []);
  }

  async function updateStatus(order: Order, newStatus: Status) {
    console.log("Updating order:", order.id, "->", newStatus);

    const { error: updErr } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (updErr) {
      console.error("Order update error:", updErr);
      alert(updErr.message);
      return;
    }

    // ✅ Only when completed: insert movement
    if (newStatus === "completed") {
      // IMPORTANT: cylinder_size_id in DB is UUID, but order.gas_cylinder is "12kg" (label).
      // So we look up the cylinder_sizes row by label and use its UUID.
      const { data: sizeRow, error: sizeErr } = await supabase
        .from("cylinder_sizes")
        .select("id")
        .eq("label", order.gas_cylinder)
        .maybeSingle();

      if (sizeErr || !sizeRow?.id) {
        console.error("Cylinder size lookup failed:", sizeErr, order.gas_cylinder);
        alert(`Cylinder size not found for "${order.gas_cylinder}".`);
        return;
      }

      const qty = order.quantity ?? 1;

      const movementRow = {
         business_id: order.business_id,
         customer_id: order.customer_id,
         delivery_id: null,
         cylinder_size_id: sizeRow.id,

     // delivery exchange
         full_out: qty,
         empty_in: qty,

         movement_type: "delivery_exchange",
         movement_date: new Date().toISOString(),
         related_order_id: order.id,
     };

      console.log("Inserting movement:", movementRow);

      const { error: mvErr } = await supabase
        .from("cylinder_movements")
        .insert([movementRow]);

      if (mvErr) {
        console.error("Movement insert error:", mvErr);
        alert(mvErr.message);
        return;
      }
    }

    await loadOrders();
  }

  async function cycleStatus(order: Order) {
    let newStatus: Status = order.status;

    if (order.status === "ordered") newStatus = "in_progress";
    else if (order.status === "in_progress") newStatus = "completed";
    else return;

    await updateStatus(order, newStatus);
  }

  function getStatusStyle(status: Status) {
    switch (status) {
      case "ordered":
        return { background: "#fdecea", color: "#c62828" };
      case "in_progress":
        return { background: "#fff4e5", color: "#ef6c00" };
      case "completed":
        return { background: "#edf7ed", color: "#2e7d32" };
    }
  }

  const grouped = orders.reduce((acc, order) => {
    const dateKey = new Date(order.business_date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <div style={{ padding: 40, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 20 }}>📦 Delivery Log</h1>

      <div style={{ marginBottom: 25 }}>
        <button
          onClick={() => setFilter("today")}
          style={{
            marginRight: 10,
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: filter === "today" ? "#000" : "#fff",
            color: filter === "today" ? "#fff" : "#000",
          }}
        >
          Today
        </button>

        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: filter === "all" ? "#000" : "#fff",
            color: filter === "all" ? "#fff" : "#000",
          }}
        >
          All
        </button>
      </div>

      {Object.entries(grouped).map(([date, dateOrders]) => (
        <div key={date} style={{ marginBottom: 40 }}>
          <h3 style={{ marginBottom: 15 }}>
            📅 {new Date(date).toLocaleDateString()}
          </h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                <th>Name</th>
                <th>Phone</th>
                <th>Date</th>
                <th>Gas</th>
                <th>Area</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {dateOrders.map((order) => (
                <tr key={order.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{order.customer_name}</td>
                  <td>{order.phone}</td>
                  <td>{new Date(order.business_date).toLocaleDateString()}</td>
                  <td>{order.gas_cylinder}</td>
                  <td>{order.area}</td>
                  <td>
                    <span
                      onClick={() => cycleStatus(order)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 20,
                        cursor: order.status === "completed" ? "default" : "pointer",
                        fontWeight: 600,
                        fontSize: 13,
                        ...getStatusStyle(order.status),
                      }}
                    >
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}