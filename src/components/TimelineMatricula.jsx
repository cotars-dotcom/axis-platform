/**
 * AXIS — Timeline de Matrícula
 * 
 * Visualiza o status do processo de registro/matrícula de um imóvel
 * em leilão judicial. Mostra as etapas e o que está completo/pendente.
 */

const ETAPAS = [
  {
    id: 'identificacao',
    label: 'Identificação',
    desc: 'Imóvel identificado, número de matrícula localizado',
    icon: '🏠',
    campo: 'matricula_numero',
    check: p => !!(p.matricula_numero || p.matricula_status),
  },
  {
    id: 'analise_matricula',
    label: 'Análise de Matrícula',
    desc: 'Matrícula analisada — ônus, penhoras, hipotecas verificados',
    icon: '📋',
    campo: 'matricula_status',
    check: p => p.matricula_status && p.matricula_status !== 'Não verificada',
  },
  {
    id: 'penhora',
    label: 'Penhora Averbada',
    desc: 'Registro da penhora judicial averbado no CRI',
    icon: '⚖️',
    campo: 'debitos_total_estimado',
    check: p => p.processos_ativos || parseFloat(p.debitos_total_estimado || 0) > 0,
  },
  {
    id: 'edital',
    label: 'Edital Publicado',
    desc: 'Edital de praça publicado e prazo de 5 dias transcorrido',
    icon: '📰',
    campo: 'data_leilao',
    check: p => !!p.data_leilao,
  },
  {
    id: 'hasta',
    label: 'Hasta Pública',
    desc: 'Leilão realizado com lance vencedor',
    icon: '🔨',
    campo: 'status_operacional',
    check: p => ['arrematado', 'aguardando_resultado', 'nao_arrematado'].includes(p.status_operacional),
  },
  {
    id: 'auto_arrematacao',
    label: 'Auto de Arrematação',
    desc: 'Documento judicial gerado confirmando arrematação',
    icon: '📄',
    campo: null,
    check: p => p.status_operacional === 'arrematado',
  },
  {
    id: 'carta_arrematacao',
    label: 'Carta de Arrematação',
    desc: 'Carta emitida pelo juiz — título de posse',
    icon: '📜',
    campo: null,
    check: p => p.status_operacional === 'arrematado',
  },
  {
    id: 'registro_cri',
    label: 'Registro no CRI',
    desc: 'Imóvel registrado em nome do novo proprietário',
    icon: '🏛️',
    campo: null,
    check: p => false, // Nunca automático — precisa ser informado
  },
]

export default function TimelineMatricula({ imovel }) {
  if (!imovel) return null
  const eLeilao = imovel.tipo_transacao === 'leilao' || imovel.tipo_transacao === 'leilao_judicial'
  if (!eLeilao) return null

  const etapas = ETAPAS.map(e => ({
    ...e,
    concluida: e.check(imovel),
  }))

  // Encontrar etapa atual (primeira não concluída)
  const idxAtual = etapas.findIndex(e => !e.concluida)
  const concluidas = etapas.filter(e => e.concluida).length

  return (
    <div style={{ padding: '14px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
          Progresso do Registro
        </div>
        <div style={{ fontSize: 11, color: '#64748B' }}>
          {concluidas}/{etapas.length} etapas
        </div>
      </div>

      {/* Barra de progresso */}
      <div style={{ height: 4, borderRadius: 2, background: '#E2E8F0', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          width: `${(concluidas / etapas.length) * 100}%`,
          height: '100%', borderRadius: 2,
          background: concluidas === etapas.length ? '#059669' : '#3B82F6',
          transition: 'width .5s',
        }}/>
      </div>

      {/* Etapas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {etapas.map((e, i) => {
          const isAtual = i === idxAtual
          const cor = e.concluida ? '#059669' : isAtual ? '#3B82F6' : '#94A3B8'
          const bg = e.concluida ? '#F0FDF4' : isAtual ? '#EFF6FF' : 'transparent'
          const borderCor = e.concluida ? '#BBF7D0' : isAtual ? '#BFDBFE' : '#E2E8F0'

          return (
            <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 8px',
              borderRadius: 7, background: bg, border: `1px solid ${borderCor}`, marginBottom: 4 }}>
              {/* Ícone + linha vertical */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 14,
                  background: e.concluida ? '#DCFCE7' : isAtual ? '#DBEAFE' : '#F1F5F9',
                  border: `2px solid ${cor}`,
                }}>
                  {e.concluida ? '✅' : isAtual ? e.icon : <span style={{ opacity: 0.4 }}>{e.icon}</span>}
                </div>
                {i < etapas.length - 1 && (
                  <div style={{ width: 2, height: 8, background: e.concluida ? '#BBF7D0' : '#E2E8F0', marginTop: 2 }}/>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: isAtual ? 700 : 600, color: cor }}>
                  {e.label}
                  {isAtual && <span style={{ marginLeft: 6, fontSize: 9, background: '#3B82F6', color: '#fff',
                    padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>ATUAL</span>}
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1, lineHeight: 1.4 }}>
                  {e.desc}
                </div>
                {/* Dado relevante */}
                {e.concluida && e.campo && imovel[e.campo] && (
                  <div style={{ fontSize: 9, color: '#059669', marginTop: 2, fontWeight: 600 }}>
                    {e.campo === 'matricula_numero' && `Matrícula nº ${imovel[e.campo]}`}
                    {e.campo === 'matricula_status' && imovel[e.campo]}
                    {e.campo === 'data_leilao' && `Leilão: ${new Date(imovel[e.campo]+'T12:00').toLocaleDateString('pt-BR')}`}
                    {e.campo === 'debitos_total_estimado' && parseFloat(imovel[e.campo]) > 0 &&
                      `Débitos: R$ ${Math.round(imovel[e.campo]).toLocaleString('pt-BR')}`}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {imovel.prazo_liberacao_estimado_meses > 0 && (
        <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6,
          background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 10, color: '#92400E' }}>
          ⏱️ Prazo estimado de liberação após arrematação: <strong>{imovel.prazo_liberacao_estimado_meses} meses</strong>
        </div>
      )}
    </div>
  )
}
