import { useEffect, useState } from "react";
import { CheckCircle2, MinusCircle, DatabaseBackup, Loader2, BellRing } from "lucide-react";
import {
  getAdminSessions,
  AdminSession,
  getBackups,
  runBackupNow,
  BackupSummary,
  ApiError,
  getAdminAlertSubscriptions,
  AdminAlertSubscription,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function BackupsCard() {
  const toast = useToast();
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    try {
      const { backups } = await getBackups();
      setBackups(backups);
    } catch {
      /* the sessions table above already surfaces a load error; keep this quiet */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRunNow() {
    setRunning(true);
    try {
      const { counts } = await runBackupNow();
      toast.success(`Backup complete (${Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString("en-IN")} rows).`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Backup failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card">
      <div className="section-title">
        <DatabaseBackup size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
        Local backups
      </div>
      <button className="btn small secondary" onClick={handleRunNow} disabled={running} style={{ marginBottom: 12 }}>
        {running ? <Loader2 size={12} className="spin" /> : <DatabaseBackup size={12} />}
        Run backup now
      </button>
      {loading ? (
        <div className="loading-state">Loading backups…</div>
      ) : backups.length === 0 ? (
        <div className="empty-state">No backups yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="run-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.name}>
                  <td title={new Date(b.createdAt).toLocaleString()}>{relativeTime(b.createdAt)}</td>
                  <td>{fmtBytes(b.sizeBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AlertRecipientsCard() {
  const [subscriptions, setSubscriptions] = useState<AdminAlertSubscription[]>([]);
  const [configuredRecipients, setConfiguredRecipients] = useState<{ email: string; active: boolean; source: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAlertSubscriptions()
      .then(({ subscriptions, configuredRecipients }) => {
        setSubscriptions(subscriptions);
        setConfiguredRecipients(configuredRecipients);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card">
      <div className="section-title">
        <BellRing size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
        Alert recipients <span style={{ color: "var(--text-muted)" }}>({subscriptions.length + configuredRecipients.length})</span>
      </div>
      {loading ? (
        <div className="loading-state">Loading alert recipients…</div>
      ) : subscriptions.length === 0 && configuredRecipients.length === 0 ? (
        <div className="empty-state">No users have saved alert preferences yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="run-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Keywords</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {configuredRecipients.map((recipient) => (
                <tr key={`configured-${recipient.email}`}>
                  <td>{recipient.email}</td>
                  <td>
                    <span className={`badge ${recipient.active ? "success" : "muted"}`}>
                      {recipient.active ? "sending" : "paused"}
                    </span>
                  </td>
                  <td>All alert digest matches</td>
                  <td>configured</td>
                </tr>
              ))}
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.email}</td>
                  <td>
                    <span className={`badge ${sub.active ? "success" : "muted"}`}>{sub.active ? "sending" : "paused"}</span>
                  </td>
                  <td>{sub.keywords.length ? sub.keywords.join(", ") : "—"}</td>
                  <td title={new Date(sub.updatedAt).toLocaleString()}>{relativeTime(sub.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SessionsPanel() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { sessions } = await getAdminSessions();
        if (!cancelled) {
          setSessions(sessions);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load sessions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      {loading ? (
        <div className="loading-state">Loading sessions…</div>
      ) : error ? (
        <div className="error-state">Unable to load sessions — {error}</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">No sessions yet.</div>
      ) : (
        <div className="card">
          <div className="section-title">
            Active sessions <span style={{ color: "var(--text-muted)" }}>({sessions.length})</span>
          </div>
          <div className="table-wrap">
            <table className="run-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>IP address</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th>Logged in</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.email}</td>
                    <td>
                      <span className={`badge ${s.role === "admin" ? "warning" : "muted"}`}>{s.role}</span>
                    </td>
                    <td>{s.ipAddress ?? "—"}</td>
                    <td>
                      {s.active ? (
                        <span className="badge success">
                          <CheckCircle2 size={12} />
                          active
                        </span>
                      ) : (
                        <span className="badge muted">
                          <MinusCircle size={12} />
                          ended
                        </span>
                      )}
                    </td>
                    <td title={new Date(s.lastActiveAt).toLocaleString()}>{relativeTime(s.lastActiveAt)}</td>
                    <td title={new Date(s.createdAt).toLocaleString()}>{relativeTime(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BackupsCard />
      <AlertRecipientsCard />
    </>
  );
}
