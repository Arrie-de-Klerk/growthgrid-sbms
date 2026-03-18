import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import "../App.css";

type Row = {
  size_kg: number;
  full: number;
  empty: number;
  at_customer: number;
  damaged: number;
  total: number;
  damaged_value: number;
  loss_alert_threshold: number;
  size_alert_threshold: number;
};

export default function Dashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventory_dashboard_overview")
      .select("*")
      .order("size_kg");

    if (error) {
      console.error(error);
      alert("Failed to load dashboard");
    } else {
      setRows(data ?? []);
    }

    setLoading(false);
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.full += r.full;
        acc.empty += r.empty;
        acc.at_customer += r.at_customer;
        acc.damaged += r.damaged;
        acc.total += r.total;
        acc.loss += r.damaged_value;
        return acc;
      },
      {
        full: 0,
        empty: 0,
        at_customer: 0,
        damaged: 0,
        total: 0,
        loss: 0,
      }
    );
  }, [rows]);

  const lossThreshold = rows[0]?.loss_alert_threshold ?? 0;
  const showLossAlert = totals.loss >= lossThreshold;

  if (loading) return <p>Loading dashboard…</p>;

  return (
    <div className="container">
      <h1>📊 Owner Dashboard</h1>

      {/* KPI CARDS */}
      <div className="kpis">
        <Kpi label="Total Cylinders" value={totals.total} />
        <Kpi label="At Customers" value={totals.at_customer} />
        <Kpi label="Damaged" value={totals.damaged} />
        <Kpi
          label="Total Loss"
          value={`R ${totals.loss.toLocaleString()}`}
          alert={showLossAlert}
        />
      </div>

      {showLossAlert && (
        <div className="alert critical">
          🚨 LOSS ALERT: Loss exceeds R {lossThreshold.toLocaleString()}
        </div>
      )}

      {/* TABLE */}
      <table>
        <thead>
          <tr>
            <th>Size (kg)</th>
            <th>Full</th>
            <th>Empty</th>
            <th>At Customer</th>
            <th>Damaged</th>
            <th>Total</th>
            <th>Loss (R)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.size_kg}>
              <td>{r.size_kg}</td>
              <td>{r.full}</td>
              <td>{r.empty}</td>
              <td>{r.at_customer}</td>
              <td>{r.damaged}</td>
              <td>{r.total}</td>
              <td>
                <LossBadge
                  value={r.damaged_value}
                  threshold={r.size_alert_threshold}
                />
              </td>
            </tr>
          ))}

          {/* TOTALS ROW */}
          <tr className="totals">
            <td>Total</td>
            <td>{totals.full}</td>
            <td>{totals.empty}</td>
            <td>{totals.at_customer}</td>
            <td>{totals.damaged}</td>
            <td>{totals.total}</td>
            <td>R {totals.loss.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Kpi({
  label,
  value,
  alert,
}: {
  label: string;
  value: number | string;
  alert?: boolean;
}) {
  return (
    <div className={`kpi ${alert ? "critical" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function LossBadge({
  value,
  threshold,
}: {
  value: number;
  threshold: number;
}) {
  if (value === 0) return <span className="ok">OK</span>;

  if (value >= threshold)
    return <span className="critical">🚨 R {value.toLocaleString()}</span>;

  return <span className="warning">⚠️ R {value.toLocaleString()}</span>;
}
