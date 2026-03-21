import React, { useMemo } from "react";

const THEME = { card: "#0F1420", border: "rgba(0, 229, 187, 0.18)", text: "#DDE4F0", muted: "rgba(221, 228, 240, 0.72)", accent: "#00E5BB", buy: "#18D87A", wait: "#F6C343", avoid: "#F05353" };

function toDate(v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }

function fmt(d) { return new Intl.DateTimeFormat("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }).format(d); }

function colorByType(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("compr")) return THEME.buy;
  if (t.includes("evit")) return THEME.avoid;
  if (t.includes("leil")) return THEME.accent;
  return THEME.wait;
}

export default function Timeline({ events = [] }) {
  const rows = useMemo(() => (Array.isArray(events) ? events : []).map(e => { const d = toDate(e.date || e.at); return d ? { ...e, date: d } : null; }).filter(Boolean).sort((a,b) => a.date - b.date), [events]);

  return <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 18 }}>
    <div style={{ color: THEME.text, fontWeight: 800, marginBottom: 14 }}>📅 Histórico</div>
    {rows.length === 0 ? <div style={{ color: THEME.muted }}>Nenhum evento.</div> :
      <div style={{ position: "relative", paddingLeft: 22 }}>
        <div style={{ position: "absolute", left: 10, top: 6, bottom: 6, width: 2, background: "rgba(221,228,240,0.10)", borderRadius: 99 }} />
        <div style={{ display: "grid", gap: 14 }}>
          {rows.map((e, i) => <div key={i}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ marginLeft: -22, marginTop: 4, width: 14, height: 14, borderRadius: 999, background: colorByType(e.type), border: "2px solid rgba(8,11,16,0.75)", flex: "0 0 auto" }} />
              <div>
                <div style={{ color: THEME.text, fontWeight: 700 }}>{e.title || e.type || "Evento"}</div>
                <div style={{ color: THEME.muted, fontSize: 12 }}>{fmt(e.date)}</div>
              </div>
            </div>
            {e.note && <div style={{ marginLeft: 2, marginTop: 4, color: THEME.muted, fontSize: 13, borderLeft: "2px solid rgba(0,229,187,0.12)", paddingLeft: 10 }}>{e.note}</div>}
          </div>)}
        </div>
      </div>}
  </div>;
}
