import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  selling_price: number;
  sold_date: string;
};

export default function OwnerMotorBestSellers() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBestSellers();
  }, []);

  async function loadBestSellers() {
    const { data, error } = await supabase
      .from("motor_vehicles")
      .select("*")
      .eq("status", "sold")
      .order("selling_price", { ascending: false })
      .limit(10);

    if (!error && data) setVehicles(data);
    setLoading(false);
  }

  if (loading) return <p style={{ padding: 32 }}>Loading best sellers…</p>;

  return (
    <div style={{ padding: 32 }}>
      <h1>⭐ Best Selling Vehicles</h1>
      <p style={{ marginBottom: 20 }}>
        Top vehicles based on highest selling price
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
            <th style={th}>Make</th>
            <th style={th}>Model</th>
            <th style={th}>Year</th>
            <th style={th}>Selling Price</th>
            <th style={th}>Sold Date</th>
          </tr>
        </thead>

        <tbody>
          {vehicles.map((v) => (
            <tr key={v.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={td}>{v.make}</td>
              <td style={td}>{v.model}</td>
              <td style={td}>{v.year}</td>
              <td style={td}>
                R {v.selling_price?.toLocaleString() || 0}
              </td>
              <td style={td}>
                {v.sold_date
                  ? new Date(v.sold_date).toLocaleDateString()
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: 10, borderBottom: "1px solid #ddd" };
const td = { padding: 10 };