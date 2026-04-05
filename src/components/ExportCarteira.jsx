/**
 * AXIS — Export Carteira (Sprint 10)
 * Exporta carteira de imóveis em Excel (.xlsx) ou PDF (HTML autônomo).
 * Importar XLSX via dynamic import para não inflar o bundle base.
 */
import { useState } from 'react'
import { C } from '../appConstants.js'
import { isMercadoDireto } from '../lib/detectarFonte.js'

const fmt = v => v ? `R$ ${Math.round(v).toLocaleString('pt-BR')}` : '—'
const pct = v => v != null ? `${Number(v).toFixed(1)}%` : '—'

// ── EXPORT EXCEL ─────────────────────────────────────────────────────
async function exportarExcel(imoveis) {
  const XLSX = await import('xlsx')
  
  const rows = imoveis.map(p => ({
    'Código': p.codigo_axis || '',
    'Título': p.titulo || '',
    'Cidade': p.cidade || '',
    'Bairro': p.bairro || '',
    'Tipo': p.tipo || '',
    'Tipologia': p.tipologia || '',
    'Área (m²)': parseFloat(p.area_privativa_m2 || p.area_m2) || '',
    'Quartos': p.quartos || '',
    'Vagas': p.vagas || '',
    'Valor Mínimo': p.valor_minimo || '',
    'Valor Avaliação': p.valor_avaliacao || '',
    'Desconto (%)': p.desconto_percentual || '',
    'Score Total': p.score_total || '',
    'Recomendação': p.recomendacao || '',
    'Score Localização': p.score_localizacao || '',
    'Score Desconto': p.score_desconto || '',
    'Score Jurídico': p.score_juridico || '',
    'Score Ocupação': p.score_ocupacao || '',
    'Score Liquidez': p.score_liquidez || '',
    'Score Mercado': p.score_mercado || '',
    'Preço m² Imóvel': p.preco_m2_imovel || '',
    'Preço m² Mercado': p.preco_m2_mercado || '',
    'Valor Mercado Est.': p.valor_mercado_estimado || '',
    'Aluguel Estimado': p.aluguel_mensal_estimado || '',
    'Yield Bruto (%)': p.yield_bruto_pct || '',
    'Tipo Transação': isMercadoDireto(p.fonte_url, p.tipo_transacao) ? 'Mercado' : 'Leilão',
    'Data Leilão': p.data_leilao ? new Date(p.data_leilao+'T12:00').toLocaleDateString('pt-BR') : '',
    'Nº Leilão': p.num_leilao || '',
    'Modalidade': p.modalidade_leilao || '',
    'Ocupação': p.ocupacao || '',
    'Financiável': p.financiavel ? 'Sim' : p.financiavel === false ? 'Não' : '',
    'Docs Analisados': p.num_documentos || 0,
    'Score Docs': p.score_viabilidade_docs || '',
    'Rec. Jurídica': p.recomendacao_juridica_docs || '',
    'Síntese': (p.sintese_executiva || '').substring(0, 200),
    'Fonte URL': p.fonte_url || '',
    'Criado em': p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  
  // Larguras de coluna
  ws['!cols'] = [
    { wch: 8 },  // Código
    { wch: 35 }, // Título
    { wch: 15 }, // Cidade
    { wch: 18 }, // Bairro
    { wch: 12 }, // Tipo
    { wch: 12 }, // Tipologia
    { wch: 10 }, // Área
    { wch: 8 },  // Quartos
    { wch: 8 },  // Vagas
    { wch: 14 }, // Valor Mínimo
    { wch: 14 }, // Valor Avaliação
    { wch: 10 }, // Desconto
    { wch: 10 }, // Score Total
    { wch: 12 }, // Recomendação
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Carteira AXIS')
  
  // Aba de resumo
  const resumo = [
    { 'Métrica': 'Total de Imóveis', 'Valor': imoveis.length },
    { 'Métrica': 'Score Médio', 'Valor': (imoveis.reduce((s, p) => s + (p.score_total || 0), 0) / imoveis.length).toFixed(2) },
    { 'Métrica': 'Patrimônio Monitorado', 'Valor': fmt(imoveis.reduce((s, p) => s + (p.valor_minimo || 0), 0)) },
    { 'Métrica': 'COMPRAR', 'Valor': imoveis.filter(p => p.recomendacao === 'COMPRAR').length },
    { 'Métrica': 'AGUARDAR', 'Valor': imoveis.filter(p => p.recomendacao === 'AGUARDAR').length },
    { 'Métrica': 'EVITAR', 'Valor': imoveis.filter(p => p.recomendacao === 'EVITAR').length },
    { 'Métrica': 'Leilão', 'Valor': imoveis.filter(p => !isMercadoDireto(p.fonte_url, p.tipo_transacao)).length },
    { 'Métrica': 'Mercado Direto', 'Valor': imoveis.filter(p => isMercadoDireto(p.fonte_url, p.tipo_transacao)).length },
    { 'Métrica': 'Gerado em', 'Valor': new Date().toLocaleString('pt-BR') },
  ]
  const wsResumo = XLSX.utils.json_to_sheet(resumo)
  wsResumo['!cols'] = [{ wch: 22 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  const data = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `AXIS_Carteira_${data}.xlsx`)
}

// ── EXPORT PDF (HTML autônomo) ───────────────────────────────────────
function exportarPDF(imoveis) {
  const data = new Date().toLocaleDateString('pt-BR')
  const total = imoveis.length
  const avgScore = total ? (imoveis.reduce((s, p) => s + (p.score_total || 0), 0) / total).toFixed(1) : '0'
  const patrimonio = fmt(imoveis.reduce((s, p) => s + (p.valor_minimo || 0), 0))
  const comprar = imoveis.filter(p => p.recomendacao === 'COMPRAR').length
  const aguardar = imoveis.filter(p => p.recomendacao === 'AGUARDAR').length
  const evitar = imoveis.filter(p => p.recomendacao === 'EVITAR').length

  const recBg = r => r === 'COMPRAR' ? '#ECFDF5' : r === 'EVITAR' ? '#FEF2F2' : '#FEF9C3'
  const recCor = r => r === 'COMPRAR' ? '#065F46' : r === 'EVITAR' ? '#991B1B' : '#92400E'

  const rows = imoveis.map(p => `
    <tr style="border-bottom:1px solid #E8E6DF">
      <td style="padding:8px 6px;font-weight:600;font-size:11px;color:#002B80">${p.codigo_axis || '—'}</td>
      <td style="padding:8px 6px;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.titulo || '—'}</td>
      <td style="padding:8px 6px;font-size:11px">${p.bairro || '—'}</td>
      <td style="padding:8px 6px;font-size:11px;text-align:right;font-weight:600">${fmt(p.valor_minimo)}</td>
      <td style="padding:8px 6px;text-align:center">
        <span style="font-size:13px;font-weight:800;color:${p.score_total >= 7 ? '#05A86D' : p.score_total >= 5 ? '#D4A017' : '#E5484D'}">${(p.score_total || 0).toFixed(1)}</span>
      </td>
      <td style="padding:8px 6px;text-align:center">
        <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;background:${recBg(p.recomendacao)};color:${recCor(p.recomendacao)}">${p.recomendacao || '—'}</span>
      </td>
      <td style="padding:8px 6px;font-size:10.5px;color:#666">${p.desconto_percentual ? `-${p.desconto_percentual}%` : '—'}</td>
      <td style="padding:8px 6px;font-size:10.5px;color:#666">${p.data_leilao ? new Date(p.data_leilao+'T12:00').toLocaleDateString('pt-BR') : '—'}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AXIS — Carteira de Investimentos</title>
<style>
  @media print { @page { size:A4 landscape; margin:15mm } }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1A1A2E; margin:0; padding:24px; background:#fff }
  .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #002B80; padding-bottom:16px; margin-bottom:20px }
  .kpi-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-bottom:24px }
  .kpi { background:#F4F3EF; border-radius:8px; padding:14px; text-align:center }
  .kpi-val { font-size:22px; font-weight:800; color:#002B80; margin:4px 0 }
  .kpi-label { font-size:10px; color:#8E8EA0; text-transform:uppercase; letter-spacing:.5px }
  table { width:100%; border-collapse:collapse }
  th { background:#002B80; color:#fff; font-size:10px; padding:8px 6px; text-align:left; text-transform:uppercase; letter-spacing:.5px }
  th:nth-child(4),th:nth-child(5),th:nth-child(6),th:nth-child(7) { text-align:center }
  tr:hover { background:#F4F3EF }
  .footer { margin-top:20px; padding-top:12px; border-top:1px solid #E8E6DF; font-size:10px; color:#8E8EA0; display:flex; justify-content:space-between }
</style></head>
<body>
  <div class="header">
    <div>
      <div style="font-size:24px;font-weight:800;color:#002B80;letter-spacing:-1px">AXIS IP</div>
      <div style="font-size:12px;color:#8E8EA0">Inteligência Patrimonial — Carteira Consolidada</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#8E8EA0">Gerado em ${data}</div>
      <div style="font-size:11px;color:#8E8EA0">${total} ativo(s) monitorado(s)</div>
    </div>
  </div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Patrimônio</div><div class="kpi-val">${patrimonio}</div></div>
    <div class="kpi"><div class="kpi-label">Score Médio</div><div class="kpi-val" style="color:#05A86D">${avgScore}/10</div></div>
    <div class="kpi"><div class="kpi-label">Comprar</div><div class="kpi-val" style="color:#05A86D">${comprar}</div></div>
    <div class="kpi"><div class="kpi-label">Aguardar</div><div class="kpi-val" style="color:#D4A017">${aguardar}</div></div>
    <div class="kpi"><div class="kpi-label">Evitar</div><div class="kpi-val" style="color:#E5484D">${evitar}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Código</th><th>Título</th><th>Bairro</th><th style="text-align:right">Valor</th>
      <th style="text-align:center">Score</th><th style="text-align:center">Rec.</th><th style="text-align:center">Desc.</th><th>Leilão</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    <span>AXIS IP · Inteligência Patrimonial</span>
    <span>Documento gerado automaticamente — uso interno</span>
  </div>
  <script>window.onload=()=>{if(confirm('Imprimir relatório?'))window.print()}</script>
</body></html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

// ── COMPONENTE ───────────────────────────────────────────────────────
export default function ExportCarteira({ imoveis, isPhone = false }) {
  const [exportando, setExportando] = useState(null)

  const handleExport = async (tipo) => {
    setExportando(tipo)
    try {
      if (tipo === 'excel') await exportarExcel(imoveis)
      else exportarPDF(imoveis)
    } catch (e) {
      console.error('[AXIS Export]', e)
      alert(`Erro ao exportar: ${e.message}`)
    }
    setExportando(null)
  }

  const btnStyle = {
    padding: isPhone ? '6px 10px' : '7px 14px',
    borderRadius: 7,
    border: `1px solid ${C.borderW}`,
    background: C.white,
    color: C.navy,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        style={btnStyle}
        onClick={() => handleExport('excel')}
        disabled={exportando === 'excel'}
      >
        {exportando === 'excel' ? '⏳' : '📊'} {isPhone ? 'XLSX' : 'Excel'}
      </button>
      <button
        style={btnStyle}
        onClick={() => handleExport('pdf')}
        disabled={exportando === 'pdf'}
      >
        {exportando === 'pdf' ? '⏳' : '📄'} PDF
      </button>
    </div>
  )
}

// Exportar funções individuais para uso direto
export { exportarExcel, exportarPDF }
