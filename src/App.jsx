import { useState, useEffect, useRef } from "react"
import { stLoad, stSave } from "./storage.js"
import Charts from "./components/Charts.jsx"
import Timeline from "./components/Timeline.jsx"
import MobileNav from "./components/MobileNav.jsx"
import BuscaGPT from "./components/BuscaGPT.jsx"
import { useAuth } from "./lib/AuthContext.jsx"
import Login from "./pages/Login.jsx"
import { getImoveis, saveImovel, deleteImovel } from "./lib/supabase.js"
import Tarefas from "./pages/Tarefas.jsx"
import AdminPanel from "./pages/AdminPanel.jsx"
import { analisarImovelCompleto } from "./lib/dualAI.js"
    
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36)
const fmtD = d => d ? new Date(d).toLocaleDateString("pt-BR") : "â"
const fmtC = v => v ? `R$ ${Number(v).toLocaleString("pt-BR", {minimumFractionDigits:0})}` : "â"

const K = {
  bg:"#080B10", bg2:"#0C1018", s1:"#111620", s2:"#171E2C",
  bd:"#1C2438", bd2:"#232D42", teal:"#00E5BB", amb:"#F5A623",
  red:"#FF4757", blue:"#4A9EFF", pur:"#A78BFA", grn:"#2ECC71",
  gold:"#FFD700", tx:"#DDE4F0", t2:"#7A8BA8", t3:"#3D4E6A", wh:"#FFFFFF",
  trello:"#0052CC"
}

const scoreColor = s => s >= 7.5 ? K.grn : s >= 6 ? K.teal : s >= 4.5 ? K.amb : K.red
const scoreLabel = s => s >= 7.5 ? "FORTE" : s >= 6 ? "BOM" : s >= 4.5 ? "MÃDIO" : "FRACO"
const recColor = r => ({ COMPRAR: K.grn, AGUARDAR: K.amb, EVITAR: K.red })[r] || K.t3

const btn = (v="p") => ({
  background: v==="p"?K.teal:v==="d"?`${K.red}18`:v==="trello"?K.trello:K.s2,
  color: v==="p"?"#000":v==="d"?K.red:v==="trello"?"#fff":K.t2,
  border: v==="d"?`1px solid ${K.red}40`:"none",
  borderRadius:"6px", padding: v==="s"?"5px 12px":"9px 20px",
  fontSize: v==="s"?"11.5px":"13px", fontWeight:"600", cursor:"pointer", flexShrink:0
})
const inp = { background:K.s1, border:`1px solid ${K.bd}`, borderRadius:"6px", padding:"10px 14px", color:K.tx, fontSize:"13px", width:"100%", outline:"none" }
const card = (ac) => ({ background:K.s1, border:`1px solid ${ac||K.bd}`, borderRadius:"8px", padding:"18px" })
const Bdg = ({c,ch}) => <span style={{display:"inline-block",fontSize:"10px",fontWeight:"700",padding:"2px 8px",borderRadius:"4px",textTransform:"uppercase",letterSpacing:".5px",background:`${c}20`,color:c,border:`1px solid ${c}40`}}>{ch}</span>

function Hdr({title,sub,actions}) {
  return <div style={{padding:"22px 28px 16px",borderBottom:`1px solid ${K.bd}`,flexShrink:0}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px",flexWrap:"wrap"}}>
      <div>
        <div style={{fontWeight:"700",fontSize:"19px",color:K.wh,letterSpacing:"-0.3px"}}>{title}</div>
        {sub&&<div style={{fontSize:"11px",color:K.t3,marginTop:"3px"}}>{sub}</div>}
      </div>
      {actions&&<div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{actions}</div>}
    </div>
  </div>
}

function ScoreRing({score,size=80}) {
  const c = scoreColor(score||0)
  const r = (size-10)/2
  const circ = 2*Math.PI*r
  const dash = ((score||0)/10)*circ
  return <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={K.s2} strokeWidth="8"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
    </svg>
    <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
      <div style={{fontSize:size>70?"18px":"13px",fontWeight:"800",color:c,lineHeight:1}}>{(score||0).toFixed(1)}</div>
      <div style={{fontSize:"8px",color:K.t3,textTransform:"uppercase",letterSpacing:".5px"}}>{scoreLabel(score||0)}</div>
    </div>
  </div>
}


// ââ AI ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages"

async function analyzeProperty(url) {
  const sys = `VocÃª Ã© LEILAX, especialista em anÃ¡lise de imÃ³veis em leilÃ£o para investimento imobiliÃ¡rio no Brasil. Use web search para buscar informaÃ§Ãµes sobre o imÃ³vel.

Retorne SOMENTE JSON vÃ¡lido sem markdown:
{
  "titulo":"","endereco":"","cidade":"","estado":"","tipo":"Apartamento|Casa|Terreno|Comercial",
  "area_m2":0,"quartos":0,"vagas":0,"andar":"","modalidade":"","leiloeiro":"",
  "data_leilao":"DD/MM/AAAA","valor_avaliacao":0,"valor_minimo":0,"desconto_percentual":0,
  "ocupacao":"Desocupado|Ocupado|Desconhecido","financiavel":true,"fgts_aceito":false,
  "debitos_condominio":"Sem dÃ©bitos|Com dÃ©bitos|Desconhecido",
  "debitos_iptu":"Sem dÃ©bitos|Com dÃ©bitos|Desconhecido",
  "processos_ativos":"Nenhum|PossÃ­vel|Confirmado|Desconhecido",
  "matricula_status":"Limpa|Com Ã´nus|Desconhecido",
  "obs_juridicas":"",
  "preco_m2_imovel":0,"preco_m2_mercado":0,"aluguel_mensal_estimado":0,
  "liquidez":"Alta|MÃ©dia|Baixa","prazo_revenda_meses":0,
  "positivos":[""],"negativos":[""],"alertas":[""],
  "recomendacao":"COMPRAR|AGUARDAR|EVITAR","justificativa":"",
  "estrutura_recomendada":"CPF Ãºnico|CondomÃ­nio voluntÃ¡rio|PJ",
  "custo_regularizacao":0,"custo_reforma":0,
  "retorno_venda_pct":0,"retorno_locacao_anual_pct":0,
  "mercado_tendencia":"Alta|EstÃ¡vel|Queda","mercado_demanda":"Alta|MÃ©dia|Baixa",
  "mercado_tempo_venda_meses":0,"mercado_obs":"",
  "score_localizacao":0,"score_desconto":0,"score_juridico":0,
  "score_ocupacao":0,"score_liquidez":0,"score_mercado":0,"score_total":0
}
Scores 0-10. score_total = mÃ©dia ponderada (loc 20%, desc 18%, jur 18%, ocup 15%, liq 15%, merc 14%).
Se score_juridico < 4 â score_total *= 0.75. Se ocupado â score_total *= 0.85.`

  const apiKey = localStorage.getItem("leilax-api-key") || ""
  if (!apiKey) throw new Error("Configure a chave da API Anthropic nas configuraÃ§Ãµes")

  const r = await fetch(ANTHROPIC_API, {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:4000, system:sys,
      tools:[{type:"web_search_20250305",name:"web_search"}],
      messages:[{role:"user",content:`Analise o imÃ³vel em leilÃ£o: ${url}`}]
    })
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message || "Erro na API")
  const txt = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n")
  try { return JSON.parse(txt.replace(/```json|```/g,"").trim()) }
  catch { throw new Error("Falha ao interpretar resposta. Tente novamente.") }
}

// ââ TRELLO ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const BASE = "https://api.trello.com/1"
const tGet  = async (path,key,token) => { const r=await fetch(`${BASE}${path}?key=${key}&token=${token}`); if(!r.ok) throw new Error(await r.text()); return r.json() }
const tPost = async (path,key,token,body) => { const p=new URLSearchParams({key,token,...body}); const r=await fetch(`${BASE}${path}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:p}); if(!r.ok) throw new Error(await r.text()); return r.json() }

function buildTrelloCard(p) {
  const rc = p.recomendacao||"â"
  const score = (p.score_total||0).toFixed(1)
  const emoji = rc==="COMPRAR"?"ð¢":rc==="AGUARDAR"?"ð¡":"ð´"
  const desc = `## ${emoji} ${rc} â Score ${score}/10

**EndereÃ§o:** ${p.endereco||"â"}
**Tipo:** ${p.tipo||"â"} Â· ${p.area_m2||"â"}mÂ² Â· ${p.quartos||"â"} quartos Â· ${p.vagas||"â"} vagas

---

### ð° Valores
- **AvaliaÃ§Ã£o:** ${fmtC(p.valor_avaliacao)}
- **Lance mÃ­nimo:** ${fmtC(p.valor_minimo)}
- **Desconto:** ${p.desconto_percentual||"â"}%
- **PreÃ§o/mÂ² imÃ³vel:** R$ ${p.preco_m2_imovel||"â"}/mÂ²
- **PreÃ§o/mÂ² mercado:** R$ ${p.preco_m2_mercado||"â"}/mÂ²

---

### âï¸ JurÃ­dico
- **Processos:** ${p.processos_ativos||"â"}
- **MatrÃ­cula:** ${p.matricula_status||"â"}
- **DÃ©b. condomÃ­nio:** ${p.debitos_condominio||"â"}
- **DÃ©b. IPTU:** ${p.debitos_iptu||"â"}
${p.obs_juridicas?`\n${p.obs_juridicas}`:""}

---

### ð Scores
| DimensÃ£o | Score | Peso |
|---|---|---|
| LocalizaÃ§Ã£o | ${p.score_localizacao||0}/10 | 20% |
| Desconto | ${p.score_desconto||0}/10 | 18% |
| JurÃ­dico | ${p.score_juridico||0}/10 | 18% |
| OcupaÃ§Ã£o | ${p.score_ocupacao||0}/10 | 15% |
| Liquidez | ${p.score_liquidez||0}/10 | 15% |
| Mercado | ${p.score_mercado||0}/10 | 14% |
| **TOTAL** | **${score}/10** | |

---

### ð Retorno
- **Revenda:** +${p.retorno_venda_pct||"â"}%
- **LocaÃ§Ã£o a.a.:** ${p.retorno_locacao_anual_pct||"â"}%
- **Custo regularizaÃ§Ã£o:** ${fmtC(p.custo_regularizacao)}
- **Custo reforma:** ${fmtC(p.custo_reforma)}
- **Estrutura recomendada:** ${p.estrutura_recomendada||"â"}

---

### â Pontos Positivos
${(p.positivos||[]).map(x=>`- ${x}`).join("\n")||"â"}

### â ï¸ Pontos de AtenÃ§Ã£o
${(p.negativos||[]).map(x=>`- ${x}`).join("\n")||"â"}

### ð¨ Alertas
${(p.alertas||[]).map(x=>`- ${x}`).join("\n")||"Nenhum"}

---

### ð¬ Justificativa
${p.justificativa||"â"}

---
*Analisado por LEILAX Â· ${new Date().toLocaleDateString("pt-BR")}*
${p.fonte_url?`\nð ${p.fonte_url}`:""}`

  return { name:`${emoji} [${score}] ${p.titulo||p.tipo||"ImÃ³vel"} â ${p.cidade||""}`, desc }
}

// ââ TRELLO CONFIG MODAL âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function TrelloModal({config,onSave,onClose}) {
  const [key,setKey]=useState(config?.key||"")
  const [token,setToken]=useState(config?.token||"")
  const [boards,setBoards]=useState([])
  const [boardId,setBoardId]=useState(config?.boardId||"")
  const [lists,setLists]=useState([])
  const [listId,setListId]=useState(config?.listId||"")
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState("")
  const [step,setStep]=useState(config?.token?2:1)

  const connect = async () => {
    if(!key.trim()||!token.trim()){setError("Informe a chave e o token");return}
    setLoading(true);setError("")
    try { const b=await tGet("/members/me/boards?fields=id,name",key.trim(),token.trim()); setBoards(b);setStep(2) }
    catch(e){setError(e.message)}
    setLoading(false)
  }

  const fetchLists = async (bid) => {
    setBoardId(bid);setLists([]);setListId("")
    if(!bid)return
    setLoading(true)
    try { const l=await tGet(`/boards/${bid}/lists?fields=id,name`,key,token); setLists(l); if(l.length)setListId(l[0].id) }
    catch(e){setError(e.message)}
    setLoading(false)
  }

  const save = () => {
    if(!key||!token||!boardId||!listId){setError("Preencha todos os campos");return}
    onSave({key,token,boardId,listId,boardName:boards.find(b=>b.id===boardId)?.name||"",listName:lists.find(l=>l.id===listId)?.name||""})
  }

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}>
    <div style={{background:K.s1,border:`1px solid ${K.bd}`,borderRadius:"10px",padding:"28px",maxWidth:"480px",width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
        <div>
          <div style={{fontWeight:"700",fontSize:"16px",color:K.wh}}>ð· Configurar Trello</div>
          <div style={{fontSize:"11px",color:K.t3,marginTop:"2px"}}>Conecte ao seu board para envio automÃ¡tico</div>
        </div>
        <button style={btn("s")} onClick={onClose}>â</button>
      </div>

      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>API Key</div>
        <input style={inp} placeholder="Sua API Key do Trello" value={key} onChange={e=>setKey(e.target.value)}/>
        <div style={{fontSize:"10.5px",color:K.t3,marginTop:"4px"}}>Obtenha em: <a href="https://trello.com/app-key" target="_blank" rel="noopener noreferrer" style={{color:K.blue}}>trello.com/app-key</a></div>
      </div>
      <div style={{marginBottom:"16px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Token</div>
        <input style={inp} placeholder="Token de acesso" value={token} onChange={e=>setToken(e.target.value)}/>
        <div style={{fontSize:"10.5px",color:K.t3,marginTop:"4px"}}>Na mesma pÃ¡gina, clique em "Token" e autorize</div>
      </div>

      {step===1&&<button style={btn("trello")} onClick={connect} disabled={loading}>{loading?"Conectando...":"Conectar ao Trello â"}</button>}

      {step===2&&boards.length>0&&<>
        <div style={{marginBottom:"12px"}}>
          <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Board</div>
          <select style={{...inp,cursor:"pointer"}} value={boardId} onChange={e=>fetchLists(e.target.value)}>
            <option value="">â Selecione o board â</option>
            {boards.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {lists.length>0&&<div style={{marginBottom:"18px"}}>
          <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Lista de Destino</div>
          <select style={{...inp,cursor:"pointer"}} value={listId} onChange={e=>setListId(e.target.value)}>
            {lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>}
        <div style={{display:"flex",gap:"10px"}}>
          <button style={btn("trello")} onClick={save} disabled={!listId}>ð¾ Salvar</button>
          <button style={btn("s")} onClick={()=>setStep(1)}>â Voltar</button>
        </div>
      </>}

      {error&&<div style={{background:`${K.red}15`,border:`1px solid ${K.red}40`,borderRadius:"6px",padding:"10px",marginTop:"12px",fontSize:"12px",color:K.red}}>â ï¸ {error}</div>}
    </div>
  </div>
}

// ââ API KEY MODAL âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ApiKeyModal({onClose}) {
  const [key,setKey]=useState(localStorage.getItem("leilax-api-key")||"")
  const save=()=>{localStorage.setItem("leilax-api-key",key.trim());onClose()}
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}>
    <div style={{background:K.s1,border:`1px solid ${K.bd}`,borderRadius:"10px",padding:"28px",maxWidth:"480px",width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px"}}>
        <div>
          <div style={{fontWeight:"700",fontSize:"16px",color:K.wh}}>ð API Key Anthropic</div>
          <div style={{fontSize:"11px",color:K.t3,marginTop:"2px"}}>NecessÃ¡ria para anÃ¡lise com IA</div>
        </div>
        <button style={btn("s")} onClick={onClose}>â</button>
      </div>
      <div style={{marginBottom:"8px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Chave da API</div>
        <input style={inp} type="password" placeholder="sk-ant-..." value={key} onChange={e=>setKey(e.target.value)}/>
      </div>
      <div style={{fontSize:"11px",color:K.t3,marginBottom:"18px"}}>
        Obtenha em: <a href="https://console.anthropic.com/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{color:K.blue}}>console.anthropic.com</a>
      </div>
      <div style={{background:`${K.amb}10`,border:`1px solid ${K.amb}30`,borderRadius:"6px",padding:"12px",marginBottom:"16px",fontSize:"11.5px",color:K.amb}}>
        â ï¸ A chave fica salva apenas no seu navegador (localStorage). Nunca Ã© enviada para nenhum servidor externo alÃ©m da Anthropic.
      </div>
      <button style={btn()} onClick={save}>ð¾ Salvar</button>
    </div>
  </div>
}

// ââ NOVO IMÃVEL âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function NovoImovel({onSave,onCancel,trello}) {
  const [url,setUrl]=useState("")
  const [loading,setLoading]=useState(false)
  const [step,setStep]=useState("")
  const [error,setError]=useState("")
  const [trelloMsg,setTrelloMsg]=useState("")

  const analyze = async () => {
    if(!url.trim()){setError("Cole o link do leilÃ£o");return}
    const hasKey = localStorage.getItem("leilax-api-key")
    if(!hasKey){setError("Configure a chave da API Anthropic nas ConfiguraÃ§Ãµes (âï¸)");return}
    setLoading(true);setError("");setTrelloMsg("")
    setStep("ð Buscando informaÃ§Ãµes do imÃ³vel...")
    try {
      setStep("ð§  IA analisando: score, risco jurÃ­dico, mercado...")
      const openaiKey = localStorage.getItem("leilax-openai-key") || ""
        const data = await analisarImovelCompleto(url.trim(), hasKey, openaiKey, parametrosBanco, criteriosBanco, (msg) => setStep(msg))
      data.fonte_url = url.trim()
      const property = {...data, id:uid(), createdAt:new Date().toISOString()}
      if(trello?.listId) {
        setStep("ð· Enviando para o Trello...")
        try {
          const cd = buildTrelloCard(property)
          await tPost("/cards",trello.key,trello.token,{idList:trello.listId,name:cd.name,desc:cd.desc})
          setTrelloMsg("â Card criado no Trello")
        } catch(e){ setTrelloMsg(`â ï¸ Salvo no app, erro Trello: ${e.message}`) }
      }
      onSave(property)
    } catch(e){ setError(e.message||"Erro na anÃ¡lise.") }
    setLoading(false);setStep("")
  }

  return <div>
    <Hdr title="Analisar ImÃ³vel" sub="Cole o link do leilÃ£o â IA busca e analisa tudo automaticamente"/>
    <div style={{padding:"24px 28px",maxWidth:"640px"}}>
      {trello?.listId
        ?<div style={{background:`${K.trello}15`,border:`1px solid ${K.trello}40`,borderRadius:"7px",padding:"12px 16px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"18px"}}>ð·</span>
          <div><div style={{fontSize:"12.5px",color:K.wh,fontWeight:"600"}}>Trello conectado</div>
          <div style={{fontSize:"11px",color:K.t3}}>{trello.boardName} â {trello.listName}</div></div>
          <span style={{marginLeft:"auto",fontSize:"9px",background:`${K.grn}20`,color:K.grn,padding:"2px 8px",borderRadius:"3px",fontWeight:"700"}}>ATIVO</span>
        </div>
        :<div style={{background:`${K.amb}10`,border:`1px solid ${K.amb}30`,borderRadius:"7px",padding:"12px 16px",marginBottom:"18px",fontSize:"12px",color:K.amb}}>
          â ï¸ Trello nÃ£o configurado. Configure em <b>âï¸ Config</b> na barra lateral.
        </div>}

      <div style={{marginBottom:"16px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}}>Link do LeilÃ£o *</div>
        <input style={{...inp,fontSize:"14px"}} placeholder="https://venda-imoveis.caixa.gov.br/..." value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")analyze()}}/>
        <div style={{fontSize:"11px",color:K.t3,marginTop:"5px"}}>Portal CAIXA, sites de leiloeiros, qualquer anÃºncio pÃºblico</div>
      </div>

      {error&&<div style={{background:`${K.red}15`,border:`1px solid ${K.red}40`,borderRadius:"6px",padding:"12px",marginBottom:"14px",fontSize:"12.5px",color:K.red}}>â ï¸ {error}</div>}
      {trelloMsg&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"6px",padding:"10px",marginBottom:"14px",fontSize:"12px",color:K.teal}}>{trelloMsg}</div>}

      {loading&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"7px",padding:"16px",marginBottom:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:K.teal,animation:"pulse 1s infinite",flexShrink:0}}/>
          <div style={{fontSize:"13px",color:K.teal,fontWeight:"600"}}>{step}</div>
        </div>
        <div style={{fontSize:"11px",color:K.t3,marginTop:"6px"}}>Pode levar 20-40 segundos...</div>
      </div>}

      <div style={{display:"flex",gap:"10px"}}>
        <button style={btn()} onClick={analyze} disabled={loading}>{loading?"â³ Analisando...":"ð Analisar ImÃ³vel"}</button>
        <button style={btn("s")} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  </div>
}

// ââ PROPERTY CARD âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function PropCard({p,onNav}) {
  const sc=p.score_total||0, rc=recColor(p.recomendacao)
  return <div onClick={()=>onNav("detail",{id:p.id})}
    style={{...card(),cursor:"pointer",transition:"all .15s"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=K.teal;e.currentTarget.style.transform="translateY(-2px)"}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=K.bd;e.currentTarget.style.transform="none"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:"600",fontSize:"13px",color:K.wh,marginBottom:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.titulo||"ImÃ³vel sem tÃ­tulo"}</div>
        <div style={{fontSize:"10.5px",color:K.t3,marginBottom:"8px"}}>ð {p.cidade}/{p.estado} Â· {p.tipo} Â· {p.area_m2?`${p.area_m2}mÂ²`:"â"}</div>
        <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"10px"}}>
          <Bdg c={rc} ch={p.recomendacao||"â"}/>
          <Bdg c={p.ocupacao==="Desocupado"?K.grn:p.ocupacao==="Ocupado"?K.red:K.t3} ch={p.ocupacao||"â"}/>
          {p.financiavel&&<Bdg c={K.blue} ch="FinanciÃ¡vel"/>}{p.analise_dupla_ia&&<span style={{fontSize:"9px",fontWeight:"700",background:"linear-gradient(135deg,rgba(0,229,187,0.2),rgba(16,163,127,0.2))",border:"1px solid rgba(0,229,187,0.35)",color:"#00E5BB",padding:"2px 8px",borderRadius:"4px",letterSpacing:".5px"}}>ð¤ CLAUDE + GPT</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
          <div style={{background:K.s2,borderRadius:"5px",padding:"7px 10px"}}>
            <div style={{fontSize:"9px",color:K.t3,marginBottom:"2px"}}>MÃNIMO</div>
            <div style={{fontSize:"13px",fontWeight:"700",color:K.amb}}>{fmtC(p.valor_minimo)}</div>
          </div>
          <div style={{background:K.s2,borderRadius:"5px",padding:"7px 10px"}}>
            <div style={{fontSize:"9px",color:K.t3,marginBottom:"2px"}}>DESCONTO</div>
            <div style={{fontSize:"13px",fontWeight:"700",color:K.grn}}>{p.desconto_percentual?`${p.desconto_percentual}%`:"â"}</div>
          </div>
        </div>
      </div>
      <ScoreRing score={sc} size={70}/>
    </div>
    <div style={{fontSize:"10px",color:K.t3,marginTop:"10px",borderTop:`1px solid ${K.bd}`,paddingTop:"8px"}}>{fmtD(p.createdAt)} Â· {p.modalidade||"â"}</div>
  </div>
}

// ââ DASHBOARD âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Dashboard({props,onNav}) {
  const total=props.length, comprar=props.filter(p=>p.recomendacao==="COMPRAR").length
  const forte=props.filter(p=>(p.score_total||0)>=7.5).length
  const avg=total?(props.reduce((s,p)=>s+(p.score_total||0),0)/total).toFixed(1):"â"
  const recentes=[...props].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6)
  return <div>
    <Hdr title="Dashboard LEILAX" sub={`${total} imÃ³vel(is) analisado(s)`} actions={<button style={btn()} onClick={()=>onNav("novo")}>+ Analisar ImÃ³vel</button>}/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
        {[{l:"Analisados",v:total,c:K.blue},{l:"Score MÃ©dio",v:avg,c:K.teal},{l:"Comprar",v:comprar,c:K.grn},{l:"Score Forte",v:forte,c:K.gold}].map(k=>(
          <div key={k.l} style={{background:`${k.c}12`,border:`1px solid ${k.c}30`,borderRadius:"8px",padding:"16px"}}>
            <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>{k.l}</div>
            <div style={{fontFamily:"monospace",fontSize:"30px",fontWeight:"800",color:k.c}}>{k.v}</div>
          </div>
        ))}
      </div>
      {total===0
        ?<div style={{textAlign:"center",padding:"60px 20px",color:K.t3}}>
          <div style={{fontSize:"48px",marginBottom:"16px"}}>ð </div>
          <div style={{fontSize:"15px",marginBottom:"8px",color:K.t2}}>Nenhum imÃ³vel analisado ainda</div>
          <div style={{fontSize:"12px",marginBottom:"24px"}}>Cole o link de um leilÃ£o para comeÃ§ar</div>
          <button style={btn()} onClick={()=>onNav("novo")}>Analisar Primeiro ImÃ³vel</button>
        </div>
        :<><div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>AnÃ¡lises Recentes</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px"}}>
          {recentes.map(p=><PropCard key={p.id} p={p} onNav={onNav}/>)}
        </div></>}
    </div>
  </div>
}

// ââ DETAIL ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Detail({p,onDelete,onNav,trello}) {
  const [sending,setSending]=useState(false)
  const [msg,setMsg]=useState("")
  if(!p) return <div style={{padding:"40px",textAlign:"center",color:K.t3}}>NÃ£o encontrado</div>
  const sc=p.score_total||0, rc=recColor(p.recomendacao)
  const scores=[
    {l:"LocalizaÃ§Ã£o",v:p.score_localizacao,w:"20%"},{l:"Desconto",v:p.score_desconto,w:"18%"},
    {l:"JurÃ­dico",v:p.score_juridico,w:"18%"},{l:"OcupaÃ§Ã£o",v:p.score_ocupacao,w:"15%"},
    {l:"Liquidez",v:p.score_liquidez,w:"15%"},{l:"Mercado",v:p.score_mercado,w:"14%"},
  ]
  const sendTrello=async()=>{
    if(!trello?.listId){setMsg("Trello nÃ£o configurado");return}
    setSending(true);setMsg("")
    try { const cd=buildTrelloCard(p); await tPost("/cards",trello.key,trello.token,{idList:trello.listId,name:cd.name,desc:cd.desc}); setMsg("â Card enviado ao Trello!") }
    catch(e){setMsg(`Erro: ${e.message}`)}
    setSending(false)
  }
  return <div>
    <Hdr title={p.titulo||"ImÃ³vel"} sub={`${p.cidade}/${p.estado} Â· ${fmtD(p.createdAt)}`}
      actions={<>
        {p.fonte_url&&<a href={p.fonte_url} target="_blank" rel="noopener noreferrer" style={{...btn("s"),textDecoration:"none",display:"inline-block"}}>ð AnÃºncio</a>}
        <button style={btn("trello")} onClick={sendTrello} disabled={sending}>{sending?"Enviando...":"ð· Trello"}</button>
        <button style={{...btn("d"),padding:"5px 12px",fontSize:"12px"}} onClick={()=>{if(confirm("Excluir?"))onDelete(p.id)}}>ð</button>
      </>}/>
    <div style={{padding:"20px 28px"}}>
      {msg&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"6px",padding:"10px",marginBottom:"14px",fontSize:"12px",color:K.teal}}>{msg}</div>}
      <div style={{background:`${rc}10`,border:`1px solid ${rc}30`,borderRadius:"10px",padding:"20px",marginBottom:"16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
          <ScoreRing score={sc} size={90}/>
          <div>
            <div style={{fontSize:"11px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"}}>RecomendaÃ§Ã£o</div>
            <div style={{fontSize:"28px",fontWeight:"800",color:rc}}>{p.recomendacao||"â"}</div>
            <div style={{fontSize:"12px",color:K.t2,marginTop:"4px",maxWidth:"400px"}}>{p.justificativa}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          <Bdg c={p.ocupacao==="Desocupado"?K.grn:K.red} ch={p.ocupacao||"â"}/>
          <Bdg c={p.financiavel?K.blue:K.t3} ch={p.financiavel?"FinanciÃ¡vel":"Sem financ."}/>
          {p.fgts_aceito&&<Bdg c={K.pur} ch="FGTS"/>}
          <Bdg c={K.t3} ch={p.modalidade||"â"}/>
        </div>
      </div>
      {p.alertas?.length>0&&<div style={{background:`${K.red}10`,border:`1px solid ${K.red}30`,borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"11px",color:K.red,fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>ð¨ Alertas CrÃ­ticos</div>
        {p.alertas.map((a,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"4px"}}>â¢ {a}</div>)}
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>ð° Valores</div>
          {[["AvaliaÃ§Ã£o",fmtC(p.valor_avaliacao),K.t2],["Lance mÃ­nimo",fmtC(p.valor_minimo),K.amb],["Desconto",p.desconto_percentual?`${p.desconto_percentual}%`:"â",K.grn],["PreÃ§o/mÂ² imÃ³vel",p.preco_m2_imovel?`R$ ${p.preco_m2_imovel}/mÂ²`:"â",K.teal],["PreÃ§o/mÂ² mercado",p.preco_m2_mercado?`R$ ${p.preco_m2_mercado}/mÂ²`:"â",K.t2],["Aluguel estimado",fmtC(p.aluguel_mensal_estimado)+"/mÃªs",K.pur]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",fontWeight:"600",color:c}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>ð  Ficha TÃ©cnica</div>
          {[["Tipo",p.tipo],["Ãrea",p.area_m2?`${p.area_m2}mÂ²`:"â"],["Quartos",p.quartos],["Vagas",p.vagas],["Leiloeiro",p.leiloeiro],["Data leilÃ£o",p.data_leilao],["Liquidez",p.liquidez],["Revenda est.",p.prazo_revenda_meses?`${p.prazo_revenda_meses} meses`:"â"]].filter(([,v])=>v&&v!=="â"&&v!=="0").map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",color:K.tx}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{...card(),marginBottom:"14px"}}>
        <div style={{fontWeight:"600",color:K.wh,marginBottom:"14px",fontSize:"13px"}}>ð Score por DimensÃ£o</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
          {scores.map(({l,v,w})=>(
            <div key={l} style={{background:K.s2,borderRadius:"6px",padding:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"11px",color:K.t3}}>{l}</span>
                <span style={{fontSize:"10px",color:K.t3}}>peso {w}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <div style={{flex:1,height:"6px",background:K.bd,borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{width:`${(v||0)*10}%`,height:"100%",background:scoreColor(v||0),borderRadius:"3px"}}/>
                </div>
                <span style={{fontSize:"13px",fontWeight:"700",color:scoreColor(v||0),minWidth:"28px",textAlign:"right"}}>{(v||0).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>âï¸ JurÃ­dico</div>
          {[["Processos",p.processos_ativos,{Nenhum:K.grn,PossÃ­vel:K.amb,Confirmado:K.red,Desconhecido:K.t3}],
            ["MatrÃ­cula",p.matricula_status,{Limpa:K.grn,"Com Ã´nus":K.red,Desconhecido:K.t3}],
            ["DÃ©b. condomÃ­nio",p.debitos_condominio,{"Sem dÃ©bitos":K.grn,"Com dÃ©bitos":K.red,Desconhecido:K.t3}],
            ["DÃ©b. IPTU",p.debitos_iptu,{"Sem dÃ©bitos":K.grn,"Com dÃ©bitos":K.red,Desconhecido:K.t3}]].map(([l,v,cs])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`,alignItems:"center"}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span>
              <span style={{fontSize:"12px",fontWeight:"600",color:cs?.[v]||K.t2}}>{v||"â"}</span>
            </div>
          ))}
          {p.obs_juridicas&&<div style={{marginTop:"10px",fontSize:"11.5px",color:K.t2,lineHeight:"1.6",background:K.s2,borderRadius:"5px",padding:"8px"}}>{p.obs_juridicas}</div>}
        </div>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>ð Retorno e Custos</div>
          {[["Custo regularizaÃ§Ã£o",fmtC(p.custo_regularizacao),K.amb],["Custo reforma",fmtC(p.custo_reforma),K.amb],["Retorno revenda",p.retorno_venda_pct?`+${p.retorno_venda_pct}%`:"â",K.grn],["LocaÃ§Ã£o a.a.",p.retorno_locacao_anual_pct?`${p.retorno_locacao_anual_pct}%`:"â",K.teal],["Estrutura rec.",p.estrutura_recomendada,K.pur],["TendÃªncia",p.mercado_tendencia,p.mercado_tendencia==="Alta"?K.grn:K.amb],["Demanda",p.mercado_demanda,p.mercado_demanda==="Alta"?K.grn:K.amb]].filter(([,v])=>v&&v!=="â").map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",fontWeight:"600",color:c}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      {(p.positivos?.length>0||p.negativos?.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={{...card(),borderTop:`2px solid ${K.grn}`}}>
          <div style={{fontWeight:"600",color:K.grn,marginBottom:"10px",fontSize:"13px"}}>â Pontos Positivos</div>
          {(p.positivos||[]).map((pt,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"6px",display:"flex",gap:"8px"}}><span style={{color:K.grn}}>+</span>{pt}</div>)}
        </div>
        <div style={{...card(),borderTop:`2px solid ${K.red}`}}>
          <div style={{fontWeight:"600",color:K.red,marginBottom:"10px",fontSize:"13px"}}>â ï¸ Pontos de AtenÃ§Ã£o</div>
          {(p.negativos||[]).map((pt,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"6px",display:"flex",gap:"8px"}}><span style={{color:K.red}}>â</span>{pt}</div>)}
        </div>
      </div>}
      {p.endereco&&<div style={{...card(),marginBottom:"14px"}}><div style={{fontWeight:"600",color:K.wh,marginBottom:"6px",fontSize:"13px"}}>ð LocalizaÃ§Ã£o</div><div style={{fontSize:"13px",color:K.t2}}>{p.endereco}</div></div>}
    </div>
  </div>
}

// ââ LISTA âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Lista({props,onNav,onDelete}) {
  const [q,setQ]=useState(""), [filter,setFilter]=useState("todos"), [sort,setSort]=useState("score")
  let list=[...props]
  if(q) list=list.filter(p=>`${p.titulo} ${p.cidade} ${p.tipo}`.toLowerCase().includes(q.toLowerCase()))
  if(filter!=="todos") list=list.filter(p=>p.recomendacao===filter.toUpperCase())
  list.sort((a,b)=>sort==="score"?(b.score_total||0)-(a.score_total||0):sort==="desconto"?(b.desconto_percentual||0)-(a.desconto_percentual||0):sort==="valor"?(a.valor_minimo||0)-(b.valor_minimo||0):new Date(b.createdAt)-new Date(a.createdAt))
  return <div>
    <Hdr title="ImÃ³veis" sub={`${props.length} total Â· ${list.length} filtrado(s)`} actions={<button style={btn()} onClick={()=>onNav("novo")}>+ Novo</button>}/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"flex",gap:"10px",marginBottom:"16px",flexWrap:"wrap"}}>
        <input style={{...inp,maxWidth:"260px"}} placeholder="ð Buscar..." value={q} onChange={e=>setQ(e.target.value)}/>
        <select style={{...inp,width:"auto",cursor:"pointer"}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="todos">Todos</option><option value="comprar">Comprar</option><option value="aguardar">Aguardar</option><option value="evitar">Evitar</option>
        </select>
        <select style={{...inp,width:"auto",cursor:"pointer"}} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="score">Maior Score</option><option value="desconto">Maior Desconto</option><option value="valor">Menor Valor</option><option value="data">Mais Recente</option>
        </select>
      </div>
      {list.length===0?<div style={{textAlign:"center",padding:"40px",color:K.t3}}><div style={{fontSize:"32px",marginBottom:"10px"}}>ð</div><div>Nenhum imÃ³vel encontrado</div></div>
      :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px"}}>
        {list.map(p=><PropCard key={p.id} p={p} onNav={onNav}/>)}
      </div>}
    </div>
  </div>
}

// ââ COMPARATIVO âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Comparativo({props}) {
  const [sel,setSel]=useState([])
  const top=[...props].sort((a,b)=>(b.score_total||0)-(a.score_total||0)).slice(0,8)
  const cmp=props.filter(p=>sel.includes(p.id))
  const toggle=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):s.length<3?[...s,id]:s)
  const dims=[["Score Total",p=>(p.score_total||0).toFixed(1),p=>scoreColor(p.score_total)],["RecomendaÃ§Ã£o",p=>p.recomendacao,p=>recColor(p.recomendacao)],["Valor MÃ­nimo",p=>fmtC(p.valor_minimo),()=>K.t2],["Desconto",p=>p.desconto_percentual?`${p.desconto_percentual}%`:"â",()=>K.grn],["Ãrea",p=>p.area_m2?`${p.area_m2}mÂ²`:"â",()=>K.t2],["PreÃ§o/mÂ²",p=>p.preco_m2_imovel?`R$ ${p.preco_m2_imovel}`:"â",()=>K.t2],["OcupaÃ§Ã£o",p=>p.ocupacao,p=>p.ocupacao==="Desocupado"?K.grn:K.red],["Processos",p=>p.processos_ativos,p=>p.processos_ativos==="Nenhum"?K.grn:K.red],["FinanciÃ¡vel",p=>p.financiavel?"Sim":"NÃ£o",p=>p.financiavel?K.grn:K.t3],["Retorno revenda",p=>p.retorno_venda_pct?`+${p.retorno_venda_pct}%`:"â",()=>K.grn]]
  return <div>
    <Hdr title="Comparativo" sub="Selecione atÃ© 3 imÃ³veis"/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"20px"}}>
        {top.map(p=><div key={p.id} onClick={()=>toggle(p.id)} style={{background:sel.includes(p.id)?`${K.teal}15`:K.s2,border:`1px solid ${sel.includes(p.id)?K.teal:K.bd}`,borderRadius:"6px",padding:"7px 12px",cursor:"pointer",fontSize:"12px",color:K.tx}}>
          {sel.includes(p.id)?"â ":""}{(p.titulo||"ImÃ³vel").slice(0,26)} <span style={{color:scoreColor(p.score_total)}}>({(p.score_total||0).toFixed(1)})</span>
        </div>)}
      </div>
      {cmp.length>=2?<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12.5px"}}>
          <thead><tr>
            <th style={{padding:"10px 14px",background:K.s2,color:K.t3,textAlign:"left",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",borderBottom:`1px solid ${K.bd}`,minWidth:"130px"}}>DimensÃ£o</th>
            {cmp.map(p=><th key={p.id} style={{padding:"10px 14px",background:K.s2,color:K.wh,textAlign:"center",borderBottom:`1px solid ${K.bd}`,minWidth:"180px"}}>
              <div style={{fontSize:"11.5px",marginBottom:"6px"}}>{(p.titulo||"ImÃ³vel").slice(0,22)}</div>
              <ScoreRing score={p.score_total} size={44}/>
            </th>)}
          </tr></thead>
          <tbody>{dims.map(([label,getValue,getColor],i)=>(
            <tr key={label} style={{background:i%2===0?K.s1:K.bg2}}>
              <td style={{padding:"8px 14px",color:K.t3,borderBottom:`1px solid ${K.bd}`}}>{label}</td>
              {cmp.map(p=><td key={p.id} style={{padding:"8px 14px",textAlign:"center",borderBottom:`1px solid ${K.bd}`,color:getColor(p),fontWeight:"600"}}>{getValue(p)||"â"}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>:<div style={{textAlign:"center",padding:"40px",color:K.t3}}><div style={{fontSize:"28px",marginBottom:"10px"}}>âï¸</div><div>Selecione pelo menos 2 imÃ³veis acima</div></div>}
    </div>
  </div>
}

// ââ APP ROOT ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function App() {
  const { session, profile, loading: authLoading, isAdmin } = useAuth()
  if (authLoading) return <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#080B10',justifyContent:'center',alignItems:'center',color:'#00E5BB',fontFamily:'system-ui',fontSize:'16px',fontWeight:'700'}}>â³ Carregando...</div>
  if (!session) return <Login />
  if (profile && !profile.ativo) return <div style={{display:'flex',height:'100vh',background:'#080B10',justifyContent:'center',alignItems:'center',color:'#FF4757',fontFamily:'system-ui',flexDirection:'column',gap:'12px'}}><div>ð«</div><div style={{fontSize:'16px',fontWeight:'700'}}>Acesso desativado</div><div style={{fontSize:'13px',color:'#3D4E6A'}}>Contate o administrador</div></div>
  const [view,setView]=useState("dashboard")
  const [vp,setVp]=useState({})
  const [props,setProps]=useState([])
  const [loaded,setL]=useState(false)
  const [toast,setToast]=useState(null)
  const [trello,setTrello]=useState(null)
  const [showTrello,setShowTrello]=useState(false)
  const [showApiKey,setShowApiKey]=useState(false)
const [parametrosBanco,setParametrosBanco]=useState([])
const [criteriosBanco,setCriteriosBanco]=useState([])
  const apiOk = localStorage.getItem("leilax-api-key")
useEffect(()=>{async function lp(){try{const{data:pr}=await supabase.from("parametros_score").select("*");if(pr)setParametrosBanco(pr);const{data:cr}=await supabase.from("criterios_avaliacao").select("*");if(cr)setCriteriosBanco(cr)}catch(e){console.warn("parametros:",e)}}lp()},[])

  const showToast=(msg,c)=>{setToast({msg,c:c||K.teal});setTimeout(()=>setToast(null),4500)}
  const nav=(v,p={})=>{setView(v);setVp(p)}

  useEffect(()=>{(async()=>{
    const [p,t]=await Promise.all([stLoad("leilax-props"),stLoad("leilax-trello")])
    if(p)setProps(p); if(t)setTrello(t); setL(true)
    // Mostrar modal de API key se nÃ£o tiver
    if(!localStorage.getItem("leilax-api-key")) setTimeout(()=>setShowApiKey(true),1000)
  })()},[])

  useEffect(()=>{if(loaded)stSave("leilax-props",props)},[props,loaded])
  useEffect(()=>{if(loaded&&trello)stSave("leilax-trello",trello)},[trello,loaded])

  const addProp=p=>{
    setProps(ps=>[p,...ps])
    showToast(`â ${p.titulo||"ImÃ³vel"} â Score ${(p.score_total||0).toFixed(1)} Â· ${p.recomendacao}`)
    nav("detail",{id:p.id})
  }
  const delProp=id=>{setProps(ps=>ps.filter(p=>p.id!==id));showToast("ExcluÃ­do",K.red);nav("imoveis")}
  const saveTrello=cfg=>{setTrello(cfg);setShowTrello(false);showToast("â Trello configurado â "+cfg.boardName,K.trello)}

  const navItems=[
    {i:'ð ',l:'Dashboard',v:'dashboard'},
    {i:'ð',l:'Analisar',v:'novo'},
    {i:'ð¤',l:'Busca GPT',v:'busca'},
    {i:'ð',l:'ImÃ³veis',v:'imoveis'},
    {i:'ð',l:'GrÃ¡ficos',v:'graficos'},
    {i:'âï¸',l:'Comparar',v:'comparar'},
    {i:'â',l:'Tarefas',v:'tarefas'},
    ...(isAdmin?[{i:'ð¡ï¸',l:'Admin',v:'admin'}]:[]),
  ]
  const isAct=v=>view===v||(v==="imoveis"&&view==="detail")
  const selP=vp.id?props.find(p=>p.id===vp.id):null

  if(!loaded) return <div style={{display:"flex",height:"100vh",background:K.bg,justifyContent:"center",alignItems:"center",flexDirection:"column",gap:"12px",fontFamily:"system-ui"}}>
    <div style={{fontSize:"32px"}}>ð </div>
    <div style={{color:K.teal,fontWeight:"700",fontSize:"16px"}}>Carregando LEILAX...</div>
  </div>

  return <div style={{display:"flex",height:"100vh",background:K.bg,color:K.tx,fontFamily:"'DM Sans',system-ui,sans-serif",fontSize:"14px",overflow:"hidden"}}>
    <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${K.bg};}::-webkit-scrollbar-thumb{background:${K.bd2};border-radius:2px;}select option{background:${K.s1};}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}a:hover{opacity:.8;}`}</style>

    {showTrello&&<TrelloModal config={trello} onSave={saveTrello} onClose={()=>setShowTrello(false)}/>}
    {showApiKey&&<ApiKeyModal onClose={()=>setShowApiKey(false)}/>}

    {/* SIDEBAR */}
{/* RODAPE DA SIDEBAR */}
<div style={{flexShrink:0,padding:'8px',borderTop:'1px solid rgba(0,229,187,0.10)',display:'flex',flexDirection:'column',gap:'6px'}}>
{/* Trello */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer'}} onClick={()=>setShowTrello(true)}>
<div style={{display:'flex',alignItems:'center',gap:'7px'}}>
<span style={{fontSize:'13px'}}>ð·</span>
<div>
<div style={{fontSize:'11px',color:'#DDE4F0',fontWeight:600,lineHeight:1.2}}>Trello</div>
<div style={{fontSize:'9px',color:'#3D4E6A'}}>{trello?'Configurado':'Clique para configurar'}</div>
</div>
</div>
<span style={{fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'3px',background:trello?'rgba(0,229,187,0.15)':'rgba(255,71,87,0.15)',color:trello?'#00E5BB':'#FF4757',border:trello?'1px solid rgba(0,229,187,0.3)':'1px solid rgba(255,71,87,0.3)'}}>{trello?'ON':'OFF'}</span>
</div>
{/* API Key */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer'}} onClick={()=>setShowApiKey(true)}>
<div style={{display:'flex',alignItems:'center',gap:'7px'}}>
<span style={{fontSize:'13px'}}>âï¸</span>
<div style={{fontSize:'11px',color:'#DDE4F0',fontWeight:600}}>API Key</div>
</div>
<span style={{fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'3px',background:apiOk?'rgba(0,229,187,0.15)':'rgba(255,71,87,0.15)',color:apiOk?'#00E5BB':'#FF4757',border:apiOk?'1px solid rgba(0,229,187,0.3)':'1px solid rgba(255,71,87,0.3)'}}>{apiOk?'OK':'FALTA'}</span>
</div>
{/* Perfil + Sair */}
<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,71,87,0.06)',border:'1px solid rgba(255,71,87,0.15)'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'rgba(0,229,187,0.2)',border:'1px solid rgba(0,229,187,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#00E5BB',fontSize:'11px',flexShrink:0}}>{(profile?.nome||'U')[0].toUpperCase()}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:'11px',fontWeight:600,color:'#DDE4F0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.nome||'UsuÃ¡rio'}</div>
<div style={{fontSize:'9px',color:'#3D4E6A'}}>{isAdmin?'ð¡ï¸ Admin':'ð¤ Membro'}</div>
</div>
<div title="Sair" style={{fontSize:'16px',cursor:'pointer',color:'#FF4757',flexShrink:0,padding:'2px'}} onClick={async()=>{const{signOut}=await import('./lib/supabase.js');await signOut()}}>â©</div>
</div>
{/* Stats */}
<div style={{padding:'4px 10px',fontSize:'10px',color:'#3D4E6A',display:'flex',flexDirection:'column',gap:'2px'}}>
<div>ð  {props.filter(p=>p.status==='analisado').length} analisados</div>
<div>â {props.filter(p=>p.recomendacao==='COMPRAR').length} para comprar</div>
<div>â­ {props.filter(p=>(p.score_total||0)>=7).length} score forte</div>
</div>
</div>

    {/* CONTENT */}
    <div style={{flex:1,overflowY:"auto",background:K.bg,display:"flex",flexDirection:"column",minWidth:0}}>
      {view==="dashboard"&&<Dashboard props={props} onNav={nav}/>}
      {view==="novo"&&<NovoImovel onSave={addProp} onCancel={()=>nav("imoveis")} trello={trello}/>}
      {view==="imoveis"&&<Lista props={props} onNav={nav} onDelete={delProp}/>}
      {view==="detail"&&<Detail p={selP} onDelete={delProp} onNav={nav} trello={trello}/>}
      {view==="comparar"&&<Comparativo props={props}/>}
    {view==="busca"&&<BuscaGPT onAnalisar={(link)=>{nav("novo");setTimeout(()=>{},100)}}/>}
    {view==="graficos"&&<div><div style={{padding:"22px 28px 16px",borderBottom:`1px solid ${K.bd}`}}><div style={{fontWeight:700,fontSize:19,color:K.wh}}>ð GrÃ¡ficos</div></div><div style={{padding:"20px 28px"}}><Charts properties={props}/></div></div>}
    {view==="tarefas"&&<Tarefas/>}
    {view==="admin"&&isAdmin&&<AdminPanel/>}
    </div>

    {toast&&<div style={{position:"fixed",bottom:"16px",right:"16px",background:toast.c===K.trello?K.trello:toast.c,color:toast.c===K.teal||toast.c===K.trello?"#000":"#fff",padding:"12px 20px",borderRadius:"8px",fontSize:"13px",fontWeight:"600",zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,.6)",maxWidth:"340px"}}>{toast.msg}</div>}
    <MobileNav items={navItems} activeKey={view} onNavigate={(v)=>nav(v)}/>
  </div>
}
import { useState, useEffect, useRef } from "react"
import { stLoad, stSave } from "./storage.js"
import Charts from "./components/Charts.jsx"
import Timeline from "./components/Timeline.jsx"
import MobileNav from "./components/MobileNav.jsx"
import BuscaGPT from "./components/BuscaGPT.jsx"
import { useAuth } from "./lib/AuthContext.jsx"
import Login from "./pages/Login.jsx"
import { getImoveis, saveImovel, deleteImovel } from "./lib/supabase.js"
import Tarefas from "./pages/Tarefas.jsx"
import AdminPanel from "./pages/AdminPanel.jsx"
import { analisarImovelCompleto } from "./lib/dualAI.js"
    
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36)
const fmtD = d => d ? new Date(d).toLocaleDateString("pt-BR") : "—"
const fmtC = v => v ? `R$ ${Number(v).toLocaleString("pt-BR", {minimumFractionDigits:0})}` : "—"

const K = {
  bg:"#080B10", bg2:"#0C1018", s1:"#111620", s2:"#171E2C",
  bd:"#1C2438", bd2:"#232D42", teal:"#00E5BB", amb:"#F5A623",
  red:"#FF4757", blue:"#4A9EFF", pur:"#A78BFA", grn:"#2ECC71",
  gold:"#FFD700", tx:"#DDE4F0", t2:"#7A8BA8", t3:"#3D4E6A", wh:"#FFFFFF",
  trello:"#0052CC"
}

const scoreColor = s => s >= 7.5 ? K.grn : s >= 6 ? K.teal : s >= 4.5 ? K.amb : K.red
const scoreLabel = s => s >= 7.5 ? "FORTE" : s >= 6 ? "BOM" : s >= 4.5 ? "MÉDIO" : "FRACO"
const recColor = r => ({ COMPRAR: K.grn, AGUARDAR: K.amb, EVITAR: K.red })[r] || K.t3

const btn = (v="p") => ({
  background: v==="p"?K.teal:v==="d"?`${K.red}18`:v==="trello"?K.trello:K.s2,
  color: v==="p"?"#000":v==="d"?K.red:v==="trello"?"#fff":K.t2,
  border: v==="d"?`1px solid ${K.red}40`:"none",
  borderRadius:"6px", padding: v==="s"?"5px 12px":"9px 20px",
  fontSize: v==="s"?"11.5px":"13px", fontWeight:"600", cursor:"pointer", flexShrink:0
})
const inp = { background:K.s1, border:`1px solid ${K.bd}`, borderRadius:"6px", padding:"10px 14px", color:K.tx, fontSize:"13px", width:"100%", outline:"none" }
const card = (ac) => ({ background:K.s1, border:`1px solid ${ac||K.bd}`, borderRadius:"8px", padding:"18px" })
const Bdg = ({c,ch}) => <span style={{display:"inline-block",fontSize:"10px",fontWeight:"700",padding:"2px 8px",borderRadius:"4px",textTransform:"uppercase",letterSpacing:".5px",background:`${c}20`,color:c,border:`1px solid ${c}40`}}>{ch}</span>

function Hdr({title,sub,actions}) {
  return <div style={{padding:"22px 28px 16px",borderBottom:`1px solid ${K.bd}`,flexShrink:0}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px",flexWrap:"wrap"}}>
      <div>
        <div style={{fontWeight:"700",fontSize:"19px",color:K.wh,letterSpacing:"-0.3px"}}>{title}</div>
        {sub&&<div style={{fontSize:"11px",color:K.t3,marginTop:"3px"}}>{sub}</div>}
      </div>
      {actions&&<div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{actions}</div>}
    </div>
  </div>
}

function ScoreRing({score,size=80}) {
  const c = scoreColor(score||0)
  const r = (size-10)/2
  const circ = 2*Math.PI*r
  const dash = ((score||0)/10)*circ
  return <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={K.s2} strokeWidth="8"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
    </svg>
    <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
      <div style={{fontSize:size>70?"18px":"13px",fontWeight:"800",color:c,lineHeight:1}}>{(score||0).toFixed(1)}</div>
      <div style={{fontSize:"8px",color:K.t3,textTransform:"uppercase",letterSpacing:".5px"}}>{scoreLabel(score||0)}</div>
    </div>
  </div>
}


// ── AI ────────────────────────────────────────────────────────────────────────
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages"

async function analyzeProperty(url) {
  const sys = `Você é LEILAX, especialista em análise de imóveis em leilão para investimento imobiliário no Brasil. Use web search para buscar informações sobre o imóvel.

Retorne SOMENTE JSON válido sem markdown:
{
  "titulo":"","endereco":"","cidade":"","estado":"","tipo":"Apartamento|Casa|Terreno|Comercial",
  "area_m2":0,"quartos":0,"vagas":0,"andar":"","modalidade":"","leiloeiro":"",
  "data_leilao":"DD/MM/AAAA","valor_avaliacao":0,"valor_minimo":0,"desconto_percentual":0,
  "ocupacao":"Desocupado|Ocupado|Desconhecido","financiavel":true,"fgts_aceito":false,
  "debitos_condominio":"Sem débitos|Com débitos|Desconhecido",
  "debitos_iptu":"Sem débitos|Com débitos|Desconhecido",
  "processos_ativos":"Nenhum|Possível|Confirmado|Desconhecido",
  "matricula_status":"Limpa|Com ônus|Desconhecido",
  "obs_juridicas":"",
  "preco_m2_imovel":0,"preco_m2_mercado":0,"aluguel_mensal_estimado":0,
  "liquidez":"Alta|Média|Baixa","prazo_revenda_meses":0,
  "positivos":[""],"negativos":[""],"alertas":[""],
  "recomendacao":"COMPRAR|AGUARDAR|EVITAR","justificativa":"",
  "estrutura_recomendada":"CPF único|Condomínio voluntário|PJ",
  "custo_regularizacao":0,"custo_reforma":0,
  "retorno_venda_pct":0,"retorno_locacao_anual_pct":0,
  "mercado_tendencia":"Alta|Estável|Queda","mercado_demanda":"Alta|Média|Baixa",
  "mercado_tempo_venda_meses":0,"mercado_obs":"",
  "score_localizacao":0,"score_desconto":0,"score_juridico":0,
  "score_ocupacao":0,"score_liquidez":0,"score_mercado":0,"score_total":0
}
Scores 0-10. score_total = média ponderada (loc 20%, desc 18%, jur 18%, ocup 15%, liq 15%, merc 14%).
Se score_juridico < 4 → score_total *= 0.75. Se ocupado → score_total *= 0.85.`

  const apiKey = localStorage.getItem("leilax-api-key") || ""
  if (!apiKey) throw new Error("Configure a chave da API Anthropic nas configurações")

  const r = await fetch(ANTHROPIC_API, {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:4000, system:sys,
      tools:[{type:"web_search_20250305",name:"web_search"}],
      messages:[{role:"user",content:`Analise o imóvel em leilão: ${url}`}]
    })
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message || "Erro na API")
  const txt = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n")
  try { return JSON.parse(txt.replace(/```json|```/g,"").trim()) }
  catch { throw new Error("Falha ao interpretar resposta. Tente novamente.") }
}

// ── TRELLO ────────────────────────────────────────────────────────────────────
const BASE = "https://api.trello.com/1"
const tGet  = async (path,key,token) => { const r=await fetch(`${BASE}${path}?key=${key}&token=${token}`); if(!r.ok) throw new Error(await r.text()); return r.json() }
const tPost = async (path,key,token,body) => { const p=new URLSearchParams({key,token,...body}); const r=await fetch(`${BASE}${path}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:p}); if(!r.ok) throw new Error(await r.text()); return r.json() }

function buildTrelloCard(p) {
  const rc = p.recomendacao||"—"
  const score = (p.score_total||0).toFixed(1)
  const emoji = rc==="COMPRAR"?"🟢":rc==="AGUARDAR"?"🟡":"🔴"
  const desc = `## ${emoji} ${rc} — Score ${score}/10

**Endereço:** ${p.endereco||"—"}
**Tipo:** ${p.tipo||"—"} · ${p.area_m2||"—"}m² · ${p.quartos||"—"} quartos · ${p.vagas||"—"} vagas

---

### 💰 Valores
- **Avaliação:** ${fmtC(p.valor_avaliacao)}
- **Lance mínimo:** ${fmtC(p.valor_minimo)}
- **Desconto:** ${p.desconto_percentual||"—"}%
- **Preço/m² imóvel:** R$ ${p.preco_m2_imovel||"—"}/m²
- **Preço/m² mercado:** R$ ${p.preco_m2_mercado||"—"}/m²

---

### ⚖️ Jurídico
- **Processos:** ${p.processos_ativos||"—"}
- **Matrícula:** ${p.matricula_status||"—"}
- **Déb. condomínio:** ${p.debitos_condominio||"—"}
- **Déb. IPTU:** ${p.debitos_iptu||"—"}
${p.obs_juridicas?`\n${p.obs_juridicas}`:""}

---

### 📊 Scores
| Dimensão | Score | Peso |
|---|---|---|
| Localização | ${p.score_localizacao||0}/10 | 20% |
| Desconto | ${p.score_desconto||0}/10 | 18% |
| Jurídico | ${p.score_juridico||0}/10 | 18% |
| Ocupação | ${p.score_ocupacao||0}/10 | 15% |
| Liquidez | ${p.score_liquidez||0}/10 | 15% |
| Mercado | ${p.score_mercado||0}/10 | 14% |
| **TOTAL** | **${score}/10** | |

---

### 📈 Retorno
- **Revenda:** +${p.retorno_venda_pct||"—"}%
- **Locação a.a.:** ${p.retorno_locacao_anual_pct||"—"}%
- **Custo regularização:** ${fmtC(p.custo_regularizacao)}
- **Custo reforma:** ${fmtC(p.custo_reforma)}
- **Estrutura recomendada:** ${p.estrutura_recomendada||"—"}

---

### ✅ Pontos Positivos
${(p.positivos||[]).map(x=>`- ${x}`).join("\n")||"—"}

### ⚠️ Pontos de Atenção
${(p.negativos||[]).map(x=>`- ${x}`).join("\n")||"—"}

### 🚨 Alertas
${(p.alertas||[]).map(x=>`- ${x}`).join("\n")||"Nenhum"}

---

### 💬 Justificativa
${p.justificativa||"—"}

---
*Analisado por LEILAX · ${new Date().toLocaleDateString("pt-BR")}*
${p.fonte_url?`\n🔗 ${p.fonte_url}`:""}`

  return { name:`${emoji} [${score}] ${p.titulo||p.tipo||"Imóvel"} — ${p.cidade||""}`, desc }
}

// ── TRELLO CONFIG MODAL ───────────────────────────────────────────────────────
function TrelloModal({config,onSave,onClose}) {
  const [key,setKey]=useState(config?.key||"")
  const [token,setToken]=useState(config?.token||"")
  const [boards,setBoards]=useState([])
  const [boardId,setBoardId]=useState(config?.boardId||"")
  const [lists,setLists]=useState([])
  const [listId,setListId]=useState(config?.listId||"")
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState("")
  const [step,setStep]=useState(config?.token?2:1)

  const connect = async () => {
    if(!key.trim()||!token.trim()){setError("Informe a chave e o token");return}
    setLoading(true);setError("")
    try { const b=await tGet("/members/me/boards?fields=id,name",key.trim(),token.trim()); setBoards(b);setStep(2) }
    catch(e){setError(e.message)}
    setLoading(false)
  }

  const fetchLists = async (bid) => {
    setBoardId(bid);setLists([]);setListId("")
    if(!bid)return
    setLoading(true)
    try { const l=await tGet(`/boards/${bid}/lists?fields=id,name`,key,token); setLists(l); if(l.length)setListId(l[0].id) }
    catch(e){setError(e.message)}
    setLoading(false)
  }

  const save = () => {
    if(!key||!token||!boardId||!listId){setError("Preencha todos os campos");return}
    onSave({key,token,boardId,listId,boardName:boards.find(b=>b.id===boardId)?.name||"",listName:lists.find(l=>l.id===listId)?.name||""})
  }

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}>
    <div style={{background:K.s1,border:`1px solid ${K.bd}`,borderRadius:"10px",padding:"28px",maxWidth:"480px",width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
        <div>
          <div style={{fontWeight:"700",fontSize:"16px",color:K.wh}}>🔷 Configurar Trello</div>
          <div style={{fontSize:"11px",color:K.t3,marginTop:"2px"}}>Conecte ao seu board para envio automático</div>
        </div>
        <button style={btn("s")} onClick={onClose}>✕</button>
      </div>

      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>API Key</div>
        <input style={inp} placeholder="Sua API Key do Trello" value={key} onChange={e=>setKey(e.target.value)}/>
        <div style={{fontSize:"10.5px",color:K.t3,marginTop:"4px"}}>Obtenha em: <a href="https://trello.com/app-key" target="_blank" rel="noopener noreferrer" style={{color:K.blue}}>trello.com/app-key</a></div>
      </div>
      <div style={{marginBottom:"16px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Token</div>
        <input style={inp} placeholder="Token de acesso" value={token} onChange={e=>setToken(e.target.value)}/>
        <div style={{fontSize:"10.5px",color:K.t3,marginTop:"4px"}}>Na mesma página, clique em "Token" e autorize</div>
      </div>

      {step===1&&<button style={btn("trello")} onClick={connect} disabled={loading}>{loading?"Conectando...":"Conectar ao Trello →"}</button>}

      {step===2&&boards.length>0&&<>
        <div style={{marginBottom:"12px"}}>
          <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Board</div>
          <select style={{...inp,cursor:"pointer"}} value={boardId} onChange={e=>fetchLists(e.target.value)}>
            <option value="">— Selecione o board —</option>
            {boards.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {lists.length>0&&<div style={{marginBottom:"18px"}}>
          <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Lista de Destino</div>
          <select style={{...inp,cursor:"pointer"}} value={listId} onChange={e=>setListId(e.target.value)}>
            {lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>}
        <div style={{display:"flex",gap:"10px"}}>
          <button style={btn("trello")} onClick={save} disabled={!listId}>💾 Salvar</button>
          <button style={btn("s")} onClick={()=>setStep(1)}>← Voltar</button>
        </div>
      </>}

      {error&&<div style={{background:`${K.red}15`,border:`1px solid ${K.red}40`,borderRadius:"6px",padding:"10px",marginTop:"12px",fontSize:"12px",color:K.red}}>⚠️ {error}</div>}
    </div>
  </div>
}

// ── API KEY MODAL ─────────────────────────────────────────────────────────────
function ApiKeyModal({onClose}) {
  const [key,setKey]=useState(localStorage.getItem("leilax-api-key")||"")
  const save=()=>{localStorage.setItem("leilax-api-key",key.trim());onClose()}
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}>
    <div style={{background:K.s1,border:`1px solid ${K.bd}`,borderRadius:"10px",padding:"28px",maxWidth:"480px",width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px"}}>
        <div>
          <div style={{fontWeight:"700",fontSize:"16px",color:K.wh}}>🔑 API Key Anthropic</div>
          <div style={{fontSize:"11px",color:K.t3,marginTop:"2px"}}>Necessária para análise com IA</div>
        </div>
        <button style={btn("s")} onClick={onClose}>✕</button>
      </div>
      <div style={{marginBottom:"8px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Chave da API</div>
        <input style={inp} type="password" placeholder="sk-ant-..." value={key} onChange={e=>setKey(e.target.value)}/>
      </div>
      <div style={{fontSize:"11px",color:K.t3,marginBottom:"18px"}}>
        Obtenha em: <a href="https://console.anthropic.com/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{color:K.blue}}>console.anthropic.com</a>
      </div>
      <div style={{background:`${K.amb}10`,border:`1px solid ${K.amb}30`,borderRadius:"6px",padding:"12px",marginBottom:"16px",fontSize:"11.5px",color:K.amb}}>
        ⚠️ A chave fica salva apenas no seu navegador (localStorage). Nunca é enviada para nenhum servidor externo além da Anthropic.
      </div>
      <button style={btn()} onClick={save}>💾 Salvar</button>
    </div>
  </div>
}

// ── NOVO IMÓVEL ───────────────────────────────────────────────────────────────
function NovoImovel({onSave,onCancel,trello}) {
  const [url,setUrl]=useState("")
  const [loading,setLoading]=useState(false)
  const [step,setStep]=useState("")
  const [error,setError]=useState("")
  const [trelloMsg,setTrelloMsg]=useState("")

  const analyze = async () => {
    if(!url.trim()){setError("Cole o link do leilão");return}
    const hasKey = localStorage.getItem("leilax-api-key")
    if(!hasKey){setError("Configure a chave da API Anthropic nas Configurações (⚙️)");return}
    setLoading(true);setError("");setTrelloMsg("")
    setStep("🔍 Buscando informações do imóvel...")
    try {
      setStep("🧠 IA analisando: score, risco jurídico, mercado...")
      const openaiKey = localStorage.getItem("leilax-openai-key") || ""
        const data = await analisarImovelCompleto(url.trim(), hasKey, openaiKey, parametrosBanco, criteriosBanco, (msg) => setStep(msg))
      data.fonte_url = url.trim()
      const property = {...data, id:uid(), createdAt:new Date().toISOString()}
      if(trello?.listId) {
        setStep("🔷 Enviando para o Trello...")
        try {
          const cd = buildTrelloCard(property)
          await tPost("/cards",trello.key,trello.token,{idList:trello.listId,name:cd.name,desc:cd.desc})
          setTrelloMsg("✓ Card criado no Trello")
        } catch(e){ setTrelloMsg(`⚠️ Salvo no app, erro Trello: ${e.message}`) }
      }
      onSave(property)
    } catch(e){ setError(e.message||"Erro na análise.") }
    setLoading(false);setStep("")
  }

  return <div>
    <Hdr title="Analisar Imóvel" sub="Cole o link do leilão — IA busca e analisa tudo automaticamente"/>
    <div style={{padding:"24px 28px",maxWidth:"640px"}}>
      {trello?.listId
        ?<div style={{background:`${K.trello}15`,border:`1px solid ${K.trello}40`,borderRadius:"7px",padding:"12px 16px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"18px"}}>🔷</span>
          <div><div style={{fontSize:"12.5px",color:K.wh,fontWeight:"600"}}>Trello conectado</div>
          <div style={{fontSize:"11px",color:K.t3}}>{trello.boardName} → {trello.listName}</div></div>
          <span style={{marginLeft:"auto",fontSize:"9px",background:`${K.grn}20`,color:K.grn,padding:"2px 8px",borderRadius:"3px",fontWeight:"700"}}>ATIVO</span>
        </div>
        :<div style={{background:`${K.amb}10`,border:`1px solid ${K.amb}30`,borderRadius:"7px",padding:"12px 16px",marginBottom:"18px",fontSize:"12px",color:K.amb}}>
          ⚠️ Trello não configurado. Configure em <b>⚙️ Config</b> na barra lateral.
        </div>}

      <div style={{marginBottom:"16px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}}>Link do Leilão *</div>
        <input style={{...inp,fontSize:"14px"}} placeholder="https://venda-imoveis.caixa.gov.br/..." value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")analyze()}}/>
        <div style={{fontSize:"11px",color:K.t3,marginTop:"5px"}}>Portal CAIXA, sites de leiloeiros, qualquer anúncio público</div>
      </div>

      {error&&<div style={{background:`${K.red}15`,border:`1px solid ${K.red}40`,borderRadius:"6px",padding:"12px",marginBottom:"14px",fontSize:"12.5px",color:K.red}}>⚠️ {error}</div>}
      {trelloMsg&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"6px",padding:"10px",marginBottom:"14px",fontSize:"12px",color:K.teal}}>{trelloMsg}</div>}

      {loading&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"7px",padding:"16px",marginBottom:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:K.teal,animation:"pulse 1s infinite",flexShrink:0}}/>
          <div style={{fontSize:"13px",color:K.teal,fontWeight:"600"}}>{step}</div>
        </div>
        <div style={{fontSize:"11px",color:K.t3,marginTop:"6px"}}>Pode levar 20-40 segundos...</div>
      </div>}

      <div style={{display:"flex",gap:"10px"}}>
        <button style={btn()} onClick={analyze} disabled={loading}>{loading?"⏳ Analisando...":"🔍 Analisar Imóvel"}</button>
        <button style={btn("s")} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  </div>
}

// ── PROPERTY CARD ─────────────────────────────────────────────────────────────
function PropCard({p,onNav}) {
  const sc=p.score_total||0, rc=recColor(p.recomendacao)
  return <div onClick={()=>onNav("detail",{id:p.id})}
    style={{...card(),cursor:"pointer",transition:"all .15s"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=K.teal;e.currentTarget.style.transform="translateY(-2px)"}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=K.bd;e.currentTarget.style.transform="none"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:"600",fontSize:"13px",color:K.wh,marginBottom:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.titulo||"Imóvel sem título"}</div>
        <div style={{fontSize:"10.5px",color:K.t3,marginBottom:"8px"}}>📍 {p.cidade}/{p.estado} · {p.tipo} · {p.area_m2?`${p.area_m2}m²`:"—"}</div>
        <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"10px"}}>
          <Bdg c={rc} ch={p.recomendacao||"—"}/>
          <Bdg c={p.ocupacao==="Desocupado"?K.grn:p.ocupacao==="Ocupado"?K.red:K.t3} ch={p.ocupacao||"—"}/>
          {p.financiavel&&<Bdg c={K.blue} ch="Financiável"/>}{p.analise_dupla_ia&&<span style={{fontSize:"9px",fontWeight:"700",background:"linear-gradient(135deg,rgba(0,229,187,0.2),rgba(16,163,127,0.2))",border:"1px solid rgba(0,229,187,0.35)",color:"#00E5BB",padding:"2px 8px",borderRadius:"4px",letterSpacing:".5px"}}>🤖 CLAUDE + GPT</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
          <div style={{background:K.s2,borderRadius:"5px",padding:"7px 10px"}}>
            <div style={{fontSize:"9px",color:K.t3,marginBottom:"2px"}}>MÍNIMO</div>
            <div style={{fontSize:"13px",fontWeight:"700",color:K.amb}}>{fmtC(p.valor_minimo)}</div>
          </div>
          <div style={{background:K.s2,borderRadius:"5px",padding:"7px 10px"}}>
            <div style={{fontSize:"9px",color:K.t3,marginBottom:"2px"}}>DESCONTO</div>
            <div style={{fontSize:"13px",fontWeight:"700",color:K.grn}}>{p.desconto_percentual?`${p.desconto_percentual}%`:"—"}</div>
          </div>
        </div>
      </div>
      <ScoreRing score={sc} size={70}/>
    </div>
    <div style={{fontSize:"10px",color:K.t3,marginTop:"10px",borderTop:`1px solid ${K.bd}`,paddingTop:"8px"}}>{fmtD(p.createdAt)} · {p.modalidade||"—"}</div>
  </div>
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({props,onNav}) {
  const total=props.length, comprar=props.filter(p=>p.recomendacao==="COMPRAR").length
  const forte=props.filter(p=>(p.score_total||0)>=7.5).length
  const avg=total?(props.reduce((s,p)=>s+(p.score_total||0),0)/total).toFixed(1):"—"
  const recentes=[...props].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6)
  return <div>
    <Hdr title="Dashboard LEILAX" sub={`${total} imóvel(is) analisado(s)`} actions={<button style={btn()} onClick={()=>onNav("novo")}>+ Analisar Imóvel</button>}/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
        {[{l:"Analisados",v:total,c:K.blue},{l:"Score Médio",v:avg,c:K.teal},{l:"Comprar",v:comprar,c:K.grn},{l:"Score Forte",v:forte,c:K.gold}].map(k=>(
          <div key={k.l} style={{background:`${k.c}12`,border:`1px solid ${k.c}30`,borderRadius:"8px",padding:"16px"}}>
            <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>{k.l}</div>
            <div style={{fontFamily:"monospace",fontSize:"30px",fontWeight:"800",color:k.c}}>{k.v}</div>
          </div>
        ))}
      </div>
      {total===0
        ?<div style={{textAlign:"center",padding:"60px 20px",color:K.t3}}>
          <div style={{fontSize:"48px",marginBottom:"16px"}}>🏠</div>
          <div style={{fontSize:"15px",marginBottom:"8px",color:K.t2}}>Nenhum imóvel analisado ainda</div>
          <div style={{fontSize:"12px",marginBottom:"24px"}}>Cole o link de um leilão para começar</div>
          <button style={btn()} onClick={()=>onNav("novo")}>Analisar Primeiro Imóvel</button>
        </div>
        :<><div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>Análises Recentes</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px"}}>
          {recentes.map(p=><PropCard key={p.id} p={p} onNav={onNav}/>)}
        </div></>}
    </div>
  </div>
}

// ── DETAIL ────────────────────────────────────────────────────────────────────
function Detail({p,onDelete,onNav,trello}) {
  const [sending,setSending]=useState(false)
  const [msg,setMsg]=useState("")
  if(!p) return <div style={{padding:"40px",textAlign:"center",color:K.t3}}>Não encontrado</div>
  const sc=p.score_total||0, rc=recColor(p.recomendacao)
  const scores=[
    {l:"Localização",v:p.score_localizacao,w:"20%"},{l:"Desconto",v:p.score_desconto,w:"18%"},
    {l:"Jurídico",v:p.score_juridico,w:"18%"},{l:"Ocupação",v:p.score_ocupacao,w:"15%"},
    {l:"Liquidez",v:p.score_liquidez,w:"15%"},{l:"Mercado",v:p.score_mercado,w:"14%"},
  ]
  const sendTrello=async()=>{
    if(!trello?.listId){setMsg("Trello não configurado");return}
    setSending(true);setMsg("")
    try { const cd=buildTrelloCard(p); await tPost("/cards",trello.key,trello.token,{idList:trello.listId,name:cd.name,desc:cd.desc}); setMsg("✓ Card enviado ao Trello!") }
    catch(e){setMsg(`Erro: ${e.message}`)}
    setSending(false)
  }
  return <div>
    <Hdr title={p.titulo||"Imóvel"} sub={`${p.cidade}/${p.estado} · ${fmtD(p.createdAt)}`}
      actions={<>
        {p.fonte_url&&<a href={p.fonte_url} target="_blank" rel="noopener noreferrer" style={{...btn("s"),textDecoration:"none",display:"inline-block"}}>🔗 Anúncio</a>}
        <button style={btn("trello")} onClick={sendTrello} disabled={sending}>{sending?"Enviando...":"🔷 Trello"}</button>
        <button style={{...btn("d"),padding:"5px 12px",fontSize:"12px"}} onClick={()=>{if(confirm("Excluir?"))onDelete(p.id)}}>🗑</button>
      </>}/>
    <div style={{padding:"20px 28px"}}>
      {msg&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"6px",padding:"10px",marginBottom:"14px",fontSize:"12px",color:K.teal}}>{msg}</div>}
      <div style={{background:`${rc}10`,border:`1px solid ${rc}30`,borderRadius:"10px",padding:"20px",marginBottom:"16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
          <ScoreRing score={sc} size={90}/>
          <div>
            <div style={{fontSize:"11px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"}}>Recomendação</div>
            <div style={{fontSize:"28px",fontWeight:"800",color:rc}}>{p.recomendacao||"—"}</div>
            <div style={{fontSize:"12px",color:K.t2,marginTop:"4px",maxWidth:"400px"}}>{p.justificativa}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          <Bdg c={p.ocupacao==="Desocupado"?K.grn:K.red} ch={p.ocupacao||"—"}/>
          <Bdg c={p.financiavel?K.blue:K.t3} ch={p.financiavel?"Financiável":"Sem financ."}/>
          {p.fgts_aceito&&<Bdg c={K.pur} ch="FGTS"/>}
          <Bdg c={K.t3} ch={p.modalidade||"—"}/>
        </div>
      </div>
      {p.alertas?.length>0&&<div style={{background:`${K.red}10`,border:`1px solid ${K.red}30`,borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"11px",color:K.red,fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>🚨 Alertas Críticos</div>
        {p.alertas.map((a,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"4px"}}>• {a}</div>)}
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>💰 Valores</div>
          {[["Avaliação",fmtC(p.valor_avaliacao),K.t2],["Lance mínimo",fmtC(p.valor_minimo),K.amb],["Desconto",p.desconto_percentual?`${p.desconto_percentual}%`:"—",K.grn],["Preço/m² imóvel",p.preco_m2_imovel?`R$ ${p.preco_m2_imovel}/m²`:"—",K.teal],["Preço/m² mercado",p.preco_m2_mercado?`R$ ${p.preco_m2_mercado}/m²`:"—",K.t2],["Aluguel estimado",fmtC(p.aluguel_mensal_estimado)+"/mês",K.pur]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",fontWeight:"600",color:c}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>🏠 Ficha Técnica</div>
          {[["Tipo",p.tipo],["Área",p.area_m2?`${p.area_m2}m²`:"—"],["Quartos",p.quartos],["Vagas",p.vagas],["Leiloeiro",p.leiloeiro],["Data leilão",p.data_leilao],["Liquidez",p.liquidez],["Revenda est.",p.prazo_revenda_meses?`${p.prazo_revenda_meses} meses`:"—"]].filter(([,v])=>v&&v!=="—"&&v!=="0").map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",color:K.tx}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{...card(),marginBottom:"14px"}}>
        <div style={{fontWeight:"600",color:K.wh,marginBottom:"14px",fontSize:"13px"}}>📊 Score por Dimensão</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
          {scores.map(({l,v,w})=>(
            <div key={l} style={{background:K.s2,borderRadius:"6px",padding:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"11px",color:K.t3}}>{l}</span>
                <span style={{fontSize:"10px",color:K.t3}}>peso {w}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <div style={{flex:1,height:"6px",background:K.bd,borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{width:`${(v||0)*10}%`,height:"100%",background:scoreColor(v||0),borderRadius:"3px"}}/>
                </div>
                <span style={{fontSize:"13px",fontWeight:"700",color:scoreColor(v||0),minWidth:"28px",textAlign:"right"}}>{(v||0).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>⚖️ Jurídico</div>
          {[["Processos",p.processos_ativos,{Nenhum:K.grn,Possível:K.amb,Confirmado:K.red,Desconhecido:K.t3}],
            ["Matrícula",p.matricula_status,{Limpa:K.grn,"Com ônus":K.red,Desconhecido:K.t3}],
            ["Déb. condomínio",p.debitos_condominio,{"Sem débitos":K.grn,"Com débitos":K.red,Desconhecido:K.t3}],
            ["Déb. IPTU",p.debitos_iptu,{"Sem débitos":K.grn,"Com débitos":K.red,Desconhecido:K.t3}]].map(([l,v,cs])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`,alignItems:"center"}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span>
              <span style={{fontSize:"12px",fontWeight:"600",color:cs?.[v]||K.t2}}>{v||"—"}</span>
            </div>
          ))}
          {p.obs_juridicas&&<div style={{marginTop:"10px",fontSize:"11.5px",color:K.t2,lineHeight:"1.6",background:K.s2,borderRadius:"5px",padding:"8px"}}>{p.obs_juridicas}</div>}
        </div>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>📈 Retorno e Custos</div>
          {[["Custo regularização",fmtC(p.custo_regularizacao),K.amb],["Custo reforma",fmtC(p.custo_reforma),K.amb],["Retorno revenda",p.retorno_venda_pct?`+${p.retorno_venda_pct}%`:"—",K.grn],["Locação a.a.",p.retorno_locacao_anual_pct?`${p.retorno_locacao_anual_pct}%`:"—",K.teal],["Estrutura rec.",p.estrutura_recomendada,K.pur],["Tendência",p.mercado_tendencia,p.mercado_tendencia==="Alta"?K.grn:K.amb],["Demanda",p.mercado_demanda,p.mercado_demanda==="Alta"?K.grn:K.amb]].filter(([,v])=>v&&v!=="—").map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",fontWeight:"600",color:c}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      {(p.positivos?.length>0||p.negativos?.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={{...card(),borderTop:`2px solid ${K.grn}`}}>
          <div style={{fontWeight:"600",color:K.grn,marginBottom:"10px",fontSize:"13px"}}>✅ Pontos Positivos</div>
          {(p.positivos||[]).map((pt,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"6px",display:"flex",gap:"8px"}}><span style={{color:K.grn}}>+</span>{pt}</div>)}
        </div>
        <div style={{...card(),borderTop:`2px solid ${K.red}`}}>
          <div style={{fontWeight:"600",color:K.red,marginBottom:"10px",fontSize:"13px"}}>⚠️ Pontos de Atenção</div>
          {(p.negativos||[]).map((pt,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"6px",display:"flex",gap:"8px"}}><span style={{color:K.red}}>−</span>{pt}</div>)}
        </div>
      </div>}
      {p.endereco&&<div style={{...card(),marginBottom:"14px"}}><div style={{fontWeight:"600",color:K.wh,marginBottom:"6px",fontSize:"13px"}}>📍 Localização</div><div style={{fontSize:"13px",color:K.t2}}>{p.endereco}</div></div>}
    </div>
  </div>
}

// ── LISTA ─────────────────────────────────────────────────────────────────────
function Lista({props,onNav,onDelete}) {
  const [q,setQ]=useState(""), [filter,setFilter]=useState("todos"), [sort,setSort]=useState("score")
  let list=[...props]
  if(q) list=list.filter(p=>`${p.titulo} ${p.cidade} ${p.tipo}`.toLowerCase().includes(q.toLowerCase()))
  if(filter!=="todos") list=list.filter(p=>p.recomendacao===filter.toUpperCase())
  list.sort((a,b)=>sort==="score"?(b.score_total||0)-(a.score_total||0):sort==="desconto"?(b.desconto_percentual||0)-(a.desconto_percentual||0):sort==="valor"?(a.valor_minimo||0)-(b.valor_minimo||0):new Date(b.createdAt)-new Date(a.createdAt))
  return <div>
    <Hdr title="Imóveis" sub={`${props.length} total · ${list.length} filtrado(s)`} actions={<button style={btn()} onClick={()=>onNav("novo")}>+ Novo</button>}/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"flex",gap:"10px",marginBottom:"16px",flexWrap:"wrap"}}>
        <input style={{...inp,maxWidth:"260px"}} placeholder="🔍 Buscar..." value={q} onChange={e=>setQ(e.target.value)}/>
        <select style={{...inp,width:"auto",cursor:"pointer"}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="todos">Todos</option><option value="comprar">Comprar</option><option value="aguardar">Aguardar</option><option value="evitar">Evitar</option>
        </select>
        <select style={{...inp,width:"auto",cursor:"pointer"}} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="score">Maior Score</option><option value="desconto">Maior Desconto</option><option value="valor">Menor Valor</option><option value="data">Mais Recente</option>
        </select>
      </div>
      {list.length===0?<div style={{textAlign:"center",padding:"40px",color:K.t3}}><div style={{fontSize:"32px",marginBottom:"10px"}}>🔍</div><div>Nenhum imóvel encontrado</div></div>
      :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px"}}>
        {list.map(p=><PropCard key={p.id} p={p} onNav={onNav}/>)}
      </div>}
    </div>
  </div>
}

// ── COMPARATIVO ───────────────────────────────────────────────────────────────
function Comparativo({props}) {
  const [sel,setSel]=useState([])
  const top=[...props].sort((a,b)=>(b.score_total||0)-(a.score_total||0)).slice(0,8)
  const cmp=props.filter(p=>sel.includes(p.id))
  const toggle=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):s.length<3?[...s,id]:s)
  const dims=[["Score Total",p=>(p.score_total||0).toFixed(1),p=>scoreColor(p.score_total)],["Recomendação",p=>p.recomendacao,p=>recColor(p.recomendacao)],["Valor Mínimo",p=>fmtC(p.valor_minimo),()=>K.t2],["Desconto",p=>p.desconto_percentual?`${p.desconto_percentual}%`:"—",()=>K.grn],["Área",p=>p.area_m2?`${p.area_m2}m²`:"—",()=>K.t2],["Preço/m²",p=>p.preco_m2_imovel?`R$ ${p.preco_m2_imovel}`:"—",()=>K.t2],["Ocupação",p=>p.ocupacao,p=>p.ocupacao==="Desocupado"?K.grn:K.red],["Processos",p=>p.processos_ativos,p=>p.processos_ativos==="Nenhum"?K.grn:K.red],["Financiável",p=>p.financiavel?"Sim":"Não",p=>p.financiavel?K.grn:K.t3],["Retorno revenda",p=>p.retorno_venda_pct?`+${p.retorno_venda_pct}%`:"—",()=>K.grn]]
  return <div>
    <Hdr title="Comparativo" sub="Selecione até 3 imóveis"/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"20px"}}>
        {top.map(p=><div key={p.id} onClick={()=>toggle(p.id)} style={{background:sel.includes(p.id)?`${K.teal}15`:K.s2,border:`1px solid ${sel.includes(p.id)?K.teal:K.bd}`,borderRadius:"6px",padding:"7px 12px",cursor:"pointer",fontSize:"12px",color:K.tx}}>
          {sel.includes(p.id)?"✓ ":""}{(p.titulo||"Imóvel").slice(0,26)} <span style={{color:scoreColor(p.score_total)}}>({(p.score_total||0).toFixed(1)})</span>
        </div>)}
      </div>
      {cmp.length>=2?<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12.5px"}}>
          <thead><tr>
            <th style={{padding:"10px 14px",background:K.s2,color:K.t3,textAlign:"left",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",borderBottom:`1px solid ${K.bd}`,minWidth:"130px"}}>Dimensão</th>
            {cmp.map(p=><th key={p.id} style={{padding:"10px 14px",background:K.s2,color:K.wh,textAlign:"center",borderBottom:`1px solid ${K.bd}`,minWidth:"180px"}}>
              <div style={{fontSize:"11.5px",marginBottom:"6px"}}>{(p.titulo||"Imóvel").slice(0,22)}</div>
              <ScoreRing score={p.score_total} size={44}/>
            </th>)}
          </tr></thead>
          <tbody>{dims.map(([label,getValue,getColor],i)=>(
            <tr key={label} style={{background:i%2===0?K.s1:K.bg2}}>
              <td style={{padding:"8px 14px",color:K.t3,borderBottom:`1px solid ${K.bd}`}}>{label}</td>
              {cmp.map(p=><td key={p.id} style={{padding:"8px 14px",textAlign:"center",borderBottom:`1px solid ${K.bd}`,color:getColor(p),fontWeight:"600"}}>{getValue(p)||"—"}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>:<div style={{textAlign:"center",padding:"40px",color:K.t3}}><div style={{fontSize:"28px",marginBottom:"10px"}}>⚖️</div><div>Selecione pelo menos 2 imóveis acima</div></div>}
    </div>
  </div>
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const { session, profile, loading: authLoading, isAdmin } = useAuth()
  if (authLoading) return <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#080B10',justifyContent:'center',alignItems:'center',color:'#00E5BB',fontFamily:'system-ui',fontSize:'16px',fontWeight:'700'}}>⏳ Carregando...</div>
  if (!session) return <Login />
  if (profile && !profile.ativo) return <div style={{display:'flex',height:'100vh',background:'#080B10',justifyContent:'center',alignItems:'center',color:'#FF4757',fontFamily:'system-ui',flexDirection:'column',gap:'12px'}}><div>🚫</div><div style={{fontSize:'16px',fontWeight:'700'}}>Acesso desativado</div><div style={{fontSize:'13px',color:'#3D4E6A'}}>Contate o administrador</div></div>
  const [view,setView]=useState("dashboard")
  const [vp,setVp]=useState({})
  const [props,setProps]=useState([])
  const [loaded,setL]=useState(false)
  const [toast,setToast]=useState(null)
  const [trello,setTrello]=useState(null)
  const [showTrello,setShowTrello]=useState(false)
  const [showApiKey,setShowApiKey]=useState(false)
const [parametrosBanco,setParametrosBanco]=useState([])
const [criteriosBanco,setCriteriosBanco]=useState([])
  const apiOk = localStorage.getItem("leilax-api-key")
useEffect(()=>{async function lp(){try{const{data:pr}=await supabase.from("parametros_score").select("*");if(pr)setParametrosBanco(pr);const{data:cr}=await supabase.from("criterios_avaliacao").select("*");if(cr)setCriteriosBanco(cr)}catch(e){console.warn("parametros:",e)}}lp()},[])

  const showToast=(msg,c)=>{setToast({msg,c:c||K.teal});setTimeout(()=>setToast(null),4500)}
  const nav=(v,p={})=>{setView(v);setVp(p)}

  useEffect(()=>{(async()=>{
    const [p,t]=await Promise.all([stLoad("leilax-props"),stLoad("leilax-trello")])
    if(p)setProps(p); if(t)setTrello(t); setL(true)
    // Mostrar modal de API key se não tiver
    if(!localStorage.getItem("leilax-api-key")) setTimeout(()=>setShowApiKey(true),1000)
  })()},[])

  useEffect(()=>{if(loaded)stSave("leilax-props",props)},[props,loaded])
  useEffect(()=>{if(loaded&&trello)stSave("leilax-trello",trello)},[trello,loaded])

  const addProp=p=>{
    setProps(ps=>[p,...ps])
    showToast(`✓ ${p.titulo||"Imóvel"} — Score ${(p.score_total||0).toFixed(1)} · ${p.recomendacao}`)
    nav("detail",{id:p.id})
  }
  const delProp=id=>{setProps(ps=>ps.filter(p=>p.id!==id));showToast("Excluído",K.red);nav("imoveis")}
  const saveTrello=cfg=>{setTrello(cfg);setShowTrello(false);showToast("✓ Trello configurado — "+cfg.boardName,K.trello)}

  const navItems=[
    {i:'🏠',l:'Dashboard',v:'dashboard'},
    {i:'🔍',l:'Analisar',v:'novo'},
    {i:'🤖',l:'Busca GPT',v:'busca'},
    {i:'📋',l:'Imóveis',v:'imoveis'},
    {i:'📊',l:'Gráficos',v:'graficos'},
    {i:'⚖️',l:'Comparar',v:'comparar'},
    {i:'✅',l:'Tarefas',v:'tarefas'},
    ...(isAdmin?[{i:'🛡️',l:'Admin',v:'admin'}]:[]),
  ]
  const isAct=v=>view===v||(v==="imoveis"&&view==="detail")
  const selP=vp.id?props.find(p=>p.id===vp.id):null

  if(!loaded) return <div style={{display:"flex",height:"100vh",background:K.bg,justifyContent:"center",alignItems:"center",flexDirection:"column",gap:"12px",fontFamily:"system-ui"}}>
    <div style={{fontSize:"32px"}}>🏠</div>
    <div style={{color:K.teal,fontWeight:"700",fontSize:"16px"}}>Carregando LEILAX...</div>
  </div>

  return <div style={{display:"flex",height:"100vh",background:K.bg,color:K.tx,fontFamily:"'DM Sans',system-ui,sans-serif",fontSize:"14px",overflow:"hidden"}}>
    <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${K.bg};}::-webkit-scrollbar-thumb{background:${K.bd2};border-radius:2px;}select option{background:${K.s1};}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}a:hover{opacity:.8;}`}</style>

    {showTrello&&<TrelloModal config={trello} onSave={saveTrello} onClose={()=>setShowTrello(false)}/>}
    {showApiKey&&<ApiKeyModal onClose={()=>setShowApiKey(false)}/>}

    {/* SIDEBAR */}
{/* RODAPE DA SIDEBAR */}
<div style={{flexShrink:0,padding:'8px',borderTop:'1px solid rgba(0,229,187,0.10)',display:'flex',flexDirection:'column',gap:'6px'}}>
{/* Trello */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer'}} onClick={()=>setShowTrello(true)}>
<div style={{display:'flex',alignItems:'center',gap:'7px'}}>
<span style={{fontSize:'13px'}}>🔷</span>
<div>
<div style={{fontSize:'11px',color:'#DDE4F0',fontWeight:600,lineHeight:1.2}}>Trello</div>
<div style={{fontSize:'9px',color:'#3D4E6A'}}>{trello?'Configurado':'Clique para configurar'}</div>
</div>
</div>
<span style={{fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'3px',background:trello?'rgba(0,229,187,0.15)':'rgba(255,71,87,0.15)',color:trello?'#00E5BB':'#FF4757',border:trello?'1px solid rgba(0,229,187,0.3)':'1px solid rgba(255,71,87,0.3)'}}>{trello?'ON':'OFF'}</span>
</div>
{/* API Key */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer'}} onClick={()=>setShowApiKey(true)}>
<div style={{display:'flex',alignItems:'center',gap:'7px'}}>
<span style={{fontSize:'13px'}}>⚙️</span>
<div style={{fontSize:'11px',color:'#DDE4F0',fontWeight:600}}>API Key</div>
</div>
<span style={{fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'3px',background:apiOk?'rgba(0,229,187,0.15)':'rgba(255,71,87,0.15)',color:apiOk?'#00E5BB':'#FF4757',border:apiOk?'1px solid rgba(0,229,187,0.3)':'1px solid rgba(255,71,87,0.3)'}}>{apiOk?'OK':'FALTA'}</span>
</div>
{/* Perfil + Sair */}
<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,71,87,0.06)',border:'1px solid rgba(255,71,87,0.15)'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'rgba(0,229,187,0.2)',border:'1px solid rgba(0,229,187,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#00E5BB',fontSize:'11px',flexShrink:0}}>{(profile?.nome||'U')[0].toUpperCase()}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:'11px',fontWeight:600,color:'#DDE4F0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.nome||'Usuário'}</div>
<div style={{fontSize:'9px',color:'#3D4E6A'}}>{isAdmin?'🛡️ Admin':'👤 Membro'}</div>
</div>
<div title="Sair" style={{fontSize:'16px',cursor:'pointer',color:'#FF4757',flexShrink:0,padding:'2px'}} onClick={async()=>{const{signOut}=await import('./lib/supabase.js');await signOut()}}>↩</div>
</div>
{/* Stats */}
<div style={{padding:'4px 10px',fontSize:'10px',color:'#3D4E6A',display:'flex',flexDirection:'column',gap:'2px'}}>
<div>🏠 {props.filter(p=>p.status==='analisado').length} analisados</div>
<div>✅ {props.filter(p=>p.recomendacao==='COMPRAR').length} para comprar</div>
<div>⭐ {props.filter(p=>(p.score_total||0)>=7).length} score forte</div>
</div>
</div>

    {/* CONTENT */}
    <div style={{flex:1,overflowY:"auto",background:K.bg,display:"flex",flexDirection:"column",minWidth:0}}>
      {view==="dashboard"&&<Dashboard props={props} onNav={nav}/>}
      {view==="novo"&&<NovoImovel onSave={addProp} onCancel={()=>nav("imoveis")} trello={trello}/>}
      {view==="imoveis"&&<Lista props={props} onNav={nav} onDelete={delProp}/>}
      {view==="detail"&&<Detail p={selP} onDelete={delProp} onNav={nav} trello={trello}/>}
      {view==="comparar"&&<Comparativo props={props}/>}
    {view==="busca"&&<BuscaGPT onAnalisar={(link)=>{nav("novo");setTimeout(()=>{},100)}}/>}
    {view==="graficos"&&<div><div style={{padding:"22px 28px 16px",borderBottom:`1px solid ${K.bd}`}}><div style={{fontWeight:700,fontSize:19,color:K.wh}}>📊 Gráficos</div></div><div style={{padding:"20px 28px"}}><Charts properties={props}/></div></div>}
    {view==="tarefas"&&<Tarefas/>}
    {view==="admin"&&isAdmin&&<AdminPanel/>}
    </div>

    {toast&&<div style={{position:"fixed",bottom:"16px",right:"16px",background:toast.c===K.trello?K.trello:toast.c,color:toast.c===K.teal||toast.c===K.trello?"#000":"#fff",padding:"12px 20px",borderRadius:"8px",fontSize:"13px",fontWeight:"600",zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,.6)",maxWidth:"340px"}}>{toast.msg}</div>}
    <MobileNav items={navItems} activeKey={view} onNavigate={(v)=>nav(v)}/>
  </div>
}
import { useState, useEffect, useRef } from "react"
import { stLoad, stSave } from "./storage.js"
import Charts from "./components/Charts.jsx"
import Timeline from "./components/Timeline.jsx"
import MobileNav from "./components/MobileNav.jsx"
import BuscaGPT from "./components/BuscaGPT.jsx"
import { useAuth } from "./lib/AuthContext.jsx"
import Login from "./pages/Login.jsx"
import { getImoveis, saveImovel, deleteImovel } from "./lib/supabase.js"
import Tarefas from "./pages/Tarefas.jsx"
import AdminPanel from "./pages/AdminPanel.jsx"
import { analisarImovelCompleto } from "./lib/dualAI.js"
    
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36)
const fmtD = d => d ? new Date(d).toLocaleDateString("pt-BR") : "â"
const fmtC = v => v ? `R$ ${Number(v).toLocaleString("pt-BR", {minimumFractionDigits:0})}` : "â"

const K = {
  bg:"#080B10", bg2:"#0C1018", s1:"#111620", s2:"#171E2C",
  bd:"#1C2438", bd2:"#232D42", teal:"#00E5BB", amb:"#F5A623",
  red:"#FF4757", blue:"#4A9EFF", pur:"#A78BFA", grn:"#2ECC71",
  gold:"#FFD700", tx:"#DDE4F0", t2:"#7A8BA8", t3:"#3D4E6A", wh:"#FFFFFF",
  trello:"#0052CC"
}

const scoreColor = s => s >= 7.5 ? K.grn : s >= 6 ? K.teal : s >= 4.5 ? K.amb : K.red
const scoreLabel = s => s >= 7.5 ? "FORTE" : s >= 6 ? "BOM" : s >= 4.5 ? "MÃDIO" : "FRACO"
const recColor = r => ({ COMPRAR: K.grn, AGUARDAR: K.amb, EVITAR: K.red })[r] || K.t3

const btn = (v="p") => ({
  background: v==="p"?K.teal:v==="d"?`${K.red}18`:v==="trello"?K.trello:K.s2,
  color: v==="p"?"#000":v==="d"?K.red:v==="trello"?"#fff":K.t2,
  border: v==="d"?`1px solid ${K.red}40`:"none",
  borderRadius:"6px", padding: v==="s"?"5px 12px":"9px 20px",
  fontSize: v==="s"?"11.5px":"13px", fontWeight:"600", cursor:"pointer", flexShrink:0
})
const inp = { background:K.s1, border:`1px solid ${K.bd}`, borderRadius:"6px", padding:"10px 14px", color:K.tx, fontSize:"13px", width:"100%", outline:"none" }
const card = (ac) => ({ background:K.s1, border:`1px solid ${ac||K.bd}`, borderRadius:"8px", padding:"18px" })
const Bdg = ({c,ch}) => <span style={{display:"inline-block",fontSize:"10px",fontWeight:"700",padding:"2px 8px",borderRadius:"4px",textTransform:"uppercase",letterSpacing:".5px",background:`${c}20`,color:c,border:`1px solid ${c}40`}}>{ch}</span>

function Hdr({title,sub,actions}) {
  return <div style={{padding:"22px 28px 16px",borderBottom:`1px solid ${K.bd}`,flexShrink:0}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px",flexWrap:"wrap"}}>
      <div>
        <div style={{fontWeight:"700",fontSize:"19px",color:K.wh,letterSpacing:"-0.3px"}}>{title}</div>
        {sub&&<div style={{fontSize:"11px",color:K.t3,marginTop:"3px"}}>{sub}</div>}
      </div>
      {actions&&<div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>{actions}</div>}
    </div>
  </div>
}

function ScoreRing({score,size=80}) {
  const c = scoreColor(score||0)
  const r = (size-10)/2
  const circ = 2*Math.PI*r
  const dash = ((score||0)/10)*circ
  return <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={K.s2} strokeWidth="8"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
    </svg>
    <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
      <div style={{fontSize:size>70?"18px":"13px",fontWeight:"800",color:c,lineHeight:1}}>{(score||0).toFixed(1)}</div>
      <div style={{fontSize:"8px",color:K.t3,textTransform:"uppercase",letterSpacing:".5px"}}>{scoreLabel(score||0)}</div>
    </div>
  </div>
}


// ââ AI ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages"

async function analyzeProperty(url) {
  const sys = `VocÃª Ã© LEILAX, especialista em anÃ¡lise de imÃ³veis em leilÃ£o para investimento imobiliÃ¡rio no Brasil. Use web search para buscar informaÃ§Ãµes sobre o imÃ³vel.

Retorne SOMENTE JSON vÃ¡lido sem markdown:
{
  "titulo":"","endereco":"","cidade":"","estado":"","tipo":"Apartamento|Casa|Terreno|Comercial",
  "area_m2":0,"quartos":0,"vagas":0,"andar":"","modalidade":"","leiloeiro":"",
  "data_leilao":"DD/MM/AAAA","valor_avaliacao":0,"valor_minimo":0,"desconto_percentual":0,
  "ocupacao":"Desocupado|Ocupado|Desconhecido","financiavel":true,"fgts_aceito":false,
  "debitos_condominio":"Sem dÃ©bitos|Com dÃ©bitos|Desconhecido",
  "debitos_iptu":"Sem dÃ©bitos|Com dÃ©bitos|Desconhecido",
  "processos_ativos":"Nenhum|PossÃ­vel|Confirmado|Desconhecido",
  "matricula_status":"Limpa|Com Ã´nus|Desconhecido",
  "obs_juridicas":"",
  "preco_m2_imovel":0,"preco_m2_mercado":0,"aluguel_mensal_estimado":0,
  "liquidez":"Alta|MÃ©dia|Baixa","prazo_revenda_meses":0,
  "positivos":[""],"negativos":[""],"alertas":[""],
  "recomendacao":"COMPRAR|AGUARDAR|EVITAR","justificativa":"",
  "estrutura_recomendada":"CPF Ãºnico|CondomÃ­nio voluntÃ¡rio|PJ",
  "custo_regularizacao":0,"custo_reforma":0,
  "retorno_venda_pct":0,"retorno_locacao_anual_pct":0,
  "mercado_tendencia":"Alta|EstÃ¡vel|Queda","mercado_demanda":"Alta|MÃ©dia|Baixa",
  "mercado_tempo_venda_meses":0,"mercado_obs":"",
  "score_localizacao":0,"score_desconto":0,"score_juridico":0,
  "score_ocupacao":0,"score_liquidez":0,"score_mercado":0,"score_total":0
}
Scores 0-10. score_total = mÃ©dia ponderada (loc 20%, desc 18%, jur 18%, ocup 15%, liq 15%, merc 14%).
Se score_juridico < 4 â score_total *= 0.75. Se ocupado â score_total *= 0.85.`

  const apiKey = localStorage.getItem("leilax-api-key") || ""
  if (!apiKey) throw new Error("Configure a chave da API Anthropic nas configuraÃ§Ãµes")

  const r = await fetch(ANTHROPIC_API, {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({
      model:"claude-sonnet-4-6", max_tokens:4000, system:sys,
      tools:[{type:"web_search_20250305",name:"web_search"}],
      messages:[{role:"user",content:`Analise o imÃ³vel em leilÃ£o: ${url}`}]
    })
  })
  const d = await r.json()
  if (d.error) throw new Error(d.error.message || "Erro na API")
  const txt = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n")
  try { return JSON.parse(txt.replace(/```json|```/g,"").trim()) }
  catch { throw new Error("Falha ao interpretar resposta. Tente novamente.") }
}

// ââ TRELLO ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const BASE = "https://api.trello.com/1"
const tGet  = async (path,key,token) => { const r=await fetch(`${BASE}${path}?key=${key}&token=${token}`); if(!r.ok) throw new Error(await r.text()); return r.json() }
const tPost = async (path,key,token,body) => { const p=new URLSearchParams({key,token,...body}); const r=await fetch(`${BASE}${path}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:p}); if(!r.ok) throw new Error(await r.text()); return r.json() }

function buildTrelloCard(p) {
  const rc = p.recomendacao||"â"
  const score = (p.score_total||0).toFixed(1)
  const emoji = rc==="COMPRAR"?"ð¢":rc==="AGUARDAR"?"ð¡":"ð´"
  const desc = `## ${emoji} ${rc} â Score ${score}/10

**EndereÃ§o:** ${p.endereco||"â"}
**Tipo:** ${p.tipo||"â"} Â· ${p.area_m2||"â"}mÂ² Â· ${p.quartos||"â"} quartos Â· ${p.vagas||"â"} vagas

---

### ð° Valores
- **AvaliaÃ§Ã£o:** ${fmtC(p.valor_avaliacao)}
- **Lance mÃ­nimo:** ${fmtC(p.valor_minimo)}
- **Desconto:** ${p.desconto_percentual||"â"}%
- **PreÃ§o/mÂ² imÃ³vel:** R$ ${p.preco_m2_imovel||"â"}/mÂ²
- **PreÃ§o/mÂ² mercado:** R$ ${p.preco_m2_mercado||"â"}/mÂ²

---

### âï¸ JurÃ­dico
- **Processos:** ${p.processos_ativos||"â"}
- **MatrÃ­cula:** ${p.matricula_status||"â"}
- **DÃ©b. condomÃ­nio:** ${p.debitos_condominio||"â"}
- **DÃ©b. IPTU:** ${p.debitos_iptu||"â"}
${p.obs_juridicas?`\n${p.obs_juridicas}`:""}

---

### ð Scores
| DimensÃ£o | Score | Peso |
|---|---|---|
| LocalizaÃ§Ã£o | ${p.score_localizacao||0}/10 | 20% |
| Desconto | ${p.score_desconto||0}/10 | 18% |
| JurÃ­dico | ${p.score_juridico||0}/10 | 18% |
| OcupaÃ§Ã£o | ${p.score_ocupacao||0}/10 | 15% |
| Liquidez | ${p.score_liquidez||0}/10 | 15% |
| Mercado | ${p.score_mercado||0}/10 | 14% |
| **TOTAL** | **${score}/10** | |

---

### ð Retorno
- **Revenda:** +${p.retorno_venda_pct||"â"}%
- **LocaÃ§Ã£o a.a.:** ${p.retorno_locacao_anual_pct||"â"}%
- **Custo regularizaÃ§Ã£o:** ${fmtC(p.custo_regularizacao)}
- **Custo reforma:** ${fmtC(p.custo_reforma)}
- **Estrutura recomendada:** ${p.estrutura_recomendada||"â"}

---

### â Pontos Positivos
${(p.positivos||[]).map(x=>`- ${x}`).join("\n")||"â"}

### â ï¸ Pontos de AtenÃ§Ã£o
${(p.negativos||[]).map(x=>`- ${x}`).join("\n")||"â"}

### ð¨ Alertas
${(p.alertas||[]).map(x=>`- ${x}`).join("\n")||"Nenhum"}

---

### ð¬ Justificativa
${p.justificativa||"â"}

---
*Analisado por LEILAX Â· ${new Date().toLocaleDateString("pt-BR")}*
${p.fonte_url?`\nð ${p.fonte_url}`:""}`

  return { name:`${emoji} [${score}] ${p.titulo||p.tipo||"ImÃ³vel"} â ${p.cidade||""}`, desc }
}

// ââ TRELLO CONFIG MODAL âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function TrelloModal({config,onSave,onClose}) {
  const [key,setKey]=useState(config?.key||"")
  const [token,setToken]=useState(config?.token||"")
  const [boards,setBoards]=useState([])
  const [boardId,setBoardId]=useState(config?.boardId||"")
  const [lists,setLists]=useState([])
  const [listId,setListId]=useState(config?.listId||"")
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState("")
  const [step,setStep]=useState(config?.token?2:1)

  const connect = async () => {
    if(!key.trim()||!token.trim()){setError("Informe a chave e o token");return}
    setLoading(true);setError("")
    try { const b=await tGet("/members/me/boards?fields=id,name",key.trim(),token.trim()); setBoards(b);setStep(2) }
    catch(e){setError(e.message)}
    setLoading(false)
  }

  const fetchLists = async (bid) => {
    setBoardId(bid);setLists([]);setListId("")
    if(!bid)return
    setLoading(true)
    try { const l=await tGet(`/boards/${bid}/lists?fields=id,name`,key,token); setLists(l); if(l.length)setListId(l[0].id) }
    catch(e){setError(e.message)}
    setLoading(false)
  }

  const save = () => {
    if(!key||!token||!boardId||!listId){setError("Preencha todos os campos");return}
    onSave({key,token,boardId,listId,boardName:boards.find(b=>b.id===boardId)?.name||"",listName:lists.find(l=>l.id===listId)?.name||""})
  }

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}>
    <div style={{background:K.s1,border:`1px solid ${K.bd}`,borderRadius:"10px",padding:"28px",maxWidth:"480px",width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
        <div>
          <div style={{fontWeight:"700",fontSize:"16px",color:K.wh}}>ð· Configurar Trello</div>
          <div style={{fontSize:"11px",color:K.t3,marginTop:"2px"}}>Conecte ao seu board para envio automÃ¡tico</div>
        </div>
        <button style={btn("s")} onClick={onClose}>â</button>
      </div>

      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>API Key</div>
        <input style={inp} placeholder="Sua API Key do Trello" value={key} onChange={e=>setKey(e.target.value)}/>
        <div style={{fontSize:"10.5px",color:K.t3,marginTop:"4px"}}>Obtenha em: <a href="https://trello.com/app-key" target="_blank" rel="noopener noreferrer" style={{color:K.blue}}>trello.com/app-key</a></div>
      </div>
      <div style={{marginBottom:"16px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Token</div>
        <input style={inp} placeholder="Token de acesso" value={token} onChange={e=>setToken(e.target.value)}/>
        <div style={{fontSize:"10.5px",color:K.t3,marginTop:"4px"}}>Na mesma pÃ¡gina, clique em "Token" e autorize</div>
      </div>

      {step===1&&<button style={btn("trello")} onClick={connect} disabled={loading}>{loading?"Conectando...":"Conectar ao Trello â"}</button>}

      {step===2&&boards.length>0&&<>
        <div style={{marginBottom:"12px"}}>
          <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Board</div>
          <select style={{...inp,cursor:"pointer"}} value={boardId} onChange={e=>fetchLists(e.target.value)}>
            <option value="">â Selecione o board â</option>
            {boards.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        {lists.length>0&&<div style={{marginBottom:"18px"}}>
          <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Lista de Destino</div>
          <select style={{...inp,cursor:"pointer"}} value={listId} onChange={e=>setListId(e.target.value)}>
            {lists.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>}
        <div style={{display:"flex",gap:"10px"}}>
          <button style={btn("trello")} onClick={save} disabled={!listId}>ð¾ Salvar</button>
          <button style={btn("s")} onClick={()=>setStep(1)}>â Voltar</button>
        </div>
      </>}

      {error&&<div style={{background:`${K.red}15`,border:`1px solid ${K.red}40`,borderRadius:"6px",padding:"10px",marginTop:"12px",fontSize:"12px",color:K.red}}>â ï¸ {error}</div>}
    </div>
  </div>
}

// ââ API KEY MODAL âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ApiKeyModal({onClose}) {
  const [key,setKey]=useState(localStorage.getItem("leilax-api-key")||"")
  const save=()=>{localStorage.setItem("leilax-api-key",key.trim());onClose()}
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}>
    <div style={{background:K.s1,border:`1px solid ${K.bd}`,borderRadius:"10px",padding:"28px",maxWidth:"480px",width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px"}}>
        <div>
          <div style={{fontWeight:"700",fontSize:"16px",color:K.wh}}>ð API Key Anthropic</div>
          <div style={{fontSize:"11px",color:K.t3,marginTop:"2px"}}>NecessÃ¡ria para anÃ¡lise com IA</div>
        </div>
        <button style={btn("s")} onClick={onClose}>â</button>
      </div>
      <div style={{marginBottom:"8px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"5px"}}>Chave da API</div>
        <input style={inp} type="password" placeholder="sk-ant-..." value={key} onChange={e=>setKey(e.target.value)}/>
      </div>
      <div style={{fontSize:"11px",color:K.t3,marginBottom:"18px"}}>
        Obtenha em: <a href="https://console.anthropic.com/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{color:K.blue}}>console.anthropic.com</a>
      </div>
      <div style={{background:`${K.amb}10`,border:`1px solid ${K.amb}30`,borderRadius:"6px",padding:"12px",marginBottom:"16px",fontSize:"11.5px",color:K.amb}}>
        â ï¸ A chave fica salva apenas no seu navegador (localStorage). Nunca Ã© enviada para nenhum servidor externo alÃ©m da Anthropic.
      </div>
      <button style={btn()} onClick={save}>ð¾ Salvar</button>
    </div>
  </div>
}

// ââ NOVO IMÃVEL âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function NovoImovel({onSave,onCancel,trello}) {
  const [url,setUrl]=useState("")
  const [loading,setLoading]=useState(false)
  const [step,setStep]=useState("")
  const [error,setError]=useState("")
  const [trelloMsg,setTrelloMsg]=useState("")

  const analyze = async () => {
    if(!url.trim()){setError("Cole o link do leilÃ£o");return}
    const hasKey = localStorage.getItem("leilax-api-key")
    if(!hasKey){setError("Configure a chave da API Anthropic nas ConfiguraÃ§Ãµes (âï¸)");return}
    setLoading(true);setError("");setTrelloMsg("")
    setStep("ð Buscando informaÃ§Ãµes do imÃ³vel...")
    try {
      setStep("ð§  IA analisando: score, risco jurÃ­dico, mercado...")
      const openaiKey = localStorage.getItem("leilax-openai-key") || ""
        const data = await analisarImovelCompleto(url.trim(), hasKey, openaiKey, parametrosBanco, criteriosBanco, (msg) => setStep(msg))
      data.fonte_url = url.trim()
      const property = {...data, id:uid(), createdAt:new Date().toISOString()}
      if(trello?.listId) {
        setStep("ð· Enviando para o Trello...")
        try {
          const cd = buildTrelloCard(property)
          await tPost("/cards",trello.key,trello.token,{idList:trello.listId,name:cd.name,desc:cd.desc})
          setTrelloMsg("â Card criado no Trello")
        } catch(e){ setTrelloMsg(`â ï¸ Salvo no app, erro Trello: ${e.message}`) }
      }
      onSave(property)
    } catch(e){ setError(e.message||"Erro na anÃ¡lise.") }
    setLoading(false);setStep("")
  }

  return <div>
    <Hdr title="Analisar ImÃ³vel" sub="Cole o link do leilÃ£o â IA busca e analisa tudo automaticamente"/>
    <div style={{padding:"24px 28px",maxWidth:"640px"}}>
      {trello?.listId
        ?<div style={{background:`${K.trello}15`,border:`1px solid ${K.trello}40`,borderRadius:"7px",padding:"12px 16px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"18px"}}>ð·</span>
          <div><div style={{fontSize:"12.5px",color:K.wh,fontWeight:"600"}}>Trello conectado</div>
          <div style={{fontSize:"11px",color:K.t3}}>{trello.boardName} â {trello.listName}</div></div>
          <span style={{marginLeft:"auto",fontSize:"9px",background:`${K.grn}20`,color:K.grn,padding:"2px 8px",borderRadius:"3px",fontWeight:"700"}}>ATIVO</span>
        </div>
        :<div style={{background:`${K.amb}10`,border:`1px solid ${K.amb}30`,borderRadius:"7px",padding:"12px 16px",marginBottom:"18px",fontSize:"12px",color:K.amb}}>
          â ï¸ Trello nÃ£o configurado. Configure em <b>âï¸ Config</b> na barra lateral.
        </div>}

      <div style={{marginBottom:"16px"}}>
        <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"6px"}}>Link do LeilÃ£o *</div>
        <input style={{...inp,fontSize:"14px"}} placeholder="https://venda-imoveis.caixa.gov.br/..." value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")analyze()}}/>
        <div style={{fontSize:"11px",color:K.t3,marginTop:"5px"}}>Portal CAIXA, sites de leiloeiros, qualquer anÃºncio pÃºblico</div>
      </div>

      {error&&<div style={{background:`${K.red}15`,border:`1px solid ${K.red}40`,borderRadius:"6px",padding:"12px",marginBottom:"14px",fontSize:"12.5px",color:K.red}}>â ï¸ {error}</div>}
      {trelloMsg&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"6px",padding:"10px",marginBottom:"14px",fontSize:"12px",color:K.teal}}>{trelloMsg}</div>}

      {loading&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"7px",padding:"16px",marginBottom:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <div style={{width:"8px",height:"8px",borderRadius:"50%",background:K.teal,animation:"pulse 1s infinite",flexShrink:0}}/>
          <div style={{fontSize:"13px",color:K.teal,fontWeight:"600"}}>{step}</div>
        </div>
        <div style={{fontSize:"11px",color:K.t3,marginTop:"6px"}}>Pode levar 20-40 segundos...</div>
      </div>}

      <div style={{display:"flex",gap:"10px"}}>
        <button style={btn()} onClick={analyze} disabled={loading}>{loading?"â³ Analisando...":"ð Analisar ImÃ³vel"}</button>
        <button style={btn("s")} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  </div>
}

// ââ PROPERTY CARD âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function PropCard({p,onNav}) {
  const sc=p.score_total||0, rc=recColor(p.recomendacao)
  return <div onClick={()=>onNav("detail",{id:p.id})}
    style={{...card(),cursor:"pointer",transition:"all .15s"}}
    onMouseEnter={e=>{e.currentTarget.style.borderColor=K.teal;e.currentTarget.style.transform="translateY(-2px)"}}
    onMouseLeave={e=>{e.currentTarget.style.borderColor=K.bd;e.currentTarget.style.transform="none"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"10px"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:"600",fontSize:"13px",color:K.wh,marginBottom:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.titulo||"ImÃ³vel sem tÃ­tulo"}</div>
        <div style={{fontSize:"10.5px",color:K.t3,marginBottom:"8px"}}>ð {p.cidade}/{p.estado} Â· {p.tipo} Â· {p.area_m2?`${p.area_m2}mÂ²`:"â"}</div>
        <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"10px"}}>
          <Bdg c={rc} ch={p.recomendacao||"â"}/>
          <Bdg c={p.ocupacao==="Desocupado"?K.grn:p.ocupacao==="Ocupado"?K.red:K.t3} ch={p.ocupacao||"â"}/>
          {p.financiavel&&<Bdg c={K.blue} ch="FinanciÃ¡vel"/>}{p.analise_dupla_ia&&<span style={{fontSize:"9px",fontWeight:"700",background:"linear-gradient(135deg,rgba(0,229,187,0.2),rgba(16,163,127,0.2))",border:"1px solid rgba(0,229,187,0.35)",color:"#00E5BB",padding:"2px 8px",borderRadius:"4px",letterSpacing:".5px"}}>ð¤ CLAUDE + GPT</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px"}}>
          <div style={{background:K.s2,borderRadius:"5px",padding:"7px 10px"}}>
            <div style={{fontSize:"9px",color:K.t3,marginBottom:"2px"}}>MÃNIMO</div>
            <div style={{fontSize:"13px",fontWeight:"700",color:K.amb}}>{fmtC(p.valor_minimo)}</div>
          </div>
          <div style={{background:K.s2,borderRadius:"5px",padding:"7px 10px"}}>
            <div style={{fontSize:"9px",color:K.t3,marginBottom:"2px"}}>DESCONTO</div>
            <div style={{fontSize:"13px",fontWeight:"700",color:K.grn}}>{p.desconto_percentual?`${p.desconto_percentual}%`:"â"}</div>
          </div>
        </div>
      </div>
      <ScoreRing score={sc} size={70}/>
    </div>
    <div style={{fontSize:"10px",color:K.t3,marginTop:"10px",borderTop:`1px solid ${K.bd}`,paddingTop:"8px"}}>{fmtD(p.createdAt)} Â· {p.modalidade||"â"}</div>
  </div>
}

// ââ DASHBOARD âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Dashboard({props,onNav}) {
  const total=props.length, comprar=props.filter(p=>p.recomendacao==="COMPRAR").length
  const forte=props.filter(p=>(p.score_total||0)>=7.5).length
  const avg=total?(props.reduce((s,p)=>s+(p.score_total||0),0)/total).toFixed(1):"â"
  const recentes=[...props].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6)
  return <div>
    <Hdr title="Dashboard LEILAX" sub={`${total} imÃ³vel(is) analisado(s)`} actions={<button style={btn()} onClick={()=>onNav("novo")}>+ Analisar ImÃ³vel</button>}/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"12px",marginBottom:"20px"}}>
        {[{l:"Analisados",v:total,c:K.blue},{l:"Score MÃ©dio",v:avg,c:K.teal},{l:"Comprar",v:comprar,c:K.grn},{l:"Score Forte",v:forte,c:K.gold}].map(k=>(
          <div key={k.l} style={{background:`${k.c}12`,border:`1px solid ${k.c}30`,borderRadius:"8px",padding:"16px"}}>
            <div style={{fontSize:"10px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>{k.l}</div>
            <div style={{fontFamily:"monospace",fontSize:"30px",fontWeight:"800",color:k.c}}>{k.v}</div>
          </div>
        ))}
      </div>
      {total===0
        ?<div style={{textAlign:"center",padding:"60px 20px",color:K.t3}}>
          <div style={{fontSize:"48px",marginBottom:"16px"}}>ð </div>
          <div style={{fontSize:"15px",marginBottom:"8px",color:K.t2}}>Nenhum imÃ³vel analisado ainda</div>
          <div style={{fontSize:"12px",marginBottom:"24px"}}>Cole o link de um leilÃ£o para comeÃ§ar</div>
          <button style={btn()} onClick={()=>onNav("novo")}>Analisar Primeiro ImÃ³vel</button>
        </div>
        :<><div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>AnÃ¡lises Recentes</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px"}}>
          {recentes.map(p=><PropCard key={p.id} p={p} onNav={onNav}/>)}
        </div></>}
    </div>
  </div>
}

// ââ DETAIL ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Detail({p,onDelete,onNav,trello}) {
  const [sending,setSending]=useState(false)
  const [msg,setMsg]=useState("")
  if(!p) return <div style={{padding:"40px",textAlign:"center",color:K.t3}}>NÃ£o encontrado</div>
  const sc=p.score_total||0, rc=recColor(p.recomendacao)
  const scores=[
    {l:"LocalizaÃ§Ã£o",v:p.score_localizacao,w:"20%"},{l:"Desconto",v:p.score_desconto,w:"18%"},
    {l:"JurÃ­dico",v:p.score_juridico,w:"18%"},{l:"OcupaÃ§Ã£o",v:p.score_ocupacao,w:"15%"},
    {l:"Liquidez",v:p.score_liquidez,w:"15%"},{l:"Mercado",v:p.score_mercado,w:"14%"},
  ]
  const sendTrello=async()=>{
    if(!trello?.listId){setMsg("Trello nÃ£o configurado");return}
    setSending(true);setMsg("")
    try { const cd=buildTrelloCard(p); await tPost("/cards",trello.key,trello.token,{idList:trello.listId,name:cd.name,desc:cd.desc}); setMsg("â Card enviado ao Trello!") }
    catch(e){setMsg(`Erro: ${e.message}`)}
    setSending(false)
  }
  return <div>
    <Hdr title={p.titulo||"ImÃ³vel"} sub={`${p.cidade}/${p.estado} Â· ${fmtD(p.createdAt)}`}
      actions={<>
        {p.fonte_url&&<a href={p.fonte_url} target="_blank" rel="noopener noreferrer" style={{...btn("s"),textDecoration:"none",display:"inline-block"}}>ð AnÃºncio</a>}
        <button style={btn("trello")} onClick={sendTrello} disabled={sending}>{sending?"Enviando...":"ð· Trello"}</button>
        <button style={{...btn("d"),padding:"5px 12px",fontSize:"12px"}} onClick={()=>{if(confirm("Excluir?"))onDelete(p.id)}}>ð</button>
      </>}/>
    <div style={{padding:"20px 28px"}}>
      {msg&&<div style={{background:`${K.teal}10`,border:`1px solid ${K.teal}30`,borderRadius:"6px",padding:"10px",marginBottom:"14px",fontSize:"12px",color:K.teal}}>{msg}</div>}
      <div style={{background:`${rc}10`,border:`1px solid ${rc}30`,borderRadius:"10px",padding:"20px",marginBottom:"16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
          <ScoreRing score={sc} size={90}/>
          <div>
            <div style={{fontSize:"11px",color:K.t3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"4px"}}>RecomendaÃ§Ã£o</div>
            <div style={{fontSize:"28px",fontWeight:"800",color:rc}}>{p.recomendacao||"â"}</div>
            <div style={{fontSize:"12px",color:K.t2,marginTop:"4px",maxWidth:"400px"}}>{p.justificativa}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
          <Bdg c={p.ocupacao==="Desocupado"?K.grn:K.red} ch={p.ocupacao||"â"}/>
          <Bdg c={p.financiavel?K.blue:K.t3} ch={p.financiavel?"FinanciÃ¡vel":"Sem financ."}/>
          {p.fgts_aceito&&<Bdg c={K.pur} ch="FGTS"/>}
          <Bdg c={K.t3} ch={p.modalidade||"â"}/>
        </div>
      </div>
      {p.alertas?.length>0&&<div style={{background:`${K.red}10`,border:`1px solid ${K.red}30`,borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"11px",color:K.red,fontWeight:"700",textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>ð¨ Alertas CrÃ­ticos</div>
        {p.alertas.map((a,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"4px"}}>â¢ {a}</div>)}
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>ð° Valores</div>
          {[["AvaliaÃ§Ã£o",fmtC(p.valor_avaliacao),K.t2],["Lance mÃ­nimo",fmtC(p.valor_minimo),K.amb],["Desconto",p.desconto_percentual?`${p.desconto_percentual}%`:"â",K.grn],["PreÃ§o/mÂ² imÃ³vel",p.preco_m2_imovel?`R$ ${p.preco_m2_imovel}/mÂ²`:"â",K.teal],["PreÃ§o/mÂ² mercado",p.preco_m2_mercado?`R$ ${p.preco_m2_mercado}/mÂ²`:"â",K.t2],["Aluguel estimado",fmtC(p.aluguel_mensal_estimado)+"/mÃªs",K.pur]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",fontWeight:"600",color:c}}>{v}</span>
            </div>
          ))}
        </div>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>ð  Ficha TÃ©cnica</div>
          {[["Tipo",p.tipo],["Ãrea",p.area_m2?`${p.area_m2}mÂ²`:"â"],["Quartos",p.quartos],["Vagas",p.vagas],["Leiloeiro",p.leiloeiro],["Data leilÃ£o",p.data_leilao],["Liquidez",p.liquidez],["Revenda est.",p.prazo_revenda_meses?`${p.prazo_revenda_meses} meses`:"â"]].filter(([,v])=>v&&v!=="â"&&v!=="0").map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",color:K.tx}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{...card(),marginBottom:"14px"}}>
        <div style={{fontWeight:"600",color:K.wh,marginBottom:"14px",fontSize:"13px"}}>ð Score por DimensÃ£o</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px"}}>
          {scores.map(({l,v,w})=>(
            <div key={l} style={{background:K.s2,borderRadius:"6px",padding:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                <span style={{fontSize:"11px",color:K.t3}}>{l}</span>
                <span style={{fontSize:"10px",color:K.t3}}>peso {w}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <div style={{flex:1,height:"6px",background:K.bd,borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{width:`${(v||0)*10}%`,height:"100%",background:scoreColor(v||0),borderRadius:"3px"}}/>
                </div>
                <span style={{fontSize:"13px",fontWeight:"700",color:scoreColor(v||0),minWidth:"28px",textAlign:"right"}}>{(v||0).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>âï¸ JurÃ­dico</div>
          {[["Processos",p.processos_ativos,{Nenhum:K.grn,PossÃ­vel:K.amb,Confirmado:K.red,Desconhecido:K.t3}],
            ["MatrÃ­cula",p.matricula_status,{Limpa:K.grn,"Com Ã´nus":K.red,Desconhecido:K.t3}],
            ["DÃ©b. condomÃ­nio",p.debitos_condominio,{"Sem dÃ©bitos":K.grn,"Com dÃ©bitos":K.red,Desconhecido:K.t3}],
            ["DÃ©b. IPTU",p.debitos_iptu,{"Sem dÃ©bitos":K.grn,"Com dÃ©bitos":K.red,Desconhecido:K.t3}]].map(([l,v,cs])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`,alignItems:"center"}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span>
              <span style={{fontSize:"12px",fontWeight:"600",color:cs?.[v]||K.t2}}>{v||"â"}</span>
            </div>
          ))}
          {p.obs_juridicas&&<div style={{marginTop:"10px",fontSize:"11.5px",color:K.t2,lineHeight:"1.6",background:K.s2,borderRadius:"5px",padding:"8px"}}>{p.obs_juridicas}</div>}
        </div>
        <div style={card()}>
          <div style={{fontWeight:"600",color:K.wh,marginBottom:"12px",fontSize:"13px"}}>ð Retorno e Custos</div>
          {[["Custo regularizaÃ§Ã£o",fmtC(p.custo_regularizacao),K.amb],["Custo reforma",fmtC(p.custo_reforma),K.amb],["Retorno revenda",p.retorno_venda_pct?`+${p.retorno_venda_pct}%`:"â",K.grn],["LocaÃ§Ã£o a.a.",p.retorno_locacao_anual_pct?`${p.retorno_locacao_anual_pct}%`:"â",K.teal],["Estrutura rec.",p.estrutura_recomendada,K.pur],["TendÃªncia",p.mercado_tendencia,p.mercado_tendencia==="Alta"?K.grn:K.amb],["Demanda",p.mercado_demanda,p.mercado_demanda==="Alta"?K.grn:K.amb]].filter(([,v])=>v&&v!=="â").map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${K.bd}`}}>
              <span style={{fontSize:"12px",color:K.t3}}>{l}</span><span style={{fontSize:"12.5px",fontWeight:"600",color:c}}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      {(p.positivos?.length>0||p.negativos?.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
        <div style={{...card(),borderTop:`2px solid ${K.grn}`}}>
          <div style={{fontWeight:"600",color:K.grn,marginBottom:"10px",fontSize:"13px"}}>â Pontos Positivos</div>
          {(p.positivos||[]).map((pt,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"6px",display:"flex",gap:"8px"}}><span style={{color:K.grn}}>+</span>{pt}</div>)}
        </div>
        <div style={{...card(),borderTop:`2px solid ${K.red}`}}>
          <div style={{fontWeight:"600",color:K.red,marginBottom:"10px",fontSize:"13px"}}>â ï¸ Pontos de AtenÃ§Ã£o</div>
          {(p.negativos||[]).map((pt,i)=><div key={i} style={{fontSize:"12.5px",color:K.tx,marginBottom:"6px",display:"flex",gap:"8px"}}><span style={{color:K.red}}>â</span>{pt}</div>)}
        </div>
      </div>}
      {p.endereco&&<div style={{...card(),marginBottom:"14px"}}><div style={{fontWeight:"600",color:K.wh,marginBottom:"6px",fontSize:"13px"}}>ð LocalizaÃ§Ã£o</div><div style={{fontSize:"13px",color:K.t2}}>{p.endereco}</div></div>}
    </div>
  </div>
}

// ââ LISTA âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Lista({props,onNav,onDelete}) {
  const [q,setQ]=useState(""), [filter,setFilter]=useState("todos"), [sort,setSort]=useState("score")
  let list=[...props]
  if(q) list=list.filter(p=>`${p.titulo} ${p.cidade} ${p.tipo}`.toLowerCase().includes(q.toLowerCase()))
  if(filter!=="todos") list=list.filter(p=>p.recomendacao===filter.toUpperCase())
  list.sort((a,b)=>sort==="score"?(b.score_total||0)-(a.score_total||0):sort==="desconto"?(b.desconto_percentual||0)-(a.desconto_percentual||0):sort==="valor"?(a.valor_minimo||0)-(b.valor_minimo||0):new Date(b.createdAt)-new Date(a.createdAt))
  return <div>
    <Hdr title="ImÃ³veis" sub={`${props.length} total Â· ${list.length} filtrado(s)`} actions={<button style={btn()} onClick={()=>onNav("novo")}>+ Novo</button>}/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"flex",gap:"10px",marginBottom:"16px",flexWrap:"wrap"}}>
        <input style={{...inp,maxWidth:"260px"}} placeholder="ð Buscar..." value={q} onChange={e=>setQ(e.target.value)}/>
        <select style={{...inp,width:"auto",cursor:"pointer"}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="todos">Todos</option><option value="comprar">Comprar</option><option value="aguardar">Aguardar</option><option value="evitar">Evitar</option>
        </select>
        <select style={{...inp,width:"auto",cursor:"pointer"}} value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="score">Maior Score</option><option value="desconto">Maior Desconto</option><option value="valor">Menor Valor</option><option value="data">Mais Recente</option>
        </select>
      </div>
      {list.length===0?<div style={{textAlign:"center",padding:"40px",color:K.t3}}><div style={{fontSize:"32px",marginBottom:"10px"}}>ð</div><div>Nenhum imÃ³vel encontrado</div></div>
      :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"12px"}}>
        {list.map(p=><PropCard key={p.id} p={p} onNav={onNav}/>)}
      </div>}
    </div>
  </div>
}

// ââ COMPARATIVO âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Comparativo({props}) {
  const [sel,setSel]=useState([])
  const top=[...props].sort((a,b)=>(b.score_total||0)-(a.score_total||0)).slice(0,8)
  const cmp=props.filter(p=>sel.includes(p.id))
  const toggle=id=>setSel(s=>s.includes(id)?s.filter(x=>x!==id):s.length<3?[...s,id]:s)
  const dims=[["Score Total",p=>(p.score_total||0).toFixed(1),p=>scoreColor(p.score_total)],["RecomendaÃ§Ã£o",p=>p.recomendacao,p=>recColor(p.recomendacao)],["Valor MÃ­nimo",p=>fmtC(p.valor_minimo),()=>K.t2],["Desconto",p=>p.desconto_percentual?`${p.desconto_percentual}%`:"â",()=>K.grn],["Ãrea",p=>p.area_m2?`${p.area_m2}mÂ²`:"â",()=>K.t2],["PreÃ§o/mÂ²",p=>p.preco_m2_imovel?`R$ ${p.preco_m2_imovel}`:"â",()=>K.t2],["OcupaÃ§Ã£o",p=>p.ocupacao,p=>p.ocupacao==="Desocupado"?K.grn:K.red],["Processos",p=>p.processos_ativos,p=>p.processos_ativos==="Nenhum"?K.grn:K.red],["FinanciÃ¡vel",p=>p.financiavel?"Sim":"NÃ£o",p=>p.financiavel?K.grn:K.t3],["Retorno revenda",p=>p.retorno_venda_pct?`+${p.retorno_venda_pct}%`:"â",()=>K.grn]]
  return <div>
    <Hdr title="Comparativo" sub="Selecione atÃ© 3 imÃ³veis"/>
    <div style={{padding:"20px 28px"}}>
      <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginBottom:"20px"}}>
        {top.map(p=><div key={p.id} onClick={()=>toggle(p.id)} style={{background:sel.includes(p.id)?`${K.teal}15`:K.s2,border:`1px solid ${sel.includes(p.id)?K.teal:K.bd}`,borderRadius:"6px",padding:"7px 12px",cursor:"pointer",fontSize:"12px",color:K.tx}}>
          {sel.includes(p.id)?"â ":""}{(p.titulo||"ImÃ³vel").slice(0,26)} <span style={{color:scoreColor(p.score_total)}}>({(p.score_total||0).toFixed(1)})</span>
        </div>)}
      </div>
      {cmp.length>=2?<div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12.5px"}}>
          <thead><tr>
            <th style={{padding:"10px 14px",background:K.s2,color:K.t3,textAlign:"left",fontSize:"11px",textTransform:"uppercase",letterSpacing:"1px",borderBottom:`1px solid ${K.bd}`,minWidth:"130px"}}>DimensÃ£o</th>
            {cmp.map(p=><th key={p.id} style={{padding:"10px 14px",background:K.s2,color:K.wh,textAlign:"center",borderBottom:`1px solid ${K.bd}`,minWidth:"180px"}}>
              <div style={{fontSize:"11.5px",marginBottom:"6px"}}>{(p.titulo||"ImÃ³vel").slice(0,22)}</div>
              <ScoreRing score={p.score_total} size={44}/>
            </th>)}
          </tr></thead>
          <tbody>{dims.map(([label,getValue,getColor],i)=>(
            <tr key={label} style={{background:i%2===0?K.s1:K.bg2}}>
              <td style={{padding:"8px 14px",color:K.t3,borderBottom:`1px solid ${K.bd}`}}>{label}</td>
              {cmp.map(p=><td key={p.id} style={{padding:"8px 14px",textAlign:"center",borderBottom:`1px solid ${K.bd}`,color:getColor(p),fontWeight:"600"}}>{getValue(p)||"â"}</td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>:<div style={{textAlign:"center",padding:"40px",color:K.t3}}><div style={{fontSize:"28px",marginBottom:"10px"}}>âï¸</div><div>Selecione pelo menos 2 imÃ³veis acima</div></div>}
    </div>
  </div>
}

// ââ APP ROOT ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function App() {
  const { session, profile, loading: authLoading, isAdmin } = useAuth()
  if (authLoading) return <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#080B10',justifyContent:'center',alignItems:'center',color:'#00E5BB',fontFamily:'system-ui',fontSize:'16px',fontWeight:'700'}}>â³ Carregando...</div>
  if (!session) return <Login />
  if (profile && !profile.ativo) return <div style={{display:'flex',height:'100vh',background:'#080B10',justifyContent:'center',alignItems:'center',color:'#FF4757',fontFamily:'system-ui',flexDirection:'column',gap:'12px'}}><div>ð«</div><div style={{fontSize:'16px',fontWeight:'700'}}>Acesso desativado</div><div style={{fontSize:'13px',color:'#3D4E6A'}}>Contate o administrador</div></div>
  const [view,setView]=useState("dashboard")
  const [vp,setVp]=useState({})
  const [props,setProps]=useState([])
  const [loaded,setL]=useState(false)
  const [toast,setToast]=useState(null)
  const [trello,setTrello]=useState(null)
  const [showTrello,setShowTrello]=useState(false)
  const [showApiKey,setShowApiKey]=useState(false)
const [parametrosBanco,setParametrosBanco]=useState([])
const [criteriosBanco,setCriteriosBanco]=useState([])
  const apiOk = localStorage.getItem("leilax-api-key")
useEffect(()=>{async function lp(){try{const{data:pr}=await supabase.from("parametros_score").select("*");if(pr)setParametrosBanco(pr);const{data:cr}=await supabase.from("criterios_avaliacao").select("*");if(cr)setCriteriosBanco(cr)}catch(e){console.warn("parametros:",e)}}lp()},[])

  const showToast=(msg,c)=>{setToast({msg,c:c||K.teal});setTimeout(()=>setToast(null),4500)}
  const nav=(v,p={})=>{setView(v);setVp(p)}

  useEffect(()=>{(async()=>{
    const [p,t]=await Promise.all([stLoad("leilax-props"),stLoad("leilax-trello")])
    if(p)setProps(p); if(t)setTrello(t); setL(true)
    // Mostrar modal de API key se nÃ£o tiver
    if(!localStorage.getItem("leilax-api-key")) setTimeout(()=>setShowApiKey(true),1000)
  })()},[])

  useEffect(()=>{if(loaded)stSave("leilax-props",props)},[props,loaded])
  useEffect(()=>{if(loaded&&trello)stSave("leilax-trello",trello)},[trello,loaded])

  const addProp=p=>{
    setProps(ps=>[p,...ps])
    showToast(`â ${p.titulo||"ImÃ³vel"} â Score ${(p.score_total||0).toFixed(1)} Â· ${p.recomendacao}`)
    nav("detail",{id:p.id})
  }
  const delProp=id=>{setProps(ps=>ps.filter(p=>p.id!==id));showToast("ExcluÃ­do",K.red);nav("imoveis")}
  const saveTrello=cfg=>{setTrello(cfg);setShowTrello(false);showToast("â Trello configurado â "+cfg.boardName,K.trello)}

  const navItems=[
    {i:'ð ',l:'Dashboard',v:'dashboard'},
    {i:'ð',l:'Analisar',v:'novo'},
    {i:'ð¤',l:'Busca GPT',v:'busca'},
    {i:'ð',l:'ImÃ³veis',v:'imoveis'},
    {i:'ð',l:'GrÃ¡ficos',v:'graficos'},
    {i:'âï¸',l:'Comparar',v:'comparar'},
    {i:'â',l:'Tarefas',v:'tarefas'},
    ...(isAdmin?[{i:'ð¡ï¸',l:'Admin',v:'admin'}]:[]),
  ]
  const isAct=v=>view===v||(v==="imoveis"&&view==="detail")
  const selP=vp.id?props.find(p=>p.id===vp.id):null

  if(!loaded) return <div style={{display:"flex",height:"100vh",background:K.bg,justifyContent:"center",alignItems:"center",flexDirection:"column",gap:"12px",fontFamily:"system-ui"}}>
    <div style={{fontSize:"32px"}}>ð </div>
    <div style={{color:K.teal,fontWeight:"700",fontSize:"16px"}}>Carregando LEILAX...</div>
  </div>

  return <div style={{display:"flex",height:"100vh",background:K.bg,color:K.tx,fontFamily:"'DM Sans',system-ui,sans-serif",fontSize:"14px",overflow:"hidden"}}>
    <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${K.bg};}::-webkit-scrollbar-thumb{background:${K.bd2};border-radius:2px;}select option{background:${K.s1};}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}a:hover{opacity:.8;}`}</style>

    {showTrello&&<TrelloModal config={trello} onSave={saveTrello} onClose={()=>setShowTrello(false)}/>}
    {showApiKey&&<ApiKeyModal onClose={()=>setShowApiKey(false)}/>}

    {/* SIDEBAR */}
{/* RODAPE DA SIDEBAR */}
<div style={{flexShrink:0,padding:'8px',borderTop:'1px solid rgba(0,229,187,0.10)',display:'flex',flexDirection:'column',gap:'6px'}}>
{/* Trello */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer'}} onClick={()=>setShowTrello(true)}>
<div style={{display:'flex',alignItems:'center',gap:'7px'}}>
<span style={{fontSize:'13px'}}>ð·</span>
<div>
<div style={{fontSize:'11px',color:'#DDE4F0',fontWeight:600,lineHeight:1.2}}>Trello</div>
<div style={{fontSize:'9px',color:'#3D4E6A'}}>{trello?'Configurado':'Clique para configurar'}</div>
</div>
</div>
<span style={{fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'3px',background:trello?'rgba(0,229,187,0.15)':'rgba(255,71,87,0.15)',color:trello?'#00E5BB':'#FF4757',border:trello?'1px solid rgba(0,229,187,0.3)':'1px solid rgba(255,71,87,0.3)'}}>{trello?'ON':'OFF'}</span>
</div>
{/* API Key */}
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',cursor:'pointer'}} onClick={()=>setShowApiKey(true)}>
<div style={{display:'flex',alignItems:'center',gap:'7px'}}>
<span style={{fontSize:'13px'}}>âï¸</span>
<div style={{fontSize:'11px',color:'#DDE4F0',fontWeight:600}}>API Key</div>
</div>
<span style={{fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'3px',background:apiOk?'rgba(0,229,187,0.15)':'rgba(255,71,87,0.15)',color:apiOk?'#00E5BB':'#FF4757',border:apiOk?'1px solid rgba(0,229,187,0.3)':'1px solid rgba(255,71,87,0.3)'}}>{apiOk?'OK':'FALTA'}</span>
</div>
{/* Perfil + Sair */}
<div style={{display:'flex',alignItems:'center',gap:'8px',padding:'7px 10px',borderRadius:'7px',background:'rgba(255,71,87,0.06)',border:'1px solid rgba(255,71,87,0.15)'}}>
<div style={{width:26,height:26,borderRadius:'50%',background:'rgba(0,229,187,0.2)',border:'1px solid rgba(0,229,187,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#00E5BB',fontSize:'11px',flexShrink:0}}>{(profile?.nome||'U')[0].toUpperCase()}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:'11px',fontWeight:600,color:'#DDE4F0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.nome||'UsuÃ¡rio'}</div>
<div style={{fontSize:'9px',color:'#3D4E6A'}}>{isAdmin?'ð¡ï¸ Admin':'ð¤ Membro'}</div>
</div>
<div title="Sair" style={{fontSize:'16px',cursor:'pointer',color:'#FF4757',flexShrink:0,padding:'2px'}} onClick={async()=>{const{signOut}=await import('./lib/supabase.js');await signOut()}}>â©</div>
</div>
{/* Stats */}
<div style={{padding:'4px 10px',fontSize:'10px',color:'#3D4E6A',display:'flex',flexDirection:'column',gap:'2px'}}>
<div>ð  {props.filter(p=>p.status==='analisado').length} analisados</div>
<div>â {props.filter(p=>p.recomendacao==='COMPRAR').length} para comprar</div>
<div>â­ {props.filter(p=>(p.score_total||0)>=7).length} score forte</div>
</div>
</div>

    {/* CONTENT */}
    <div style={{flex:1,overflowY:"auto",background:K.bg,display:"flex",flexDirection:"column",minWidth:0}}>
      {view==="dashboard"&&<Dashboard props={props} onNav={nav}/>}
      {view==="novo"&&<NovoImovel onSave={addProp} onCancel={()=>nav("imoveis")} trello={trello}/>}
      {view==="imoveis"&&<Lista props={props} onNav={nav} onDelete={delProp}/>}
      {view==="detail"&&<Detail p={selP} onDelete={delProp} onNav={nav} trello={trello}/>}
      {view==="comparar"&&<Comparativo props={props}/>}
    {view==="busca"&&<BuscaGPT onAnalisar={(link)=>{nav("novo");setTimeout(()=>{},100)}}/>}
    {view==="graficos"&&<div><div style={{padding:"22px 28px 16px",borderBottom:`1px solid ${K.bd}`}}><div style={{fontWeight:700,fontSize:19,color:K.wh}}>ð GrÃ¡ficos</div></div><div style={{padding:"20px 28px"}}><Charts properties={props}/></div></div>}
    {view==="tarefas"&&<Tarefas/>}
    {view==="admin"&&isAdmin&&<AdminPanel/>}
    </div>

    {toast&&<div style={{position:"fixed",bottom:"16px",right:"16px",background:toast.c===K.trello?K.trello:toast.c,color:toast.c===K.teal||toast.c===K.trello?"#000":"#fff",padding:"12px 20px",borderRadius:"8px",fontSize:"13px",fontWeight:"600",zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,.6)",maxWidth:"340px"}}>{toast.msg}</div>}
    <MobileNav items={navItems} activeKey={view} onNavigate={(v)=>nav(v)}/>
  </div>
}
