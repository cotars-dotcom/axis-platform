/**
 * AXIS — Análise Competitiva vs Leilão Ninja
 * 
 * Tabela de diferencial de features, pontuação e posicionamento.
 */

const FEATURES = [
  // Análise financeira
  { cat: 'Financeiro', feature: 'MAO automático (flip)', axis: true, ninja: true, peso: 'alto' },
  { cat: 'Financeiro', feature: 'MAO para locação', axis: true, ninja: false, peso: 'alto' },
  { cat: 'Financeiro', feature: 'Holding cost (IPTU + condo)', axis: true, ninja: 'parcial', peso: 'medio' },
  { cat: 'Financeiro', feature: 'Débitos do arrematante no MAO', axis: true, ninja: false, peso: 'alto' },
  { cat: 'Financeiro', feature: 'IRPF isenção automática (≤R$440k)', axis: true, ninja: false, peso: 'medio' },
  { cat: 'Financeiro', feature: 'Valorização por classe IPEAD', axis: true, ninja: false, peso: 'medio' },
  { cat: 'Financeiro', feature: 'Preditor de concorrência', axis: true, ninja: true, peso: 'alto' },
  { cat: 'Financeiro', feature: 'Matriz 4 cenários de reforma', axis: true, ninja: false, peso: 'medio' },
  // Jurídico
  { cat: 'Jurídico', feature: 'Kill-switch jurídico visual', axis: true, ninja: false, peso: 'alto' },
  { cat: 'Jurídico', feature: 'Consulta Datajud CNJ', axis: true, ninja: false, peso: 'alto' },
  { cat: 'Jurídico', feature: 'Timeline de matrícula', axis: true, ninja: false, peso: 'medio' },
  { cat: 'Jurídico', feature: 'Análise PDF jurídico (Vision)', axis: true, ninja: 'parcial', peso: 'alto' },
  { cat: 'Jurídico', feature: 'Score jurídico 0-10', axis: true, ninja: 'parcial', peso: 'medio' },
  // Mercado
  { cat: 'Mercado', feature: 'Score 0-100 multidimensional', axis: true, ninja: true, peso: 'alto' },
  { cat: 'Mercado', feature: 'Radar de score (6 dimensões)', axis: true, ninja: false, peso: 'medio' },
  { cat: 'Mercado', feature: 'Dados de bairro calibrados BH', axis: true, ninja: 'parcial', peso: 'alto' },
  { cat: 'Mercado', feature: 'Avaliação judicial inflada (alerta)', axis: true, ninja: false, peso: 'medio' },
  { cat: 'Mercado', feature: 'Liquidez e tempo de absorção', axis: true, ninja: false, peso: 'medio' },
  // UX / Operacional
  { cat: 'UX', feature: 'Badge urgência leilão (countdown)', axis: true, ninja: true, peso: 'medio' },
  { cat: 'UX', feature: 'Relatório PDF profissional', axis: true, ninja: true, peso: 'alto' },
  { cat: 'UX', feature: 'Exportar Google Calendar', axis: true, ninja: false, peso: 'baixo' },
  { cat: 'UX', feature: 'Confidence badge (qualidade análise)', axis: true, ninja: false, peso: 'medio' },
  { cat: 'UX', feature: 'Enricher automático pós-análise', axis: true, ninja: false, peso: 'alto' },
  { cat: 'UX', feature: 'Aba saúde do sistema (admin)', axis: true, ninja: false, peso: 'baixo' },
  // Custo
  { cat: 'Custo', feature: 'Motor de análise via Gemini Flash', axis: 'R$0,002/análise', ninja: false, peso: 'alto' },
  { cat: 'Custo', feature: 'Sem taxa por imóvel analisado', axis: true, ninja: false, peso: 'alto' },
  { cat: 'Custo', feature: 'SaaS próprio (sem lock-in)', axis: true, ninja: false, peso: 'alto' },
]

const C_AXIS  = '#059669'
const C_NINJA = '#EF4444'
const C_PAR   = '#D97706'

const icone = v => {
  if (v === true)    return { txt: '✅ Sim',    cor: C_AXIS }
  if (v === false)   return { txt: '❌ Não',    cor: C_NINJA }
  if (v === 'parcial') return { txt: '🟡 Parcial', cor: C_PAR }
  return { txt: v, cor: '#334155' }
}

export default function AbaDiagnosticoCompetitivo() {
  const cats = [...new Set(FEATURES.map(f => f.cat))]

  const axisWins  = FEATURES.filter(f => f.axis === true && f.ninja !== true).length
  const empate    = FEATURES.filter(f => f.axis === true && f.ninja === true).length
  const ninjaWins = FEATURES.filter(f => f.axis !== true && f.ninja === true).length

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Score summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: '🟢 Exclusivo AXIS', valor: axisWins, cor: C_AXIS, sub: 'features que Ninja não tem' },
          { label: '🟡 Empate', valor: empate, cor: C_PAR, sub: 'ambos têm' },
          { label: '🔴 Ninja exclusivo', valor: ninjaWins, cor: C_NINJA, sub: 'Ninja tem, AXIS não' },
        ].map(s => (
          <div key={s.label} style={{ padding: '12px 14px', borderRadius: 10,
            background: `${s.cor}10`, border: `1px solid ${s.cor}30`, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.cor }}>{s.valor}</div>
            <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabela por categoria */}
      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#334155',
            textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6,
            padding: '4px 8px', background: '#F1F5F9', borderRadius: 5 }}>
            {cat}
          </div>
          {FEATURES.filter(f => f.cat === cat).map((f, i) => {
            const a = icone(f.axis)
            const n = icone(f.ninja)
            const isWin = f.axis === true && f.ninja !== true
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto',
                gap: 6, padding: '6px 8px', alignItems: 'center',
                borderBottom: '1px solid #F1F5F9',
                background: isWin ? '#F0FDF4' : 'transparent' }}>
                <div style={{ fontSize: 11, color: '#334155', fontWeight: isWin ? 600 : 400 }}>
                  {f.feature}
                  {f.peso === 'alto' && <span style={{ marginLeft: 4, fontSize: 8,
                    background: '#DBEAFE', color: '#1D4ED8', padding: '1px 4px',
                    borderRadius: 3, fontWeight: 700 }}>key</span>}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: a.cor,
                  textAlign: 'center', minWidth: 70 }}>{a.txt}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: n.cor,
                  textAlign: 'center', minWidth: 70 }}>{n.txt}</div>
              </div>
            )
          })}
        </div>
      ))}

      <div style={{ marginTop: 12, fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>
        Análise baseada em funcionalidades públicas do Leilão Ninja (abr/2026).
        Dados de mercado comparativos: Ninja indexa imóveis de todo Brasil; AXIS é focado em BH/MG com dados calibrados localmente.
      </div>
    </div>
  )
}
