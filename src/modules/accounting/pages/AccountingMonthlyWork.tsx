import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../../shared/lib/supabase";

type TaskType = "bookkeeping" | "vat" | "paye" | "payroll" | "tax";

type TaskStatus =
  | "not_started"
  | "in_progress"
  | "waiting_documents"
  | "completed"
  | "submitted";

type AccountingClient = {
  id: string;
  client_name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  is_vat_registered: boolean;
  is_paye_registered: boolean;
  has_payroll: boolean;
  financial_year_end: string | null;
  assigned_staff: string | null;
  status: string;
};

type AccountingMonthlyTask = {
  id: string;
  business_id: string;
  client_id: string;
  month_start: string;
  task_type: TaskType;
  status: TaskStatus;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  notes: string | null;
};

type WorkRow = {
  client: AccountingClient;
  tasks: Partial<Record<TaskType, AccountingMonthlyTask>>;
};

const TASK_TYPES: TaskType[] = ["bookkeeping", "vat", "paye", "payroll", "tax"];

function AccountingMonthlyWork() {
  const [searchParams] = useSearchParams();

  const statusParam = searchParams.get("status");
  const taskParam = searchParams.get("task");

  const [clients, setClients] = useState<AccountingClient[]>([]);
  const [tasks, setTasks] = useState<AccountingMonthlyTask[]>([]);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    | "all"
    | "not_started"
    | "in_progress"
    | "waiting_documents"
    | "completed"
    | "submitted"
  >(
    statusParam === "not_started" ||
      statusParam === "in_progress" ||
      statusParam === "waiting_documents" ||
      statusParam === "completed" ||
      statusParam === "submitted"
      ? statusParam
      : "all"
  );

  const [taskFilter, setTaskFilter] = useState<"all" | TaskType>(
    taskParam === "bookkeeping" ||
      taskParam === "vat" ||
      taskParam === "paye" ||
      taskParam === "payroll" ||
      taskParam === "tax"
      ? taskParam
      : "all"
  );

  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const monthStart = getMonthStart();

  async function loadMonthlyWork() {
    try {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        setError("You are not signed in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, business_type")
        .eq("id", userData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        setError("Profile or business not found.");
        return;
      }

      if (profile.business_type !== "accounting") {
        setError("This page is only for Accounting businesses.");
        return;
      }

      const { data: clientData, error: clientsError } = await supabase
        .from("accounting_clients")
        .select(
          "id, client_name, business_name, phone, email, is_vat_registered, is_paye_registered, has_payroll, financial_year_end, assigned_staff, status"
        )
        .eq("business_id", profile.business_id)
        .order("client_name", { ascending: true });

      if (clientsError) throw clientsError;

      const loadedClients = (clientData ?? []) as AccountingClient[];
      setClients(loadedClients);

      await createMissingTasks(profile.business_id, loadedClients);

      const { data: taskData, error: tasksError } = await supabase
        .from("accounting_monthly_tasks")
        .select("*")
        .eq("business_id", profile.business_id)
        .eq("month_start", monthStart);

      if (tasksError) throw tasksError;

      setTasks((taskData ?? []) as AccountingMonthlyTask[]);
    } catch (err) {
      console.error(err);
      setError("Could not load monthly work.");
    } finally {
      setLoading(false);
    }
  }

  async function createMissingTasks(
    activeBusinessId: string,
    activeClients: AccountingClient[]
  ) {
    const rowsToCreate = activeClients.flatMap((client) => {
      const requiredTasks = getRequiredTaskTypes(client);

      return requiredTasks.map((taskType) => ({
        business_id: activeBusinessId,
        client_id: client.id,
        month_start: monthStart,
        task_type: taskType,
        status: "not_started" as TaskStatus,
      }));
    });

    if (rowsToCreate.length === 0) return;

    const { error: upsertError } = await supabase
      .from("accounting_monthly_tasks")
      .upsert(rowsToCreate, {
        onConflict: "business_id,client_id,month_start,task_type",
        ignoreDuplicates: true,
      });

    if (upsertError) throw upsertError;
  }

  async function updateTaskStatus(
    task: AccountingMonthlyTask,
    nextStatus: TaskStatus
  ) {
    try {
      setSavingTaskId(task.id);
      setError("");

      const now = new Date().toISOString();

      const updatePayload: Partial<AccountingMonthlyTask> = {
        status: nextStatus,
      };

      if (nextStatus === "in_progress" && !task.started_at) {
        updatePayload.started_at = now;
      }

      if (nextStatus === "completed") {
        updatePayload.completed_at = now;

        if (!task.started_at) {
          updatePayload.started_at = now;
        }
      }

      if (nextStatus === "submitted") {
        updatePayload.submitted_at = now;

        if (!task.completed_at) {
          updatePayload.completed_at = now;
        }

        if (!task.started_at) {
          updatePayload.started_at = now;
        }
      }

      if (nextStatus === "not_started") {
        updatePayload.started_at = null;
        updatePayload.completed_at = null;
        updatePayload.submitted_at = null;
      }

      const { error: updateError } = await supabase
        .from("accounting_monthly_tasks")
        .update(updatePayload)
        .eq("id", task.id);

      if (updateError) throw updateError;

      await loadMonthlyWork();
    } catch (err) {
      console.error(err);
      setError("Could not update task.");
    } finally {
      setSavingTaskId(null);
    }
  }

  useEffect(() => {
    loadMonthlyWork();
  }, []);

  const rows = useMemo<WorkRow[]>((() => {
    return clients.map((client) => {
      const clientTasks = tasks.filter((task) => task.client_id === client.id);

      const taskMap: Partial<Record<TaskType, AccountingMonthlyTask>> = {};

      clientTasks.forEach((task) => {
        taskMap[task.task_type] = task;
      });

      return {
        client,
        tasks: taskMap,
      };
    });
  }) as () => WorkRow[], [clients, tasks]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [
          row.client.client_name,
          row.client.business_name,
          row.client.phone,
          row.client.email,
          row.client.assigned_staff,
          row.client.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesTaskAndStatus =
        taskFilter === "all"
          ? filter === "all" ||
            Object.values(row.tasks).some((task) => task?.status === filter)
          : filter === "all"
            ? Boolean(row.tasks[taskFilter])
            : row.tasks[taskFilter]?.status === filter;

      return matchesSearch && matchesTaskAndStatus;
    });
  }, [rows, search, filter, taskFilter]);

  const summary = useMemo(() => {
    return {
      totalClients: clients.length,
      notStarted: tasks.filter((task) => task.status === "not_started").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      waitingDocs: tasks.filter((task) => task.status === "waiting_documents")
        .length,
      completed: tasks.filter((task) => task.status === "completed").length,
      submitted: tasks.filter((task) => task.status === "submitted").length,
    };
  }, [clients, tasks]);

  const visibleTaskTypes: TaskType[] =
    taskFilter === "all" ? TASK_TYPES : [taskFilter];

  const monthLabel = new Date().toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Monthly Work</h1>
          <p style={subtitleStyle}>
            Real monthly work tracker for {monthLabel}: bookkeeping, VAT, PAYE,
            payroll and tax tasks.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link to="/accounting">
            <button type="button" style={secondaryButtonStyle}>
              Back to Dashboard
            </button>
          </Link>

          <Link to="/accounting/documents">
            <button type="button" style={buttonStyle}>
              Documents
            </button>
          </Link>
        </div>
      </header>

      <section style={summaryGridStyle}>
        <SummaryBox label="Clients" value={summary.totalClients.toString()} />
        <SummaryBox label="Not Started" value={summary.notStarted.toString()} />
        <SummaryBox label="In Progress" value={summary.inProgress.toString()} />
        <SummaryBox label="Waiting Docs" value={summary.waitingDocs.toString()} />
        <SummaryBox label="Completed" value={summary.completed.toString()} />
        <SummaryBox label="Submitted" value={summary.submitted.toString()} />
      </section>

      <section style={toolbarStyle}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, business, phone, email, staff..."
          style={searchStyle}
        />

        <select
          value={taskFilter}
          onChange={(e) => setTaskFilter(e.target.value as "all" | TaskType)}
          style={selectStyle}
        >
          <option value="all">All Work Types</option>
          <option value="bookkeeping">Bookkeeping</option>
          <option value="vat">VAT</option>
          <option value="paye">PAYE</option>
          <option value="payroll">Payroll</option>
          <option value="tax">Tax</option>
        </select>

        <select
          value={filter}
          onChange={(e) =>
            setFilter(
              e.target.value as
                | "all"
                | "not_started"
                | "in_progress"
                | "waiting_documents"
                | "completed"
                | "submitted"
            )
          }
          style={selectStyle}
        >
          <option value="all">All Tasks</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">Started</option>
          <option value="waiting_documents">Waiting Documents</option>
          <option value="completed">Completed</option>
          <option value="submitted">Submitted</option>
        </select>

        <button type="button" onClick={loadMonthlyWork} style={refreshButtonStyle}>
          Refresh
        </button>
      </section>

      {loading && <div style={infoStyle}>Loading monthly work...</div>}

      {error && <div style={errorStyle}>⚠️ {error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div style={emptyStyle}>
          No accounting clients captured yet. Add a client first.
        </div>
      )}

      {!loading && !error && rows.length > 0 && filteredRows.length === 0 && (
        <div style={emptyStyle}>No monthly work matches your filter.</div>
      )}

      {!loading && !error && filteredRows.length > 0 && (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Business</th>

                {visibleTaskTypes.map((taskType) => (
                  <th key={taskType} style={thStyle}>
                    {getTaskTypeLabel(taskType)}
                  </th>
                ))}

                <th style={thStyle}>Assigned</th>
                <th style={thStyle}>Open</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.client.id}>
                  <td style={tdStyle}>{row.client.client_name}</td>
                  <td style={tdStyle}>{row.client.business_name || "-"}</td>

                  {visibleTaskTypes.map((taskType) => (
                    <td key={taskType} style={tdStyle}>
                      <TaskCell
                        task={row.tasks[taskType]}
                        savingTaskId={savingTaskId}
                        onStatusChange={updateTaskStatus}
                      />
                    </td>
                  ))}

                  <td style={tdStyle}>{row.client.assigned_staff || "-"}</td>

                  <td style={tdStyle}>
                    <Link to={`/accounting/clients/${row.client.id}`}>
                      <button type="button" style={smallButtonStyle}>
                        Open
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section style={noteStyle}>
        <strong>Saved in Supabase:</strong> These task statuses are real. You can
        now filter by work type and status, for example VAT + Not Started.
      </section>
    </div>
  );
}

function TaskCell({
  task,
  savingTaskId,
  onStatusChange,
}: {
  task: AccountingMonthlyTask | undefined;
  savingTaskId: string | null;
  onStatusChange: (task: AccountingMonthlyTask, nextStatus: TaskStatus) => void;
}) {
  if (!task) {
    return <span style={notApplicableStyle}>N/A</span>;
  }

  const isSaving = savingTaskId === task.id;

  return (
    <div style={taskCellStyle}>
      <StatusBadge status={task.status} />

      <div style={dateTextStyle}>{getTaskDateText(task)}</div>

      <div style={miniButtonRowStyle}>
        {task.status === "not_started" && (
          <>
            <button
              type="button"
              style={miniButtonStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(task, "in_progress")}
            >
              Start
            </button>

            <button
              type="button"
              style={miniButtonLightStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(task, "waiting_documents")}
            >
              Docs
            </button>
          </>
        )}

        {task.status === "in_progress" && (
          <>
            <button
              type="button"
              style={miniButtonStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(task, "completed")}
            >
              Complete
            </button>

            <button
              type="button"
              style={miniButtonLightStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(task, "waiting_documents")}
            >
              Docs
            </button>
          </>
        )}

        {task.status === "waiting_documents" && (
          <>
            <button
              type="button"
              style={miniButtonStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(task, "in_progress")}
            >
              Resume
            </button>

            <button
              type="button"
              style={miniButtonLightStyle}
              disabled={isSaving}
              onClick={() => onStatusChange(task, "completed")}
            >
              Complete
            </button>
          </>
        )}

        {task.status === "completed" && (
          <button
            type="button"
            style={miniButtonStyle}
            disabled={isSaving}
            onClick={() => onStatusChange(task, "submitted")}
          >
            Submit
          </button>
        )}

        {task.status === "submitted" && (
          <button
            type="button"
            style={miniButtonLightStyle}
            disabled={isSaving}
            onClick={() => onStatusChange(task, "in_progress")}
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const label = getStatusLabel(status);

  const styleByStatus: Record<TaskStatus, CSSProperties> = {
    not_started: {
      background: "#e0f2fe",
      color: "#075985",
    },
    in_progress: {
      background: "#fff7ed",
      color: "#9a3412",
    },
    waiting_documents: {
      background: "#fee2e2",
      color: "#991b1b",
    },
    completed: {
      background: "#dcfce7",
      color: "#166534",
    },
    submitted: {
      background: "#ede9fe",
      color: "#5b21b6",
    },
  };

  return (
    <span style={{ ...statusBadgeStyle, ...styleByStatus[status] }}>
      {label}
    </span>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryValueStyle}>{value}</div>
      <div style={summaryLabelStyle}>{label}</div>
    </div>
  );
}

function getMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function getRequiredTaskTypes(client: AccountingClient): TaskType[] {
  const taskTypes: TaskType[] = ["bookkeeping"];

  if (client.is_vat_registered) taskTypes.push("vat");
  if (client.is_paye_registered) taskTypes.push("paye");
  if (client.has_payroll) taskTypes.push("payroll");
  if (client.financial_year_end) taskTypes.push("tax");

  return taskTypes;
}

function getTaskTypeLabel(taskType: TaskType) {
  switch (taskType) {
    case "bookkeeping":
      return "Bookkeeping";
    case "vat":
      return "VAT";
    case "paye":
      return "PAYE";
    case "payroll":
      return "Payroll";
    case "tax":
      return "Tax";
    default:
      return taskType;
  }
}

function getStatusLabel(status: TaskStatus) {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "in_progress":
      return "Started";
    case "waiting_documents":
      return "Waiting Docs";
    case "completed":
      return "Completed";
    case "submitted":
      return "Submitted";
    default:
      return status;
  }
}

function getTaskDateText(task: AccountingMonthlyTask) {
  if (task.status === "submitted" && task.submitted_at) {
    return `Submitted: ${formatDate(task.submitted_at)}`;
  }

  if (task.status === "completed" && task.completed_at) {
    return `Completed: ${formatDate(task.completed_at)}`;
  }

  if (task.status === "in_progress" && task.started_at) {
    return `Started: ${formatDate(task.started_at)}`;
  }

  if (task.status === "waiting_documents") {
    return "Waiting for client";
  }

  return "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const pageStyle: CSSProperties = {
  padding: 40,
  maxWidth: 1500,
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 20,
  marginBottom: 30,
};

const titleStyle: CSSProperties = {
  fontSize: 42,
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  fontSize: 18,
  color: "#555",
  marginTop: 8,
  maxWidth: 820,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const summaryBoxStyle: CSSProperties = {
  padding: 20,
  borderRadius: 14,
  background: "#111",
  color: "white",
  border: "1px solid #111",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
};

const summaryValueStyle: CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
};

const summaryLabelStyle: CSSProperties = {
  marginTop: 6,
  fontWeight: 700,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginBottom: 20,
  flexWrap: "wrap",
};

const searchStyle: CSSProperties = {
  flex: 1,
  minWidth: 280,
  padding: 13,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 16,
};

const selectStyle: CSSProperties = {
  padding: 13,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 16,
  background: "white",
};

const tableWrapStyle: CSSProperties = {
  overflowX: "auto",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
  background: "white",
  border: "1px solid #ddd",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: 12,
  background: "#f2f2f2",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

const taskCellStyle: CSSProperties = {
  display: "grid",
  gap: 7,
  minWidth: 135,
};

const statusBadgeStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  width: "fit-content",
};

const notApplicableStyle: CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#666",
  fontWeight: 800,
  fontSize: 12,
};

const dateTextStyle: CSSProperties = {
  fontSize: 12,
  color: "#555",
};

const miniButtonRowStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const miniButtonStyle: CSSProperties = {
  padding: "5px 8px",
  borderRadius: 7,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 12,
};

const miniButtonLightStyle: CSSProperties = {
  ...miniButtonStyle,
  background: "white",
  color: "black",
  border: "1px solid #ddd",
};

const infoStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#f3f4f6",
  fontWeight: 700,
};

const emptyStyle: CSSProperties = {
  marginTop: 20,
  padding: 24,
  border: "1px solid #ddd",
  borderRadius: 12,
  background: "white",
};

const errorStyle: CSSProperties = {
  padding: 18,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 700,
};

const noteStyle: CSSProperties = {
  marginTop: 24,
  padding: 18,
  borderRadius: 12,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#92400e",
};

const buttonStyle: CSSProperties = {
  padding: "12px 18px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "white",
  color: "black",
  border: "1px solid #ddd",
};

const refreshButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#666",
};

const smallButtonStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "black",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

export default AccountingMonthlyWork;