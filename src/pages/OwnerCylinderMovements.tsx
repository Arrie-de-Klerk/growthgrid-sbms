import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Order = {
  business_date: string;
  gas_cylinder: string;
  quantity: number;
  status: string;
};

export default function OwnerCylinderMovement() {

  const [openingStock, setOpeningStock] = useState<any>(() => {

  const saved = localStorage.getItem("openingStock");

  if (saved) return JSON.parse(saved);

  return {
    "9kg": 500,
    "12kg": 500,
    "14kg": 500,
    "19kg": 500,
    "48kg": 500
  };

});

      useEffect(() => {

       localStorage.setItem("openingStock", JSON.stringify(openingStock));

    }, [openingStock]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "completed")
      .order("business_date", { ascending: true });

    if (data) setOrders(data);

    setLoading(false);
  }

  /* CYLINDER ORDER */

  const cylinderOrder = ["9kg", "12kg", "14kg", "19kg", "48kg"];

  const sizes: any = {};

  orders.forEach(order => {

    if (!order.gas_cylinder) return;

    const size = order.gas_cylinder.trim();
    const qty = order.quantity || 0;

    if (!sizes[size]) sizes[size] = [];

    sizes[size].push({
      date: order.business_date.split("T")[0],
      fullOut: qty,
      emptyIn: qty
    });

  });

     <h2 style={{marginBottom:15}}>Opening Stock</h2>

      {cylinderOrder.map(size => (

        <div key={size} style={{marginBottom:10}}>

        <label style={{marginRight:10}}>{size}</label>

         <input
           type="number"
           value={openingStock[size]}
           onChange={(e) => {

          setOpeningStock({
          ...openingStock,
          [size]: Number(e.target.value)
        })

       }}
        style={{width:120}}
      />

      </div>

     ))}

  /* STOCK SUMMARY */

  const stockSummary: any = {};

  cylinderOrder.forEach(size => {

    const moves = sizes[size] || [];

    let fullStock = openingStock[size] || 0;
    let emptyStock = 0;

    moves.forEach((m:any)=>{
      fullStock = fullStock - m.fullOut;
      emptyStock = emptyStock + m.emptyIn;
    });

    stockSummary[size] = fullStock;

  });

  return (

    <div style={{ padding: 40, maxWidth: 1100 }}>

      <h1 style={{ marginBottom: 30 }}>
        Cylinder Movement Ledger
      </h1>

      {loading && <p>Loading…</p>}

      <div style={{
         background:"#fff3cd",
         padding:20,
         borderRadius:8,
         marginBottom:30
    }}>

     <h2 style={{marginBottom:15}}>Opening Stock</h2>

       {cylinderOrder.map(size => (

     <div key={size} style={{marginBottom:10}}>

       <label style={{marginRight:10}}>{size}</label>

          <input
            type="number"
            value={openingStock[size]}
            onChange={(e)=>{

        setOpeningStock({
          ...openingStock,
          [size]: Number(e.target.value)
        })

        }}
         style={{width:120}}
      />

     </div>

      ))}

     </div>

      {/* STOCK STATUS PANEL */}

      <div style={{
        background:"#f5f5f5",
        padding:20,
        borderRadius:8,
        marginBottom:40
      }}>

        <h2 style={{marginBottom:15}}>
          Cylinder Stock Status
        </h2>

        <table style={{width:"100%"}}>

          <thead>
            <tr>
              <th style={{textAlign:"left"}}>Size</th>
              <th style={{textAlign:"left"}}>Full Cylinders</th>
              <th style={{textAlign:"left"}}>Status</th>
            </tr>
          </thead>

          <tbody>

            {cylinderOrder.map(size=>{

              const stock = stockSummary[size] || 0;
              const low = stock < 100;

              return(

                <tr key={size}>

                  <td>{size}</td>

                  <td>{stock}</td>

                  <td style={{
                    color: low ? "red" : "green",
                    fontWeight:600
                  }}>
                    {low ? "LOW STOCK" : "OK"}
                  </td>

                </tr>

              )

            })}

          </tbody>

        </table>

      </div>

      {/* LEDGER TABLES */}

      {cylinderOrder.map(size => {

        const moves = sizes[size];

        if (!moves) return null;

        let fullStock = openingStock[size] || 0;
        let emptyStock = 0;

        return (

          <div key={size} style={{ marginBottom: 50 }}>

            <h2 style={{ marginBottom: 15 }}>
              {size} Cylinders
            </h2>

            <table
               style={{
               width: "900px",
               borderCollapse: "collapse",
               tableLayout: "fixed"
           }}
           >

          <thead>
               <tr style={{ borderBottom: "2px solid #ccc" }}>
               <th style={{ width: "120px", textAlign: "center" }}>Date</th>
               <th style={{ width: "120px", textAlign: "center" }}>Opening</th>
               <th style={{ width: "120px", textAlign: "center" }}>Full Out</th>
               <th style={{ width: "120px", textAlign: "center" }}>Empty In</th>
               <th style={{ width: "140px", textAlign: "center" }}>Full In Store</th>
               <th style={{ width: "140px", textAlign: "center" }}>Total Cylinders</th>
          </tr>
         </thead>

              <tbody>

                {moves.map((m:any,i:number)=>{

                  const opening = fullStock;

                  fullStock = fullStock - m.fullOut;
                  emptyStock = emptyStock + m.emptyIn;

                  const total = fullStock + emptyStock;
                  const low = fullStock < 100;

                  return(

                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>

                      <td style={{ textAlign: "center" }}>
                        {m.date}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {opening}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        -{m.fullOut}
                      </td>

                      <td style={{ textAlign: "center" }}>
                         +{m.emptyIn}
                      </td>

                      <td
                         style={{
                         textAlign: "center",
                         color: low ? "red" : "black",
                         fontWeight: 600
                   }}
                  >
                         {fullStock}
                      </td>

                      <td style={{ textAlign: "center" }}>
                          {total}
                      </td>

                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        );

      })}

    </div>

  );
}