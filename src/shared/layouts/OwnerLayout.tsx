import { useState } from "react";
import Dashboard from "../../modules/gas/pages/Dashboard";
import Settings from "../../modules/gas/pages/Settings";
import "../App.css";

type OwnerPage = "dashboard" | "settings";

export default function OwnerLayout() {
  const [page, setPage] = useState<OwnerPage>("dashboard");

  return (
    <div>
      {/* OWNER NAV */}
      <nav className="top-nav">
        <button
          className={page === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          📊 Dashboard
        </button>

        <button
          className={page === "settings" ? "active" : ""}
          onClick={() => setPage("settings")}
        >
          ⚙️ Settings
        </button>
      </nav>

      {/* OWNER CONTENT */}
      {page === "dashboard" && <Dashboard />}
      {page === "settings" && <Settings />}
    </div>
  );
}
