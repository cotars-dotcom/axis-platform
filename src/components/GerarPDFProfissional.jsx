/**
 * AXIS — Relatório PDF Profissional (Sprint 15B)
 * Gera PDF A4 de 6 páginas via jspdf client-side
 * Páginas: Capa | Resumo Executivo | Investimento | Jurídico | Mercado | Fotos
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { isMercadoDireto } from '../lib/detectarFonte.js'
import { calcularBreakdownFinanceiro, calcularROI, HOLDING_MESES_PADRAO, IPTU_SOBRE_CONDO_RATIO } from '../lib/constants.js'
import { CUSTO_M2_SINAPI, FATOR_VALORIZACAO, detectarClasse, avaliarViabilidadeReforma } from '../lib/reformaUnificada.js'

// ── Cores AXIS ────────────────────────────────────────────────────
const NAVY = [0, 43, 128]
const GREEN = [6, 95, 70]
const RED = [153, 27, 27]
const AMBER = [146, 64, 14]
const PURPLE = [124, 58, 237]
const GRAY = [100, 116, 139]
const LIGHT = [248, 247, 244]
const WHITE = [255, 255, 255]

const fmt = v => v ? `R$ ${Math.round(v).toLocaleString('pt-BR')}` : '—'
const pct = v => v != null ? `${Number(v).toFixed(1)}%` : '—'

// ── Converter imagem URL para base64 ─────────────────────────────
async function imgToBase64(url, timeout = 6000) {
  try {
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=600&q=75&output=jpg`
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(timeout) })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.onerror = () => reject()
      r.readAsDataURL(blob)
    })
  } catch { return null }
}

// ── Helpers de desenho ───────────────────────────────────────────
function drawRodape(doc, p, pageNum, totalPages) {
  const y = 282
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(15, y, 195, y)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text(`AXIS IP · ${p.codigo_axis || ''} · ${new Date().toLocaleDateString('pt-BR')} · Gerado automaticamente — não constitui parecer jurídico`, 15, y + 4)
  doc.text(`${pageNum}/${totalPages}`, 195, y + 4, { align: 'right' })
}

function drawBadge(doc, x, y, text, bg, fg) {
  const w = doc.getTextWidth(text) + 6
  doc.setFillColor(...bg)
  doc.roundedRect(x, y - 4, w, 6, 1.5, 1.5, 'F')
  doc.setTextColor(...fg)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(text, x + 3, y)
  doc.setFont('helvetica', 'normal')
  return w + 2
}

function scoreColor(v) {
  if (v >= 7) return GREEN
  if (v >= 5) return AMBER
  return RED
}

function recBadgeColors(rec) {
  if (rec === 'COMPRAR') return { bg: [236, 253, 245], fg: GREEN, label: 'COMPRAR' }
  if (rec === 'EVITAR') return { bg: [254, 242, 242], fg: RED, label: 'EVITAR' }
  return { bg: [254, 249, 195], fg: AMBER, label: 'AGUARDAR' }
}

// ══════════════════════════════════════════════════════════════════
// GERADOR PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export async function gerarPDFProfissional(p, onProgress = () => {}) {
  const doc = new jsPDF('p', 'mm', 'a4') // 210 × 297mm
  let lastTableY = 0
  let lastTableResult = null
  const table = (opts) => {
    const r = autoTable(doc, opts)
    lastTableY = r?.finalY ?? (doc.lastAutoTable?.finalY ?? lastTableY)
    lastTableResult = r
    return r
  }
  const eMercado = isMercadoDireto(p.fonte_url, p.tipo_transacao)
  const area = parseFloat(p.area_privativa_m2 || p.area_m2) || 0
  const lance = parseFloat(p.preco_pedido || p.valor_minimo) || 0
  const mercado = parseFloat(p.valor_mercado_estimado) || 0
  const aluguel = parseFloat(p.aluguel_mensal_estimado) || 0
  const bd = calcularBreakdownFinanceiro(lance, p, eMercado)
  const roi = calcularROI(bd.investimentoTotal, mercado, aluguel)
  const condoMensal = parseFloat(p.condominio_mensal || 0)
  const iptuMensal = parseFloat(p.iptu_mensal || 0) || (condoMensal > 0 ? Math.round(condoMensal * IPTU_SOBRE_CONDO_RATIO) : 0)
  const holdingMensal = condoMensal + iptuMensal
  const holdingTotal = HOLDING_MESES_PADRAO * holdingMensal
  const totalPages = 6

  // Pré-carregar fotos
  onProgress('Convertendo fotos...')
  const fotosRaw = [p.foto_principal, ...(p.fotos || [])].filter(Boolean)
  const fotosUnicas = [...new Set(fotosRaw)].slice(0, 8)
  const fotosB64 = (await Promise.allSettled(fotosUnicas.map(u => imgToBase64(u))))
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean)
  const heroImg = fotosB64[0] || null

  // Reformas SINAPI
  const classe = detectarClasse(parseFloat(p.preco_m2_mercado) || 7000)
  const viab = avaliarViabilidadeReforma(mercado, lance, area, parseFloat(p.preco_m2_mercado) || 7000)
  const reformas = ['refresh_giro', 'leve_reforcada_1_molhado', 'pesada'].map((esc, i) => {
    const custoM2 = CUSTO_M2_SINAPI[esc]?.[classe] || 0
    const custo = parseFloat(p[['custo_reforma_basica', 'custo_reforma_media', 'custo_reforma_completa'][i]]) || Math.round(area * custoM2)
    const fv = FATOR_VALORIZACAO[esc] || 1
    const cenario = ['basica', 'media', 'completa'][i]
    const v = viab?.[cenario]
    return { label: ['Básica', 'Média', 'Completa'][i], custo, custoM2, valorizacao: Math.round((fv - 1) * 100), roiFlip: v?.roiFlip || 0, eficiencia: v?.eficiencia || 0 }
  })

  const rec = recBadgeColors(p.recomendacao)

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 1 — CAPA
  // ══════════════════════════════════════════════════════════════
  onProgress('Gerando capa...')

  // Fundo navy topo
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 40, 'F')

  // Logo AXIS
  doc.setFontSize(22)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text('AXIS IP', 15, 18)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Inteligência Imobiliária', 15, 24)
  doc.setFontSize(7)
  doc.text('axisip.vercel.app', 15, 30)

  // Código + Data no canto
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(p.codigo_axis || '', 195, 18, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date().toLocaleDateString('pt-BR'), 195, 25, { align: 'right' })

  // Foto principal
  let yPos = 45
  if (heroImg) {
    try {
      doc.addImage(heroImg, 'JPEG', 15, yPos, 180, 100)
      yPos += 105
    } catch { yPos += 5 }
  } else {
    doc.setFillColor(...LIGHT)
    doc.rect(15, yPos, 180, 60, 'F')
    doc.setTextColor(...GRAY)
    doc.setFontSize(12)
    doc.text('Foto não disponível', 105, yPos + 33, { align: 'center' })
    yPos += 65
  }

  // Título
  doc.setFontSize(16)
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  const titulo = p.titulo || 'Imóvel'
  const tituloLines = doc.splitTextToSize(titulo.length > 80 ? titulo.substring(0, 80) + '...' : titulo, 140)
  doc.text(tituloLines, 15, yPos + 5)
  yPos += tituloLines.length * 7 + 4

  // Endereço
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  const endereco = [p.endereco, p.bairro, p.cidade].filter(Boolean).join(' — ') + `/${p.estado || 'MG'}`
  doc.text(doc.splitTextToSize(endereco, 140), 15, yPos)
  yPos += 10

  // Specs
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  const specs = [area ? `${area}m²` : null, p.quartos ? `${p.quartos}q` : null, p.suites ? `${p.suites}s` : null, p.vagas ? `${p.vagas}v` : null, p.condominio_mensal ? `Cond. ${fmt(p.condominio_mensal)}` : null].filter(Boolean).join(' · ')
  doc.text(specs, 15, yPos)
  yPos += 10

  // Score grande + Badge recomendação
  const score = parseFloat(p.score_total || 0)
  doc.setFontSize(48)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...scoreColor(score))
  doc.text(score.toFixed(1), 160, yPos + 5, { align: 'center' })
  doc.setFontSize(9)
  doc.text('/10', 178, yPos + 5)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('SCORE AXIS', 160, yPos + 11, { align: 'center' })

  // Badge recomendação
  drawBadge(doc, 15, yPos, rec.label, rec.bg, rec.fg)
  const badgeX = 15 + doc.getTextWidth(rec.label) + 10
  drawBadge(doc, badgeX, yPos, eMercado ? 'MERCADO DIRETO' : `${p.num_leilao || 1}ª PRAÇA`, eMercado ? [239, 246, 255] : [236, 253, 245], eMercado ? [29, 78, 216] : GREEN)

  // Valores destaque
  yPos += 20
  doc.setFillColor(...LIGHT)
  doc.roundedRect(15, yPos, 56, 28, 3, 3, 'F')
  doc.roundedRect(77, yPos, 56, 28, 3, 3, 'F')
  doc.roundedRect(139, yPos, 56, 28, 3, 3, 'F')

  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text(eMercado ? 'PREÇO PEDIDO' : 'LANCE MÍNIMO', 43, yPos + 8, { align: 'center' })
  doc.text('MERCADO EST.', 105, yPos + 8, { align: 'center' })
  doc.text('ALUGUEL EST.', 167, yPos + 8, { align: 'center' })

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(194, 65, 12)
  doc.text(fmt(lance), 43, yPos + 19, { align: 'center' })
  doc.setTextColor(...NAVY)
  doc.text(fmt(mercado), 105, yPos + 19, { align: 'center' })
  doc.setTextColor(...PURPLE)
  doc.text(aluguel ? `${fmt(aluguel)}/mês` : '—', 167, yPos + 19, { align: 'center' })

  drawRodape(doc, p, 1, totalPages)

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 2 — RESUMO EXECUTIVO
  // ══════════════════════════════════════════════════════════════
  onProgress('Resumo executivo...')
  doc.addPage()
  yPos = 15

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('Resumo Executivo', 15, yPos)
  yPos += 10

  // Scores 6D com barras
  const scores6D = [
    { l: 'Localização', v: parseFloat(p.score_localizacao) || 0, w: '20%' },
    { l: 'Desconto', v: parseFloat(p.score_desconto) || 0, w: '18%' },
    { l: 'Jurídico', v: parseFloat(p.score_juridico) || 0, w: '18%' },
    { l: 'Ocupação', v: parseFloat(p.score_ocupacao) || 0, w: '15%' },
    { l: 'Liquidez', v: parseFloat(p.score_liquidez) || 0, w: '15%' },
    { l: 'Mercado', v: parseFloat(p.score_mercado) || 0, w: '14%' },
  ]

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Score por Dimensão', 15, yPos)
  yPos += 5

  scores6D.forEach(s => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(`${s.l} (${s.w})`, 15, yPos + 3)

    // Barra background
    doc.setFillColor(230, 230, 230)
    doc.roundedRect(60, yPos, 80, 4, 1, 1, 'F')
    // Barra preenchida
    const cor = scoreColor(s.v)
    doc.setFillColor(...cor)
    doc.roundedRect(60, yPos, Math.max(1, (s.v / 10) * 80), 4, 1, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...cor)
    doc.text(s.v.toFixed(1), 145, yPos + 3)
    yPos += 7
  })

  yPos += 5

  // Síntese executiva
  if (p.sintese_executiva) {
    doc.setFillColor(240, 244, 255)
    const sinteseLines = doc.splitTextToSize(p.sintese_executiva, 170)
    const sinteseH = sinteseLines.length * 4 + 10
    doc.roundedRect(15, yPos, 180, sinteseH, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(29, 78, 216)
    doc.text('Síntese Executiva', 20, yPos + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 51, 51)
    doc.text(sinteseLines, 20, yPos + 12)
    yPos += sinteseH + 5
  }

  // Alertas
  if (p.alertas?.length) {
    doc.setFillColor(254, 242, 242)
    const alertas = p.alertas.slice(0, 6).map(a => typeof a === 'string' ? a : a.texto || '')
    const alertaLines = alertas.map(a => doc.splitTextToSize(`• ${a}`, 168))
    const totalAlertaLines = alertaLines.reduce((s, l) => s + l.length, 0)
    const alertaH = totalAlertaLines * 4 + 10
    doc.roundedRect(15, yPos, 180, alertaH, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...RED)
    doc.text('Alertas', 20, yPos + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 51, 51)
    let ay = yPos + 12
    alertaLines.forEach(lines => {
      doc.text(lines, 20, ay)
      ay += lines.length * 4
    })
    yPos += alertaH + 5
  }

  // Positivos / Negativos
  if (yPos < 230) {
    const posNegs = [
      { title: 'Pontos Positivos', items: (p.positivos || []).slice(0, 4), color: GREEN },
      { title: 'Pontos de Atenção', items: (p.negativos || []).slice(0, 4), color: RED },
    ]
    posNegs.forEach((pn, idx) => {
      const x = idx === 0 ? 15 : 108
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...pn.color)
      doc.text(pn.title, x, yPos + 4)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(51, 51, 51)
      let py = yPos + 10
      pn.items.forEach(item => {
        const lines = doc.splitTextToSize(`${idx === 0 ? '+' : '−'} ${item}`, 82)
        doc.text(lines, x, py)
        py += lines.length * 3.5 + 1
      })
    })
  }

  drawRodape(doc, p, 2, totalPages)

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 3 — ANÁLISE DE INVESTIMENTO
  // ══════════════════════════════════════════════════════════════
  onProgress('Análise de investimento...')
  doc.addPage()
  yPos = 15

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('Análise de Investimento', 15, yPos)
  yPos += 10

  // Tabela breakdown custos
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Custos de Aquisição', 15, yPos)
  yPos += 3

  const breakdownRows = [
    [eMercado ? 'Preço pedido' : 'Lance mínimo', fmt(lance)],
    [`Comissão ${eMercado ? '' : 'leiloeiro '}(${(bd.comissao.pct * 100).toFixed(0)}%)`, fmt(bd.comissao.valor)],
    [`ITBI (${(bd.itbi.pct * 100).toFixed(0)}%)`, fmt(bd.itbi.valor)],
    ['Doc + Registro', fmt(bd.documentacao.valor)],
  ]
  if (!eMercado && bd.advogado.valor > 0) breakdownRows.push([`Advogado (${(bd.advogado.pct * 100).toFixed(0)}%)`, fmt(bd.advogado.valor)])
  if (bd.reforma > 0) breakdownRows.push(['Reforma estimada', fmt(bd.reforma)])
  if (holdingTotal > 0) breakdownRows.push([`Holding (${HOLDING_MESES_PADRAO}m × ${fmt(holdingMensal)}/mês)`, fmt(holdingTotal)])
  breakdownRows.push([{ content: 'INVESTIMENTO TOTAL', styles: { fontStyle: 'bold', textColor: NAVY } }, { content: fmt(bd.investimentoTotal + holdingTotal), styles: { fontStyle: 'bold', textColor: NAVY } }])

  table({
    startY: yPos,
    head: [],
    body: breakdownRows,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 51, 51] },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 50, halign: 'right' } },
    margin: { left: 15, right: 105 },
    tableWidth: 85,
  })

  // Cenários de saída (lado direito)
  const exitStartY = yPos
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('Cenários de Saída', 110, exitStartY)

  const exitRows = [
    ['Otimista (+15%)', fmt(roi.cenarios?.otimista?.valor), `${roi.cenarios?.otimista?.roi > 0 ? '+' : ''}${roi.cenarios?.otimista?.roi}%`],
    ['Realista', fmt(roi.cenarios?.realista?.valor), `${roi.cenarios?.realista?.roi > 0 ? '+' : ''}${roi.cenarios?.realista?.roi}%`],
    ['Venda rápida (-10%)', fmt(roi.cenarios?.vendaRapida?.valor), `${roi.cenarios?.vendaRapida?.roi > 0 ? '+' : ''}${roi.cenarios?.vendaRapida?.roi}%`],
  ]

  table({
    startY: exitStartY + 3,
    head: [['Cenário', 'Valor', 'ROI']],
    body: exitRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7 },
    margin: { left: 110 },
    tableWidth: 85,
  })

  // Locação
  if (roi.locacao) {
    const locY = lastTableY + 5
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(110, locY, 85, 18, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text('Locação', 114, locY + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(`Aluguel: ${fmt(roi.locacao.aluguelMensal)}/mês`, 114, locY + 10)
    doc.text(`Yield: ${roi.locacao.yieldAnual}% a.a. · Payback: ${Math.round(roi.locacao.paybackMeses / 12)} anos`, 114, locY + 15)
  }

  // Cenários de reforma
  yPos = Math.max(lastTableY + 15, (roi.locacao ? lastTableY + 30 : lastTableY + 10))
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('Cenários de Reforma (SINAPI-MG 2026)', 15, yPos)
  yPos += 3

  const reformaRows = reformas.map(r => {
    const custoTotal = lance + bd.totalCustos + r.custo + holdingTotal
    const valorPos = Math.round(mercado * (1 + r.valorizacao / 100))
    const roiRef = custoTotal > 0 ? Math.round((valorPos - custoTotal) / custoTotal * 100) : 0
    return [r.label, fmt(r.custo), `R$ ${r.custoM2}/m²`, `+${r.valorizacao}%`, fmt(custoTotal), fmt(valorPos), `${roiRef > 0 ? '+' : ''}${roiRef}%`]
  })

  table({
    startY: yPos,
    head: [['Cenário', 'Custo', 'R$/m²', 'Valoriz.', 'Invest. Total', 'Valor Pós', 'ROI']],
    body: reformaRows,
    theme: 'striped',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7 },
    margin: { left: 15, right: 15 },
  })

  drawRodape(doc, p, 3, totalPages)

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 4 — ANÁLISE JURÍDICA
  // ══════════════════════════════════════════════════════════════
  onProgress('Análise jurídica...')
  doc.addPage()
  yPos = 15

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('Análise Jurídica', 15, yPos)
  yPos += 10

  // Dados do processo
  const juridRows = [
    p.processos_ativos && ['Processo', p.processos_ativos],
    p.vara_judicial && ['Vara', p.vara_judicial],
    p.tipo_justica && ['Tribunal', p.tipo_justica],
    p.matricula_status && ['Matrícula', p.matricula_status],
    p.ocupacao && ['Ocupação', p.ocupacao],
    p.ocupacao_fonte && ['Fonte ocupação', p.ocupacao_fonte],
    ['Responsab. débitos', p.responsabilidade_debitos === 'sub_rogado' ? '[OK] Sub-rogados no preço' : p.responsabilidade_debitos === 'exonerado' ? '[OK] Arrematante exonerado' : p.responsabilidade_debitos === 'arrematante' ? '[!] Arrematante arca' : p.responsabilidade_debitos || '—'],
    p.responsabilidade_fonte && ['Fonte', p.responsabilidade_fonte],
    p.debitos_condominio && ['Déb. condomínio', p.debitos_condominio],
    p.debitos_iptu && ['Déb. IPTU', p.debitos_iptu],
    !eMercado && ['Comissão leiloeiro', `${p.comissao_leiloeiro_pct || 5}%`],
    ['Pagamento', p.parcelamento_aceito ? 'Parcelamento aceito' : 'Exclusivamente à vista'],
  ].filter(Boolean)

  table({
    startY: yPos,
    head: [],
    body: juridRows.map(([l, v]) => {
      const vStr = typeof v === 'string' ? v : String(v || '—')
      return [l, vStr.length > 120 ? vStr.substring(0, 120) + '...' : vStr]
    }),
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [51, 51, 51], overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', textColor: GRAY },
      1: { cellWidth: 140 }
    },
    margin: { left: 15, right: 15 },
  })

  yPos = lastTableY + 8

  // Observações jurídicas
  if (p.obs_juridicas && yPos < 240) {
    doc.setFillColor(254, 249, 195)
    const obsLines = doc.splitTextToSize(p.obs_juridicas, 170)
    const obsH = Math.min(obsLines.length * 3.5 + 10, 240 - yPos)
    doc.roundedRect(15, yPos, 180, obsH, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...AMBER)
    doc.text('Observações Jurídicas', 20, yPos + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(51, 51, 51)
    doc.text(obsLines.slice(0, Math.floor((obsH - 10) / 3.5)), 20, yPos + 12)
  }

  drawRodape(doc, p, 4, totalPages)

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 5 — ANÁLISE DE MERCADO
  // ══════════════════════════════════════════════════════════════
  onProgress('Análise de mercado...')
  doc.addPage()
  yPos = 15

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('Análise de Mercado', 15, yPos)
  yPos += 10

  // Dados do bairro
  const mercRows = [
    ['Preço/m² imóvel', p.preco_m2_imovel ? `R$ ${Math.round(p.preco_m2_imovel).toLocaleString('pt-BR')}/m²` : '—'],
    ['Preço/m² mercado', p.preco_m2_mercado ? `R$ ${Math.round(p.preco_m2_mercado).toLocaleString('pt-BR')}/m²` : '—'],
    ['Desconto s/ mercado', pct(p.desconto_sobre_mercado_pct_calculado || p.desconto_sobre_mercado_pct)],
    ['Yield bruto', p.yield_bruto_pct ? `${p.yield_bruto_pct}% a.a.` : '—'],
    ['Tendência', p.mercado_tendencia || '—'],
    ['Demanda', p.mercado_demanda || '—'],
    ['Tempo revenda', p.prazo_revenda_meses ? `${p.prazo_revenda_meses} meses` : '—'],
    ['Liquidez', p.liquidez || '—'],
  ]

  table({
    startY: yPos,
    head: [['Indicador', 'Valor']],
    body: mercRows,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: NAVY, textColor: WHITE },
    margin: { left: 15, right: 105 },
    tableWidth: 85,
  })

  // Dados AXIS bairro (lado direito)
  if (p._dados_bairro_axis) {
    const db = p._dados_bairro_axis
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(3, 105, 161)
    doc.text(`Dados AXIS — ${db.label || p.bairro}`, 110, yPos)

    const axisRows = [
      db.classeIpeadLabel && ['Classe IPEAD', db.classeIpeadLabel],
      db.precoContratoM2 && ['Preço contrato QA', `R$ ${db.precoContratoM2.toLocaleString('pt-BR')}/m²`],
      db.precoAnuncioM2 && ['Preço anúncio', `R$ ${db.precoAnuncioM2.toLocaleString('pt-BR')}/m²`],
      db.yieldBruto && ['Yield bruto', `${db.yieldBruto}% a.a.`],
      db.tendencia12m != null && ['Tendência 12m', `${db.tendencia12m}%`],
    ].filter(Boolean)

    table({
      startY: yPos + 3,
      head: [],
      body: axisRows,
      theme: 'plain',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [51, 51, 51] },
      columnStyles: { 0: { cellWidth: 38, textColor: GRAY, fontStyle: 'bold' } },
      margin: { left: 110 },
      tableWidth: 85,
    })
  }

  yPos = lastTableY + 10

  // Comparáveis
  if (p.comparaveis?.length > 0 && yPos < 220) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text(`Comparáveis (${p.comparaveis.length})`, 15, yPos)
    yPos += 3

    const compRows = p.comparaveis.slice(0, 8).map(c => [
      (c.descricao || c.endereco || '—').substring(0, 50),
      c.area_m2 ? `${c.area_m2}m²` : '—',
      c.quartos || '—',
      c.valor ? fmt(c.valor) : '—',
      c.preco_m2 ? `R$ ${Math.round(c.preco_m2).toLocaleString('pt-BR')}` : '—',
    ])

    table({
      startY: yPos,
      head: [['Endereço', 'Área', 'Q', 'Preço', 'R$/m²']],
      body: compRows,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7 },
      margin: { left: 15, right: 15 },
    })
  }

  // Aluguel por cenário
  yPos = lastTableResult ? lastTableY + 10 : yPos + 5
  if (aluguel > 0 && yPos < 250) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...NAVY)
    doc.text('Aluguel Estimado por Cenário', 15, yPos)
    yPos += 3

    const alugCenarios = [
      ['Sem reforma', 0.90], ['Básica', 1.00], ['Média', 1.08], ['Completa', 1.20]
    ].map(([label, fator]) => {
      const alug = Math.round(aluguel * fator)
      const yieldB = lance > 0 ? ((alug * 12) / lance * 100).toFixed(1) : '—'
      return [label, fmt(alug) + '/mês', `${yieldB}%`]
    })

    table({
      startY: yPos,
      head: [['Cenário', 'Aluguel', 'Yield']],
      body: alugCenarios,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontSize: 7 },
      margin: { left: 15, right: 105 },
      tableWidth: 85,
    })
  }

  drawRodape(doc, p, 5, totalPages)

  // ══════════════════════════════════════════════════════════════
  // PÁGINA 6 — GALERIA DE FOTOS
  // ══════════════════════════════════════════════════════════════
  onProgress('Galeria de fotos...')
  doc.addPage()
  yPos = 15

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text('Galeria de Fotos', 15, yPos)
  yPos += 8

  if (fotosB64.length > 0) {
    const cols = 2
    const imgW = 87
    const imgH = 58
    const gap = 6
    fotosB64.slice(0, 8).forEach((img, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = 15 + col * (imgW + gap)
      const y = yPos + row * (imgH + gap)
      if (y + imgH > 275) return // overflow protection
      try {
        doc.setFillColor(...LIGHT)
        doc.roundedRect(x, y, imgW, imgH, 2, 2, 'F')
        doc.addImage(img, 'JPEG', x + 1, y + 1, imgW - 2, imgH - 2)
      } catch { /* foto falhou */ }
    })
  } else {
    doc.setFontSize(10)
    doc.setTextColor(...GRAY)
    doc.text('Nenhuma foto disponível', 105, 150, { align: 'center' })
  }

  drawRodape(doc, p, 6, totalPages)

  // ══════════════════════════════════════════════════════════════
  // SALVAR
  // ══════════════════════════════════════════════════════════════
  onProgress('Finalizando PDF...')
  const filename = `AXIS_${p.codigo_axis || 'imovel'}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
  return filename
}
