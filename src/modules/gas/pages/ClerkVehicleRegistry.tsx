import VehicleRegistryBlock from "../components/VehicleRegistryBlock";

export default function ClerkVehicleRegistry() {
  const businessId = "demo-business";

  return (
    <VehicleRegistryBlock
      businessId={businessId}
      onCreated={async () => {
        console.log("Vehicle created");
      }}
    />
  );
}