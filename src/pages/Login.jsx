import { useState } from 'react'
import { supabase, signIn } from '../lib/supabase'

const C = {
  navy:    '#002B80',
  navy2:   '#001A5C',
  emerald: '#05A86D',
  emeraldL:'#E6F6F0',
  bg:      '#EDECEA',
  white:   '#FFFFFF',
  muted:   '#6B7C90',
  hint:    '#9EAAB8',
  border:  '#DDD9CF',
  text:    '#0A1628',
}

function AxisLogo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" rx="11" fill={C.navy}/>
        <text x="7" y="31" fontFamily="'Inter',sans-serif"
          fontWeight="900" fontSize="22" fill="white">A</text>
        <line x1="26" y1="18" x2="37" y2="9"
          stroke={C.emerald} strokeWidth="2.5" strokeLinecap="round"/>
        <polyline points="31,9 37,9 37,15"
          fill="none" stroke={C.emerald} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div>
        <div style={{
          fontFamily:"'Inter',sans-serif",
          fontWeight:900, fontSize:24,
          color:C.navy, letterSpacing:'-1px', lineHeight:1,
        }}>
          <span>A</span>
          <span style={{position:'relative'}}>X</span>
          <span>IS</span>
        </div>
        <div style={{
          fontSize:9, color:C.muted, letterSpacing:'2px',
          textTransform:'uppercase', marginTop:1,
        }}>
          Inteligência Patrimonial
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [convite, setConvite] = useState(
    new URLSearchParams(window.location.search).get('convite') || ''
  )
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function handleLogin(e) {
    e?.preventDefault()
    setLoading(true); setErro('')
    try {
      await signIn(email.trim().toLowerCase(), senha)
    } catch(e) {
      setErro(e.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : e.message)
    }
    setLoading(false)
  }

  return<div style={{minHeight:'100vh',background:K.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',system-ui,sans-serif",padding:'20px'}}>
    <div style={{width:'100%',maxWidth:'400px'}}>
      <div style={{textAlign:'center',marginBottom:'40px'}}>
        <div style={{fontWeight:'800',fontSize:'36px',color:K.wh,letterSpacing:'-1px',marginBottom:'8px'}}>AX<span style={{color:K.teal}}>IS</span></div>
        <div style={{fontSize:'13px',color:K.t3,letterSpacing:'2px',textTransform:'uppercase'}}>Inteligência Patrimonial</div>
      </div>

      {/* ── LADO DIREITO: Formulário ─────────────────────── */}
      <div style={{
        flex:1, display:'flex', alignItems:'center',
        justifyContent:'center', padding:'48px 64px',
      }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          <div style={{
            display:'flex', gap:4, marginBottom:36,
            background:'rgba(0,0,0,0.04)',
            borderRadius:10, padding:4,
          }}>
            {['login','cadastro'].map(m => (
              <button key={m} onClick={() => { setModo(m); setErro(''); setSucesso('') }}
                style={{
                  flex:1, padding:'9px 0', borderRadius:7,
                  border:'none', cursor:'pointer', fontSize:13.5,
                  fontWeight: modo===m ? 600 : 400,
                  background: modo===m ? C.white : 'transparent',
                  color: modo===m ? C.navy : C.muted,
                  boxShadow: modo===m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition:'all 0.15s',
                }}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {modo === 'login' ? (
            <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:C.muted,
                  textTransform:'uppercase',letterSpacing:'0.6px',display:'block',marginBottom:6}}>
                  Email
                </label>
                <input
                  type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="seu@email.com" required autoComplete="email"
                  style={{
                    width:'100%', padding:'12px 14px', borderRadius:9,
                    border:`1.5px solid ${C.border}`, fontSize:14,
                    color:C.text, background:C.white, outline:'none',
                    boxSizing:'border-box', transition:'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = C.emerald}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:C.muted,
                  textTransform:'uppercase',letterSpacing:'0.6px',display:'block',marginBottom:6}}>
                  Senha
                </label>
                <input
                  type="password" value={senha} onChange={e=>setSenha(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  style={{
                    width:'100%', padding:'12px 14px', borderRadius:9,
                    border:`1.5px solid ${C.border}`, fontSize:14,
                    color:C.text, background:C.white, outline:'none',
                    boxSizing:'border-box', transition:'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = C.emerald}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              {erro && (
                <div style={{
                  padding:'10px 14px', borderRadius:8,
                  background:'#FEE8E8', color:'#C0392B', fontSize:13,
                }}>⚠️ {erro}</div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  padding:'13px', borderRadius:9, border:'none',
                  background: loading ? C.emeraldL : C.emerald,
                  color: loading ? C.emerald : '#fff',
                  fontSize:15, fontWeight:700, cursor: loading ? 'wait' : 'pointer',
                  transition:'all 0.15s', marginTop:4,
                  letterSpacing:'-0.3px',
                }}>
                {loading ? 'Entrando...' : 'Entrar na plataforma →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCadastro} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{
                padding:'12px 14px', borderRadius:9,
                background:'#EEF2FF',
                border:'1px solid rgba(0,43,128,0.12)',
                fontSize:12.5, color:C.navy, lineHeight:1.5,
              }}>
                🔐 Acesso por <b>convite</b>. Insira o código recebido pelo administrador.
              </div>

              {[
                { label:'Nome completo', val:nome, set:setNome, type:'text', ph:'Gabriel Mattos', ac:'name' },
                { label:'Email', val:email, set:setEmail, type:'email', ph:'seu@email.com', ac:'email' },
                { label:'Senha', val:senha, set:setSenha, type:'password', ph:'min. 6 caracteres', ac:'new-password' },
                { label:'Código de convite', val:convite, set:setConvite, type:'text', ph:'TOKEN-CONVITE', ac:'off' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{fontSize:12,fontWeight:600,color:C.muted,
                    textTransform:'uppercase',letterSpacing:'0.6px',display:'block',marginBottom:6}}>
                    {f.label}
                  </label>
                  <input
                    type={f.type} value={f.val} onChange={e=>f.set(e.target.value)}
                    placeholder={f.ph} required autoComplete={f.ac}
                    style={{
                      width:'100%', padding:'12px 14px', borderRadius:9,
                      border:`1.5px solid ${C.border}`, fontSize:14,
                      color:C.text, background:C.white, outline:'none',
                      boxSizing:'border-box', transition:'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = C.emerald}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                </div>
              ))}

              {erro && (
                <div style={{
                  padding:'10px 14px', borderRadius:8,
                  background:'#FEE8E8', color:'#C0392B', fontSize:13,
                }}>⚠️ {erro}</div>
              )}
              {sucesso && (
                <div style={{
                  padding:'10px 14px', borderRadius:8,
                  background:C.emeraldL, color:C.emerald, fontSize:13, fontWeight:500,
                }}>✅ {sucesso}</div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  padding:'13px', borderRadius:9, border:'none',
                  background: loading ? C.emeraldL : C.navy,
                  color: loading ? C.navy : '#fff',
                  fontSize:15, fontWeight:700, cursor: loading ? 'wait' : 'pointer',
                  transition:'all 0.15s', marginTop:4,
                }}>
                {loading ? 'Criando conta...' : 'Criar conta →'}
              </button>
            </form>
          )}

          <div style={{
            marginTop:36, paddingTop:24,
            borderTop:`1px solid ${C.border}`,
            display:'flex', justifyContent:'space-between',
            alignItems:'center',
          }}>
            <p style={{margin:0, fontSize:11, color:C.hint}}>
              AXIS Intelligence v2.1
            </p>
            <p style={{margin:0, fontSize:11, color:C.hint}}>
              Belo Horizonte · MG
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
