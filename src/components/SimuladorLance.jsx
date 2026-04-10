/**
 * AXIS — Simulador de Lance Interativo (Sprint 16)
 * Slider com marcas 1ª/2ª praça, ROI alvo, custos manuais
 */
import { useState, useMemo } from 'react'
import { C, card, fmtC } from '../appConstants.js'
import { calcularBreakdownFinanceiro, calcularROI } from '../lib/constants.js'
import { isMercadoDireto } from '../lib/detectarFonte.js'

export default function SimuladorLance({ p, isPhone = false }) {
  if (!p) return null
  const eMercado = isMercadoDireto(p.fonte_url, p.tipo_transacao)
  const avaliacao = parseFloat(p.valor_avaliacao) || parseFloat(p.valor_minimo) || 0
  const mercado = parseFloat(p.valor_mercado_estimado) || 0
  const aluguel = parseFloat(p.aluguel_mensal_estimado) || 0
  const lance1p = parseFloat(p.valor_minimo || p.preco_pedido) || 0
  const lance2p = Math.round(avaliacao * 0.50)

  const minLance = Math.round(Math.min(lance2p, lance1p) * 0.8)
  const maxLance = Math.round(Math.max(avaliacao, mercado) * 1.1)

  const [lanceCustom, setLanceCustom] = useState(lance1p)
  const [custoReformaManual, setCustoReformaManual] = useState(parseFloat(p.custo_reforma_estimado || p.custo_reforma_calculado || p.custo_reforma_basica) || 0)
  const [custoExtra, setCustoExtra] = useState(0)

  const sim = useMemo(() => {
    const bd = calcularBreakdownFinanceiro(lanceCustom, { ...p, custo_reforma_estimado: custoReformaManual }, eMercado)
    const investTotal = bd.investimentoTotal + custoExtra
    const roi = calcularROI(investTotal, mercado, aluguel)
    return { bd, investTotal, roi }
  }, [lanceCustom, custoReformaManual, custoExtra])

  const roiVal = sim.roi?.roi ?? 0
  const roiColor = roiVal >= 15 ? '#065F46' : roiVal >= 0 ? '#92400E' : '#991B1B'

  // Marcas no slider
  const pctOf = (val) => maxLance > minLance ? ((val - minLance) / (maxLance - minLance)) * 100 : 50
  const marks = [
    !eMercado && lance2p > 0 && { val: lance2p, label: '2ª Praça', color: '#7C3AED' },
    { val: lance1p, label: eMercado ? 'Pedido' : '1ª Praça', color: '#D97706' },
    avaliacao !== lance1p && { val: avaliacao, label: 'Avaliação', color: '#64748B' },
  ].filter(Boolean)

  // ROI break-even (lance onde ROI = 0)
  const breakEven = mercado > 0 ? Math.round(mercado / (1 + (sim.bd.totalCustos - lanceCustom + custoReformaManual + custoExtra) / mercado)) : null

  const inputStyle = {
    width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${C.border}`,
    fontSize: 13, fontWeight: 600, color: C.navy, background: '#F8FAFC',
    outline: 'none', textAlign: 'right',
  }

  return (
    <div style={{...card(), padding: 16}}>
      <div style={{fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 14}}>
        Simulador de Lance
      </div>

      {/* Slider */}
      <div style={{position: 'relative', marginBottom: 20, padding: '0 4px'}}>
        <input type="range" min={minLance} max={maxLance} step={1000} value={lanceCustom}
          onChange={e => setLanceCustom(Number(e.target.value))}
          style={{width: '100%', accentColor: C.emerald, height: 6, cursor: 'pointer'}}
        />
        {/* Marcas */}
        <div style={{position: 'relative', height: 28, marginTop: 4}}>
          {marks.map((m, i) => {
            const left = Math.max(2, Math.min(98, pctOf(m.val)))
            return (
              <div key={i} style={{position: 'absolute', left: `${left}%`, transform: 'translateX(-50%)', textAlign: 'center'}}>
                <div style={{width: 2, height: 8, background: m.color, margin: '0 auto 2px'}} />
                <div style={{fontSize: 8, fontWeight: 700, color: m.color, whiteSpace: 'nowrap'}}>{m.label}</div>
                <div style={{fontSize: 8, color: '#94A3B8'}}>{fmtC(m.val)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Inputs manuais */}
      <div style={{display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '1fr 1fr 1fr', gap: 10, marginBottom: 14}}>
        <div>
          <label style={{fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase'}}>Valor do Lance</label>
          <input type="number" value={lanceCustom} onChange={e => setLanceCustom(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={{fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase'}}>Custo Reforma</label>
          <input type="number" value={custoReformaManual} onChange={e => setCustoReformaManual(Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <label style={{fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase'}}>Custos Extras</label>
          <input type="number" value={custoExtra} onChange={e => setCustoExtra(Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {/* Resultado */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8}}>
        {[
          { label: 'Lance', value: fmtC(lanceCustom), color: '#D97706' },
          { label: 'Custos Aq.', value: fmtC(sim.bd.totalCustos), color: C.navy },
          { label: 'Reforma', value: fmtC(custoReformaManual), color: '#92400E' },
          { label: 'Invest. Total', value: fmtC(sim.investTotal), color: C.navy },
          { label: 'ROI Flip', value: `${roiVal > 0 ? '+' : ''}${roiVal}%`, color: roiColor },
          sim.roi?.locacao && { label: 'Yield', value: `${sim.roi.locacao.yieldAnual}% a.a.`, color: '#065F46' },
        ].filter(Boolean).map((kpi, i) => (
          <div key={i} style={{padding: '8px 10px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderLeft: `3px solid ${kpi.color}`}}>
            <div style={{fontSize: 9, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase'}}>{kpi.label}</div>
            <div style={{fontSize: 14, fontWeight: 800, color: kpi.color, marginTop: 2}}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Cenários rápidos */}
      {!eMercado && (
        <div style={{display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap'}}>
          <button onClick={() => setLanceCustom(lance1p)} style={btnStyle(lanceCustom === lance1p)}>1ª Praça ({fmtC(lance1p)})</button>
          {lance2p > 0 && <button onClick={() => setLanceCustom(lance2p)} style={btnStyle(lanceCustom === lance2p)}>2ª Praça ({fmtC(lance2p)})</button>}
          <button onClick={() => setLanceCustom(Math.round(avaliacao * 0.60))} style={btnStyle(false)}>60% aval.</button>
          <button onClick={() => setLanceCustom(Math.round(avaliacao * 0.70))} style={btnStyle(false)}>70% aval.</button>
        </div>
      )}
    </div>
  )
}

function btnStyle(active) {
  return {
    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
    border: active ? '1px solid #059669' : '1px solid #E2E8F0',
    background: active ? '#ECFDF5' : '#FFFFFF',
    color: active ? '#065F46' : '#64748B',
  }
}
