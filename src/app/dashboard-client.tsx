"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "jamais";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

const CATEGORY_STYLE: Record<string, { tag: string; rail: string }> = {
  bourses: { tag: "tag-bourses", rail: "rail-bourses" },
  examens: { tag: "tag-examens", rail: "rail-examens" },
  concours: { tag: "tag-concours", rail: "rail-concours" },
  calendrier: { tag: "tag-calendrier", rail: "rail-calendrier" },
};

function categoryStyle(category: string | null) {
  return CATEGORY_STYLE[category?.toLowerCase() ?? ""] ?? { tag: "tag-default", rail: "rail-default" };
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
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const [scraping, setScraping] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Statut de la dernière collecte par source, pour la pastille dans le panneau des sources
  const lastLogBySource = useMemo(() => {
    const map = new Map<string, ScrapeLog>();
    for (const l of logs) {
      if (l.sourceId && !map.has(l.sourceId)) map.set(l.sourceId, l);
    }
    return map;
  }, [logs]);

  const lastRun = logs[0]?.createdAt ?? null;

  const handleScrape = useCallback(async () => {
    setScraping(true);
    setMessage(null);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      const total = data.results.reduce((s: number, r: { newCount: number }) => s + r.newCount, 0);
      setMessage({ text: `Scraping terminé — ${total} nouveau(x) communiqué(s)`, ok: true });
      router.refresh();
    } catch {
      setMessage({ text: "Erreur lors du scraping.", ok: false });
    } finally {
      setScraping(false);
    }
  }, [router]);

  const handleToggleSource = useCallback(async (id: string, active: boolean) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: active } : s)));
    await fetch(`/api/sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: active }),
    });
  }, []);

  const handleDeleteSource = useCallback(async (id: string) => {
    setConfirmDeleteId(null);
    setSources((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
  }, []);

  return (
    <div className="min-h-screen">
      <div className="shell">
        {/* Masthead */}
        <header className="masthead">
          <div className="brand">
            <span className="eyebrow">Veille Éducation · Burkina Faso</span>
            <h1 className="serif">Bulletin de surveillance</h1>
            <span className="sub">
              {stats.totalSources} source{stats.totalSources > 1 ? "s" : ""} suivie
              {stats.totalSources > 1 ? "s" : ""} · dernière collecte {timeAgo(lastRun)}
            </span>
          </div>
          <div className="masthead-right">
            <button className="btn" onClick={() => setDrawerOpen((v) => !v)}>
              + Ajouter une source
            </button>
            <button
              className={`btn btn-primary${scraping ? " scraping" : ""}`}
              onClick={handleScrape}
              disabled={scraping}
            >
              {scraping && <span className="dot" />}
              {scraping ? "Scraping en cours…" : "Lancer le scraping"}
            </button>
          </div>
        </header>

        {message && (
          <div className={`toast ${message.ok ? "toast-ok" : "toast-err"}`}>{message.text}</div>
        )}

        {/* Stats */}
        <section className="stats">
          <StatCard label="Sources actives" value={`${stats.activeSources}/${stats.totalSources}`} delay={0.05} />
          <StatCard label="Total communiqués" value={stats.totalCommuniques} delay={0.1} />
          <StatCard label="Aujourd'hui" value={stats.newToday} delay={0.15} />
          <StatCard label="E-mails envoyés" value={stats.sentCount} delay={0.2} />
        </section>

        <div className="grid">
          {/* Sources rail */}
          <div className="panel">
            <div className="panel-head">
              <h2>Sources surveillées</h2>
              <span className="count">{sources.length}</span>
            </div>

            {sources.length === 0 && (
              <div className="empty">
                <div className="ic">＋</div>
                Aucune source configurée — ajoutez-en une pour démarrer la veille.
              </div>
            )}

            {sources.map((s) => {
              const lastLog = lastLogBySource.get(s.id);
              const dotClass = !s.isActive ? "paused" : lastLog?.status === "error" ? "err" : "live";
              const isConfirming = confirmDeleteId === s.id;
              return (
                <div className="source" key={s.id}>
                  <span className={`status-dot ${dotClass}`} title={dotClass === "live" ? "Actif" : dotClass === "err" ? "Dernière collecte en erreur" : "En pause"} />
                  <div className="source-info">
                    <span className="name">{s.name}</span>
                    <span className="type">{s.type}{s.category ? ` · ${s.category}` : ""}</span>
                  </div>
                  <label className="switch" title={s.isActive ? "Désactiver" : "Activer"}>
                    <input
                      type="checkbox"
                      checked={s.isActive}
                      onChange={(e) => handleToggleSource(s.id, e.target.checked)}
                    />
                    <span className="switch-track" />
                  </label>
                  {isConfirming ? (
                    <span className="confirm-inline">
                      <button className="btn-tiny btn-tiny-danger" onClick={() => handleDeleteSource(s.id)}>
                        Confirmer
                      </button>
                      <button className="btn-tiny" onClick={() => setConfirmDeleteId(null)}>
                        Annuler
                      </button>
                    </span>
                  ) : (
                    <button
                      className="icon-btn"
                      aria-label={`Supprimer ${s.name}`}
                      onClick={() => setConfirmDeleteId(s.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            <button className="add-source-toggle" onClick={() => setDrawerOpen((v) => !v)}>
              + Nouvelle source à surveiller
            </button>
            <div className={`drawer${drawerOpen ? " open" : ""}`}>
              <AddSourceForm
                onAdded={() => {
                  setDrawerOpen(false);
                  router.refresh();
                }}
              />
            </div>
          </div>

          {/* Feed */}
          <div className="panel">
            <div className="panel-head">
              <h2>Communiqués récents</h2>
              <span className="count">{communiques.length}</span>
            </div>

            {communiques.length === 0 && (
              <div className="empty">
                <div className="ic">📰</div>
                Aucun communiqué détecté pour le moment.
              </div>
            )}

            {communiques.map((c, i) => {
              const cat = categoryStyle(
                sources.find((s) => s.id === c.sourceId)?.category ?? null
              );
              return (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="feed-item"
                  style={{ animationDelay: `${Math.min(i, 6) * 0.06 + 0.05}s` }}
                >
                  <span className={`rail ${cat.rail}`} />
                  <div>
                    <div className="feed-top">
                      {sources.find((s) => s.id === c.sourceId)?.category && (
                        <span className={`tag ${cat.tag}`}>
                          {sources.find((s) => s.id === c.sourceId)?.category}
                        </span>
                      )}
                      <StatusChip status={c.status} emailSent={c.emailSent} />
                      <time>{formatDate(c.detectedAt)}</time>
                    </div>
                    <h3 className="serif">{c.title}</h3>
                    {c.summary && <p className="summary">{c.summary.slice(0, 160)}…</p>}
                    {(c.targetAudience || c.importantDates) && (
                      <div className="meta">
                        {c.targetAudience && (
                          <span>
                            Public : <b>{c.targetAudience}</b>
                          </span>
                        )}
                        {c.importantDates && (
                          <span>
                            Échéance : <b>{c.importantDates}</b>
                          </span>
                        )}
                      </div>
                    )}
                    <span className="source-name">{c.source.name}</span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Logs */}
        <div className="grid grid-single">
          <div className="panel">
            <div className="panel-head">
              <h2>Journal des collectes</h2>
              <span className="count">{logs.length} dernières</span>
            </div>
            {logs.length === 0 && (
              <div className="empty">
                <div className="ic">📋</div>
                Aucune collecte n&apos;a encore été effectuée.
              </div>
            )}
            {logs.map((l) => (
              <div className="log-row" key={l.id}>
                <span className={`lstatus ${l.status === "success" ? "ok" : "err"}`} />
                <span className="lname">{l.source?.name ?? "—"}</span>
                <span className="lmsg mono">{l.message ?? `${l.newCount} nouveau(x)`}</span>
                <time className="mono">{formatDate(l.createdAt)}</time>
                {l.duration != null && <span className="ldur mono">{(l.duration / 1000).toFixed(1)}s</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 20px 80px;
        }

        .masthead {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 2px solid var(--ink);
          padding-bottom: 18px;
          margin-bottom: 20px;
          opacity: 0;
          animation: rise 0.5s ease-out forwards;
        }
        .brand {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 11px;
          color: var(--accent);
          font-weight: 700;
        }
        .brand h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 400;
          letter-spacing: -0.01em;
          text-wrap: balance;
        }
        .sub {
          color: var(--muted);
          font-size: 13px;
        }
        .masthead-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .toast {
          margin-bottom: 16px;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 600;
          animation: rise 0.3s ease-out;
        }
        .toast-ok {
          background: var(--success-soft);
          color: var(--success);
        }
        .toast-err {
          background: var(--danger-soft);
          color: var(--danger);
        }

        :global(.btn) {
          border: 1px solid var(--line);
          background: var(--paper-raised);
          color: var(--ink);
          padding: 9px 16px;
          border-radius: 7px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
        }
        :global(.btn:hover) {
          box-shadow: var(--shadow);
          border-color: var(--muted);
        }
        :global(.btn:active) {
          transform: translateY(1px) scale(0.99);
        }
        :global(.btn:disabled) {
          opacity: 0.65;
          cursor: not-allowed;
        }
        :global(.btn-primary) {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        :global(.btn-primary:hover) {
          background: var(--accent-deep);
          border-color: var(--accent-deep);
        }
        :global(.dot) {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #fff;
          display: inline-block;
          animation: pulse 1.1s ease-in-out infinite;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 26px;
        }

        .grid {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
          align-items: start;
        }
        .grid-single {
          grid-template-columns: 1fr;
          margin-top: 20px;
        }

        :global(.panel) {
          background: var(--paper-raised);
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: var(--shadow);
          overflow: hidden;
        }
        :global(.panel-head) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid var(--line);
        }
        :global(.panel-head h2) {
          margin: 0;
          font-size: 14.5px;
          font-weight: 700;
        }
        :global(.count) {
          color: var(--muted);
          font-size: 12.5px;
        }

        .source {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px 18px;
          border-bottom: 1px solid var(--line);
          transition: background 0.15s ease;
        }
        .source:hover {
          background: var(--accent-soft);
        }
        .source-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .source-info .name {
          font-size: 13.5px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .source-info .type {
          font-size: 11px;
          color: var(--muted);
        }

        .status-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          flex: none;
          position: relative;
        }
        .status-dot.live {
          background: var(--success);
        }
        .status-dot.live::after {
          content: "";
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1.5px solid var(--success);
          animation: ring 2s ease-out infinite;
        }
        .status-dot.paused {
          background: var(--muted);
        }
        .status-dot.err {
          background: var(--danger);
        }

        .switch {
          position: relative;
          width: 34px;
          height: 19px;
          flex: none;
          cursor: pointer;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .switch-track {
          position: absolute;
          inset: 0;
          background: var(--line);
          border-radius: 99px;
          transition: background 0.2s ease;
        }
        .switch-track::before {
          content: "";
          position: absolute;
          width: 15px;
          height: 15px;
          left: 2px;
          top: 2px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
        }
        .switch input:checked + .switch-track {
          background: var(--accent);
        }
        .switch input:checked + .switch-track::before {
          transform: translateX(15px);
        }

        .icon-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 13px;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .icon-btn:hover {
          background: var(--danger-soft);
          color: var(--danger);
        }

        .confirm-inline {
          display: flex;
          gap: 6px;
        }
        .btn-tiny {
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid var(--line);
          background: var(--paper);
          cursor: pointer;
        }
        .btn-tiny-danger {
          background: var(--danger);
          border-color: var(--danger);
          color: #fff;
        }

        .add-source-toggle {
          width: 100%;
          text-align: left;
          padding: 14px 18px;
          border: none;
          background: none;
          color: var(--accent);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          border-top: 1px dashed var(--line);
        }
        .add-source-toggle:hover {
          background: var(--accent-soft);
        }

        .drawer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.35s ease;
          background: var(--accent-soft);
        }
        .drawer.open {
          max-height: 480px;
        }

        .empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
        }
        .empty .ic {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px dashed var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .feed-item {
          display: grid;
          grid-template-columns: 3px 1fr;
          gap: 14px;
          padding: 16px 18px;
          border-bottom: 1px solid var(--line);
          opacity: 0;
          animation: slide-in 0.4s ease-out forwards;
          text-decoration: none;
          color: inherit;
        }
        .feed-item:hover {
          background: var(--accent-soft);
        }
        .rail {
          border-radius: 2px;
        }
        .rail-bourses {
          background: var(--gold);
        }
        .rail-examens {
          background: var(--info);
        }
        .rail-concours {
          background: var(--accent);
        }
        .rail-calendrier {
          background: var(--muted);
        }
        .rail-default {
          background: var(--line);
        }
        .feed-top {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 5px;
          flex-wrap: wrap;
        }
        .tag {
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 99px;
        }
        .tag-bourses {
          background: var(--gold-soft);
          color: var(--gold);
        }
        .tag-examens {
          background: var(--info-soft);
          color: var(--info);
        }
        .tag-concours {
          background: var(--accent-soft);
          color: var(--accent);
        }
        .tag-calendrier,
        .tag-default {
          background: var(--line);
          color: var(--muted);
        }
        .feed-item time {
          color: var(--muted);
          font-size: 11.5px;
          margin-left: auto;
        }
        .feed-item h3 {
          margin: 2px 0 4px;
          font-size: 15.5px;
          font-weight: 600;
        }
        .summary {
          font-size: 13.5px;
          color: var(--muted);
          line-height: 1.5;
          max-width: 64ch;
          margin: 0 0 6px;
        }
        .meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 4px;
        }
        .meta b {
          color: var(--ink);
        }
        .source-name {
          font-size: 11.5px;
          color: var(--muted);
        }

        .log-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          border-bottom: 1px solid var(--line);
          font-size: 12.5px;
        }
        .log-row:last-child {
          border-bottom: none;
        }
        .lstatus {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex: none;
        }
        .lstatus.ok {
          background: var(--success);
        }
        .lstatus.err {
          background: var(--danger);
        }
        .lname {
          flex: none;
          width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }
        .lmsg {
          flex: 1;
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ldur {
          color: var(--muted);
        }

        .stats > :global(.stat:nth-child(1)) {
          animation-delay: 0.05s;
        }
        .stats > :global(.stat:nth-child(2)) {
          animation-delay: 0.1s;
        }
        .stats > :global(.stat:nth-child(3)) {
          animation-delay: 0.15s;
        }
        .stats > :global(.stat:nth-child(4)) {
          animation-delay: 0.2s;
        }

        @media (max-width: 880px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .grid {
            grid-template-columns: 1fr;
          }
          .masthead {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }
          .lname {
            width: 140px;
          }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function StatCard({ label, value, delay }: { label: string; value: string | number; delay: number }) {
  return (
    <div className="stat" style={{ animationDelay: `${delay}s` }}>
      <span className="k">{label}</span>
      <span className="v mono">{value}</span>
      <style jsx>{`
        .stat {
          background: var(--paper-raised);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 16px 18px;
          box-shadow: var(--shadow);
          opacity: 0;
          animation: rise 0.5s ease-out forwards;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .k {
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          font-weight: 600;
        }
        .v {
          font-size: 28px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
      `}</style>
    </div>
  );
}

function StatusChip({ status, emailSent }: { status: string; emailSent: boolean }) {
  const config: Record<string, { label: string; cls: string }> = {
    NEW: { label: "Nouveau", cls: "new" },
    SUMMARIZED: { label: "Résumé", cls: "new" },
    SENT: { label: emailSent ? "Envoyé" : "Prêt", cls: "sent" },
    ARCHIVED: { label: "Archivé", cls: "archived" },
    ERROR: { label: "Erreur envoi", cls: "error" },
  };
  const c = config[status] ?? config.NEW;
  return (
    <span className={`chip chip-${c.cls}`}>
      {c.label}
      <style jsx>{`
        .chip {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
        }
        .chip-sent {
          background: var(--success-soft);
          color: var(--success);
        }
        .chip-new {
          background: var(--warning-soft);
          color: var(--warning);
        }
        .chip-error {
          background: var(--danger-soft);
          color: var(--danger);
        }
        .chip-archived {
          background: var(--line);
          color: var(--muted);
        }
      `}</style>
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

    setSubmitting(false);
    onAdded();
  }

  return (
    <form onSubmit={handleSubmit} className="drawer-inner">
      <div className="field">
        <label>Nom de la source</label>
        <input name="name" required placeholder="Ex : Direction des Bourses" />
      </div>
      <div className="field">
        <label>URL</label>
        <input name="url" required placeholder="https://..." />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Type</label>
          <select name="type" defaultValue="WEBSITE">
            <option value="WEBSITE">Site web</option>
            <option value="FACEBOOK_PAGE">Page Facebook</option>
            <option value="RSS">Flux RSS</option>
          </select>
        </div>
        <div className="field">
          <label>Catégorie</label>
          <input name="category" placeholder="bourses, examens…" />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Sélecteur conteneur</label>
          <input name="itemSelector" placeholder="article, .post" />
        </div>
        <div className="field">
          <label>Sélecteur titre</label>
          <input name="titleSelector" placeholder="h2, .title" />
        </div>
        <div className="field">
          <label>Sélecteur lien</label>
          <input name="linkSelector" placeholder="a" />
        </div>
      </div>
      <button type="submit" disabled={submitting} className="btn btn-primary submit-btn">
        {submitting ? "Ajout en cours…" : "Ajouter la source"}
      </button>

      <style jsx>{`
        .drawer-inner {
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .field-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
        }
        label {
          display: block;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        input,
        select {
          width: 100%;
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--line);
          background: var(--paper-raised);
          color: var(--ink);
          font-size: 13.5px;
        }
        .submit-btn {
          justify-content: center;
          align-self: flex-start;
        }
      `}</style>
    </form>
  );
}
