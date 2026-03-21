import React, { useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const THEME = {
  bg: "#080B10", card: "#0F1420", border: "rgba(0, 229, 187, 0.18)",
  text: "#DDE4F0", muted: "rgba(221, 228, 240, 0.72)", accent: "#00E5BB",
  buy: "#18D87A", wait: "#F6C343", avoid: "#F05353",
};

function clampScore(x) { const n = Number(x); return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0; }

function normalizeRec(rec, score) {
  const s = clampScore(score); const r = (rec || "").toLowerCase();
  if (r.includes("compr")) return "comprar";
  if (r.includes("aguard")) return "aguardar";
  if (r.includes("evit")) return "evitar";
  return s >= 7.5 ? "comprar" : s >= 6 ? "aguardar" : "evitar";
}

function formatDayKey(d) {
  const dt = new Date(d); if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
}

function Card({ title, children }) {
  return <div style={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 14, minHeight: 280 }}>
    <div style={{ color: THEME.text, fontWeight: 800, marginBottom: 10 }}>{title}</div>
    {children}
  </div>;
}

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return <div style={{ background: "rgba(15,20,32,0.94)", border: `1px solid ${THEME.border}`, borderRadius: 12, padding: "10px 12px", color: THEME.text }}>
    {label != null && <div style={{ fontWeight: 800, marginBottom: 6 }}>{String(label)}</div>}
    {payload.map((p, i) => <div key={i} style={{ color: THEME.muted }}><span style={{ color: THEME.text, fontWeight: 700 }}>{p.name}:</span> {p.value}</div>)}
  </div>;
}

export default function Charts({ properties = [] }) {
  const safe = Array.isArray(properties) ? properties : [];
  const [selId, setSelId] = useState(() => safe[0]?.id ?? "");
  const selected = useMemo(() => safe.find(p => String(p.id) === String(selId)) || safe[0] || null, [safe, selId]);

  const dimData = useMemo(() => {
    if (!selected) return [];
    return [
      { dimension: "Localização", score: clampScore(selected.score_localizacao) },
      { dimension: "Desconto", score: clampScore(selected.score_desconto) },
      { dimension: "Jurídico", score: clampScore(selected.score_juridico) },
      { dimension: "Ocupação", score: clampScore(selected.score_ocupacao) },
      { dimension: "Liquidez", score: clampScore(selected.score_liquidez) },
      { dimension: "Mercado", score: clampScore(selected.score_mercado) },
    ].filter(d => d.score > 0);
  }, [selected]);

  const pieData = useMemo(() => {
    const c = { comprar: 0, aguardar: 0, evitar: 0 };
    for (const p of safe) c[normalizeRec(p.recomendacao, p.score_total)] += 1;
    return [{ name: "Comprar", key: "comprar", value: c.comprar }, { name: "Aguardar", key: "aguardar", value: c.aguardar }, { name: "Evitar", key: "evitar", value: c.evitar }];
  }, [safe]);

  const timeData = useMemo(() => {
    const map = new Map();
    for (const p of safe) { const k = formatDayKey(p.createdAt); if (k) map.set(k, (map.get(k) || 0) + 1); }
    return Array.from(map.entries()).map(([day, count]) => ({ day: day.slice(5), count })).sort((a,b) => a.day.localeCompare(b.day));
  }, [safe]);

  const sel = { width: "100%", background: "rgba(8,11,16,0.35)", border: `1px solid ${THEME.border}`, borderRadius: 10, color: THEME.text, padding: "10px 12px", outline: "none", marginBottom: 10 };

  return <div style={{ display: "grid", gap: 14 }}>
    <Card title="Score por dimensão">
      <select value={selected?.id ?? ""} onChange={e => setSelId(e.target.value)} style={sel}>
        {safe.map(p => <option key={p.id} value={p.id} style={{ color: "#000" }}>{p.titulo || `Imóvel ${p.id}`}</option>)}
      </select>
      {dimData.length === 0 ? <div style={{ color: THEME.muted }}>Sem dados.</div> :
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={dimData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
              <CartesianGrid stroke="rgba(221,228,240,0.08)" vertical={false} />
              <XAxis dataKey="dimension" stroke={THEME.muted} tick={{ fill: THEME.muted, fontSize: 10 }} />
              <YAxis stroke={THEME.muted} tick={{ fill: THEME.muted, fontSize: 10 }} domain={[0, 10]} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="score" name="Score" fill={THEME.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>}
    </Card>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
      <Card title="Distribuição por recomendação">
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <PieChart>
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ color: THEME.muted, fontSize: 12 }} />
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {pieData.map(e => <Cell key={e.key} fill={e.key === "comprar" ? THEME.buy : e.key === "aguardar" ? THEME.wait : THEME.avoid} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Análises por dia">
        {timeData.length === 0 ? <div style={{ color: THEME.muted }}>Sem histórico.</div> :
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={timeData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                <CartesianGrid stroke="rgba(221,228,240,0.08)" vertical={false} />
                <XAxis dataKey="day" stroke={THEME.muted} tick={{ fill: THEME.muted, fontSize: 10 }} />
                <YAxis stroke={THEME.muted} tick={{ fill: THEME.muted, fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Line type="monotone" dataKey="count" name="Análises" stroke={THEME.accent} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>}
      </Card>
    </div>
  </div>;
}
