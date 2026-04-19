/**
 * AXIS — ScoreRadar
 * 
 * Gráfico radar SVG das 6 dimensões de score.
 * Dimensões: Localização · Desconto · Jurídico · Ocupação · Liquidez · Mercado
 * Scores são 0-10 internamente, exibidos como 0-10 nos eixos.
 */

import { C, K } from '../appConstants.js'

const DIMS = [
  { key: 'score_localizacao', label: 'Localização', peso: '20%' },
  { key: 'score_desconto',    label: 'Desconto',     peso: '18%' },
  { key: 'score_juridico',    label: 'Jurídico',     peso: '18%' },
  { key: 'score_ocupacao',    label: 'Ocupação',     peso: '15%' },
  { key: 'score_liquidez',    label: 'Liquidez',     peso: '15%' },
  { key: 'score_mercado',     label: 'Mercado',      peso: '14%' },
]

// Converte polar para cartesiano
const polar2cart = (cx, cy, r, angleDeg) => {
  const rad = (angleDeg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export default function ScoreRadar({ imovel, size = 220 }) {
  if (!imovel) return null

  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.37
  const n = DIMS.length
  const angleStep = 360 / n

  // Pontos da polígona de score
  const pontos = DIMS.map((d, i) => {
    const score = Math.min(10, Math.max(0, parseFloat(imovel[d.key] || 0)))
    const r = (score / 10) * maxR
    return polar2cart(cx, cy, r, i * angleStep)
  })

  const polyPoints = pontos.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Pontos dos eixos (labels externas)
  const labelPts = DIMS.map((d, i) => {
    const score = Math.min(10, Math.max(0, parseFloat(imovel[d.key] || 0)))
    const pt = polar2cart(cx, cy, maxR + 22, i * angleStep)
    const cor = score >= 7.5 ? '#059669' : score >= 5 ? '#D97706' : '#DC2626'
    return { ...pt, label: d.label, score: score.toFixed(1), cor }
  })

  // Anéis de referência (2, 4, 6, 8, 10)
  const aneis = [2, 4, 6, 8, 10].map(v => {
    const r = (v / 10) * maxR
    const pts = Array.from({ length: n }, (_, i) => polar2cart(cx, cy, r, i * angleStep))
    return { v, pts: pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }
  })

  const scoreTotal = parseFloat(imovel.score_total || 0)
  const corTotal = scoreTotal >= 7.5 ? '#059669' : scoreTotal >= 6 ? '#D97706' : scoreTotal >= 4.5 ? '#EA580C' : '#DC2626'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}>

        {/* Anéis de referência */}
        {aneis.map(a => (
          <polygon key={a.v} points={a.pts}
            fill="none" stroke="#2A2A3A" strokeWidth={a.v === 10 ? 1.5 : 0.8}
            strokeDasharray={a.v === 10 ? 'none' : '3,3'} />
        ))}

        {/* Eixos */}
        {DIMS.map((_, i) => {
          const end = polar2cart(cx, cy, maxR, i * angleStep)
          return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
            stroke="#2A2A3A" strokeWidth={0.8} />
        })}

        {/* Área do score */}
        <polygon points={polyPoints}
          fill={`${corTotal}22`} stroke={corTotal} strokeWidth={2}
          strokeLinejoin="round" />

        {/* Pontos nos vértices */}
        {pontos.map((p, i) => {
          const score = parseFloat(imovel[DIMS[i].key] || 0)
          const cor = score >= 7.5 ? '#059669' : score >= 5 ? '#D97706' : '#DC2626'
          return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={cor} stroke="#1A1A2E" strokeWidth={1} />
        })}

        {/* Labels com score */}
        {labelPts.map((pt, i) => (
          <g key={i}>
            <text x={pt.x} y={pt.y - 5}
              textAnchor="middle" fontSize="9" fontWeight="600" fill="#94A3B8">
              {pt.label}
            </text>
            <text x={pt.x} y={pt.y + 6}
              textAnchor="middle" fontSize="11" fontWeight="800" fill={pt.cor}>
              {pt.score}
            </text>
          </g>
        ))}

        {/* Score total no centro */}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fontWeight="800" fill={corTotal}>
          {Math.round(scoreTotal * 10)}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="#64748B" fontWeight="600">
          /100
        </text>
      </svg>

      {/* Legenda compacta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', justifyContent: 'center', marginTop: 4 }}>
        {DIMS.map(d => {
          const score = parseFloat(imovel[d.key] || 0)
          const cor = score >= 7.5 ? '#059669' : score >= 5 ? '#D97706' : '#DC2626'
          return (
            <div key={d.key} style={{ fontSize: 9, color: '#64748B' }}>
              {d.label} <span style={{ fontWeight: 700, color: cor }}>{score.toFixed(1)}</span>
              <span style={{ color: '#334155', opacity: 0.6 }}> {d.peso}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
