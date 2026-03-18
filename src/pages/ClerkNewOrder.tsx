import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type QuoteType =
  | "None"
  | "Geyser"
  | "Stove"
  | "Braai"
  | "Hob"
  | "Heater"
  | "Other";

const BUSINESS_ID = "fc0e1122-d99e-424c-aebb-a84c55048444";

const installationTypeMap: Record<QuoteType, string | null> = {
  None: null,
  Geyser: "gas_geyser",
  Stove: "gas_stove",
  Braai: "braai",
  Hob: "gas_stove",
  Heater: "repair",
  Other: "inspection",
};

export default function ClerkNewOrder() {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [gasCylinder, setGasCylinder] = useState("14kg");
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  const [quoteType, setQuoteType] = useState<QuoteType>("None");
  const [otherDescription, setOtherDescription] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }

      // 🔎 Check if customer exists
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phone.trim())
        .maybeSingle();

      let customerId: string;

      // Generate next customer code
        const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

          const nextNumber = (count || 0) + 1;
          const customerCode = `CUST-${String(nextNumber).padStart(3, "0")}`;

      if (!existingCustomer) {
        const { data: newCustomer, error: customerError } =
          await supabase
            .from("customers")
            .insert({
              business_id: BUSINESS_ID,
              customer_code: customerCode,  // 👈 ADD THIS
              customer_type:
                contactName && contactName.trim() !== ""
                  ? "business"
                  : "residential",
              name: customerName.trim(),
              phone: phone.trim(),
              address_line_1: address.trim(),
              area: area.trim(),
              is_active: true,
            })
            .select()
            .single();

        if (customerError) throw customerError;

        customerId = newCustomer.id;
      } else {
        customerId = existingCustomer.id;

        await supabase
          .from("customers")
          .update({
            name: customerName.trim(),
            address_line_1: address.trim(),
            area: area.trim(),
          })
          .eq("id", customerId);
      }

      // 🔧 If installation required
      const mappedInstallationType = installationTypeMap[quoteType];

      if (mappedInstallationType) {
        const { error: instErr } = await supabase
          .from("installations")
          .insert({
            business_id: BUSINESS_ID,
            customer_id: customerId,
            installation_type: mappedInstallationType,
            status: "planned",
            address: address.trim(),
            notes: otherDescription?.trim() || null,
          });

        if (instErr) throw instErr;
      }

      
      // 📦 Insert order
      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          business_id: BUSINESS_ID,
          clerk_id: user.id,
          business_date: new Date().toISOString(),
          customer_name: customerName.trim(),
          contact_name: contactName.trim() || null,
          gas_cylinder: gasCylinder === "0" ? null : gasCylinder,
          quantity: gasCylinder === "0" ? 0 : quantity,
          unit_price: gasCylinder === "0" ? 0 : unitPrice,
          status: "ordered",
          quote_type: quoteType === "None" ? null : quoteType,
          other_description:
            quoteType === "Other" ? otherDescription : null,
          phone: phone.trim(),
          email: email.trim() || null,
          address: address.trim(),
          area: area.trim(),
          customer_id: customerId,
        });

      if (orderError) throw orderError;

      navigate("/dashboard/clerk");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    }

    setLoading(false);
  }
     
  
    const cylinderPrices: Record<string, number> = {
      "0": 0,
      "9kg": 450,
      "12kg": 480,
      "14kg": 520,
      "19kg": 600,
      "48kg": 1500,
     };

  return (
    <div style={{ padding: "32px", maxWidth: "900px" }}>
      <h1>📞 New Order</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <input
          placeholder="Customer Name / Business Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />

        <input
          placeholder="Contact Name (optional) if Business"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />

         <select
           value={gasCylinder}
           onChange={(e) => {
            const selected = e.target.value;
            setGasCylinder(selected);
            setUnitPrice(cylinderPrices[selected] ?? 0);
        }}
        >
            <option value="0">0 - No Gas</option>
            <option value="9kg">9kg</option>
            <option value="12kg">12kg</option>
            <option value="14kg">14kg</option>
            <option value="19kg">19kg</option>
            <option value="48kg">48kg</option>
        </select>

        <div>
           <label>Price per Cylinder (R)</label>
          <input
            type="number"
            step="0.01"
            placeholder="Price (R)"
            value={unitPrice}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setUnitPrice(Number(e.target.value))
          }
        required
      />
        </div>

        <div>
          <label>Quantity</label>
         <input
            type="number"
            min="0"
            placeholder="Quantity"
            value={quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setQuantity(Number(e.target.value))
         }
         required
        />
        </div>

        <select
          value={quoteType}
          onChange={(e) => setQuoteType(e.target.value as QuoteType)}
        >
          <option value="None">No Installation</option>
          <option value="Geyser">Geyser</option>
          <option value="Stove">Stove</option>
          <option value="Braai">Braai</option>
          <option value="Hob">Hob</option>
          <option value="Heater">Heater</option>
          <option value="Other">Other</option>
        </select>

        {quoteType === "Other" && (
          <input
            placeholder="Describe installation"
            value={otherDescription}
            onChange={(e) => setOtherDescription(e.target.value)}
          />
        )}

        <input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <input
          placeholder="Area or Town"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          required
        />

        {error && <div style={{ color: "red" }}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Order"}
        </button>
      </form>
    </div>
  );
}