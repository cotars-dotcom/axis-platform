/**
 * AXIS — Resumo Pré-Leilão
 * 
 * Card de decisão rápida para imóveis com leilão nos próximos 30 dias.
 * Mostra os 3 cenários de lance + recomendação de ação.
 */

import { C, K, fmtC } from '../appConstants.js'
import { calcularLanceMaximoParaROI, CUSTOS_LEILAO, HOLDING_MESES_PADRAO, IPTU_SOBRE_CONDO_RATIO } from '../lib/constants.js'

const cor = n => n >= 20 ? '#059669' : n >= 10 ? '#D97706' : '#DC2626'
const fmt = v => v ? `R$ ${Math.round(v).toLocaleString('pt-BR')}` : '—'

function calcularROISimples(lance, p) {
  if (!lance || !p.valor_mercado_estimado) return null
  const mercado = parseFloat(p.valor_mercado_estimado)
  const pctCustos = (CUSTOS_LEILAO.comissao_leiloeiro_pct + CUSTOS_LEILAO.itbi_pct + 
                     CUSTOS_LEILAO.advogado_pct + CUSTOS_LEILAO.documentacao_pct) / 100
  const condo = parseFloat(p.condominio_mensal || 0)
  const iptu = parseFloat(p.iptu_mensal || 0) || Math.round(condo * IPTU_SOBRE_CONDO_RATIO)
  const holding = HOLDING_MESES_PADRAO * (condo + iptu)
  const debitos = p.responsabilidade_debitos === 'arrematante' ? parseFloat(p.debitos_total_estimado || 0) : 0
  const reforma = parseFloat(p.custo_reforma_basica || 0)
  const invest = lance * (1 + pctCustos) + reforma + holding + debitos
  const lucroFlip = mercado * 0.94 - invest
  const roiFlip = invest > 0 ? (lucroFlip / invest) * 100 : 0
  const aluguel = parseFloat(p.aluguel_mensal_estimado || 0)
  const yieldLoc = aluguel > 0 && invest > 0 ? (aluguel * 12 / invest) * 100 : 0
  return { invest: Math.round(invest), lucroFlip: Math.round(lucroFlip), roiFlip: Math.round(roiFlip * 10) / 10, yieldLoc: Math.round(yieldLoc * 10) / 10 }
}

export default function ResumoPreLeilao({ imovel }) {
  const p = imovel
  if (!p?.data_leilao && !p?.data_leilao_2) return null
  
  const hoje = Date.now()
  const dias1 = p.data_leilao ? Math.ceil((new Date(p.data_leilao + 'T12:00') - hoje) / 86400000) : null
  const dias2 = p.data_leilao_2 ? Math.ceil((new Date(p.data_leilao_2 + 'T12:00') - hoje) / 86400000) : null
  
  // Só mostrar se leilão em ≤30 dias
  const temProximo = (dias1 !== null && dias1 >= 0 && dias1 <= 30) || (dias2 !== null && dias2 >= 0 && dias2 <= 30)
  if (!temProximo) return null

  const avaliacao = parseFloat(p.valor_avaliacao || p.valor_minimo) || 0
  
  // 3 cenários de lance para 2ª praça
  const cenarios = [
    { label: '50% (piso legal)', lance: Math.round(avaliacao * 0.50), prob: 15, cor: '#7C3AED' },
    { label: '57% (esperado)', lance: Math.round(avaliacao * 0.57), prob: 55, cor: '#3B82F6' },
    { label: '65% (competitivo)', lance: Math.round(avaliacao * 0.65), prob: 30, cor: '#D97706' },
  ]

  const maoFlip = parseFloat(p.mao_flip) || 0
  const maoLoc = parseFloat(p.mao_locacao) || 0
  
  const urgente = (dias1 !== null && dias1 >= 0 && dias1 <= 7) || (dias2 !== null && dias2 >= 0 && dias2 <= 7)

  return (
    <div style={{ ...K, marginBottom: 14, borderRadius: 12, overflow: 'hidden',
      border: `2px solid ${urgente ? '#DC2626' : '#D97706'}`,
      background: urgente ? '#FEF2F210' : '#FFFBEB10' }}>
      
      {/* Header */}
      <div style={{ padding: '10px 16px',
        background: urgente ? 'linear-gradient(135deg,#DC2626,#991B1B)' : 'linear-gradient(135deg,#D97706,#92400E)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
            {urgente ? '🚨' : '⏳'} DECISÃO DE LANCE
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
            {dias1 !== null && dias1 >= 0 && <span>1ª praça: {dias1 === 0 ? 'HOJE' : `em ${dias1}d`} ({fmt(p.valor_minimo)}) &nbsp;&nbsp;</span>}
            {dias2 !== null && dias2 >= 0 && <span>2ª praça: {dias2 === 0 ? 'HOJE' : `em ${dias2}d`} ({fmt(p.valor_minimo_2)})</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', color: '#fff' }}>
          <div style={{ fontSize: 10, opacity: 0.8 }}>Mercado est.</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(p.valor_mercado_estimado)}</div>
        </div>
      </div>
      
      {/* MAO rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#1E293B' }}>
        {[
          { label: 'MAO Flip (ROI 20%)', valor: maoFlip, cor: '#059669', icon: '🔄' },
          { label: 'MAO Locação (yield 6%)', valor: maoLoc, cor: '#7C3AED', icon: '🏠' },
        ].map(m => (
          <div key={m.label} style={{ padding: '10px 14px', background: '#0F172A' }}>
            <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>{m.icon} {m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: m.valor > 0 ? m.cor : '#475569', marginTop: 2 }}>
              {m.valor > 0 ? fmt(m.valor) : '—'}
            </div>
            {p.valor_minimo_2 && m.valor > 0 && (
              <div style={{ fontSize: 9, marginTop: 2,
                color: parseFloat(p.valor_minimo_2) <= m.valor ? '#4ADE80' : '#F87171' }}>
                {parseFloat(p.valor_minimo_2) <= m.valor ? '✅ 2ª praça dentro do MAO' : '⚠️ 2ª praça acima do MAO'}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Cenários 2ª praça */}
      {dias2 !== null && dias2 >= 0 && avaliacao > 0 && (
        <div style={{ padding: '10px 14px', background: '#0F172A' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
            letterSpacing: '.5px', marginBottom: 8 }}>Cenários 2ª Praça ({new Date(p.data_leilao_2 + 'T12:00').toLocaleDateString('pt-BR')})</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {cenarios.map(c => {
              const r = calcularROISimples(c.lance, p)
              const dentroMAO = maoFlip > 0 && c.lance <= maoFlip
              return (
                <div key={c.label} style={{ flex: 1, padding: '8px 10px', borderRadius: 8,
                  background: dentroMAO ? `${c.cor}15` : '#1E293B',
                  border: `1px solid ${dentroMAO ? c.cor : '#334155'}` }}>
                  <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 600 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: c.cor, marginTop: 2 }}>
                    {fmt(c.lance)}
                  </div>
                  {r && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2,
                        color: cor(r.roiFlip) }}>
                        ROI flip {r.roiFlip > 0 ? '+' : ''}{r.roiFlip}%
                      </div>
                      {r.yieldLoc > 0 && (
                        <div style={{ fontSize: 9, color: '#7C3AED' }}>
                          Yield {r.yieldLoc}% a.a.
                        </div>
                      )}
                    </>
                  )}
                  <div style={{ fontSize: 8, color: '#475569', marginTop: 3 }}>
                    Prob. {c.prob}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Débitos */}
      {parseFloat(p.debitos_total_estimado || 0) > 0 && (
        <div style={{ padding: '8px 14px', background: '#1E293B',
          borderTop: '1px solid #334155', fontSize: 10, color: '#FCA5A5' }}>
          ⚠️ Débitos a cargo do arrematante: <strong>{fmt(p.debitos_total_estimado)}</strong> — já incluídos no cálculo do MAO
        </div>
      )}
    </div>
  )
}
