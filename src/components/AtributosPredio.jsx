/**
 * AXIS — Card Atributos do Prédio (Sprint 16)
 * Mostra amenidades, infraestrutura e pontuação de atributos
 */
import { C, card } from '../appConstants.js'

const ATRIBUTOS = [
  { key: 'elevador', label: 'Elevador', icon: '🛗', peso: 0.5 },
  { key: 'piscina', label: 'Piscina', icon: '🏊', peso: 0.3 },
  { key: 'academia', label: 'Academia', icon: '🏋️', peso: 0.2 },
  { key: 'churrasqueira', label: 'Churrasqueira', icon: '🔥', peso: 0.15 },
  { key: 'area_lazer', label: 'Área de Lazer', icon: '🎯', peso: 0.3 },
  { key: 'portaria_24h', label: 'Portaria 24h', icon: '🔒', peso: 0.4 },
]

const INFO_FIELDS = [
  { key: 'andar', label: 'Andar' },
  { key: 'total_andares', label: 'Andares prédio' },
  { key: 'ano_construcao', label: 'Ano construção' },
  { key: 'vaga_tipo', label: 'Tipo vaga' },
  { key: 'nome_condominio', label: 'Condomínio' },
  { key: 'tipologia', label: 'Tipologia' },
]

export function calcularScoreAtributos(p) {
  let pts = 0, max = 0
  ATRIBUTOS.forEach(a => {
    max += a.peso
    if (p[a.key] === true) pts += a.peso
  })
  // Bonus: andar alto (>5)
  if (parseInt(p.andar) > 5) { pts += 0.2; max += 0.2 }
  // Bonus: prédio novo (<15 anos)
  if (p.ano_construcao && (new Date().getFullYear() - parseInt(p.ano_construcao)) < 15) { pts += 0.3; max += 0.3 }
  return { pts: Math.round(pts * 10) / 10, max: Math.round(max * 10) / 10, pct: max > 0 ? Math.round((pts / max) * 100) : null }
}

export default function AtributosPredio({ p }) {
  if (!p) return null
  const score = calcularScoreAtributos(p)
  const hasAny = ATRIBUTOS.some(a => p[a.key] != null) || INFO_FIELDS.some(f => p[f.key])

  if (!hasAny) return (
    <div style={{...card(), padding: 16, opacity: 0.6}}>
      <div style={{fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 8}}>Atributos do Prédio</div>
      <div style={{fontSize: 12, color: C.muted}}>Dados de amenidades não disponíveis para este imóvel.</div>
    </div>
  )

  const tagStyle = (val) => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    background: val === true ? '#ECFDF5' : val === false ? '#FEF2F2' : '#F8FAFC',
    color: val === true ? '#065F46' : val === false ? '#991B1B' : '#64748B',
    border: `1px solid ${val === true ? '#A7F3D0' : val === false ? '#FECACA' : '#E2E8F0'}`,
  })

  return (
    <div style={{...card(), padding: 16}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
        <div style={{fontSize: 13, fontWeight: 700, color: C.navy}}>Atributos do Prédio</div>
        {score.pct != null && (
          <div style={{
            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            background: score.pct >= 60 ? '#ECFDF5' : score.pct >= 30 ? '#FEF9C3' : '#FEF2F2',
            color: score.pct >= 60 ? '#065F46' : score.pct >= 30 ? '#92400E' : '#991B1B',
          }}>
            {score.pts}/{score.max} pts ({score.pct}%)
          </div>
        )}
      </div>

      {/* Amenidades */}
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12}}>
        {ATRIBUTOS.map(a => {
          const val = p[a.key]
          if (val == null) return null
          return <span key={a.key} style={tagStyle(val)}>{a.icon} {a.label}</span>
        })}
      </div>

      {/* Info fields */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6}}>
        {INFO_FIELDS.map(f => {
          const val = p[f.key]
          if (!val) return null
          const display = f.key === 'vaga_tipo' ? val.replace(/_/g, ' ') : f.key === 'tipologia' ? val.replace(/_/g, ' ') : val
          return (
            <div key={f.key} style={{padding: '6px 10px', background: '#F8FAFC', borderRadius: 6, border: '1px solid #E2E8F0'}}>
              <div style={{fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.3px'}}>{f.label}</div>
              <div style={{fontSize: 12, fontWeight: 600, color: C.text, marginTop: 2}}>{display}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
