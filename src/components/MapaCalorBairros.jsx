/**
 * AXIS — Mapa de Calor de Bairros
 * 
 * Visualização SVG dos bairros de BH por liquidez/score de mercado.
 * Usa dados de metricas_bairros do banco.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const COR_LIQUIDEZ = {
  'Alta':  { bg: '#ECFDF5', brd: '#6EE7B7', txt: '#065F46', dot: '#059669' },
  'Média': { bg: '#FEF9C3', brd: '#FDE68A', txt: '#92400E', dot: '#D97706' },
  'Baixa': { bg: '#FEF2F2', brd: '#FECACA', txt: '#991B1B', dot: '#DC2626' },
}

export default function MapaCalorBairros({ onBairroClick = null }) {
  const [bairros, setBairros] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecionado, setSelecionado] = useState(null)
  const [filtro, setFiltro] = useState('todos') // todos | alta | media | baixa

  useEffect(() => {
    supabase
      .from('metricas_bairros')
      .select('bairro, cidade, classe_ipead, preco_contrato_m2, preco_anuncio_m2, yield_bruto, tendencia_12m, tempo_venda_dias, liquidez_label, vacancia_pct, aluguel_2q_tipico, aluguel_3q_tipico')
      .order('preco_contrato_m2', { ascending: false })
      .then(({ data }) => { setBairros(data || []); setLoading(false) })
  }, [])

  const filtrados = bairros.filter(b => {
    if (filtro === 'todos') return true
    return (b.liquidez_label || 'Baixa').toLowerCase() === filtro
  })

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
      ⏳ Carregando dados de mercado...
    </div>
  )

  if (!bairros.length) return (
    <div style={{ padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>
      Sem dados de mercado no banco.
    </div>
  )

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          ['todos', '🗺️ Todos', '#334155'],
          ['Alta', '🟢 Alta liquidez', '#059669'],
          ['Média', '🟡 Média liquidez', '#D97706'],
          ['Baixa', '🔴 Baixa liquidez', '#DC2626'],
        ].map(([v, l, c]) => (
          <button key={v} onClick={() => setFiltro(v)}
            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              cursor: 'pointer',
              border: filtro === v ? `1px solid ${c}` : '1px solid #E2E8F0',
              background: filtro === v ? `${c}15` : '#fff',
              color: filtro === v ? c : '#64748B' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Grid de bairros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {filtrados.map(b => {
          const liq = b.liquidez_label || 'Baixa'
          const cores = COR_LIQUIDEZ[liq] || COR_LIQUIDEZ['Baixa']
          const isSel = selecionado?.bairro === b.bairro
          const tendPos = (b.tendencia_12m || 0) > 0

          return (
            <div key={b.bairro}
              onClick={() => {
                setSelecionado(isSel ? null : b)
                if (onBairroClick) onBairroClick(b)
              }}
              style={{
                padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                background: isSel ? cores.bg : '#F8FAFC',
                border: `1px solid ${isSel ? cores.brd : '#E2E8F0'}`,
                transition: 'all .15s',
                transform: isSel ? 'scale(1.01)' : 'none',
              }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{b.bairro}</div>
                  <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 1 }}>{b.classe_ipead || '—'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: cores.txt,
                    background: cores.bg, border: `1px solid ${cores.brd}`,
                    padding: '1px 5px', borderRadius: 3 }}>{liq}</span>
                  {b.tendencia_12m != null && (
                    <span style={{ fontSize: 9, color: tendPos ? '#059669' : '#DC2626', fontWeight: 700 }}>
                      {tendPos ? '↑' : '↓'} {Math.abs(b.tendencia_12m)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Métricas principais */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {[
                  ['Contrato/m²', b.preco_contrato_m2 ? `R$${Math.round(b.preco_contrato_m2 / 1000).toFixed(1)}k` : '—'],
                  ['Yield', b.yield_bruto ? `${b.yield_bruto}%` : '—'],
                  ['Venda (dias)', b.tempo_venda_dias ? `${b.tempo_venda_dias}d` : '—'],
                  ['Aluguel 2q', b.aluguel_2q_tipico ? `R$${Math.round(b.aluguel_2q_tipico / 1000).toFixed(1)}k` : '—'],
                ].map(([l, v]) => (
                  <div key={l} style={{ padding: '3px 5px', background: '#F1F5F9', borderRadius: 4 }}>
                    <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Barra de yield visual */}
              {b.yield_bruto && (
                <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: '#E2E8F0', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, (b.yield_bruto / 10) * 100)}%`,
                    height: '100%', borderRadius: 2,
                    background: b.yield_bruto >= 7 ? '#059669' : b.yield_bruto >= 5.5 ? '#D97706' : '#94A3B8'
                  }}/>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Painel de detalhe do bairro selecionado */}
      {selecionado && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10,
          background: '#0F172A', border: '1px solid #1E293B' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#F1F5F9', marginBottom: 10 }}>
            📍 {selecionado.bairro} — Detalhes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {[
              ['Preço contrato/m²', selecionado.preco_contrato_m2 ? `R$ ${Math.round(selecionado.preco_contrato_m2).toLocaleString('pt-BR')}` : '—'],
              ['Preço anúncio/m²', selecionado.preco_anuncio_m2 ? `R$ ${Math.round(selecionado.preco_anuncio_m2).toLocaleString('pt-BR')}` : '—'],
              ['Yield bruto', selecionado.yield_bruto ? `${selecionado.yield_bruto}% a.a.` : '—'],
              ['Tendência 12m', selecionado.tendencia_12m != null ? `${selecionado.tendencia_12m > 0 ? '+' : ''}${selecionado.tendencia_12m}%` : '—'],
              ['Tempo de venda', selecionado.tempo_venda_dias ? `${selecionado.tempo_venda_dias} dias` : '—'],
              ['Vacância loc.', selecionado.vacancia_pct ? `${selecionado.vacancia_pct}%` : '—'],
              ['Aluguel 2q típico', selecionado.aluguel_2q_tipico ? `R$ ${Math.round(selecionado.aluguel_2q_tipico).toLocaleString('pt-BR')}/mês` : '—'],
              ['Aluguel 3q típico', selecionado.aluguel_3q_tipico ? `R$ ${Math.round(selecionado.aluguel_3q_tipico).toLocaleString('pt-BR')}/mês` : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ padding: '6px 8px', borderRadius: 6, background: '#1E293B' }}>
                <div style={{ fontSize: 8, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10, color: '#94A3B8' }}>
        <span>🟢 Alta: venda ≤60d</span>
        <span>🟡 Média: venda 61-90d</span>
        <span>🔴 Baixa: venda >90d</span>
        <span style={{ marginLeft: 'auto' }}>Fonte: FipeZAP/IPEAD/QuintoAndar 2025-26</span>
      </div>
    </div>
  )
}
