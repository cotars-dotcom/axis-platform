/**
 * AXIS — Helper: abrir HTML em nova aba
 * 
 * Safari/iOS bloqueia window.open() não iniciado por gesto direto.
 * Solução: Blob + URL.createObjectURL + <a> dinâmico.
 * Fallback final: download do arquivo HTML.
 */

/**
 * Abre conteúdo HTML em nova aba ou faz download como fallback.
 * @param {string} html - Conteúdo HTML completo
 * @param {string} nomeArquivo - Nome do arquivo para download (sem .html)
 * @param {boolean} imprimir - Se true, chama window.print() ao abrir
 */
export function abrirHtmlNovaTela(html, nomeArquivo = 'relatorio-axis', imprimir = false) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  // Tentativa 1: âncora dinâmica com target="_blank" (funciona no Safari)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Liberar URL após 60s
  setTimeout(() => URL.revokeObjectURL(url), 60000)

  // Se precisar imprimir, aguardar nova aba carregar
  // (não é possível controlar window de outra aba por segurança — usuário usa Ctrl+P)
  if (imprimir) {
    // Mostrar toast orientando o usuário
    const toast = document.createElement('div')
    toast.textContent = 'Use Ctrl+P (ou Cmd+P) para salvar como PDF'
    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0F172A;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:9999;pointer-events:none'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 4000)
  }
}

/**
 * Força download de arquivo HTML (fallback absoluto)
 */
export function downloadHtml(html, nomeArquivo = 'relatorio-axis') {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.html') ? nomeArquivo : nomeArquivo + '.html'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
