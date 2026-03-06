// src/App.jsx  — Anand Finco Complete Web App
// Features: Login, Admin Dashboard, Client Portfolio,
//           Gold/Silver/ETF Buy, Sell Stake (with Bank Details),
//           Buy More, Live News, WhatsApp Notifications
import { useState, useEffect, useRef } from 'react'
import { auth, db } from './firebase.js'
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, Timestamp
} from 'firebase/firestore'

// ── Helpers ───────────────────────────────────────────────────────────────
const fmt   = n => '₹' + new Intl.NumberFormat('en-IN').format(Math.round(n || 0))
const fmtCr = n => { if (!n) return '₹0'; if (n>=1e7) return `₹${(n/1e7).toFixed(2)} Cr`; if (n>=1e5) return `₹${(n/1e5).toFixed(1)}L`; return fmt(n) }
const pct   = (a,b) => b > 0 ? ((a-b)/b*100).toFixed(2) : '0.00'
const gc    = n => n >= 0 ? '#22c55e' : '#ef4444'
const uid   = () => Math.random().toString(36).slice(2,10)
const now   = () => new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
const ADMIN_EMAIL = 'admin@anandfinco.com'

// ── Design Tokens ─────────────────────────────────────────────────────────
const C = {
  bg:'#070d1a', bg2:'#0c1525', bg3:'#0f1e35',
  gold:'#c9a227', goldL:'#e6c96b', goldBg:'rgba(201,162,39,0.08)', goldBd:'rgba(201,162,39,0.22)',
  text:'#f1f5f9', text2:'#cbd5e1', muted:'#6b7280', dim:'#374151',
  card:'rgba(255,255,255,0.045)', border:'rgba(255,255,255,0.08)',
  green:'#22c55e', greenBg:'rgba(34,197,94,0.08)', greenBd:'rgba(34,197,94,0.25)',
  red:'#ef4444',   redBg:'rgba(239,68,68,0.08)',   redBd:'rgba(239,68,68,0.25)',
  blue:'#3b82f6',
}

// ── Global CSS ─────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};height:100dvh;overflow:hidden}
#root{height:100dvh;display:flex;flex-direction:column;align-items:center;background:#040609}
input::placeholder,textarea::placeholder{color:${C.dim}}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
select option{background:${C.bg2}}
textarea{resize:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
.fadeUp{animation:fadeUp .35s ease both}
.live-dot{animation:pulse 1.5s ease infinite}
`
function InjectCSS() {
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = CSS
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])
  return null
}

// ── UI Primitives ──────────────────────────────────────────────────────────
function Btn({ label, onClick, outline, full, sm, disabled, loading, color, icon }) {
  const c = color || C.gold
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ width:full?'100%':'auto',
        background:outline?'transparent':`linear-gradient(135deg,${c},${c}cc)`,
        border:`1.5px solid ${c}${outline?'77':'00'}`,
        borderRadius:12, padding:sm?'8px 16px':'13px 20px',
        color:outline?c:'#060d18', fontWeight:800, fontSize:sm?11:13,
        cursor:(disabled||loading)?'not-allowed':'pointer',
        opacity:(disabled||loading)?0.45:1,
        display:'flex', alignItems:'center', justifyContent:'center', gap:7,
        fontFamily:'inherit', flexShrink:0, letterSpacing:0.3 }}>
      {loading ? '⏳ Please wait…' : <>{icon && <span>{icon}</span>}{label}</>}
    </button>
  )
}

function Field({ label, value, onChange, type='text', placeholder, note, rows, prefix }) {
  const base = {
    width:'100%', background:'rgba(255,255,255,0.05)',
    border:`1.5px solid ${C.border}`, borderRadius:11,
    padding:'11px 14px', color:C.text, fontSize:13,
    outline:'none', boxSizing:'border-box', fontFamily:'inherit',
  }
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ fontSize:10, color:C.muted, letterSpacing:0.9, textTransform:'uppercase', display:'block', marginBottom:6 }}>{label}</label>}
      {rows
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...base, resize:'none'}} />
        : <div style={{ position:'relative' }}>
            {prefix && <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', fontSize:12, color:C.muted, pointerEvents:'none' }}>{prefix}</div>}
            <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder}
              style={{...base, paddingLeft:prefix?34:14}} />
          </div>
      }
      {note && <div style={{ fontSize:10, color:C.dim, marginTop:5, lineHeight:1.5 }}>{note}</div>}
    </div>
  )
}

function Card({ children, style={}, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:'15px 17px',
        cursor:onClick?'pointer':'default', ...style }}>
      {children}
    </div>
  )
}

function SLabel({ text }) {
  return <div style={{ fontSize:9, color:C.muted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:4 }}>{text}</div>
}

function Badge({ label, color }) {
  return <span style={{ background:color+'20', color, border:`1px solid ${color}44`, borderRadius:7, padding:'2px 9px', fontSize:10, fontWeight:700 }}>{label}</span>
}

function Toast({ msg, type='success', onDone }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onDone, 3500); return () => clearTimeout(t) }, [msg])
  if (!msg) return null
  const c = type === 'error' ? C.red : type === 'warn' ? '#f59e0b' : C.green
  return (
    <div style={{ position:'fixed', top:56, left:'50%', transform:'translateX(-50%)',
      background:c+'18', border:`1px solid ${c}55`, borderRadius:12,
      padding:'11px 22px', color:c, fontSize:12, fontWeight:700,
      zIndex:9999, whiteSpace:'nowrap', maxWidth:340, textAlign:'center' }}>
      {msg}
    </div>
  )
}

function Sheet({ show, onClose, title, children }) {
  if (!show) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:800, display:'flex', alignItems:'flex-end' }}>
      <div style={{ width:'100%', background:'#0a1628', borderTopLeftRadius:24, borderTopRightRadius:24,
        border:`1px solid ${C.border}`, maxHeight:'94%', overflowY:'auto', paddingBottom:28 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'18px 20px 14px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:16, fontWeight:900, color:C.text }}>{title}</div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.07)', border:'none', borderRadius:9,
            width:32, height:32, color:C.muted, fontSize:18, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'inherit' }}>×</button>
        </div>
        <div style={{ padding:'18px 20px 0' }}>{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ data, onYes, onNo }) {
  if (!data) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:'0 24px' }}>
      <div style={{ background:'#0d1b2a', border:`1px solid ${C.border}`, borderRadius:22, padding:'26px 24px', width:'100%', maxWidth:310 }}>
        <div style={{ fontSize:15, fontWeight:900, color:C.text, marginBottom:8 }}>{data.title}</div>
        <div style={{ fontSize:12, color:C.muted, marginBottom:22, lineHeight:1.7 }}>{data.msg}</div>
        <div style={{ display:'flex', gap:10 }}>
          <Btn label="Cancel" onClick={onNo} outline full sm />
          <Btn label={data.action} onClick={onYes} full sm color={data.color} />
        </div>
      </div>
    </div>
  )
}

function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'40px 20px' }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:6 }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{sub}</div>}
    </div>
  )
}

// ── LOGIN ──────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [un, setUn]       = useState('')
  const [pw, setPw]       = useState('')
  const [show, setShow]   = useState(false)
  const [err, setErr]     = useState('')
  const [loading, setL]   = useState(false)

  async function login() {
    if (!un || !pw) { setErr('Enter username and password'); return }
    setL(true); setErr('')
    try {
      const email = un.trim().toLowerCase().includes('@')
        ? un.trim().toLowerCase()
        : `${un.trim().toLowerCase().replace(/\s/g,'.')}@anandfinco.com`
      const cred = await signInWithEmailAndPassword(auth, email, pw)
      onLogin(cred.user)
    } catch (e) {
      const map = {
        'auth/invalid-credential': 'Wrong username or password.',
        'auth/user-not-found':     'Account not found.',
        'auth/wrong-password':     'Incorrect password.',
        'auth/too-many-requests':  'Too many attempts. Try again later.',
      }
      setErr(map[e.code] || 'Login failed. Check credentials.')
    }
    setL(false)
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'32px 22px',
      background:`linear-gradient(160deg,${C.bg},${C.bg2})` }}>
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ width:70, height:70, borderRadius:20,
          background:`linear-gradient(135deg,${C.gold},${C.goldL})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 12px', boxShadow:`0 8px 32px ${C.gold}40`, fontSize:28 }}>₹</div>
        <div style={{ fontFamily:'Playfair Display,Georgia,serif', fontSize:22, fontWeight:700, color:'#e8d5a3' }}>Anand Finco</div>
        <div style={{ fontSize:10, color:C.muted, marginTop:4, letterSpacing:1.5, textTransform:'uppercase' }}>Private Wealth Management</div>
      </div>

      <div style={{ width:'100%', maxWidth:360, background:'rgba(255,255,255,0.04)',
        border:`1px solid ${C.border}`, borderRadius:20, padding:'24px 20px' }}>
        <div style={{ fontSize:17, fontWeight:900, color:C.text, marginBottom:18 }}>Welcome Back</div>

        <Field label="Username" value={un} onChange={setUn} placeholder="e.g. rahul.sharma" />

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:6 }}>Password</label>
          <div style={{ position:'relative' }}>
            <input value={pw} onChange={e=>setPw(e.target.value)} type={show?'text':'password'}
              placeholder="Enter password" onKeyDown={e=>e.key==='Enter'&&login()}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`,
                borderRadius:10, padding:'11px 42px 11px 13px', color:C.text, fontSize:13,
                outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
            <button onClick={()=>setShow(s=>!s)}
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:16 }}>
              {show ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {err && (
          <div style={{ background:C.redBg, border:`1px solid ${C.redBd}`, borderRadius:8,
            padding:'8px 12px', color:C.red, fontSize:11, marginBottom:12 }}>⚠ {err}</div>
        )}

        <Btn label="Sign In" onClick={login} loading={loading} full />
        <div style={{ textAlign:'center', fontSize:10, color:C.dim, marginTop:14 }}>
          🔒 Secured by Firebase Auth
        </div>
      </div>
    </div>
  )
}

// ── SELL FLOW ──────────────────────────────────────────────────────────────
function SellFlow({ holding, adminPhone, onClose, onSuccess }) {
  const [step,    setStep]  = useState('amount')
  const [sellPct, setSellPct] = useState(100) // % of stake to sell: 25, 50, 75, 100
  const [askVal,  setAskVal]= useState(String(holding.currentValuation || 0))
  const [reason,  setReason]= useState('')
  const [bank,    setBank]  = useState({ accountName:'', accountNo:'', confirmNo:'', ifsc:'', bankName:'', accountType:'savings' })
  const [errors,  setErrors]= useState({})
  const [loading, setL]     = useState(false)

  const totalStake  = holding.stake || 0
  const sellStake   = parseFloat(((totalStake * sellPct) / 100).toFixed(6))
  const askValNum   = parseInt(askVal) || 0
  const stakeRatio  = sellPct / 100
  const sellValue   = stakeRatio * (askValNum * totalStake / 100)   // payout = (stake%/100) * valuation
  const invested    = holding.investedAmount || 0
  const sellCost    = stakeRatio * invested
  const gainLoss    = sellValue - sellCost
  const gainPct     = sellCost > 0 ? (gainLoss / sellCost * 100) : 0
  const currVal     = (totalStake / 100) * (holding.currentValuation || 0)
  const investedVal = invested

  function validateBank() {
    const e = {}
    if (!bank.accountName.trim()) e.accountName = 'Required'
    if (!/^\d{9,18}$/.test(bank.accountNo)) e.accountNo = 'Enter valid 9–18 digit account number'
    if (bank.accountNo !== bank.confirmNo)  e.confirmNo = 'Account numbers do not match'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc.toUpperCase())) e.ifsc = 'Invalid IFSC (e.g. SBIN0001234)'
    if (!bank.bankName.trim()) e.bankName = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submitSell() {
    setL(true)
    try {
      await addDoc(collection(db, 'sellRequests'), {
        clientId:       auth.currentUser?.uid || '',
        clientEmail:    auth.currentUser?.email || '',
        holdingId:      holding.id || '',
        companyName:    holding.companyName || holding.company || '',
        sector:         holding.sector || '',
        sellPercent:    sellPct,
        stakeToSell:    sellStake,
        askingValuation:askValNum,
        expectedPayout: sellValue,
        gainLoss,
        gainPct,
        reason:         reason || 'Not specified',
        bankAccountName:bank.accountName,
        bankName:       bank.bankName,
        bankAccountNo:  '●●●●' + bank.accountNo.slice(-4),
        bankIFSC:       bank.ifsc.toUpperCase(),
        bankAccountType:bank.accountType,
        timestamp:      Timestamp.now(),
        status:         'pending',
        read:           false,
      })
      // WhatsApp to admin
      const clean = (adminPhone || '').replace(/\D/g,'')
      if (clean) {
        const msg = encodeURIComponent(
          `🔔 *Sell Request – Anand Finco*\n\n` +
          `Client: ${auth.currentUser?.email}\n` +
          `Company: ${holding.companyName || holding.company}\n` +
          `Selling: ${sellPct}% of stake (${sellStake}%)\n` +
          `Asking Valuation: ${fmtCr(askValNum)}\n` +
          `*Expected Payout: ${fmt(sellValue)}*\n\nPlease review in app.`
        )
        window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
      }
      setStep('done')
    } catch(e) {
      setErrors({ submit: e.message })
    }
    setL(false)
  }

  const prog = { amount:1, bank:2, review:3, done:4 }[step]

  return (
    <div>
      {/* Progress bar */}
      {step !== 'done' && (
        <div style={{ marginBottom:22 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            {['Sell Details','Bank Details','Review'].map((s,i) => (
              <div key={s} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flex:1 }}>
                <div style={{ width:28, height:28, borderRadius:'50%',
                  background: prog>i+1 ? C.green : prog===i+1 ? C.gold : 'rgba(255,255,255,0.07)',
                  border:`2px solid ${prog>i+1 ? C.green : prog===i+1 ? C.gold : 'rgba(255,255,255,0.12)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontWeight:900,
                  color: prog>i+1 ? '#060d18' : prog===i+1 ? '#060d18' : C.muted }}>
                  {prog>i+1 ? '✓' : i+1}
                </div>
                <div style={{ fontSize:8, color:prog===i+1?C.gold:C.muted, fontWeight:700, textAlign:'center' }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${((prog-1)/2)*100}%`,
              background:`linear-gradient(90deg,${C.gold},${C.goldL})`,
              borderRadius:99, transition:'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* STEP 1 — Sell Details */}
      {step === 'amount' && (
        <div>
          {/* Company card */}
          <div style={{ background:'linear-gradient(135deg,#0f2744,#0a1e38)',
            border:`1px solid ${C.goldBd}`, borderRadius:16, padding:'16px 18px', marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:900, color:C.text }}>{holding.companyName || holding.company}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{holding.sector} · {holding.stake}% total stake</div>
              </div>
              <Badge label={`${(currVal-investedVal)>=0?'+':''}${pct(currVal,investedVal)}%`} color={gc(currVal-investedVal)} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              {[
                ['You Invested',  fmt(investedVal),                                              C.text2],
                ['Current Value', fmt(currVal),                                                  C.gold],
                ['Unrealised P&L',(currVal-investedVal>=0?'+':'')+fmt(currVal-investedVal),      gc(currVal-investedVal)],
              ].map(([l,v,c]) => (
                <div key={l} style={{ background:'rgba(0,0,0,0.3)', borderRadius:10, padding:'9px 10px' }}>
                  <SLabel text={l}/><div style={{ fontSize:12, fontWeight:800, color:c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stake % selector */}
          <div style={{ marginBottom:18 }}>
            <label style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, fontWeight:700, display:'block', marginBottom:10 }}>
              How much stake to sell?
            </label>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
              {[25, 50, 75, 100].map(p => (
                <button key={p} onClick={()=>setSellPct(p)}
                  style={{ background:sellPct===p?`linear-gradient(135deg,${C.red},${C.red}bb)`:'rgba(255,255,255,0.06)',
                    border:`1.5px solid ${sellPct===p?'transparent':C.border}`,
                    borderRadius:11, padding:'12px 6px', cursor:'pointer', fontFamily:'inherit',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ fontSize:16, fontWeight:900, color:sellPct===p?'#fff':C.text }}>{p}%</div>
                  <div style={{ fontSize:9, color:sellPct===p?'rgba(255,255,255,0.7)':C.muted }}>
                    {parseFloat(((totalStake*p)/100).toFixed(4))}% stake
                  </div>
                </button>
              ))}
            </div>
            <div style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`,
              borderRadius:10, padding:'10px 14px', marginTop:10, textAlign:'center' }}>
              <span style={{ fontSize:12, color:C.muted }}>Selling </span>
              <span style={{ fontSize:14, fontWeight:900, color:C.gold }}>{sellPct}%</span>
              <span style={{ fontSize:12, color:C.muted }}> of your stake = </span>
              <span style={{ fontSize:14, fontWeight:900, color:C.text }}>{sellStake}%</span>
            </div>
          </div>

          <Field label="Asking Company Valuation (₹)" value={askVal} onChange={setAskVal}
            type="number" placeholder={String(holding.currentValuation||0)}
            note={`Current valuation: ${fmtCr(holding.currentValuation||0)} · Set your asking price`} />

          {/* Payout calc */}
          <div style={{ background:gainLoss>=0?C.greenBg:C.redBg,
            border:`1px solid ${gainLoss>=0?C.greenBd:C.redBd}`,
            borderRadius:14, padding:'16px 18px', marginBottom:18 }}>
            <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:10 }}>
              Expected Payout Breakdown
            </div>
            {[
              ['Selling',           `${sellPct}% of your stake (${sellStake}%)`, C.text],
              ['Your Cost (portion)',fmt(sellCost),                               C.text2],
              ['At Your Valuation', fmtCr(askValNum),                            C.text2],
              ['Expected Payout',   fmt(sellValue),                              C.gold],
            ].map(([l,v,c]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                <span style={{ fontSize:11, color:C.muted }}>{l}</span>
                <span style={{ fontSize:11, fontWeight:700, color:c }}>{v}</span>
              </div>
            ))}
            <div style={{ height:1, background:'rgba(255,255,255,0.07)', margin:'10px 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, fontWeight:800, color:C.text }}>
                {gainLoss>=0 ? '🎉 Estimated Profit' : '⚠ Estimated Loss'}
              </span>
              <span style={{ fontSize:17, fontWeight:900, color:gc(gainLoss) }}>
                {gainLoss>=0?'+':''}{fmt(gainLoss)} ({gainLoss>=0?'+':''}{gainPct.toFixed(1)}%)
              </span>
            </div>
          </div>

          <Field label="Reason for Selling (optional)" value={reason} onChange={setReason}
            rows={3} placeholder="e.g. Need liquidity, Portfolio rebalancing…" />

          <div style={{ background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.25)',
            borderRadius:11, padding:'10px 14px', marginBottom:18, fontSize:11, color:'#f59e0b', lineHeight:1.7 }}>
            ⏳ <strong>How selling works:</strong> Your request is listed. Admin finds a buyer from the investor network. Payout is transferred to your bank after buyer confirmation. Typical time: 7–30 days.
          </div>
          <Btn label="Continue to Bank Details →" onClick={()=>setStep('bank')} full />
        </div>
      )}

      {/* STEP 2 — Bank Details */}
      {step === 'bank' && (
        <div>
          <div style={{ background:C.goldBg, border:`1px solid ${C.goldBd}`,
            borderRadius:12, padding:'11px 14px', marginBottom:18, fontSize:11, color:C.gold, lineHeight:1.7 }}>
            🔒 Bank details are used only for payout processing. Account number is masked in our records.
          </div>

          <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`,
            borderRadius:14, padding:'16px', marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:14 }}>👤 Account Holder</div>
            <Field label="Full Name (as per bank records) *"
              value={bank.accountName}
              onChange={v=>{setBank(b=>({...b,accountName:v}));setErrors(e=>({...e,accountName:null}))}}
              placeholder="Rahul Sharma"
              note={errors.accountName ? `⚠ ${errors.accountName}` : 'Must match bank account name exactly'} />
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, display:'block', marginBottom:8 }}>Account Type *</label>
              <div style={{ display:'flex', gap:8 }}>
                {['savings','current'].map(t => (
                  <button key={t} onClick={()=>setBank(b=>({...b,accountType:t}))}
                    style={{ flex:1, background:bank.accountType===t?`linear-gradient(135deg,${C.gold},${C.goldL})`:'rgba(255,255,255,0.05)',
                      border:`1.5px solid ${bank.accountType===t?'transparent':C.border}`,
                      borderRadius:10, padding:'9px', color:bank.accountType===t?'#060d18':C.muted,
                      fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'inherit', textTransform:'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`,
            borderRadius:14, padding:'16px', marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:14 }}>🏦 Bank Account Details</div>
            <Field label="Bank Name *" value={bank.bankName}
              onChange={v=>{setBank(b=>({...b,bankName:v}));setErrors(e=>({...e,bankName:null}))}}
              placeholder="State Bank of India"
              note={errors.bankName?`⚠ ${errors.bankName}`:''}/>
            <Field label="Account Number *" value={bank.accountNo} type="password"
              onChange={v=>{setBank(b=>({...b,accountNo:v.replace(/\D/g,'')}));setErrors(e=>({...e,accountNo:null}))}}
              placeholder="Enter account number"
              note={errors.accountNo?`⚠ ${errors.accountNo}`:'9–18 digits. Hidden for security.'}/>
            <Field label="Confirm Account Number *" value={bank.confirmNo}
              onChange={v=>{setBank(b=>({...b,confirmNo:v.replace(/\D/g,'')}));setErrors(e=>({...e,confirmNo:null}))}}
              placeholder="Re-enter account number"
              note={errors.confirmNo?`⚠ ${errors.confirmNo}`:bank.confirmNo&&bank.accountNo===bank.confirmNo?'✅ Account numbers match':''}/>
            <Field label="IFSC Code *" value={bank.ifsc.toUpperCase()}
              onChange={v=>{setBank(b=>({...b,ifsc:v.toUpperCase().slice(0,11)}));setErrors(e=>({...e,ifsc:null}))}}
              placeholder="SBIN0001234"
              note={errors.ifsc?`⚠ ${errors.ifsc}`:'11-character IFSC on your cheque/passbook'}/>
          </div>

          <div style={{ background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.25)',
            borderRadius:11, padding:'10px 14px', marginBottom:18, fontSize:11, color:C.blue, lineHeight:1.7 }}>
            🔐 Account number is masked during storage. Admin initiates NEFT/IMPS transfer after buyer payment clearance.
          </div>

          {errors.submit && <div style={{ background:C.redBg, border:`1px solid ${C.redBd}`, borderRadius:8, padding:'8px 12px', color:C.red, fontSize:11, marginBottom:12 }}>⚠ {errors.submit}</div>}

          <div style={{ display:'flex', gap:10 }}>
            <Btn label="← Back" onClick={()=>setStep('amount')} outline full sm />
            <Btn label="Review Request →" onClick={()=>{if(validateBank())setStep('review')}} full />
          </div>
        </div>
      )}

      {/* STEP 3 — Review */}
      {step === 'review' && (
        <div>
          <div style={{ background:C.redBg, border:`1px solid ${C.redBd}`,
            borderRadius:12, padding:'11px 14px', marginBottom:18, fontSize:11, color:C.red, lineHeight:1.7 }}>
            ⚠ Please review carefully. Once submitted, this request cannot be cancelled without admin approval.
          </div>

          <Card style={{ marginBottom:14, border:`1px solid ${C.goldBd}` }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.gold, marginBottom:12, textTransform:'uppercase', letterSpacing:0.5 }}>📊 Sell Summary</div>
            {[
              ['Company',       holding.companyName||holding.company],
              ['Stake Selling', `${sellPct}% of your holding (${sellStake}%)`],
              ['Asking Val.',   fmtCr(askValNum)],
              ['Expected Payout',fmt(sellValue)],
              ['Est. Profit/Loss',`${gainLoss>=0?'+':''}${fmt(gainLoss)} (${gainLoss>=0?'+':''}${gainPct.toFixed(1)}%)`],
            ].map(([l,v],i) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'7px 0', borderBottom:i<5?`1px solid ${C.border}`:'none' }}>
                <span style={{ fontSize:11, color:C.muted }}>{l}</span>
                <span style={{ fontSize:11, fontWeight:700, color:l==='Expected Payout'?C.gold:l.includes('Profit')?gc(gainLoss):C.text }}>{v}</span>
              </div>
            ))}
          </Card>

          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.text, marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>🏦 Payout Bank Account</div>
            {[
              ['Account Name', bank.accountName],
              ['Bank',         bank.bankName],
              ['Account No.',  `●●●●${bank.accountNo.slice(-4)}`],
              ['IFSC',         bank.ifsc.toUpperCase()],
              ['Type',         bank.accountType.charAt(0).toUpperCase()+bank.accountType.slice(1)],
            ].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:11, color:C.muted }}>{l}</span>
                <span style={{ fontSize:11, fontWeight:700, color:C.text }}>{v}</span>
              </div>
            ))}
          </Card>

          <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`,
            borderRadius:12, padding:'13px 15px', marginBottom:18 }}>
            <div style={{ fontSize:10, color:C.muted, lineHeight:1.8 }}>
              By submitting, I confirm:<br/>
              • Bank account details provided are correct and belong to me.<br/>
              • Payout is subject to buyer availability and may take 7–30 business days.<br/>
              • TDS as applicable under Income Tax Act will be deducted before payout.
            </div>
          </div>

          {errors.submit && <div style={{ background:C.redBg, border:`1px solid ${C.redBd}`, borderRadius:8, padding:'8px 12px', color:C.red, fontSize:11, marginBottom:12 }}>⚠ {errors.submit}</div>}

          <div style={{ display:'flex', gap:10 }}>
            <Btn label="← Edit" onClick={()=>setStep('bank')} outline full sm />
            <Btn label={loading?'Submitting…':'Submit Sell Request'} onClick={submitSell}
              full loading={loading} color={C.red} />
          </div>
        </div>
      )}

      {/* STEP 4 — Done */}
      {step === 'done' && (
        <div style={{ textAlign:'center', padding:'10px 0 14px' }}>
          <div style={{ width:80, height:80, borderRadius:'50%',
            background:C.greenBg, border:`2px solid ${C.greenBd}`,
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 18px', fontSize:36 }}>✅</div>
          <div style={{ fontSize:20, fontWeight:900, color:C.green, marginBottom:8 }}>Request Submitted!</div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.8, marginBottom:22 }}>
            Your sell request for <strong style={{color:C.text}}>{holding.companyName||holding.company}</strong><br/>
            has been sent to the Anand Finco team.<br/>
            Admin has been notified on WhatsApp.
          </div>
          <div style={{ background:C.goldBg, border:`1px solid ${C.goldBd}`,
            borderRadius:14, padding:'16px 18px', marginBottom:20, textAlign:'left' }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.gold, marginBottom:12 }}>📋 What happens next?</div>
            {[
              ['Admin Reviews',    'Your request is listed in the investor network.'],
              ['Buyer Matched',    'A buyer is found. This may take 7–30 days.'],
              ['Payment Cleared',  'Buyer payment is received and verified.'],
              ['Payout to You',    'Amount transferred to your bank via NEFT/IMPS.'],
              ['Portfolio Updated','Your holding is reduced/removed automatically.'],
            ].map(([t,d],i) => (
              <div key={t} style={{ display:'flex', gap:12, marginBottom:10, alignItems:'flex-start' }}>
                <div style={{ width:22, height:22, borderRadius:'50%',
                  background:`linear-gradient(135deg,${C.gold},${C.goldL})`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:10, fontWeight:900, color:'#060d18', flexShrink:0 }}>{i+1}</div>
                <div>
                  <div style={{ fontSize:11, fontWeight:800, color:C.text }}>{t}</div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2, lineHeight:1.5 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
          <Btn label="Back to Portfolio" onClick={()=>{ onSuccess && onSuccess(); onClose(); }} full />
        </div>
      )}
    </div>
  )
}

// ── CLIENT — HOME ──────────────────────────────────────────────────────────
function HomeScreen({ user }) {
  const [companies,  setCompanies]  = useState([])
  const [portfolio,  setPortfolio]  = useState([])
  const [adminPhone, setAdminPhone] = useState('')
  const [investing,  setInvesting]  = useState(null)
  const [sending,    setSending]    = useState(false)
  const [done,       setDone]       = useState(false)
  const [toast,      setToast]      = useState(null)

  const load = useCallback(async () => {
    try {
      const [coSnap, pdSnap, cfgSnap] = await Promise.all([
        getDocs(query(collection(db, 'companies'), where('active', '==', true))),
        getDoc(doc(db, 'portfolios', user.uid)),
        getDoc(doc(db, 'adminConfig', 'main')),
      ])
      setCompanies(coSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setPortfolio(pdSnap.exists() ? pdSnap.data().holdings || [] : [])
      if (cfgSnap.exists()) setAdminPhone(cfgSnap.data().whatsapp || '')
    } catch (e) { console.log('home load:', e.message) }
  }, [user.uid])

  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setInterval(load, 20000); return () => clearInterval(t) }, [load])

  const totI  = portfolio.reduce((s, h) => s + (h.stake / 100) * h.buyValuation, 0)
  const totC  = portfolio.reduce((s, h) => { const co = companies.find(c => c.id === h.companyId); return s + (h.stake / 100) * (co?.currentValuation || h.buyValuation) }, 0)
  const totG  = totC - totI
  const totGP = totI > 0 ? (totG / totI) * 100 : 0

  async function confirmInvest() {
    if (!investing) return
    setSending(true)
    try {
      await addDoc(collection(db, 'notifications'), {
        clientId: user.uid, clientName: user.name || user.email,
        clientPhone: user.phone || 'N/A', clientEmail: user.email,
        companyId: investing.id, companyName: investing.name,
        interestedMin: investing.minInvest,
        message: `${user.name || 'Client'} is interested in ${investing.name} (min ${fmt(investing.minInvest)})`,
        timestamp: Timestamp.now(), read: false,
      })
      if (adminPhone) {
        const msg = encodeURIComponent(`Hello Anand Finco!\n\nI'm *${user.name || 'your client'}* (${user.email}).\nInterested in *${investing.name}*.\nMin: ${fmt(investing.minInvest)}\nContact: ${user.phone || 'see app'}\n\n– Anand Finco App`)
        window.open(`https://wa.me/${adminPhone.replace(/\D/g, '')}?text=${msg}`, '_blank')
      }
      setDone(true)
    } catch { setToast({ m: 'Could not send request. Try again.', t: 'error' }) }
    setSending(false)
  }

  const riskC = { Low: C.green, Medium: '#f59e0b', High: C.red }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,#0c1525,#0f2744)', padding: '52px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted }}>Good day,</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {(user.name || 'Investor').split(' ')[0]} 👋
            </div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0f1e', fontSize: 18, boxShadow: `0 4px 20px ${C.gold}40` }}>
            {(user.name || 'I')[0]}
          </div>
        </div>
        {/* Summary card */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.goldBd}`, borderRadius: 18, padding: 18 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>TOTAL PORTFOLIO VALUE</div>
          <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 30, fontWeight: 800, color: '#e8d5a3', margin: '6px 0 14px' }}>{fmt(totC)}</div>
          <div style={{ height: 1, background: C.border, marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 20 }}>
            {[['INVESTED', fmt(totI), C.text2], ['GAIN', (totG >= 0 ? '+' : '') + fmt(totG), gc(totG)], ['RETURN', pct(totGP), gc(totGP)]].map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>{l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: c, marginTop: 3 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 18px 30px' }}>
        {/* Active Holdings */}
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 14 }}>Active Investments</div>
        {portfolio.length === 0
          ? <Empty icon="🏦" title="No investments yet" sub="Your holdings will appear here" />
          : portfolio.map((h, i) => {
            const co   = companies.find(c => c.id === h.companyId)
            const curr = (h.stake / 100) * (co?.currentValuation || h.buyValuation)
            const buy  = (h.stake / 100) * h.buyValuation
            const g    = curr - buy
            const gp   = buy > 0 ? (g / buy) * 100 : 0
            return (
              <Card key={i} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: '#0f2744', border: '1px solid #2563eb33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏛️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.companyName}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{h.stake}% stake · {h.sector}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{fmt(curr)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: gc(gp), marginTop: 2 }}>{pct(gp)}</div>
                </div>
              </Card>
            )
          })}

        {/* Opportunities */}
        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 4, marginTop: 26 }}>Opportunities</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>Admin curated · Live pricing</div>
        {companies.length === 0
          ? <Empty icon="📭" title="No opportunities right now" sub="Check back soon" />
          : <div style={{ display: 'flex', gap: 12, overflowX: 'auto', marginLeft: -18, paddingLeft: 18, paddingRight: 18, paddingBottom: 8 }}>
            {companies.map(co => (
              <div key={co.id} style={{ minWidth: 210, background: '#0f2031', border: `1px solid ${C.goldBd}`, borderRadius: 18, padding: 16, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1.3, flex: 1 }}>{co.name}</div>
                  <Badge label={co.risk} color={riskC[co.risk] || C.muted} />
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>{co.sector}</div>
                {[['MIN INVEST', fmt(co.minInvest), C.gold], ['VALUATION', fmtL(co.currentValuation), C.text2], ['RETURNS', co.expectedReturns, C.green]].map(([l, v, c]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: C.muted }}>{l}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{v}</span>
                  </div>
                ))}
                <button onClick={() => { setInvesting(co); setDone(false) }}
                  style={{ width: '100%', marginTop: 12, background: `linear-gradient(90deg,${C.gold},${C.goldL})`, border: 'none', borderRadius: 10, padding: 10, color: '#0a0f1e', fontWeight: 900, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Invest Now →
                </button>
              </div>
            ))}
          </div>}
      </div>

      {/* Invest sheet */}
      <Sheet show={!!investing} onClose={() => { setInvesting(null); setDone(false) }} title={done ? '' : 'Express Interest'}>
        {investing && !done && (
          <>
            <Card style={{ marginBottom: 16, background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>{investing.name}</div>
              {[['Sector', investing.sector], ['Min Investment', fmt(investing.minInvest)], ['Valuation', fmtL(investing.currentValuation)], ['Expected Returns', investing.expectedReturns], ['Risk', investing.risk]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{v}</span>
                </div>
              ))}
            </Card>
            <div style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 10, padding: '10px 13px', marginBottom: 16, fontSize: 12, color: C.gold, lineHeight: 1.6 }}>
              📲 Our team will contact you on <b>{user.phone || 'your registered number'}</b> within 24 hours.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn label="Cancel" onClick={() => setInvesting(null)} outline full />
              <Btn label={sending ? 'Sending…' : 'Confirm Interest'} onClick={confirmInvest} loading={sending} color={C.green} full />
            </div>
          </>
        )}
        {done && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.green, marginBottom: 8 }}>Request Sent!</div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>Your interest has been recorded.<br />WhatsApp opened to connect with our team.</div>
            <Btn label="Close" onClick={() => { setInvesting(null); setDone(false) }} full />
          </div>
        )}
      </Sheet>
    </div>
// ── CLIENT — PORTFOLIO ─────────────────────────────────────────────────────
function PortfolioScreen({ clientData, adminPhone }) {
  const [portfolioData, setPortfolioData] = useState(null)
  const [companies,     setCompanies]     = useState([])
  const [selected,      setSelected]      = useState(null)
  const [activeSheet,   setActiveSheet]   = useState(null) // 'sell' | 'buyMore'
  const [toast,         setToast]         = useState(null)
  const [loading,       setLoading]       = useState(true)

  async function load() {
    if (!auth.currentUser) return
    setLoading(true)
    try {
      const [pd, coSnap] = await Promise.all([
        getDoc(doc(db,'portfolios',auth.currentUser.uid)),
        getDocs(collection(db,'companies')),
      ])
      setPortfolioData(pd.exists() ? pd.data() : { holdings:[] })
      const coMap = {}
      coSnap.docs.forEach(d => { coMap[d.id] = { id:d.id, ...d.data() } })
      setCompanies(coMap)
    } catch(e) { console.error(e) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const holdings = portfolioData?.holdings || []

  // Use investedAmount if set, else calculate from stake × buyValuation
  const totInvested = holdings.reduce((s,h) => {
    const inv = h.investedAmount > 0 ? h.investedAmount : ((h.stake||0)/100)*(h.buyValuation||0)
    return s + inv
  }, 0)
  const totCurrent = holdings.reduce((s,h) => {
    const co = companies[h.companyId]
    const liveVal = co?.valuation || h.buyValuation || 0
    return s + ((h.stake||0)/100)*liveVal
  }, 0)
  const totGain = totCurrent - totInvested
  const totPct  = totInvested > 0 ? totGain/totInvested*100 : 0

  function getHoldingWithCompany(h) {
    const co = companies[h.companyId] || {}
    const liveVal = co.valuation || h.buyValuation || 0
    const invested = h.investedAmount > 0 ? h.investedAmount : ((h.stake||0)/100)*(h.buyValuation||0)
    return {
      ...h,
      companyName:      co.name || h.companyName || 'Unknown',
      sector:           co.sector || h.sector || '—',
      currentValuation: liveVal,
      buyValuation:     h.buyValuation || liveVal,
      investedAmount:   invested,
      lotSize:          h.lotSize || 0.5,
    }
  }

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={()=>setToast(null)}/>

      <div style={{ background:C.bg2, padding:'52px 18px 18px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ fontSize:24, fontWeight:900, color:C.text }}>My Portfolio</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>{holdings.length} holdings · Tap a company to buy/sell</div>
      </div>

      {/* Summary */}
      {!loading && holdings.length > 0 && (
        <div style={{ padding:'12px 18px 0', flexShrink:0 }}>
          <div style={{ background:'linear-gradient(135deg,#0f2744,#0a1e38)',
            border:`1px solid ${C.goldBd}`, borderRadius:16, padding:'14px 18px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
              {[
                ['Invested', fmt(totInvested), C.text2],
                ['Current',  fmt(totCurrent),  C.gold],
                ['Gain',     (totGain>=0?'+':'')+fmt(totGain), gc(totGain)],
                ['Return',   (totPct>=0?'+':'')+totPct.toFixed(1)+'%', gc(totPct)],
              ].map(([l,v,c]) => (
                <div key={l} style={{ textAlign:'center' }}>
                  <SLabel text={l}/>
                  <div style={{ fontSize:12, fontWeight:900, color:c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto', padding:'14px 18px 30px' }}>
        {loading && <div style={{ textAlign:'center', padding:'30px 0', color:C.muted }}>Loading portfolio…</div>}

        {!loading && holdings.length === 0 && (
          <Empty icon="📊" title="No holdings yet" sub="Invest in unlisted stocks from the Home tab. Your portfolio will appear here once admin approves." />
        )}

        {!loading && holdings.map((h) => {
          const hc      = getHoldingWithCompany(h)
          const currVal = (hc.stake/100)*hc.currentValuation
          const buyVal  = hc.investedAmount   // use actual invested amount
          const gain    = currVal - buyVal
          const gainP   = buyVal > 0 ? gain/buyVal*100 : 0
          const isOpen  = selected?.id === h.id

          return (
            <div key={h.id} style={{ marginBottom:12 }}>
              <div onClick={()=>setSelected(isOpen?null:hc)}
                style={{ background:isOpen?'rgba(201,162,39,0.06)':C.card,
                  border:`1px solid ${isOpen?C.goldBd:C.border}`,
                  borderRadius:isOpen?'16px 16px 0 0':16, padding:'15px 17px', cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'center', flex:1 }}>
                    <div style={{ width:44, height:44, borderRadius:13,
                      background:'linear-gradient(135deg,#1e3a5f,#0f2744)',
                      border:'1px solid rgba(59,130,246,0.25)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🏛️</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:C.text }}>{hc.companyName}</div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                        {hc.sector} · {hc.stake}% stake
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <div style={{ fontSize:13, fontWeight:900, color:C.text }}>{fmt(currVal)}</div>
                    <Badge label={`${gain>=0?'+':''}${gainP.toFixed(1)}%`} color={gc(gain)}/>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:12 }}>
                  {[
                    ['Invested',  fmt(buyVal),                              C.text2],
                    ['P&L',       (gain>=0?'+':'')+fmt(gain),               gc(gain)],
                    ['Valuation', fmtCr(hc.currentValuation)+' 🔴 LIVE',    C.gold],
                  ].map(([l,v,c]) => (<div key={l}><SLabel text={l}/><div style={{ fontSize:11, fontWeight:700, color:c }}>{v}</div></div>))}
                </div>
                <div style={{ textAlign:'center', marginTop:10, fontSize:10, color:C.muted }}>
                  {isOpen ? '▲ tap to collapse' : '▼ tap to buy / sell'}
                </div>
              </div>

              {/* Action panel */}
              {isOpen && (
                <div style={{ background:'rgba(10,22,40,0.97)', border:`1px solid ${C.goldBd}`,
                  borderTop:'none', borderRadius:'0 0 16px 16px', padding:'16px 17px' }}>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:12, textAlign:'center' }}>
                    What would you like to do with <strong style={{color:C.text}}>{hc.companyName}</strong>?
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                    <button onClick={()=>setActiveSheet('sell')}
                      style={{ background:C.redBg, border:`1.5px solid ${C.redBd}`,
                        borderRadius:13, padding:'14px 10px', cursor:'pointer', fontFamily:'inherit',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                      <div style={{ fontSize:22 }}>💸</div>
                      <div style={{ fontSize:12, fontWeight:900, color:C.red }}>Sell Stake</div>
                      <div style={{ fontSize:9, color:C.muted, textAlign:'center', lineHeight:1.4 }}>
                        List your stake for sale. Payout on buyer match.
                      </div>
                    </button>
                    <button onClick={()=>setActiveSheet('buyMore')}
                      style={{ background:C.greenBg, border:`1.5px solid ${C.greenBd}`,
                        borderRadius:13, padding:'14px 10px', cursor:'pointer', fontFamily:'inherit',
                        display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                      <div style={{ fontSize:22 }}>📈</div>
                      <div style={{ fontSize:12, fontWeight:900, color:C.green }}>Buy More</div>
                      <div style={{ fontSize:9, color:C.muted, textAlign:'center', lineHeight:1.4 }}>
                        Increase your stake at current valuation.
                      </div>
                    </button>
                  </div>
                  <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${C.border}`,
                    borderRadius:12, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Holding Details</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        ['Your Stake',     `${hc.stake}%`],
                        ['Amount Invested',fmt(hc.investedAmount)],
                        ['Buy Valuation',  fmtCr(hc.buyValuation)],
                        ['Live Valuation', fmtCr(hc.currentValuation)],
                        ['Unrealised P&L', (gain>=0?'+':'')+fmt(gain)],
                        ['Since',          h.joinDate||'—'],
                      ].map(([l,v]) => (<div key={l}><SLabel text={l}/><div style={{ fontSize:11, fontWeight:700, color:l==='Unrealised P&L'?gc(gain):l==='Live Valuation'?C.gold:C.text2 }}>{v}</div></div>))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

      </div>

      {/* Sell Sheet */}
      <Sheet show={activeSheet==='sell'} onClose={()=>setActiveSheet(null)}
        title={`Sell Stake — ${selected?.companyName||''}`}>
        {selected && (
          <SellFlow holding={selected} adminPhone={adminPhone}
            onClose={()=>setActiveSheet(null)}
            onSuccess={()=>{ setToast({m:'✅ Sell request submitted!'}); load() }} />
        )}
      </Sheet>

      {/* Buy More Sheet */}
      <Sheet show={activeSheet==='buyMore'} onClose={()=>setActiveSheet(null)}
        title={`Buy More — ${selected?.companyName||''}`}>
        {selected && <BuyMoreFlow holding={selected} adminPhone={adminPhone}
          clientData={clientData}
          onClose={()=>{ setActiveSheet(null); setToast({m:'✅ Interest submitted to admin!'}); }} />}
      </Sheet>
    </div>
  )
}

// ── BUY MORE FLOW ──────────────────────────────────────────────────────────
function BuyMoreFlow({ holding, adminPhone, clientData, onClose }) {
  const [pct,     setPct]  = useState(50) // % of current stake to add
  const [done,    setDone] = useState(false)
  const [loading, setL]    = useState(false)
  const addStake = parseFloat(((holding.stake||0) * pct / 100).toFixed(6))
  const price    = (addStake / 100) * (holding.currentValuation||0)

  async function submit() {
    setL(true)
    try {
      await addDoc(collection(db,'notifications'),{
        type:'buyMore', clientId:auth.currentUser?.uid||'',
        clientEmail:auth.currentUser?.email||'',
        clientName:clientData?.name||'', clientPhone:clientData?.phone||'',
        companyId:holding.companyId||'', companyName:holding.companyName||holding.company||'',
        sector:holding.sector||'',
        addPercent:pct, stakeToAdd:addStake,
        currentValuation:holding.currentValuation||0,
        estimatedInvestment:price,
        timestamp:Timestamp.now(), status:'pending', read:false,
      })
      const clean = (adminPhone||'').replace(/\D/g,'')
      if (clean) {
        const msg = encodeURIComponent(`🔔 *Buy More Request – Anand Finco*\n\nClient: ${clientData?.name||auth.currentUser?.email}\nCompany: ${holding.companyName}\nAdding: ${pct}% more (+${addStake}% stake)\nValuation: ${fmtCr(holding.currentValuation||0)}\n*Est. Investment: ${fmt(price)}*`)
        window.open(`https://wa.me/${clean}?text=${msg}`,'_blank')
      }
      setDone(true)
    } catch(e) { console.error(e) }
    setL(false)
  }

  if (done) return (
    <div style={{ textAlign:'center', padding:'20px 0' }}>
      <div style={{ fontSize:50, marginBottom:14 }}>🎉</div>
      <div style={{ fontSize:18, fontWeight:900, color:C.green, marginBottom:8 }}>Interest Recorded!</div>
      <div style={{ fontSize:12, color:C.muted, marginBottom:20, lineHeight:1.7 }}>Admin notified. They will contact you to arrange the additional investment.</div>
      <Btn label="Close" onClick={onClose} full />
    </div>
  )

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#0f2744,#0a1e38)', border:`1px solid ${C.goldBd}`,
        borderRadius:14, padding:'14px 16px', marginBottom:18 }}>
        <div style={{ fontSize:14, fontWeight:900, color:C.text, marginBottom:4 }}>{holding.companyName}</div>
        <div style={{ fontSize:11, color:C.muted }}>Current stake: {holding.stake}% · Valuation: {fmtCr(holding.currentValuation||0)}</div>
      </div>

      <div style={{ marginBottom:18 }}>
        <label style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, fontWeight:700, display:'block', marginBottom:10 }}>
          How much more to add?
        </label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8 }}>
          {[25, 50, 75, 100].map(p => (
            <button key={p} onClick={()=>setPct(p)}
              style={{ background:pct===p?`linear-gradient(135deg,${C.green},${C.green}bb)`:'rgba(255,255,255,0.06)',
                border:`1.5px solid ${pct===p?'transparent':C.border}`,
                borderRadius:11, padding:'12px 6px', cursor:'pointer', fontFamily:'inherit',
                display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <div style={{ fontSize:16, fontWeight:900, color:pct===p?'#fff':C.text }}>{p}%</div>
              <div style={{ fontSize:9, color:pct===p?'rgba(255,255,255,0.7)':C.muted }}>
                +{parseFloat(((holding.stake||0)*p/100).toFixed(4))}%
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:12,padding:'14px 16px',marginBottom:18 }}>
        {[['Adding',`${pct}% more (+${addStake}% stake)`],['At Valuation',fmtCr(holding.currentValuation||0)],['Est. Investment',fmt(price)]].map(([l,v],i)=>(
          <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:i<2?`1px solid rgba(34,197,94,0.1)`:'none' }}>
            <span style={{ fontSize:11,color:C.muted }}>{l}</span>
            <span style={{ fontSize:11,fontWeight:800,color:i===2?C.green:C.text }}>{v}</span>
          </div>
        ))}
      </div>
      <Btn label={loading?'Submitting…':'Submit Interest to Admin →'} onClick={submit} full loading={loading} color={C.green}/>
    </div>
  )
}

// ── CLIENT — NEWS ──────────────────────────────────────────────────────────
const TAG_COLORS = { Markets:'#3b82f6', Bonds:'#a855f7', Unlisted:'#f59e0b', Economy:'#22c55e', Stocks:'#ec4899' }
function NewsScreen() {
  const [filter,   setFilter]   = useState('All')
  const [articles, setArticles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [lastFetch,setLastFetch]= useState(null)

  async function fetchNews() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/news')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setArticles(data.articles || [])
      setLastFetch(new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}))
    } catch(e) { setError(e.message) }
    setLoading(false)
  }
  useEffect(()=>{ fetchNews() },[])

  const filters = ['All','Markets','Bonds','Unlisted','Economy','Stocks']
  const list    = filter==='All' ? articles : articles.filter(n=>n.tag===filter)

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <div style={{ background:C.bg2,padding:'52px 18px 16px',borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:24,fontWeight:900,color:C.text }}>Market News</div>
            <div style={{ fontSize:11,color:C.muted,marginTop:3 }}>{lastFetch?`Updated ${lastFetch} · ET, Mint, Moneycontrol`:'Fetching live news…'}</div>
          </div>
          <button onClick={fetchNews} disabled={loading} style={{ background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,borderRadius:10,padding:'7px 12px',color:C.muted,fontSize:13,cursor:loading?'not-allowed':'pointer',opacity:loading?0.5:1,fontFamily:'inherit' }}>
            {loading?'⏳':'🔄'}
          </button>
        </div>
      </div>
      <div style={{ display:'flex',gap:8,padding:'12px 18px',overflowX:'auto',flexShrink:0,borderBottom:`1px solid ${C.border}` }}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ flexShrink:0,background:filter===f?`linear-gradient(90deg,${C.gold},${C.goldL})`:'rgba(255,255,255,0.05)',border:filter===f?'none':`1px solid ${C.border}`,borderRadius:20,padding:'6px 14px',fontSize:11,fontWeight:700,color:filter===f?'#0a0f1e':C.muted,cursor:'pointer',fontFamily:'inherit' }}>{f}</button>
        ))}
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'16px 18px 40px' }}>
        {loading && [1,2,3,4].map(i=>(
          <div key={i} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:12 }}>
            <div style={{ height:16,background:'rgba(255,255,255,0.06)',borderRadius:4,marginBottom:8 }}/>
            <div style={{ height:12,background:'rgba(255,255,255,0.04)',borderRadius:4,width:'80%' }}/>
          </div>
        ))}
        {!loading && error && (
          <div style={{ textAlign:'center',padding:'40px 20px' }}>
            <div style={{ fontSize:36,marginBottom:12 }}>📡</div>
            <div style={{ fontSize:14,fontWeight:700,color:C.text,marginBottom:8 }}>Could not load news</div>
            <div style={{ fontSize:12,color:C.muted,marginBottom:20,lineHeight:1.6 }}>
              {error.includes('NEWSAPI_KEY')?'Add NEWSAPI_KEY in Vercel environment variables.':error}
            </div>
            <Btn label="Try Again" onClick={fetchNews} />
          </div>
        )}
        {!loading && !error && list.length===0 && (
          <div style={{ textAlign:'center',padding:'40px 0',color:C.muted,fontSize:13 }}>No {filter} news right now.</div>
        )}
        {!loading && !error && list.map((n,i)=>(
          <a key={n.id} href={n.url} target="_blank" rel="noreferrer" style={{ textDecoration:'none',display:'block' }}>
            <Card style={{ marginBottom:12,background:i===0?'#0f2031':C.card,cursor:'pointer' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  <span style={{ background:(TAG_COLORS[n.tag]||C.blue)+'20',color:TAG_COLORS[n.tag]||C.blue,border:`1px solid ${(TAG_COLORS[n.tag]||C.blue)}44`,borderRadius:7,padding:'2px 9px',fontSize:10,fontWeight:700 }}>{n.tag}</span>
                  {n.live && <div style={{ display:'flex',alignItems:'center',gap:4,background:`${C.green}18`,borderRadius:10,padding:'2px 8px' }}>
                    <div className="live-dot" style={{ width:5,height:5,borderRadius:'50%',background:C.green }}/>
                    <span style={{ fontSize:9,color:C.green,fontWeight:800,letterSpacing:0.5 }}>LIVE</span>
                  </div>}
                </div>
                <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2 }}>
                  <span style={{ fontSize:9,color:C.gold,fontWeight:600 }}>{n.source}</span>
                  <span style={{ fontSize:10,color:C.dim }}>{n.time}</span>
                </div>
              </div>
              <div style={{ fontSize:i===0?15:13,fontWeight:800,color:C.text,lineHeight:1.4,marginBottom:7 }}>{n.title}</div>
              <div style={{ fontSize:12,color:C.muted,lineHeight:1.7 }}>{n.body}</div>
              <div style={{ marginTop:10,fontSize:10,color:C.gold,fontWeight:700 }}>Read full article →</div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── CLIENT — PROFILE ───────────────────────────────────────────────────────
function ProfileScreen({ user, clientData }) {
  const [pan,    setPan]   = useState(clientData?.pan || '')
  const [editing,setEdit]  = useState(false)
  const [saving, setSave]  = useState(false)
  const [toast,  setToast] = useState(null)

  async function savePan() {
    const v = pan.toUpperCase()
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)) { setToast({m:'Invalid PAN. Format: ABCDE1234F',t:'error'}); return }
    setSave(true)
    try {
      await updateDoc(doc(db,'clients',user.uid),{pan:v})
      setEdit(false); setToast({m:'PAN saved successfully!'})
    } catch { setToast({m:'Could not save PAN',t:'error'}) }
    setSave(false)
  }

  return (
    <div style={{ flex:1,overflowY:'auto' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={()=>setToast(null)}/>
      <div style={{ background:C.bg2,padding:'52px 18px 18px',borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:24,fontWeight:900,color:C.text }}>Profile</div>
      </div>
      <div style={{ padding:'22px 18px 40px' }}>
        <div style={{ textAlign:'center',marginBottom:24 }}>
          <div style={{ width:80,height:80,borderRadius:'50%',background:`linear-gradient(135deg,${C.gold},${C.goldL})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:32,fontWeight:900,color:'#0a0f1e',boxShadow:`0 8px 32px ${C.gold}35` }}>
            {(clientData?.name||'I')[0]}
          </div>
          <div style={{ fontSize:20,fontWeight:900,color:C.text }}>{clientData?.name||'Investor'}</div>
          <div style={{ fontSize:12,color:C.muted,marginTop:4 }}>{user.email}</div>
          <div style={{ marginTop:10,display:'inline-block',background:C.goldBg,border:`1px solid ${C.goldBd}`,borderRadius:20,padding:'4px 16px',fontSize:11,color:C.gold,fontWeight:700 }}>✦ Premium Member</div>
        </div>

        {clientData?.welcomeNote && (
          <Card style={{ marginBottom:14,background:'#0f2031',border:`1px solid ${C.goldBd}` }}>
            <div style={{ fontSize:10,color:C.gold,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:8 }}>✉ Note from Anand Finco</div>
            <div style={{ fontSize:13,color:C.text2,lineHeight:1.7,fontStyle:'italic' }}>"{clientData.welcomeNote}"</div>
          </Card>
        )}

        <Card style={{ marginBottom:14 }}>
          <div style={{ fontSize:14,fontWeight:800,color:C.text,marginBottom:14 }}>📋 Personal Info</div>
          {[
            ['Phone', clientData?.phone||'—'],
            ['City',  clientData?.city||'—'],
            ['Member Since', clientData?.joinDate||'—'],
          ].map(([l,v])=>(
            <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12,color:C.muted }}>{l}</span>
              <span style={{ fontSize:12,fontWeight:700,color:C.text2 }}>{v}</span>
            </div>
          ))}
        </Card>

        <Card style={{ marginBottom:14 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
            <div style={{ fontSize:14,fontWeight:800,color:C.text }}>🪪 PAN Card</div>
            {!editing && <button onClick={()=>setEdit(true)} style={{ background:C.goldBg,border:`1px solid ${C.goldBd}`,borderRadius:8,padding:'5px 12px',color:C.gold,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>{clientData?.pan?'Update':'Add PAN'}</button>}
          </div>
          {clientData?.pan && !editing && (
            <div style={{ background:'rgba(0,0,0,0.3)',borderRadius:10,padding:'10px 14px',fontSize:14,fontWeight:800,color:C.gold,letterSpacing:2 }}>{clientData.pan}</div>
          )}
          {editing && (
            <>
              <Field label="PAN Number" value={pan} onChange={setPan} placeholder="ABCDE1234F" />
              <div style={{ display:'flex',gap:10 }}>
                <Btn label="Cancel" onClick={()=>{setEdit(false);setPan(clientData?.pan||'')}} outline full sm/>
                <Btn label={saving?'Saving…':'Save PAN'} onClick={savePan} loading={saving} full sm/>
              </div>
            </>
          )}
        </Card>

        <button onClick={()=>signOut(auth)} style={{ width:'100%',background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:12,padding:'13px',color:C.red,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit',marginTop:8 }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  )
}

// ── ADMIN — COMPANIES ──────────────────────────────────────────────────────
function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [sheet,     setSheet]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)
  const [form,      setForm]      = useState({ name:'',sector:'',valuation:'',expectedReturn:'',minInvestment:'',risk:'Medium',description:'',active:true })
  const sf = k => v => setForm(f=>({...f,[k]:v}))

  async function load() {
    const snap = await getDocs(collection(db,'companies'))
    setCompanies(snap.docs.map(d=>({id:d.id,...d.data()})))
  }
  useEffect(()=>{ load() },[])

  async function save() {
    if (!form.name) { setToast({m:'Company name required',t:'error'}); return }
    setSaving(true)
    try {
      const data = { name:form.name, sector:form.sector, valuation:parseInt(form.valuation)||0,
        expectedReturn:form.expectedReturn, minInvestment:parseInt(form.minInvestment)||0,
        risk:form.risk, description:form.description, active:form.active }
      if (editing) await updateDoc(doc(db,'companies',editing),data)
      else         await addDoc(collection(db,'companies'),data)
      setToast({m:editing?'Company updated!':'Company added!'})
      setSheet(false); setEditing(null)
      setForm({name:'',sector:'',valuation:'',expectedReturn:'',minInvestment:'',risk:'Medium',description:'',active:true})
      load()
    } catch(e) { setToast({m:e.message,t:'error'}) }
    setSaving(false)
  }

  async function del(id) {
    await deleteDoc(doc(db,'companies',id)); load()
  }

  async function toggleActive(co) {
    await updateDoc(doc(db,'companies',co.id),{active:!co.active}); load()
  }

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={()=>setToast(null)}/>
      <div style={{ background:C.bg2,padding:'52px 18px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
        <div>
          <div style={{ fontSize:22,fontWeight:900,color:C.text }}>Companies</div>
          <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{companies.length} listed</div>
        </div>
        <Btn label="+ Add Company" onClick={()=>{setEditing(null);setForm({name:'',sector:'',valuation:'',expectedReturn:'',minInvestment:'',risk:'Medium',description:'',active:true});setSheet(true)}} sm/>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'16px 18px 40px' }}>
        {companies.length===0 && <Empty icon="🏢" title="No companies yet" sub="Tap '+ Add Company' to add your first investment opportunity."/>}
        {companies.map(co=>(
          <Card key={co.id} style={{ marginBottom:12 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14,fontWeight:800,color:C.text }}>{co.name}</div>
                <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{co.sector} · {co.risk} Risk</div>
              </div>
              <div style={{ display:'flex',gap:8,alignItems:'center',flexShrink:0 }}>
                <div style={{ background:co.active?C.greenBg:C.redBg,border:`1px solid ${co.active?C.greenBd:C.redBd}`,borderRadius:7,padding:'2px 9px',fontSize:10,fontWeight:700,color:co.active?C.green:C.red,cursor:'pointer' }} onClick={()=>toggleActive(co)}>
                  {co.active?'ACTIVE':'INACTIVE'}
                </div>
              </div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
              <div><SLabel text="Valuation"/><div style={{ fontSize:13,fontWeight:800,color:C.gold }}>{fmtCr(co.valuation)}</div></div>
              <div><SLabel text="Exp. Returns"/><div style={{ fontSize:13,fontWeight:800,color:C.green }}>{co.expectedReturn||'—'}</div></div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <Btn label="Edit" onClick={()=>{setEditing(co.id);setForm({name:co.name,sector:co.sector||'',valuation:String(co.valuation||''),expectedReturn:co.expectedReturn||'',minInvestment:String(co.minInvestment||''),risk:co.risk||'Medium',description:co.description||'',active:co.active});setSheet(true)}} outline full sm/>
              <Btn label="Delete" onClick={()=>del(co.id)} outline full sm color={C.red}/>
            </div>
          </Card>
        ))}
      </div>
      <Sheet show={sheet} onClose={()=>setSheet(false)} title={editing?'Edit Company':'Add Company'}>
        <Field label="Company Name *" value={form.name} onChange={sf('name')} placeholder="XYZ Infra Pvt Ltd"/>
        <Field label="Sector" value={form.sector} onChange={sf('sector')} placeholder="Infrastructure"/>
        <Field label="Current Valuation (₹)" value={form.valuation} onChange={sf('valuation')} type="number" placeholder="50000000"/>
        <Field label="Expected Returns" value={form.expectedReturn} onChange={sf('expectedReturn')} placeholder="18-24%"/>
        <Field label="Min Investment (₹)" value={form.minInvestment} onChange={sf('minInvestment')} type="number" placeholder="50000"/>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:8 }}>Risk Level</label>
          <div style={{ display:'flex',gap:8 }}>
            {['Low','Medium','High'].map(r=>(
              <button key={r} onClick={()=>sf('risk')(r)} style={{ flex:1,background:form.risk===r?`linear-gradient(135deg,${C.gold},${C.goldL})`:'rgba(255,255,255,0.05)',border:`1px solid ${form.risk===r?'transparent':C.border}`,borderRadius:10,padding:'8px',color:form.risk===r?'#0a0f1e':C.muted,fontWeight:700,fontSize:11,cursor:'pointer',fontFamily:'inherit' }}>{r}</button>
            ))}
          </div>
        </div>
        <Field label="Description" value={form.description} onChange={sf('description')} rows={3} placeholder="Brief description of the company…"/>
        <div style={{ display:'flex',gap:10,marginTop:4 }}>
          <Btn label="Cancel" onClick={()=>setSheet(false)} outline full/>
          <Btn label={saving?'Saving…':editing?'Update':'Add Company'} onClick={save} loading={saving} full/>
        </div>
      </Sheet>
    </div>
  )
}

// ── ADMIN — PORTFOLIOS ─────────────────────────────────────────────────────
function AdminPortfolios() {
  const [clients,   setClients]   = useState([])
  const [companies, setCompanies] = useState([])
  const [selected,  setSelected]  = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [sheet,     setSheet]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState(null)
  const [form,      setForm]      = useState({ companyId:'', stake:'', buyValuation:'', lotSize:'0.5', investedAmount:'', joinDate:String(new Date().getFullYear()) })
  const sf = k => v => setForm(f=>({...f,[k]:v}))

  useEffect(()=>{
    getDocs(collection(db,'clients')).then(s=>setClients(s.docs.map(d=>({id:d.id,...d.data()}))))
    getDocs(collection(db,'companies')).then(s=>setCompanies(s.docs.map(d=>({id:d.id,...d.data()}))))
  },[])

  async function selectClient(c) {
    setSelected(c)
    const pd = await getDoc(doc(db,'portfolios',c.id))
    setPortfolio(pd.exists()?pd.data():{holdings:[]})
  }

  async function addHolding() {
    if (!form.companyId||!form.stake) { setToast({m:'Select company and stake',t:'error'}); return }
    setSaving(true)
    try {
      const co = companies.find(c=>c.id===form.companyId)
      const holding = {
        id:           uid(),
        companyId:    form.companyId,
        companyName:  co?.name||'',
        sector:       co?.sector||'',
        stake:        parseFloat(form.stake)||0,
        lotSize:      parseFloat(form.lotSize)||0.5,
        buyValuation: parseInt(form.buyValuation)||co?.valuation||0,
        investedAmount:parseInt(form.investedAmount)||0,
        joinDate:     form.joinDate,
      }
      const cur = portfolio?.holdings || []
      const updated = { ...portfolio, holdings:[...cur, holding] }
      await setDoc(doc(db,'portfolios',selected.id), updated)
      setPortfolio(updated)
      setToast({m:`Holding added for ${selected.name}!`})
      setSheet(false)
      setForm({companyId:'',stake:'',buyValuation:'',lotSize:'0.5',investedAmount:'',joinDate:String(new Date().getFullYear())})
    } catch(e) { setToast({m:e.message,t:'error'}) }
    setSaving(false)
  }

  async function removeHolding(idx) {
    const updated = { ...portfolio, holdings:portfolio.holdings.filter((_,i)=>i!==idx) }
    await setDoc(doc(db,'portfolios',selected.id),updated)
    setPortfolio(updated)
    setToast({m:'Holding removed'})
  }

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={()=>setToast(null)}/>
      <div style={{ background:C.bg2,padding:'52px 18px 16px',borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
        <div style={{ fontSize:22,fontWeight:900,color:C.text }}>Portfolios</div>
        <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>Select a client to manage their holdings</div>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'14px 18px 40px' }}>
        {!selected && (
          clients.length===0
            ? <Empty icon="👥" title="No clients yet" sub="Add clients first from the Clients tab."/>
            : clients.map(c=>(
              <Card key={c.id} onClick={()=>selectClient(c)} style={{ marginBottom:10,cursor:'pointer' }}>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <div style={{ width:42,height:42,borderRadius:12,background:`linear-gradient(135deg,${C.gold},${C.goldL})`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#0a0f1e',fontSize:18,flexShrink:0 }}>{(c.name||'?')[0]}</div>
                  <div>
                    <div style={{ fontSize:14,fontWeight:800,color:C.text }}>{c.name}</div>
                    <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{c.username||c.id} · Tap to manage portfolio →</div>
                  </div>
                </div>
              </Card>
            ))
        )}

        {selected && (
          <>
            <button onClick={()=>setSelected(null)} style={{ background:'none',border:'none',color:C.gold,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:16,display:'flex',alignItems:'center',gap:6 }}>
              ← Back to clients
            </button>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
              <div style={{ fontSize:16,fontWeight:900,color:C.text }}>{selected.name}'s Portfolio</div>
              <Btn label="+ Add Holding" onClick={()=>setSheet(true)} sm/>
            </div>
            {(portfolio?.holdings||[]).length===0 && <Empty icon="📊" title="No holdings" sub="Tap '+ Add Holding' to assign a company stake."/>}
            {(portfolio?.holdings||[]).map((h,i)=>(
              <Card key={h.id||i} style={{ marginBottom:10 }}>
                <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:800,color:C.text }}>{h.companyName}</div>
                    <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{h.stake}% stake · Buy val: {fmtCr(h.buyValuation)}</div>
                    <div style={{ fontSize:11,color:C.text2,marginTop:2 }}>Invested: {fmt(h.investedAmount||0)} · Since {h.joinDate||'—'}</div>
                  </div>
                  <button onClick={()=>removeHolding(i)} style={{ background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:'5px 10px',color:C.red,fontSize:11,cursor:'pointer',fontFamily:'inherit',flexShrink:0 }}>Remove</button>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      <Sheet show={sheet} onClose={()=>setSheet(false)} title="Add Holding">
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:10,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:6 }}>Company *</label>
          <select value={form.companyId} onChange={e=>sf('companyId')(e.target.value)} style={{ width:'100%',background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,borderRadius:10,padding:'11px 14px',color:C.text,fontSize:13,outline:'none',fontFamily:'inherit',appearance:'none' }}>
            <option value="">Select company…</option>
            {companies.map(co=><option key={co.id} value={co.id}>{co.name}</option>)}
          </select>
        </div>
        <Field label="Stake % *" value={form.stake} onChange={sf('stake')} type="number" placeholder="1.5"/>
        <Field label="Lot Size %" value={form.lotSize} onChange={sf('lotSize')} type="number" placeholder="0.5"/>
        <Field label="Buy Valuation (₹)" value={form.buyValuation} onChange={sf('buyValuation')} type="number" placeholder="Leave blank to use current valuation"/>
        <Field label="Amount Invested (₹)" value={form.investedAmount} onChange={sf('investedAmount')} type="number" placeholder="75000"/>
        <Field label="Join Year" value={form.joinDate} onChange={sf('joinDate')} placeholder="2024"/>
        <div style={{ display:'flex',gap:10 }}>
          <Btn label="Cancel" onClick={()=>setSheet(false)} outline full/>
          <Btn label={saving?'Saving…':'Add Holding'} onClick={addHolding} loading={saving} full/>
        </div>
      </Sheet>
    </div>
  )
}

// ── ADMIN — REQUESTS ───────────────────────────────────────────────────────
function AdminRequests({ adminPhone }) {
  const [requests, setRequests] = useState([])
  const [toast,    setToast]    = useState(null)
  const [conf,     setConf]     = useState(null)
  const [tabReq,   setTabReq]   = useState('sell') // 'sell' | 'invest'

  async function load() {
    try {
      const snap = await getDocs(query(collection(db,'notifications'), orderBy('timestamp','desc')))
      setRequests(snap.docs.map(d=>({id:d.id,...d.data()})))
    } catch(e) { console.error(e) }
  }
  useEffect(()=>{ load() },[])

  async function markRead(id) {
    try { await updateDoc(doc(db,'notifications',id),{read:true}); load() } catch{}
  }

  const unread = requests.filter(r=>!r.read).length

  function openWA(r) {
    const ph = (r.clientPhone||'').replace(/\D/g,'')
    if (!ph) return
    const msg = encodeURIComponent(`Hello ${r.clientName}! 👋 Your request regarding *${r.companyName}* has been noted. We will get back to you shortly. – Anand Finco`)
    window.open(`https://wa.me/${ph}?text=${msg}`,'_blank')
  }

  const displayReqs = tabReq==='invest'
    ? requests.filter(r=>r.type==='investRequest')
    : requests.filter(r=>r.type==='buyMore'||r.type==='investRequest')

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={()=>setToast(null)}/>
      <ConfirmModal data={conf} onYes={conf?.onYes} onNo={()=>setConf(null)}/>
      <div style={{ background:C.bg2,padding:'52px 18px 16px',borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontSize:22,fontWeight:900,color:C.text }}>Requests</div>
            <div style={{ fontSize:11,color:unread>0?C.gold:C.muted,marginTop:2 }}>{unread>0?`${unread} unread`:'All caught up ✓'}</div>
          </div>
          <button onClick={load} style={{ background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,borderRadius:10,padding:'7px 12px',color:C.muted,fontSize:14,cursor:'pointer',fontFamily:'inherit' }}>🔄</button>
        </div>
        <div style={{ display:'flex',gap:8,marginTop:12 }}>
          {[['sell','All'],['invest','Invest Requests']].map(([id,label])=>(
            <button key={id} onClick={()=>setTabReq(id)} style={{ flex:1,background:tabReq===id?`linear-gradient(90deg,${C.gold},${C.goldL})`:'rgba(255,255,255,0.05)',border:tabReq===id?'none':`1px solid ${C.border}`,borderRadius:10,padding:'7px 4px',fontSize:10,fontWeight:700,color:tabReq===id?'#0a0f1e':C.muted,cursor:'pointer',fontFamily:'inherit' }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'14px 18px 40px' }}>
        {displayReqs.length===0 && <Empty icon="📬" title="No requests" sub="Client requests will appear here."/>}
        {displayReqs.map(r=>(
          <div key={r.id} onClick={()=>markRead(r.id)}
            style={{ background:r.read?C.card:'rgba(201,162,39,0.07)',
              border:`1px solid ${r.read?C.border:'rgba(201,162,39,0.35)'}`,
              borderRadius:14,padding:'14px 16px',marginBottom:12 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
              <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                {!r.read && <div style={{ width:8,height:8,borderRadius:'50%',background:C.gold,flexShrink:0 }}/>}
                <div style={{ fontSize:14,fontWeight:900,color:C.text }}>{r.clientName||r.clientEmail}</div>
              </div>
              <Badge label={r.type==='buyMore'?'BUY MORE':'INVEST'} color={r.type==='buyMore'?C.green:C.blue}/>
            </div>
            <div style={{ background:'rgba(0,0,0,0.3)',borderRadius:10,padding:'10px 12px',marginBottom:10 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8 }}>
                {[['Company',r.companyName||'—'],['Client',r.clientName||'—'],['Phone',r.clientPhone||'—'],['Type',r.type==='buyMore'?'Buy More':'New Investment'],['Est.',r.estimatedInvestment?fmt(r.estimatedInvestment):'—'],['Time',r.timestamp?.toDate?.()?.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})||'—']].map(([l,v])=>(
                  <div key={l}><SLabel text={l}/><div style={{ fontSize:11,fontWeight:700,color:C.text2 }}>{v}</div></div>
                ))}
              </div>
            </div>
            <button onClick={e=>{e.stopPropagation();openWA(r)}} style={{ width:'100%',background:'linear-gradient(90deg,#25D366,#128C7E)',border:'none',borderRadius:10,padding:'10px',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontFamily:'inherit' }}>
              💬 WhatsApp {r.clientName?.split(' ')[0]||'Client'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ADMIN — SELL REQUESTS ──────────────────────────────────────────────────
function AdminSellRequests({ adminPhone }) {
  const [reqs,  setReqs]  = useState([])
  const [toast, setToast] = useState(null)
  const [conf,  setConf]  = useState(null)

  async function load() {
    try {
      const snap = await getDocs(query(collection(db,'sellRequests'), orderBy('timestamp','desc')))
      setReqs(snap.docs.map(d=>({id:d.id,...d.data()})))
    } catch(e) { console.error(e) }
  }
  useEffect(()=>{ load() },[])

  async function approve(r) {
    try {
      await updateDoc(doc(db,'sellRequests',r.id),{status:'approved',read:true})
      setToast({m:`✅ Approved sell request for ${r.clientEmail}`})
      setConf(null); load()
      const ph = (r.clientPhone||'').replace(/\D/g,'')
      if (ph) {
        const msg = encodeURIComponent(`Hello! ✅ Your sell request for *${r.companyName}* has been approved!\n\nPayout of *${fmt(r.expectedPayout)}* will be transferred to your bank account (${r.bankAccountNo}) within 2-3 business days.\n\n– Anand Finco`)
        window.open(`https://wa.me/${ph}?text=${msg}`,'_blank')
      }
    } catch(e) { setToast({m:e.message,t:'error'}) }
  }

  async function reject(r) {
    try {
      await updateDoc(doc(db,'sellRequests',r.id),{status:'rejected',read:true})
      setToast({m:'Request rejected',t:'error'}); setConf(null); load()
    } catch(e) { setToast({m:e.message,t:'error'}) }
  }

  const pending  = reqs.filter(r=>r.status==='pending')
  const resolved = reqs.filter(r=>r.status!=='pending')
  const unread   = pending.filter(r=>!r.read).length

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={()=>setToast(null)}/>
      <ConfirmModal data={conf} onYes={conf?.onYes} onNo={()=>setConf(null)}/>
      <div style={{ background:C.bg2,padding:'52px 18px 16px',borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontSize:22,fontWeight:900,color:C.text }}>Sell Requests</div>
            <div style={{ fontSize:11,color:unread>0?C.red:C.muted,marginTop:2 }}>{unread>0?`${unread} new pending`:'All reviewed ✓'}</div>
          </div>
          <button onClick={load} style={{ background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,borderRadius:10,padding:'7px 12px',color:C.muted,fontSize:14,cursor:'pointer',fontFamily:'inherit' }}>🔄</button>
        </div>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'14px 18px 40px' }}>
        {reqs.length===0 && <Empty icon="📤" title="No sell requests" sub="When clients submit sell requests, they appear here for your review."/>}

        {pending.length>0 && <>
          <div style={{ fontSize:10,color:C.red,fontWeight:800,letterSpacing:1,textTransform:'uppercase',marginBottom:12 }}>⏳ Pending ({pending.length})</div>
          {pending.map(r=>(
            <div key={r.id} style={{ background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:16,padding:16,marginBottom:14 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  {!r.read && <div style={{ width:9,height:9,borderRadius:'50%',background:C.red,flexShrink:0 }}/>}
                  <div style={{ fontSize:15,fontWeight:900,color:C.text }}>{r.clientEmail}</div>
                </div>
                <Badge label="SELL REQUEST" color={C.red}/>
              </div>
              <div style={{ background:'rgba(0,0,0,0.3)',borderRadius:12,padding:'12px 14px',marginBottom:12 }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                  {[
                    ['Company',    r.companyName||'—'],
                    ['Selling',    `${r.sellPercent||100}% of stake (${r.stakeToSell}%)`],
                    ['Asking Val.',fmtCr(r.askingValuation)],
                    ['Exp. Payout',fmt(r.expectedPayout)],
                    ['P&L',        `${r.gainLoss>=0?'+':''}${fmt(r.gainLoss)}`],
                    ['Submitted',  r.timestamp?.toDate?.()?.toLocaleDateString('en-IN')||'—'],
                  ].map(([l,v])=>(
                    <div key={l}><SLabel text={l}/><div style={{ fontSize:11,fontWeight:700,color:l==='Exp. Payout'?C.gold:C.text2 }}>{v}</div></div>
                  ))}
                </div>
              </div>
              {r.bankAccountName && (
                <div style={{ background:'rgba(59,130,246,0.07)',border:'1px solid rgba(59,130,246,0.25)',borderRadius:10,padding:'10px 14px',marginBottom:12 }}>
                  <div style={{ fontSize:10,color:C.blue,fontWeight:800,marginBottom:8 }}>🏦 Payout Bank</div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:6 }}>
                    {[['Name',r.bankAccountName],['Bank',r.bankName],['Account',r.bankAccountNo],['IFSC',r.bankIFSC]].map(([l,v])=>(
                      <div key={l}><SLabel text={l}/><div style={{ fontSize:11,fontWeight:700,color:C.text2 }}>{v}</div></div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:10,padding:'10px 14px',marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div><div style={{ fontSize:9,color:C.muted }}>PAYOUT AMOUNT</div><div style={{ fontSize:20,fontWeight:900,color:C.green }}>{fmt(r.expectedPayout)}</div></div>
                <div style={{ fontSize:26 }}>💸</div>
              </div>
              <div style={{ display:'flex',gap:8,marginBottom:8 }}>
                <button onClick={()=>setConf({title:'Approve Sell Request?',msg:`Approve sale of ${r.stakeToSell}% stake in ${r.companyName} for ${fmt(r.expectedPayout)}? This will update the client portfolio.`,action:'✅ Approve',color:C.green,onYes:()=>approve(r)})}
                  style={{ flex:1,background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:11,padding:'11px',color:C.green,fontWeight:800,fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>
                  ✅ Approve & Update Portfolio
                </button>
                <button onClick={()=>setConf({title:'Reject?',msg:`Reject ${r.clientEmail}'s sell request?`,action:'❌ Reject',color:C.red,onYes:()=>reject(r)})}
                  style={{ background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:11,padding:'11px 16px',color:C.red,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:'inherit' }}>❌</button>
              </div>
            </div>
          ))}
        </>}

        {resolved.length>0 && <>
          <div style={{ fontSize:10,color:C.muted,fontWeight:800,letterSpacing:1,textTransform:'uppercase',margin:'14px 0 10px' }}>History</div>
          {resolved.map(r=>(
            <div key={r.id} style={{ background:'rgba(255,255,255,0.02)',border:`1px solid ${C.border}`,borderRadius:12,padding:'12px 14px',marginBottom:10 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{r.clientEmail} — {r.companyName}</div>
                <div style={{ fontSize:10,fontWeight:800,color:r.status==='approved'?C.green:C.red,background:r.status==='approved'?C.greenBg:C.redBg,borderRadius:6,padding:'2px 8px' }}>{r.status==='approved'?'✅ APPROVED':'❌ REJECTED'}</div>
              </div>
              <div style={{ fontSize:11,color:C.muted,marginTop:5 }}>{r.stakeToSell}% stake · {fmt(r.expectedPayout)}</div>
            </div>
          ))}
        </>}
      </div>
    </div>
  )
}

// ── ADMIN — CLIENTS ────────────────────────────────────────────────────────
function AdminClients() {
  const [clients, setClients] = useState([])
  const [sheet,   setSheet]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)
  const [form,    setForm]    = useState({ name:'',username:'',password:'',phone:'',city:'',joinDate:String(new Date().getFullYear()),welcomeNote:'' })
  const sf = k => v => setForm(f=>({...f,[k]:v}))

  async function load() {
    const snap = await getDocs(collection(db,'clients'))
    setClients(snap.docs.map(d=>({id:d.id,...d.data()})))
  }
  useEffect(()=>{ load() },[])

  async function addClient() {
    if (!form.name||!form.username||!form.password) { setToast({m:'Name, username and password required',t:'error'}); return }
    if (form.password.length<6) { setToast({m:'Password must be at least 6 characters',t:'error'}); return }
    setSaving(true)
    try {
      const email    = `${form.username.trim().toLowerCase().replace(/\s/g,'.')}@anandfinco.com`
      const userCred = await createUserWithEmailAndPassword(auth, email, form.password)
      await setDoc(doc(db,'clients',userCred.user.uid),{
        name:form.name, email, phone:form.phone, city:form.city,
        pan:'', joinDate:form.joinDate, welcomeNote:form.welcomeNote,
        username:form.username.trim().toLowerCase(),
      })
      setToast({m:`${form.name} added! Login: ${form.username} / ${form.password}`})
      setSheet(false)
      setForm({name:'',username:'',password:'',phone:'',city:'',joinDate:String(new Date().getFullYear()),welcomeNote:''})
      load()
    } catch(e) {
      const map = {'auth/email-already-in-use':'Username already exists.','auth/weak-password':'Password too weak.'}
      setToast({m:map[e.code]||e.message,t:'error'})
    }
    setSaving(false)
  }

  function openWA(c) {
    if (!c.phone) return
    const msg = encodeURIComponent(`Hello ${c.name}! 👋 Team Anand Finco here. Let's connect! – Anand Finco`)
    window.open(`https://wa.me/${c.phone.replace(/\D/g,'')}?text=${msg}`,'_blank')
  }

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={()=>setToast(null)}/>
      <div style={{ background:C.bg2,padding:'52px 18px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
        <div>
          <div style={{ fontSize:22,fontWeight:900,color:C.text }}>Clients</div>
          <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{clients.length} registered</div>
        </div>
        <Btn label="+ Add Client" onClick={()=>setSheet(true)} sm/>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'16px 18px 40px' }}>
        {clients.length===0 && <Empty icon="👥" title="No clients yet" sub="Tap '+ Add Client' to create your first client account."/>}
        {clients.map(c=>(
          <Card key={c.id} style={{ marginBottom:10 }}>
            <div style={{ display:'flex',alignItems:'center',gap:12 }}>
              <div style={{ width:46,height:46,borderRadius:13,background:`linear-gradient(135deg,${C.gold},${C.goldL})`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#0a0f1e',fontSize:19,flexShrink:0 }}>{(c.name||'?')[0]}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontSize:14,fontWeight:800,color:C.text }}>{c.name}</div>
                <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{c.username||c.id} · {c.phone||'No phone'} · {c.city||'—'}</div>
                {c.pan && <div style={{ fontSize:10,color:C.gold,marginTop:2,fontWeight:700 }}>PAN: {c.pan}</div>}
              </div>
              {c.phone && (
                <button onClick={()=>openWA(c)} style={{ background:'rgba(37,211,102,0.12)',border:'1px solid rgba(37,211,102,0.3)',borderRadius:10,padding:'8px 11px',fontSize:18,cursor:'pointer',flexShrink:0 }}>💬</button>
              )}
            </div>
            {c.welcomeNote && <div style={{ fontSize:11,color:C.muted,marginTop:10,padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:8,fontStyle:'italic' }}>"{c.welcomeNote}"</div>}
          </Card>
        ))}
      </div>
      <Sheet show={sheet} onClose={()=>setSheet(false)} title="Add New Client">
        <Field label="Full Name *" value={form.name} onChange={sf('name')} placeholder="Rahul Sharma"/>
        <Field label="Username * (login ID)" value={form.username} onChange={sf('username')} placeholder="rahul.sharma" note="Client logs in with this. Email: username@anandfinco.com"/>
        <Field label="Password * (min 6 chars)" value={form.password} onChange={sf('password')} type="password" placeholder="Set a strong password"/>
        <Field label="Phone (with country code)" value={form.phone} onChange={sf('phone')} placeholder="919876543210" note="Used for WhatsApp contact"/>
        <Field label="City" value={form.city} onChange={sf('city')} placeholder="Mumbai"/>
        <Field label="Join Year" value={form.joinDate} onChange={sf('joinDate')} placeholder="2025"/>
        <Field label="Welcome Note (shown in client profile)" value={form.welcomeNote} onChange={sf('welcomeNote')} rows={3} placeholder="Personalized message for this client…"/>
        <div style={{ display:'flex',gap:10,marginTop:4 }}>
          <Btn label="Cancel" onClick={()=>setSheet(false)} outline full/>
          <Btn label="Add Client" onClick={addClient} loading={saving} full/>
        </div>
      </Sheet>
    </div>
  )
}

// ── ADMIN — SETTINGS ───────────────────────────────────────────────────────
function AdminSettings({ user }) {
  const [waNum,  setWaNum]  = useState('')
  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState(null)

  useEffect(()=>{
    getDoc(doc(db,'adminConfig','main')).then(s=>{ if(s.exists()) setWaNum(s.data().whatsapp||'') }).catch(()=>{})
  },[])

  async function save() {
    const clean = waNum.replace(/\D/g,'')
    if (clean.length<10) { setToast({m:'Enter a valid phone number with country code',t:'error'}); return }
    setSaving(true)
    try {
      await setDoc(doc(db,'adminConfig','main'),{whatsapp:clean},{merge:true})
      setToast({m:'WhatsApp number saved! ✅'})
    } catch { setToast({m:'Save failed. Check Firestore rules.',t:'error'}) }
    setSaving(false)
  }

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={()=>setToast(null)}/>
      <div style={{ background:C.bg2,padding:'52px 18px 18px',borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
        <div style={{ fontSize:22,fontWeight:900,color:C.text }}>Settings</div>
        <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>Admin configuration</div>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'18px 18px 50px' }}>
        <div style={{ background:C.goldBg,border:`1px solid ${C.goldBd}`,borderRadius:16,padding:16,display:'flex',alignItems:'center',gap:14,marginBottom:16 }}>
          <div style={{ width:48,height:48,borderRadius:13,background:`linear-gradient(135deg,${C.gold},${C.goldL})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,color:'#0a0f1e' }}>A</div>
          <div>
            <div style={{ fontSize:15,fontWeight:800,color:C.text }}>Admin — Anand Finco</div>
            <div style={{ fontSize:12,color:C.muted,marginTop:3 }}>{user?.email}</div>
          </div>
        </div>

        <Card style={{ marginBottom:14 }}>
          <div style={{ fontSize:14,fontWeight:800,color:C.text,marginBottom:6 }}>💬 WhatsApp Notification Number</div>
          <div style={{ fontSize:12,color:C.muted,lineHeight:1.7,marginBottom:14 }}>
            When clients tap "Invest Now" or submit buy/sell requests, a WhatsApp message opens to this number.
          </div>
          <Field label="Your WhatsApp Number" value={waNum} onChange={setWaNum} placeholder="919876543210" note="Country code + number, no spaces. Example: 919876543210"/>
          <Btn label={saving?'Saving…':'Save Number'} onClick={save} loading={saving} full/>
        </Card>

        <Card>
          <div style={{ fontSize:14,fontWeight:800,color:C.text,marginBottom:10 }}>🔐 Firestore Security Rules</div>
          <div style={{ fontSize:12,color:C.muted,marginBottom:12 }}>Copy-paste in Firebase Console → Firestore → Rules tab:</div>
          <div style={{ background:'rgba(0,0,0,0.4)',borderRadius:10,padding:14,border:`1px solid rgba(255,255,255,0.06)` }}>
            <pre style={{ fontSize:9,color:'#a5f3fc',lineHeight:1.7,whiteSpace:'pre-wrap',fontFamily:'monospace' }}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /companies/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email
        == "${ADMIN_EMAIL}";
    }
    match /clients/{uid} {
      allow read,write: if request.auth.uid==uid
        || request.auth.token.email
           =="admin@anandfinco.com";
    }
    match /portfolios/{uid} {
      allow read: if request.auth.uid==uid
        || request.auth.token.email
           =="admin@anandfinco.com";
      allow write: if request.auth.token.email
        =="admin@anandfinco.com";
    }
    match /notifications/{id} {
      allow create: if request.auth != null;
      allow read,update: if request.auth.token.email
        =="admin@anandfinco.com";
    }
    match /sellRequests/{id} {
      allow create: if request.auth != null;
      allow read,update: if request.auth.uid
        == resource.data.clientId
        || request.auth.token.email
           =="admin@anandfinco.com";
    }
    match /adminConfig/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email
        =="admin@anandfinco.com";
    }
  }
}`}</pre>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── ADMIN SHELL ────────────────────────────────────────────────────────────
function AdminApp({ user }) {
  const [tab, setTab] = useState('requests')
  const [adminPhone, setAdminPhone] = useState('')

  useEffect(()=>{
    getDoc(doc(db,'adminConfig','main')).then(s=>{ if(s.exists()) setAdminPhone(s.data().whatsapp||'') }).catch(()=>{})
  },[])

  const TABS = [
    { id:'companies', icon:'🏢', label:'Companies' },
    { id:'portfolios',icon:'📊', label:'Portfolios' },
    { id:'requests',  icon:'📬', label:'Requests'  },
    { id:'sell',      icon:'💸', label:'Sell Reqs' },
    { id:'clients',   icon:'👥', label:'Clients'   },
    { id:'settings',  icon:'⚙️', label:'Settings'  },
  ]

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <div style={{ background:`linear-gradient(135deg,${C.bg2},#0f2744)`,padding:'10px 18px',borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:'Playfair Display,Georgia,serif',fontSize:15,fontWeight:700,color:'#e8d5a3' }}>Anand Finco</div>
            <div style={{ fontSize:10,color:C.gold,marginTop:1 }}>⚙ Admin Dashboard</div>
          </div>
          <button onClick={()=>signOut(auth)} style={{ background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:8,padding:'5px 12px',color:C.red,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
        {tab==='companies'  && <AdminCompanies/>}
        {tab==='portfolios' && <AdminPortfolios/>}
        {tab==='requests'   && <AdminRequests adminPhone={adminPhone}/>}
        {tab==='sell'       && <AdminSellRequests adminPhone={adminPhone}/>}
        {tab==='clients'    && <AdminClients/>}
        {tab==='settings'   && <AdminSettings user={user}/>}
      </div>

      <div style={{ background:'rgba(10,15,30,0.98)',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-around',padding:'8px 0 10px',flexShrink:0,overflowX:'auto' }}>
        {TABS.map(t => {
          const active = tab===t.id
          return (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'4px 10px',fontFamily:'inherit',flexShrink:0 }}>
              <span style={{ fontSize:active?18:15,filter:active?'none':'grayscale(0.6) opacity(0.5)' }}>{t.icon}</span>
              <span style={{ fontSize:8,fontWeight:active?700:400,color:active?C.gold:C.dim }}>{t.label}</span>
              {active && <div style={{ width:3,height:3,borderRadius:'50%',background:C.gold }}/>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── CLIENT SHELL ───────────────────────────────────────────────────────────
function ClientApp({ user }) {
  const [tab,        setTab]       = useState('home')
  const [clientData, setClientData]= useState(null)
  const [adminPhone, setAdminPhone]= useState('')

  useEffect(()=>{
    getDoc(doc(db,'clients',user.uid)).then(s=>{ if(s.exists()) setClientData({...s.data(),uid:user.uid}) }).catch(()=>{})
    getDoc(doc(db,'adminConfig','main')).then(s=>{ if(s.exists()) setAdminPhone(s.data().whatsapp||'') }).catch(()=>{})
  },[user])

  const TABS = [
    { id:'home',      icon:'🏠', label:'Home'      },
    { id:'portfolio', icon:'📊', label:'Portfolio'  },
    { id:'news',      icon:'📰', label:'News'       },
    { id:'profile',   icon:'👤', label:'Profile'    },
  ]

  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>
      <div style={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
        {tab==='home'      && <HomeScreen      clientData={clientData} adminPhone={adminPhone}/>}
        {tab==='portfolio' && <PortfolioScreen  clientData={clientData} adminPhone={adminPhone}/>}
        {tab==='news'      && <NewsScreen/>}
        {tab==='profile'   && <ProfileScreen    user={user} clientData={clientData}/>}
      </div>
      <div style={{ height:65,background:'rgba(10,15,30,0.98)',borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-around',flexShrink:0 }}>
        {TABS.map(t => {
          const active = tab===t.id
          return (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'4px 12px',fontFamily:'inherit' }}>
              <span style={{ fontSize:active?20:17,filter:active?'none':'grayscale(0.6) opacity(0.5)' }}>{t.icon}</span>
              <span style={{ fontSize:9,fontWeight:active?700:400,color:active?C.gold:C.dim }}>{t.label}</span>
              {active && <div style={{ width:3,height:3,borderRadius:'50%',background:C.gold }}/>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── ROOT ───────────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  if (loading) return (
    <div style={{ height:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:C.bg }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:60,height:60,borderRadius:18,background:`linear-gradient(135deg,${C.gold},${C.goldL})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:24 }}>₹</div>
        <div style={{ fontSize:12,color:C.muted }}>Loading Anand Finco…</div>
      </div>
    </div>
  )

  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <div style={{ height:'100dvh',display:'flex',flexDirection:'column',maxWidth:430,margin:'0 auto',background:C.bg,position:'relative',overflow:'hidden' }}>
      <InjectCSS/>
      {!user
        ? <LoginScreen onLogin={u=>setUser(u)}/>
        : isAdmin
          ? <AdminApp  user={user}/>
          : <ClientApp user={user}/>
      }
    </div>
  )
}
