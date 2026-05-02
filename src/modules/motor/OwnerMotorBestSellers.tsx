import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

type Vehicle = {
  name: string;
  count: number;
};

export default function OwnerMotorBestSellers() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  useEffect(() => {
    loadBestSellers();
  }, []);

  async function loadBestSellers() {
     const { data, error } = await supabase
       .from("motor_vehicles")
       .select("make, model")
       .eq("status", "sold");

     if (error || !data) return;

  // 🔥 Count per vehicle
     const counts: any = {};

      data.forEach((v) => {
    const key = `${v.make} ${v.model}`;
      counts[key] = (counts[key] || 0) + 1;
    });

  // 🔥 Convert to array + sort
    const result = Object.entries(counts)
      .map(([name, count]) => ({
         name,
         count: Number(count),   // 🔥 FIX
    }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

     setVehicles(result);
     
   }

  return (
    <div style={{ padding: 32 }}>
      <h1>⭐ Best Selling Vehicles</h1>
      <p style={{ marginBottom: 20 }}>
        Top vehicles based on highest selling price
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={th}>Rank</th>
            <th style={th}>Vehicle</th>
            <th style={th}>Units Sold</th>
          </tr>
        </thead>

        <tbody>
            {vehicles.map((v, i) => (
             <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
               <td style={td}>{i + 1}</td>
               <td style={td}>{v.name}</td>
               <td style={td}>{v.count}</td>
             </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}

const th = {
  padding: "6px",
  textAlign: "center" as const,
};

const td = {
  padding: "4px 8px",
  textAlign: "center" as const,
};