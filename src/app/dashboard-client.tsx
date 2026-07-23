"use client";

import { useState, useCallback } from "react";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  isActive: boolean;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Communique {
  id: string;
  sourceId: string;
  source: { name: string };
  url: string;
  title: string;
  rawContent: string | null;
  summary: string | null;
  targetAudience: string | null;
  importantDates: string | null;
  requiredDocs: string | null;
  status: string;
  emailSent: boolean;
  publishedAt: string | null;
  detectedAt: string;
  emailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

interface ScrapeLog {
  id: string;
  sourceId: string | null;
  source: { name: string } | null;
  status: string;
  message: string | null;
  newCount: number;
  duration: number | null;
  createdAt: string;
}

interface Stats {
  totalSources: number;
  activeSources: number;
  totalCommuniques: number;
  newToday: number;
  sentCount: number;
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export function DashboardClient({
  sources: initialSources,
  communiques,
  logs,
  stats,
}: {
  sources: Source[];
  communiques: Communique[];
  logs: ScrapeLog[];
  stats: Stats;
}) {
  const [sources, setSources] = useState(initialSources);
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState("");
  const [showAddSource, setShowAddSource] = useState(false);

  const handleScrape = useCallback(async () => {
    setScraping(true);
    setMessage("");
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      setMessage(
        `✅ Scraping terminé : ${data.results.reduce((s: number, r: { newCount: number }) => s + r.newCount, 0)} nouveau(x) communiqué(s)`
      );
      // Recharger la page après 2s
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      setMessage("❌ Erreur lors du scraping.");
    } finally {
      setScraping(false);
    }
  }, []);

  const handleToggleSource = useCallback(
    async (id: string, active: boolean) => {
      await fetch(`/api/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active }),
      });
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: active } : s))
      );
    },
    []
  );

  const handleDeleteSource = useCallback(async (id: string) => {
    if (!confirm("Supprimer cette source ?")) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header
        style={{
          background: "var(--primary)",
          color: "#fff",
          padding: "20px 32px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>
          📡 Veille Éducation Burkina Faso
        </h1>
        <p style={{ margin: "4px 0 0", opacity: 0.85, fontSize: 14 }}>
          Surveillance automatique des communiqués officiels
        </p>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {/* Stats */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <StatCard label="Sources actives" value={`${stats.activeSources}/${stats.totalSources}`} />
          <StatCard label="Total communiqués" value={stats.totalCommuniques} />
          <StatCard label="Aujourd'hui" value={stats.newToday} />
          <StatCard label="E-mails envoyés" value={stats.sentCount} />
        </section>

        {/* Actions */}
        <section
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <button onClick={handleScrape} disabled={scraping} className="btn-primary">
            {scraping ? "⏳ Scraping..." : "🔍 Lancer le scraping"}
          </button>
          <button
            onClick={() => setShowAddSource(!showAddSource)}
            className="btn-secondary"
          >
            {showAddSource ? "❌ Annuler" : "➕ Ajouter une source"}
          </button>
          {message && (
            <span
              style={{
                alignSelf: "center",
                fontSize: 14,
                color: message.startsWith("✅") ? "var(--primary)" : "var(--danger)",
              }}
            >
              {message}
            </span>
          )}
        </section>

        {/* Formulaire ajout source */}
        {showAddSource && (
          <AddSourceForm
            onAdded={() => {
              setShowAddSource(false);
              window.location.reload();
            }}
          />
        )}

        {/* Sources */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>📌 Sources surveillées</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>URL</th>
                  <th>Type</th>
                  <th>Catégorie</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#999" }}>
                      Aucune source configurée. Ajoutez-en une !
                    </td>
                  </tr>
                )}
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis" }}>
                      <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
                        {s.url}
                      </a>
                    </td>
                    <td>
                      <span className="badge">{s.type}</span>
                    </td>
                    <td>{s.category ?? "—"}</td>
                    <td>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={s.isActive}
                          onChange={(e) => handleToggleSource(s.id, e.target.checked)}
                        />
                        {s.isActive ? "✅" : "❌"}
                      </label>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteSource(s.id)}
                        style={{ color: "var(--danger)", background: "none", border: "none", cursor: "pointer" }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Derniers communiqués */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>📰 Derniers communiqués</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Source</th>
                  <th>Statut</th>
                  <th>Détecté le</th>
                  <th>E-mail</th>
                </tr>
              </thead>
              <tbody>
                {communiques.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#999" }}>
                      Aucun communiqué détecté.
                    </td>
                  </tr>
                )}
                {communiques.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--primary)", fontWeight: 500 }}
                      >
                        {c.title}
                      </a>
                      {c.summary && (
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#666" }}>
                          {c.summary.slice(0, 120)}...
                        </p>
                      )}
                    </td>
                    <td>{c.source.name}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                      {formatDate(c.detectedAt)}
                    </td>
                    <td>{c.emailSent ? "📬" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Logs récents */}
        <section>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>📋 Logs récents</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Source</th>
                  <th>Statut</th>
                  <th>Message</th>
                  <th>Nouveaux</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#999" }}>
                      Aucun log.
                    </td>
                  </tr>
                )}
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                      {formatDate(l.createdAt)}
                    </td>
                    <td>{l.source?.name ?? "—"}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: l.status === "success" ? "var(--primary-light)" : "#fce4ec",
                          color: l.status === "success" ? "var(--primary)" : "var(--danger)",
                        }}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: 300, fontSize: 13 }}>{l.message ?? "—"}</td>
                    <td>{l.newCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <style jsx>{`
        .btn-primary {
          background: var(--primary);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          background: #fff;
          color: var(--primary);
          border: 1px solid var(--primary);
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }
        .table th {
          background: #fafafa;
          text-align: left;
          padding: 10px 14px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #666;
          border-bottom: 2px solid #eee;
        }
        .table td {
          padding: 10px 14px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
          vertical-align: top;
        }
        .table tr:last-child td {
          border-bottom: none;
        }
        .badge {
          display: inline-block;
          background: var(--primary-light);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: "#fff",
        padding: "16px 20px",
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--primary)" }}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    NEW: { bg: "#e3f2fd", color: "#1565c0" },
    SUMMARIZED: { bg: "#fff3e0", color: "#e65100" },
    SENT: { bg: "var(--primary-light)", color: "var(--primary)" },
    ARCHIVED: { bg: "#f5f5f5", color: "#999" },
    ERROR: { bg: "#fce4ec", color: "var(--danger)" },
  };
  const c = colors[status] ?? colors.NEW;
  return (
    <span
      className="badge"
      style={{ background: c.bg, color: c.color }}
    >
      {status}
    </span>
  );
}

function AddSourceForm({ onAdded }: { onAdded: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    onAdded();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "#fff",
        padding: 20,
        borderRadius: 8,
        marginBottom: 24,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
      }}
    >
      <div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Nom</label>
        <input name="name" required className="input" placeholder="Ex: MEBAPLN" />
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>URL</label>
        <input name="url" required className="input" placeholder="https://..." />
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Type</label>
        <select name="type" defaultValue="WEBSITE" className="input">
          <option value="WEBSITE">Site web</option>
          <option value="FACEBOOK_PAGE">Page Facebook</option>
          <option value="RSS">Flux RSS</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Catégorie</label>
        <input name="category" className="input" placeholder="Ex: bourses" />
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Sélecteur CSS (conteneur)</label>
        <input name="itemSelector" className="input" placeholder="Ex: article, .post" />
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Sélecteur titre</label>
        <input name="titleSelector" className="input" placeholder="Ex: h2, .title" />
      </div>
      <div>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Sélecteur lien</label>
        <input name="linkSelector" className="input" placeholder="Ex: a" />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "..." : "Ajouter"}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
          margin-top: 2px;
        }
        .input:focus {
          outline: none;
          border-color: var(--primary);
        }
      `}</style>
    </form>
  );
}
