/**
 * AXIS — Painel Pós-Leilão (Sprint 10)
 * Mostra imóveis cujo leilão já passou + próximos leilões com contagem regressiva.
 * Permite registrar resultado (arrematado / não arrematado) direto do Dashboard.
 */
import { useState, useEffect } from 'react'
import { C, K, btn } from '../appConstants.js'
import { getImoveisLeilaoPendente, getImoveisLeilaoProximo, registrarResultadoLeilao } from '../lib/supabase.js'
import { supabase } from '../lib/supabase.js'

const fmt = v => v ? `R$ ${Math.round(v).toLocaleString('pt-BR')}` : '—'

function diffDias(dataLeilao) {
  // Parse manual para evitar bug de timezone: new Date('2026-04-08') em UTC-3 vira dia 7
  const [y, m, d] = dataLeilao.split('-').map(Number)
  const dl = new Date(y, m - 1, d); dl.setHours(0,0,0,0)
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  return Math.round((dl - hoje) / 86400000)
}

function BadgeDias({ dias }) {
  if (dias === 0) return <span style={badge('#DC2626','#FEE2E2')}>HOJE</span>
  if (dias === 1) return <span style={badge('#D97706','#FEF3C7')}>AMANHÃ</span>
  if (dias < 0) return <span style={badge('#991B1B','#FEE2E2')}>{Math.abs(dias)}d atrás</span>
  return <span style={badge('#065F46','#ECFDF5')}>D-{dias}</span>
}

const badge = (cor, bg) => ({
  fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
  background: bg, color: cor, whiteSpace: 'nowrap'
})

export default function PainelPosLeilao({ onNav, onRefresh, isPhone = false }) {
  const [pendentes, setPendentes] = useState([])
  const [proximos, setProximos] = useState([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const [pend, prox] = await Promise.all([
        getImoveisLeilaoPendente(),
        getImoveisLeilaoProximo(14)
      ])
      setPendentes(pend)
      setProximos(prox)
    } catch (e) { console.error('[AXIS PosLeilao]', e) }
    setLoading(false)
  }

  async function registrar(imovelId, resultado) {
    const label = resultado === 'arrematado' ? 'ARREMATADO' : 'NÃO ARREMATADO'
    if (!confirm(`Confirmar: imóvel ${label}?`)) return
    setProcessando(imovelId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await registrarResultadoLeilao(imovelId, resultado, session?.user?.id)
      await carregar()
      if (onRefresh) onRefresh()
    } catch (e) { alert('Erro: ' + e.message) }
    setProcessando(null)
  }

  const total = pendentes.length + proximos.length
  if (loading) return null
  if (total === 0) return null

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.borderW}`,
      borderRadius: 14, padding: '18px 22px',
      boxShadow: '0 2px 12px rgba(0,43,128,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏰</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Controle de Leilões</span>
          {pendentes.length > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
              background: '#FEE2E2', color: '#991B1B',
            }}>
              {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={carregar} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.muted }}>
          🔄 Atualizar
        </button>
      </div>

      {/* Leilões pendentes de resultado */}
      {pendentes.length > 0 && (
        <div style={{ marginBottom: proximos.length ? 16 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
            ⚠️ Aguardando resultado
          </div>
          {pendentes.map(p => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              background: '#FEF2F2', borderRadius: 8, marginBottom: 6, flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 150, cursor: 'pointer' }} onClick={() => onNav?.('detail', { id: p.id })}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>
                  {p.codigo_axis || ''} {p.titulo || 'Imóvel'}
                </div>
                <div style={{ fontSize: 10.5, color: '#78350F', display: 'flex', gap: 8, marginTop: 2 }}>
                  <span>{p.bairro || p.cidade || ''}</span>
                  <span>{fmt(p.valor_minimo)}</span>
                  <BadgeDias dias={diffDias(p.data_leilao)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  disabled={processando === p.id}
                  onClick={() => registrar(p.id, 'nao_arrematado')}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid #6EE7B7',
                    background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {processando === p.id ? '⏳' : '✓'} Não arrematado
                </button>
                <button
                  disabled={processando === p.id}
                  onClick={() => registrar(p.id, 'arrematado')}
                  style={{
                    padding: '5px 10px', borderRadius: 6, border: '1px solid #FCA5A5',
                    background: '#FEE2E2', color: '#991B1B', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {processando === p.id ? '⏳' : '✗'} Arrematado
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Próximos leilões */}
      {proximos.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.navy, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
            📅 Próximos leilões
          </div>
          {proximos.map(p => {
            const dias = diffDias(p.data_leilao)
            const urgente = dias <= 1
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: urgente ? '#FEF3C7' : C.surface, borderRadius: 8, marginBottom: 4,
                cursor: 'pointer', transition: 'background .15s',
                border: urgente ? '1px solid #FCD34D' : '1px solid transparent',
              }} onClick={() => onNav?.('detail', { id: p.id })}>
                <BadgeDias dias={dias} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.codigo_axis || ''} {p.titulo || 'Imóvel'}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.muted, display: 'flex', gap: 8 }}>
                    <span>{p.bairro || ''}</span>
                    <span>{fmt(p.valor_minimo)}</span>
                    <span>{p.modalidade_leilao || ''}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: p.score_total >= 7 ? '#05A86D' : p.score_total >= 5 ? '#D4A017' : '#E5484D' }}>
                    {(p.score_total || 0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 9, color: C.muted }}>{p.recomendacao || ''}</div>
                </div>
                {p.num_documentos > 0 && (
                  <span style={{ fontSize: 9, color: '#065F46', background: '#D1FAE5', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>
                    {p.num_documentos} doc{p.num_documentos !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
