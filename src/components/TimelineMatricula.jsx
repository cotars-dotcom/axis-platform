/**
 * AXIS — Timeline da Matrícula (Sprint 12.2)
 * Exibe atos registrais em timeline vertical com ícones por tipo
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { C } from '../appConstants.js'

const TIPOS = {
  construcao:        { icon: '🏗️', cor: '#6B7280', label: 'Construção' },
  venda:             { icon: '💰', cor: '#059669', label: 'Compra/Venda' },
  financiamento:     { icon: '🏦', cor: '#2563EB', label: 'Financiamento' },
  cancelamento:      { icon: '✅', cor: '#10B981', label: 'Cancelamento' },
  indisponibilidade: { icon: '⚠️', cor: '#DC2626', label: 'Indisponibilidade' },
  penhora:           { icon: '🔒', cor: '#DC2626', label: 'Penhora' },
  averbacao:         { icon: '📋', cor: '#6366F1', label: 'Averbação' },
  outro:             { icon: '📄', cor: '#6B7280', label: 'Outro' },
}

const GRAVIDADE_BG = {
  info: 'transparent',
  atencao: '#FEF3C710',
  critico: '#FEF2F220',
}

export default function TimelineMatricula({ imovel }) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState(false)

  useEffect(() => {
    if (!imovel?.id) return
    supabase.from('timeline_matricula')
      .select('*')
      .eq('imovel_id', imovel.id)
      .order('data_evento', { ascending: true })
      .then(({ data }) => {
        setEventos(data || [])
        setLoading(false)
      })
  }, [imovel?.id])

  if (loading) return null
  if (eventos.length === 0) return null

  const criticos = eventos.filter(e => e.gravidade === 'critico')
  const preview = eventos.slice(-5) // últimos 5 eventos
  const lista = expandido ? eventos : preview

  return (
    <div style={{
      background: '#fff', border: `1px solid ${C.borderW}`, borderRadius: 12,
      marginBottom: 14, overflow: 'hidden'
    }}>
      {/* Header */}
      <div
        onClick={() => setExpandido(!expandido)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', cursor: 'pointer',
          background: criticos.length > 0 ? '#FEF2F2' : '#F8FAFC',
          borderBottom: `1px solid ${C.borderW}`
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>
            📜 Timeline da Matrícula
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
            {eventos.length} atos · {eventos[0]?.data_evento?.substring(0,4) || '?'} — {eventos[eventos.length-1]?.data_evento?.substring(0,4) || '?'}
            {criticos.length > 0 && (
              <span style={{ color: '#DC2626', fontWeight: 600 }}>
                {' '}· ⚠️ {criticos.length} indisponibilidade{criticos.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <span style={{ fontSize: 10, color: C.muted }}>
          {expandido ? '▲ Recolher' : `▼ Ver ${eventos.length > 5 ? 'todos' : ''}`}
        </span>
      </div>

      {/* Alerta de indisponibilidades */}
      {criticos.length > 0 && expandido && (
        <div style={{
          margin: '12px 18px 0', padding: '10px 14px', borderRadius: 8,
          background: '#FEF2F2', border: '1px solid #FCA5A530'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>
            🚨 Indisponibilidades Ativas ({criticos.length})
          </div>
          <div style={{ fontSize: 11, color: '#991B1B', lineHeight: 1.5 }}>
            O imóvel possui {criticos.length} ordem{criticos.length > 1 ? 'ns' : ''} de indisponibilidade judicial ativa{criticos.length > 1 ? 's' : ''}, impedindo transações até levantamento judicial.
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ padding: '14px 18px', paddingLeft: 32 }}>
        {lista.map((ev, i) => {
          const t = TIPOS[ev.tipo] || TIPOS.outro
          const isLast = i === lista.length - 1
          return (
            <div key={ev.id} style={{
              position: 'relative', paddingLeft: 28, paddingBottom: isLast ? 0 : 16,
              borderLeft: isLast ? 'none' : `2px solid ${ev.gravidade === 'critico' ? '#FCA5A550' : '#E5E7EB'}`,
              background: GRAVIDADE_BG[ev.gravidade] || 'transparent',
              borderRadius: ev.gravidade === 'critico' ? 6 : 0,
              marginLeft: -1,
            }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: -9, top: 2,
                width: 16, height: 16, borderRadius: '50%',
                background: ev.gravidade === 'critico' ? '#DC2626' : '#fff',
                border: `2px solid ${t.cor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8,
              }}>
                {ev.gravidade === 'critico' && <span style={{ fontSize: 10 }}>!</span>}
              </div>

              {/* Content */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 12 }}>{t.icon}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px',
                      color: t.cor, padding: '1px 6px', borderRadius: 4,
                      background: `${t.cor}10`, border: `1px solid ${t.cor}20`
                    }}>
                      {t.label}
                    </span>
                    {ev.registro && (
                      <span style={{ fontSize: 9, color: C.muted, fontFamily: 'monospace' }}>{ev.registro}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.navy, lineHeight: 1.4 }}>
                    {ev.descricao}
                  </div>
                  {ev.partes && (
                    <div style={{ fontSize: 10, color: C.hint, marginTop: 2 }}>
                      👤 {ev.partes}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: C.muted }}>
                    {ev.data_evento ? new Date(ev.data_evento + 'T12:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '—'}
                  </div>
                  {ev.valor > 0 && (
                    <div style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>
                      {ev.valor > 1000000
                        ? `Cr$ ${Math.round(ev.valor / 1000).toLocaleString('pt-BR')}k`
                        : `R$ ${Math.round(ev.valor).toLocaleString('pt-BR')}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {!expandido && eventos.length > 5 && (
        <div
          onClick={() => setExpandido(true)}
          style={{
            padding: '8px 18px', textAlign: 'center', fontSize: 10,
            color: C.navy, fontWeight: 600, cursor: 'pointer',
            borderTop: `1px solid ${C.borderW}`, background: '#F8FAFC'
          }}
        >
          Ver todos os {eventos.length} atos registrais ▼
        </div>
      )}
    </div>
  )
}
