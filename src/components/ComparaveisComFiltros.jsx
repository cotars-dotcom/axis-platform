import { useState, useMemo } from 'react'
import { K, card } from '../appConstants'

const FAIXAS_PRECO = [
  { label: 'Todos', min: 0, max: Infinity },
  { label: 'Até 300K', min: 0, max: 300000 },
  { label: '300K–500K', min: 300000, max: 500000 },
  { label: '500K–800K', min: 500000, max: 800000 },
  { label: '800K+', min: 800000, max: Infinity },
]

const chipBase = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
  cursor: 'pointer', transition: 'all .15s', border: '1px solid',
  whiteSpace: 'nowrap', userSelect: 'none',
}

function Chip({ label, active, onClick }) {
  return (
    <span onClick={onClick} style={{
      ...chipBase,
      background: active ? `${K.teal}18` : K.bg,
      color: active ? K.teal : K.t3,
      borderColor: active ? `${K.teal}40` : K.bd,
    }}>{label}</span>
  )
}

export default function ComparaveisComFiltros({ comparaveis, imovel, isPhone, CardComparavel }) {
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroQuartos, setFiltroQuartos] = useState(null)
  const [filtroPreco, setFiltroPreco] = useState(0)
  const [ordenar, setOrdenar] = useState('similaridade')

  const tipos = useMemo(() => {
    const set = new Set()
    comparaveis.forEach(c => { if (c.tipo) set.add(c.tipo.toLowerCase()) })
    return ['todos', ...Array.from(set)]
  }, [comparaveis])

  const quartosOpts = useMemo(() => {
    const set = new Set()
    comparaveis.forEach(c => { if (c.quartos > 0) set.add(c.quartos) })
    return Array.from(set).sort((a, b) => a - b)
  }, [comparaveis])

  const filtered = useMemo(() => {
    const faixa = FAIXAS_PRECO[filtroPreco]
    let result = comparaveis.filter(c => {
      if (filtroTipo !== 'todos' && (c.tipo || '').toLowerCase() !== filtroTipo) return false
      if (filtroQuartos !== null && c.quartos !== filtroQuartos) return false
      if (c.valor && (c.valor < faixa.min || c.valor >= faixa.max)) return false
      return true
    })
    return [...result].sort((a, b) => {
      if (ordenar === 'preco_asc') return (a.valor || 0) - (b.valor || 0)
      if (ordenar === 'preco_desc') return (b.valor || 0) - (a.valor || 0)
      if (ordenar === 'preco_m2') return (a.preco_m2 || 9999) - (b.preco_m2 || 9999)
      return (b.similaridade || 0) - (a.similaridade || 0)
    })
  }, [comparaveis, filtroTipo, filtroQuartos, filtroPreco, ordenar])

  const hasFilters = filtroTipo !== 'todos' || filtroQuartos !== null || filtroPreco !== 0

  return (
    <div style={{ ...card(), marginTop: 14, marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 600, color: K.wh, fontSize: 13 }}>
          🏘️ Comparáveis de Mercado ({filtered.length}/{comparaveis.length})
        </div>
        {hasFilters && (
          <span onClick={() => { setFiltroTipo('todos'); setFiltroQuartos(null); setFiltroPreco(0) }}
            style={{ fontSize: 10, color: K.teal, cursor: 'pointer', fontWeight: 600 }}>✕ Limpar filtros</span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {tipos.length > 2 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: K.t3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipo</span>
            {tipos.map(t => <Chip key={t} label={t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)} active={filtroTipo === t} onClick={() => setFiltroTipo(t)} />)}
          </div>
        )}
        {quartosOpts.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: K.t3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quartos</span>
            <Chip label="Todos" active={filtroQuartos === null} onClick={() => setFiltroQuartos(null)} />
            {quartosOpts.map(q => <Chip key={q} label={`${q}q`} active={filtroQuartos === q} onClick={() => setFiltroQuartos(q)} />)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: K.t3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Preço</span>
          {FAIXAS_PRECO.map((f, i) => <Chip key={i} label={f.label} active={filtroPreco === i} onClick={() => setFiltroPreco(i)} />)}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: K.t3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ordenar</span>
          {[['similaridade', '⭐ Similaridade'], ['preco_asc', '💰 Menor preço'], ['preco_desc', '💰 Maior preço'], ['preco_m2', '📐 Menor R$/m²']].map(([val, label]) =>
            <Chip key={val} label={label} active={ordenar === val} onClick={() => setOrdenar(val)} />
          )}
        </div>
      </div>
      {filtered.length > 0
        ? filtered.map((c, i) => <CardComparavel key={i} item={c} K={K} isPhone={isPhone} imovel={imovel} />)
        : <div style={{ fontSize: 12, color: K.t3, textAlign: 'center', padding: '16px 0' }}>Nenhum comparável encontrado com esses filtros.</div>
      }
      {filtered.length > 1 && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 10, padding: '8px 12px', background: `${K.teal}08`, borderRadius: 8, fontSize: 11, color: K.t2 }}>
          <span>Média: <b style={{ color: K.teal }}>R$ {Math.round(filtered.reduce((s, c) => s + (c.valor || 0), 0) / filtered.length / 1000)}K</b></span>
          <span>R$/m² médio: <b style={{ color: K.teal }}>R$ {Math.round(filtered.reduce((s, c) => s + (c.preco_m2 || 0), 0) / filtered.length).toLocaleString('pt-BR')}</b></span>
        </div>
      )}
    </div>
  )
}
