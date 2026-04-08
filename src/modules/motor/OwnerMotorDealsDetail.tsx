import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../shared/lib/supabase";

export default function OwnerMotorDealDetail() {
  const { id } = useParams();
  const [deal, setDeal] = useState<any>(null);

  useEffect(() => {
    loadDeal();
  }, []);

  async function loadDeal() {
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
      .eq("id", id)
      .single();

    setDeal(data);
  }

  if (!deal) return <div>Loading...</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1>{deal.customer_name}</h1>

      <p><b>Date:</b> {deal.date}</p>
      <p><b>Phone:</b> {deal.phone}</p>
      <p><b>Email:</b> {deal.email}</p>
      <p><b>Budget:</b> R {deal.budget}</p>
      <p><b>Deposit:</b> R {deal.deposit}</p>
      <p><b>Status:</b> {deal.status}</p>
      <p><b>Salesperson:</b> {deal.salesperson_code}</p>

      <h3>Vehicle</h3>
      <p>
        {deal.vehicle
          ? `${deal.vehicle.make} ${deal.vehicle.model} (${deal.vehicle.vehicle_code})`
          : "—"}
      </p>

      <h3>Notes</h3>
      <p>{deal.notes}</p>
    </div>
  );
}