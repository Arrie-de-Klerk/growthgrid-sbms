import { useUserRole } from "../hooks/useUserRole";

export default function UserBanner({ name }: { name: string }) {
  const { role } = useUserRole();

  return (
    <div
      style={{
        padding: "10px 14px",
        background: "#f1f5f9",
        borderRadius: "8px",
        marginBottom: "20px",
        fontSize: "14px",
      }}
    >
      Logged in as: <strong>{name}</strong> ({role})
    </div>
  );
}
