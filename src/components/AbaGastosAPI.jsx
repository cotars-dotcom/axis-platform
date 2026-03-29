/**
 * AXIS — Aba 💰 Custos de IA
 * Mostra uso real do api_usage_log com breakdown por modelo,
 * custo total, projeção mensal e histórico dos últimos 30 dias.
 */
import { useState, useEffect } from 'react'
import { C, K, card } from '../appConstants.js'

const MODELOS_INFO = {
  'gemini-2.0-flash':       { label: 'Gemini Flash',      cor: '#4285F4', tier: 1 },
  'gemini-2.0-flash-lite':  { label: 'Gemini Flash-Lite', cor: '#4285F4', tier: 1 },
  'deepseek-chat':          { label: 'DeepSeek V3',        cor: '#6E40C9', tier: 2 },
  'claude-sonnet-4-20250514':{ label: 'Claude Sonnet',     cor: '#E07B54', tier: 3 },
  'claude-haiku-4-5-20251001':{ label: 'Claude Haiku',    cor: '#E07B54', tier: 3 },
  'gpt-4o':                 { label: 'GPT-4o',            cor: '#10A37F', tier: 3 },
  'gpt-4o-mini':            { label: 'GPT-4o-mini',       cor: '#10A37F', tier: 2 },
}

export default function AbaGastosAPI({ isPhone }) {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(30)

  useEffect(() => {
    setLoading(true)
    import('../lib/supabase.js').then(({ getUsoChamadas }) =>
      getUsoChamadas({ dias: periodo }).then(data => {
        setRegistros(data || [])
        setLoading(false)
      }).catch(() => setLoading(false))
    )
  }, [periodo])

  // Aggregar por modelo
  const porModelo = registros.reduce((acc, r) => {
    const m = r.modelo || 'desconhecido'
    if (!acc[m]) acc[m] = { chamadas: 0, custo_usd: 0, tokens_in: 0, tokens_out: 0 }
    acc[m].chamadas++
    acc[m].custo_usd += parseFloat(r.custo_usd || 0)
    acc[m].tokens_in += parseInt(r.tokens_input || 0)
    acc[m].tokens_out += parseInt(r.tokens_output || 0)
    return acc
  }, {})

  const totalUSD = Object.values(porModelo).reduce((s, m) => s + m.custo_usd, 0)
  const totalBRL = totalUSD * 5.80
  const totalChamadas = registros.length
  const mediaPorAnalise = totalChamadas > 0 ? totalBRL / totalChamadas : 0
  const projecaoMensal = periodo < 30 ? (totalBRL / periodo) * 30 : totalBRL * 1.1

  // Agrupar por dia para sparkline
  const porDia = registros.reduce((acc, r) => {
    const dia = r.criado_em?.slice(0, 10) || 'N/A'
    if (!acc[dia]) acc[dia] = 0
    acc[dia] += parseFloat(r.custo_usd || 0) * 5.80
    return acc
  }, {})
  const diasOrdenados = Object.keys(porDia).sort().slice(-14)

  const fmt = (v) => `R$ ${v.toFixed(2)}`
  const fmtK = (v) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(v)

  return (
    <div style={{ padding: isPhone ? '12px' : '16px 20px', maxWidth: 800 }}>
      {/* Header com seletor de período */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>💰 Custos de IA</div>
          <div style={{ fontSize: 11, color: C.hint }}>Dados reais do api_usage_log</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriodo(d)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              border: `1px solid ${periodo === d ? C.navy : C.borderW}`,
              background: periodo === d ? C.navy : C.white,
              color: periodo === d ? '#fff' : C.muted, fontWeight: periodo === d ? 600 : 400
            }}>{d}d</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.hint }}>Carregando...</div>
      ) : registros.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: C.hint }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Nenhum registro de uso ainda</div>
          <div style={{ fontSize: 11, color: C.hint, marginTop: 4 }}>Faça uma análise para começar a registrar.</div>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr 1fr' : 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              ['Total período', fmt(totalBRL), totalUSD < 2 ? C.emerald : C.mustard],
              ['Chamadas', String(totalChamadas), C.navy],
              ['Por análise', fmt(mediaPorAnalise), mediaPorAnalise < 0.20 ? C.emerald : C.mustard],
              ['Projeção/mês', fmt(projecaoMensal), projecaoMensal < 5 ? C.emerald : C.mustard],
            ].map(([label, valor, cor]) => (
              <div key={label} style={{ ...card(), padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: C.hint, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: cor }}>{valor}</div>
              </div>
            ))}
          </div>

          {/* Breakdown por modelo */}
          <div style={{ ...card(), padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginBottom: 10 }}>Por modelo</div>
            {Object.entries(porModelo)
              .sort((a, b) => b[1].custo_usd - a[1].custo_usd)
              .map(([modelo, dados]) => {
                const info = MODELOS_INFO[modelo] || { label: modelo, cor: C.muted, tier: 3 }
                const pct = totalUSD > 0 ? (dados.custo_usd / totalUSD) * 100 : 0
                const custoBRL = dados.custo_usd * 5.80
                return (
                  <div key={modelo} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: info.cor }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: C.navy }}>{info.label}</span>
                        <span style={{ fontSize: 10, color: C.hint }}>{dados.chamadas}x · {fmtK(dados.tokens_in + dados.tokens_out)} tokens</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: custoBRL > 5 ? C.mustard : C.emerald }}>
                        {fmt(custoBRL)}
                      </span>
                    </div>
                    <div style={{ height: 4, background: C.surface, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: info.cor, borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Histórico diário */}
          {diasOrdenados.length > 1 && (
            <div style={{ ...card(), padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginBottom: 10 }}>Histórico diário (últimos 14 dias)</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
                {diasOrdenados.map(dia => {
                  const val = porDia[dia] || 0
                  const maxVal = Math.max(...diasOrdenados.map(d => porDia[d] || 0))
                  const h = maxVal > 0 ? (val / maxVal) * 50 : 2
                  return (
                    <div key={dia} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div title={`${dia}: ${fmt(val)}`} style={{
                        width: '100%', height: `${h}px`, minHeight: 2,
                        background: val > 1 ? C.mustard : C.emerald, borderRadius: 2
                      }} />
                      <div style={{ fontSize: 8, color: C.hint }}>{dia.slice(8)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Últimas chamadas */}
          <div style={{ ...card(), padding: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, marginBottom: 10 }}>
              Últimas chamadas
            </div>
            {registros.slice(0, 10).map((r, i) => {
              const info = MODELOS_INFO[r.modelo] || { label: r.modelo, cor: C.muted }
              const custoBRL = parseFloat(r.custo_usd || 0) * 5.80
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0', borderBottom: i < 9 ? `1px solid ${C.borderW}` : 'none', fontSize: 11
                }}>
                  <div>
                    <span style={{ fontWeight: 500, color: C.navy }}>{info.label}</span>
                    <span style={{ color: C.hint, marginLeft: 6 }}>
                      {r.tipo || '—'} · {r.imovel_titulo?.slice(0, 25) || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: C.hint, fontSize: 10 }}>
                      {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                    <span style={{ fontWeight: 600, color: custoBRL < 0.10 ? C.emerald : C.mustard }}>
                      {custoBRL < 0.01 ? '< R$0,01' : fmt(custoBRL)}
                    </span>
                    {!r.sucesso && <span style={{ fontSize: 9, color: '#A32D2D' }}>✗ FALHOU</span>}
                    {r.modo_teste && <span style={{ fontSize: 9, color: C.hint }}>TESTE</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 10, color: C.hint, marginTop: 8, textAlign: 'center' }}>
            USD → BRL @ 5.80 · Preços: Gemini Flash $0.075/M · DeepSeek $0.27/M · Claude Sonnet $3.00/M
          </div>
        </>
      )}
    </div>
  )
}
