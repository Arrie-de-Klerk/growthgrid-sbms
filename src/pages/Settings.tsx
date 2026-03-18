import RoleGuard from "../components/RoleGuard";

export default function Settings() {
  return (
    <RoleGuard allow={["owner"]}>
      <div>
        <h2>Settings</h2>
        {/* thresholds UI here */}
      </div>
    </RoleGuard>
  );
}
