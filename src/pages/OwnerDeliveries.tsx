import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Order = {
  id: string;
  business_date: string;
  gas_cylinder: string;
  quantity: number;
  total_price: number;
  status: string;
};

export default function OwnerDeliveries() {

  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  async function loadOrders() {

    let query = supabase.from("orders").select("*");

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query.order("business_date", { ascending:false });

    if (data) setOrders(data);

    setLoading(false);
  }

  /* GROUP BY DATE */

  const grouped = orders.reduce((acc:any,order)=>{

    const date = order.business_date.split("T")[0];

    if(!acc[date]){
      acc[date] = {
        deliveries:0,
        kg:0,
        revenue:0,
        sizes:{}
      };
    }

    const size = parseInt(order.gas_cylinder) || 0;
    const qty = order.quantity || 0;

    acc[date].deliveries += 1;
    acc[date].kg += size * qty;
    acc[date].revenue += order.total_price || 0;

    if(!acc[date].sizes[order.gas_cylinder]){
      acc[date].sizes[order.gas_cylinder] = 0;
    }

    acc[date].sizes[order.gas_cylinder] += qty;

    return acc;

  },{});

  return(

  <div style={{padding:40,maxWidth:1100}}>

    <h1 style={{marginBottom:30}}>🚚 Delivery Sales Report</h1>

    {loading && <p>Loading…</p>}

    {!loading &&
      Object.entries(grouped).map(([date,data]:any)=>(
      
      <div key={date} style={{
        border:"1px solid #ddd",
        borderRadius:8,
        padding:20,
        marginBottom:20
      }}>

        <div style={{
          fontSize:18,
          fontWeight:700,
          marginBottom:10
        }}>
          {date}
        </div>

        <div style={{
          display:"flex",
          gap:40,
          marginBottom:12
        }}>

          <div>
            Deliveries<br/>
            <b>{data.deliveries}</b>
          </div>

          <div>
            Gas Sold<br/>
            <b>{data.kg} kg</b>
          </div>

          <div>
            Revenue<br/>
            <b>R {data.revenue.toLocaleString()}</b>
          </div>

        </div>

        <div style={{fontSize:14}}>

          {Object.entries(data.sizes).map(([size,qty]:any,i:number)=>{

            const kg = parseInt(size)*qty;

            return(
              <span key={i} style={{marginRight:15}}>
                {size} × {qty} = {kg}kg
              </span>
            )
          })}

        </div>

      </div>

    ))}

  </div>

  );
}