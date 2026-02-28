// src/App.jsx  — Anand Finco Complete Web App
import { useState, useEffect, useCallback, useRef } from 'react'
import { auth, db } from './firebase.js'
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, Timestamp
} from 'firebase/firestore'

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt   = n => '₹' + new Intl.NumberFormat('en-IN').format(Math.round(n || 0))
const fmtL  = n => { if (!n) return '₹0'; if (n >= 1e7) return `₹${(n/1e7).toFixed(2)} Cr`; if (n >= 1e5) return `₹${(n/1e5).toFixed(2)} L`; return fmt(n) }
const pct   = n => (n >= 0 ? '+' : '') + (n || 0).toFixed(2) + '%'
const gc    = n => n >= 0 ? '#22c55e' : '#ef4444'
const uid   = () => Math.random().toString(36).slice(2, 10)
const nowTs = () => new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
const ADMIN_EMAIL = 'admin@anandfinco.com'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:'#070d1a', bg2:'#0c1525', bg3:'#0f1e35',
  gold:'#c9a227', goldL:'#e6c96b', goldBg:'rgba(201,162,39,0.08)', goldBd:'rgba(201,162,39,0.22)',
  text:'#f1f5f9', text2:'#cbd5e1', muted:'#6b7280', dim:'#374151',
  card:'rgba(255,255,255,0.045)', border:'rgba(255,255,255,0.08)',
  green:'#22c55e', greenBg:'rgba(34,197,94,0.1)',
  red:'#ef4444',   redBg:'rgba(239,68,68,0.1)',
  blue:'#3b82f6',
}

// ── CSS inject ────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};height:100dvh;overflow:hidden}
#root{height:100dvh;display:flex;flex-direction:column;align-items:center;background:#040609}
input::placeholder,textarea::placeholder{color:${C.dim}}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
select option{background:${C.bg2}}
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

// ── Phone shell ───────────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      width: '100%', maxWidth: 430, height: '100dvh',
      background: C.bg, display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      boxShadow: '0 0 80px rgba(0,0,0,0.8)',
    }}>
      {children}
    </div>
  )
}

// ── Tiny UI atoms ─────────────────────────────────────────────────────────────
function Btn({ label, onClick, color, outline, danger, full, sm, disabled, loading, icon }) {
  const bg  = outline ? 'transparent' : (danger ? C.red : (color || C.gold))
  const tc  = outline ? (danger ? C.red : (color || C.gold)) : (danger ? '#fff' : '#0a0f1e')
  const bdc = outline ? `${danger ? C.red : (color || C.gold)}55` : 'transparent'
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{
        background: bg, border: `1px solid ${bdc}`, borderRadius: 12,
        padding: sm ? '8px 14px' : '13px 18px', color: tc,
        fontWeight: 800, fontSize: sm ? 12 : 14, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 6, width: full ? '100%' : 'auto',
        fontFamily: 'inherit', flexShrink: 0, transition: 'opacity .15s',
      }}>
      {icon && <span>{icon}</span>}
      {loading ? '…' : label}
    </button>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, note, rows, options }) {
  const base = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '10px 13px', color: C.text, fontSize: 14,
    outline: 'none', fontFamily: 'inherit',
  }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>}
      {options
        ? <select value={value} onChange={e => onChange(e.target.value)} style={base}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        : rows
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...base, resize: 'vertical' }} />
        : <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder}
            style={base} onKeyDown={type === 'password' ? undefined : undefined} />
      }
      {note && <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{note}</div>}
    </div>
  )
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, ...style, cursor: onClick ? 'pointer' : 'default' }}>
      {children}
    </div>
  )
}

function Badge({ label, color }) {
  return (
    <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [msg])
  if (!msg) return null
  const c = type === 'error' ? C.red : C.green
  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      background: `${c}18`, border: `1px solid ${c}44`, borderRadius: 10,
      padding: '10px 20px', color: c, fontSize: 12, fontWeight: 700,
      zIndex: 9999, whiteSpace: 'nowrap', maxWidth: 360, textAlign: 'center',
    }}>{msg}</div>
  )
}

function Sheet({ show, onClose, title, children }) {
  if (!show) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, background: '#0c1829', borderTopLeftRadius: 24, borderTopRightRadius: 24, border: '1px solid rgba(255,255,255,0.08)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 14px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, width: 30, height: 30, color: C.muted, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

function Confirm({ msg, onYes, onNo }) {
  if (!msg) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
        <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginBottom: 20, lineHeight: 1.5 }}>{msg}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn label="Cancel"  onClick={onNo}  outline full sm />
          <Btn label="Confirm" onClick={onYes} danger  full sm />
        </div>
      </div>
    </div>
  )
}

function Empty({ icon, title, sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.muted, marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{sub}</div>}
    </div>
  )
}

function Loader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>₹</div>
      <div style={{ fontSize: 12, color: C.muted }}>Loading…</div>
    </div>
  )
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ tabs, active, onChange }) {
  return (
    <div style={{ height: 64, background: 'rgba(8,17,31,0.98)', borderTop: `1px solid ${C.border}`, display: 'flex', flexShrink: 0, position: 'relative', zIndex: 10 }}>
      {tabs.map(t => {
        const on = active === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative', fontFamily: 'inherit' }}>
            {t.badge > 0 && <div style={{ position: 'absolute', top: 8, right: '25%', width: 16, height: 16, background: C.red, borderRadius: '50%', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</div>}
            <span style={{ fontSize: on ? 20 : 18, filter: on ? 'none' : 'grayscale(1) opacity(0.4)', transition: 'filter .2s' }}>{t.icon}</span>
            <span style={{ fontSize: 9, fontWeight: on ? 800 : 500, color: on ? C.gold : C.muted, transition: 'color .2s' }}>{t.label}</span>
            {on && <div style={{ position: 'absolute', bottom: 0, width: 20, height: 2, background: C.gold, borderRadius: 2 }} />}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const [un, setUn]         = useState('')
  const [pw, setPw]         = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState('')

  async function login() {
    if (!un || !pw) { setError('Enter username and password'); return }
    setLoad(true); setError('')
    try {
      const email = un.trim().toLowerCase() === 'admin' ? ADMIN_EMAIL : `${un.trim().toLowerCase()}@anandfinco.com`
      await signInWithEmailAndPassword(auth, email, pw)
    } catch (e) {
      const map = {
        'auth/invalid-credential':   'Wrong username or password.',
        'auth/user-not-found':        'No account found.',
        'auth/wrong-password':        'Incorrect password.',
        'auth/too-many-requests':     'Too many attempts. Wait a moment.',
        'auth/network-request-failed':'No internet connection.',
      }
      setError(map[e.code] || 'Login failed. Check your details.')
    }
    setLoad(false)
  }

  const fill = (u, p) => { setUn(u); setPw(p); setError('') }

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: `radial-gradient(ellipse at 20% 20%,rgba(201,162,39,0.06) 0%,transparent 60%), radial-gradient(ellipse at 80% 80%,rgba(59,130,246,0.04) 0%,transparent 60%), ${C.bg}` }}>
      <div className="fadeUp" style={{ width: '100%', maxWidth: 390 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: `0 12px 40px ${C.gold}40`, fontSize: 34 }}>₹</div>
          <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 26, fontWeight: 800, color: '#e8d5a3' }}>Anand Finco</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2.5, marginTop: 5, textTransform: 'uppercase' }}>Private Wealth Management</div>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 22, padding: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>Welcome Back</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22 }}>Sign in to your investment account</div>

          <Field label="Username" value={un} onChange={setUn} placeholder="e.g. rahul.sharma" />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Password</div>
            <div style={{ position: 'relative' }}>
              <input value={pw} onChange={e => setPw(e.target.value)} type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                onKeyDown={e => e.key === 'Enter' && login()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 44px 10px 13px', color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && <div style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 10, padding: '10px 13px', color: C.red, fontSize: 12, marginBottom: 14 }}>⚠️ {error}</div>}

          <Btn label="Sign In" onClick={login} loading={loading} full />

         <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: C.muted }}>
            Contact your advisor if you need access.
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: C.dim, marginTop: 18 }}>🔒 Secured by Firebase Auth · SEBI Compliant</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT — HOME
// ─────────────────────────────────────────────────────────────────────────────
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
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT — PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioScreen({ user }) {
  const [holdings,  setHoldings]  = useState([])
  const [companies, setCompanies] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'portfolios', user.uid)),
      getDocs(collection(db, 'companies')),
    ]).then(([pd, co]) => {
      setHoldings(pd.exists() ? pd.data().holdings || [] : [])
      setCompanies(co.docs.map(d => ({ id: d.id, ...d.data() })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user.uid])

  const enriched = holdings.map(h => {
    const co   = companies.find(c => c.id === h.companyId)
    const curr = (h.stake / 100) * (co?.currentValuation || h.buyValuation)
    const buy  = (h.stake / 100) * h.buyValuation
    const g    = curr - buy
    const gp   = buy > 0 ? (g / buy) * 100 : 0
    const vp   = h.buyValuation > 0 ? ((co?.currentValuation || h.buyValuation) - h.buyValuation) / h.buyValuation * 100 : 0
    return { ...h, curr, buy, g, gp, vp, nowVal: co?.currentValuation || h.buyValuation }
  })
  const totI = enriched.reduce((s, h) => s + h.buy, 0)
  const totC = enriched.reduce((s, h) => s + h.curr, 0)
  const totG = totC - totI
  const totP = totI > 0 ? (totG / totI) * 100 : 0

  if (loading) return <Loader />

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ background: C.bg2, padding: '52px 18px 18px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>My Portfolio</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{enriched.length} holdings · Live valuations</div>
      </div>

      <div style={{ padding: '18px 18px 40px' }}>
        {/* Summary */}
        <div style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 18, padding: 18, marginBottom: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[['Total Invested', fmt(totI), C.text2], ['Current Value', fmt(totC), C.gold], ['Gain / Loss', (totG >= 0 ? '+' : '') + fmt(totG), gc(totG)], ['Overall Return', pct(totP), gc(totP)]].map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector bars */}
        {enriched.length > 0 && (() => {
          const sectors = enriched.reduce((a, h) => { a[h.sector] = (a[h.sector] || 0) + h.curr; return a }, {})
          return (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 14 }}>Sector Breakdown</div>
              {Object.entries(sectors).sort(([, a], [, b]) => b - a).map(([sec, val]) => {
                const p = totC > 0 ? (val / totC) * 100 : 0
                return (
                  <div key={sec} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>{sec}</span>
                      <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{p.toFixed(1)}% · {fmt(val)}</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p}%`, background: C.gold, borderRadius: 99 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {enriched.length === 0 && <Empty icon="📊" title="No holdings yet" sub="Your portfolio will appear here once your advisor adds your investments" />}

        {/* Holdings */}
        {enriched.map((h, i) => (
          <Card key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: '#0f2744', border: '1px solid #2563eb33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏛️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{h.companyName}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{h.sector}</div>
              </div>
              <div style={{ background: `${gc(h.g)}18`, border: `1px solid ${gc(h.g)}44`, borderRadius: 9, padding: '5px 10px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: gc(h.g) }}>{pct(h.gp)}</div>
              </div>
            </div>
            <div style={{ height: 1, background: C.border, marginBottom: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[['Stake', `${h.stake}%`, C.text2], ['Invested', fmt(h.buy), C.text2], ['Current', fmt(h.curr), C.gold], ['P&L', (h.g >= 0 ? '+' : '') + fmt(h.g), gc(h.g)], ['Buy Val.', fmtL(h.buyValuation), C.muted], ['Now Val.', fmtL(h.nowVal), gc(h.vp)]].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.muted, marginBottom: 5 }}>
                <span>Valuation change</span><span style={{ color: gc(h.vp), fontWeight: 700 }}>{pct(h.vp)}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(Math.abs(h.vp) * 3, 100)}%`, background: gc(h.vp), borderRadius: 99 }} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT — NEWS
// ─────────────────────────────────────────────────────────────────────────────
const NEWS_DATA = [
  { id:1, tag:'Markets',  color:'#3b82f6', time:'2m ago',  live:true,  title:'Sensex rallies 450 pts as FII buying resumes', body:'Foreign institutional investors turned net buyers after three sessions of selling, lifting benchmark indices.' },
  { id:2, tag:'Bonds',    color:'#a855f7', time:'22m ago', live:false, title:'RBI holds repo rate at 6.5% — bond yields ease', body:'MPC votes 4-2 to keep rates unchanged. 10-year G-sec yield drops 6 bps to 7.08%.' },
  { id:3, tag:'Unlisted', color:'#f59e0b', time:'1h ago',  live:false, title:'Pre-IPO demand surges for fintech unlisted shares', body:'Secondary market premiums on unlisted fintech paper widen to 35% over last fundraise valuation.' },
  { id:4, tag:'Economy',  color:'#22c55e', time:'3h ago',  live:false, title:'India GDP revised to 7.2% for FY26 — IMF', body:'Strong domestic consumption and capital investment underpin the upgrade from 6.8% earlier.' },
  { id:5, tag:'Unlisted', color:'#f59e0b', time:'5h ago',  live:false, title:'SEBI tightens norms for unlisted public companies', body:'Half-yearly financials now mandatory for companies with over ₹10 Cr paid-up capital.' },
  { id:6, tag:'Markets',  color:'#3b82f6', time:'7h ago',  live:false, title:'FPI inflows cross ₹25,000 Cr in equities this month', body:'Sustained foreign buying driven by India\'s macro stability. Rupee strengthens to 83.2.' },
]

function NewsScreen() {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Markets', 'Bonds', 'Unlisted', 'Economy']
  const list = filter === 'All' ? NEWS_DATA : NEWS_DATA.filter(n => n.tag === filter)
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: C.bg2, padding: '52px 18px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>Market News</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>Live updates · Curated for you</div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 18px', overflowX: 'auto', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ flexShrink: 0, background: filter === f ? `linear-gradient(90deg,${C.gold},${C.goldL})` : 'rgba(255,255,255,0.05)', border: filter === f ? 'none' : `1px solid ${C.border}`, borderRadius: 20, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: filter === f ? '#0a0f1e' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{f}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {list.map((n, i) => (
          <Card key={n.id} style={{ marginBottom: 12, background: i === 0 ? '#0f2031' : C.card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge label={n.tag} color={n.color} />
                {n.live && <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${C.green}18`, borderRadius: 10, padding: '2px 8px' }}>
                  <div className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: C.green }} />
                  <span style={{ fontSize: 9, color: C.green, fontWeight: 800, letterSpacing: 0.5 }}>LIVE</span>
                </div>}
              </div>
              <span style={{ fontSize: 10, color: C.dim }}>{n.time}</span>
            </div>
            <div style={{ fontSize: i === 0 ? 15 : 13, fontWeight: 800, color: C.text, lineHeight: 1.4, marginBottom: 7 }}>{n.title}</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{n.body}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT — PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function ProfileScreen({ user }) {
  const [pan, setPan]       = useState(user.pan || '')
  const [editing, setEdit]  = useState(false)
  const [saving, setSave]   = useState(false)
  const [toast, setToast]   = useState(null)

  async function savePan() {
    const v = pan.toUpperCase()
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)) { setToast({ m: 'Invalid PAN. Format: ABCDE1234F', t: 'error' }); return }
    setSave(true)
    try {
      await updateDoc(doc(db, 'clients', user.uid), { pan: v })
      setEdit(false); setToast({ m: 'PAN saved successfully!' })
    } catch { setToast({ m: 'Could not save PAN', t: 'error' }) }
    setSave(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />
      <div style={{ background: C.bg2, padding: '52px 18px 18px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>Profile</div>
      </div>
      <div style={{ padding: '22px 18px 40px' }}>
        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 32, fontWeight: 900, color: '#0a0f1e', boxShadow: `0 8px 32px ${C.gold}35` }}>
            {(user.name || 'I')[0]}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{user.name || 'Investor'}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{user.email}</div>
          <div style={{ marginTop: 10, display: 'inline-block', background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 20, padding: '4px 16px', fontSize: 11, color: C.gold, fontWeight: 700 }}>✦ Premium Member</div>
        </div>

        {/* Welcome note */}
        {user.welcomeNote && (
          <Card style={{ marginBottom: 14, background: '#0f2031', border: `1px solid ${C.goldBd}` }}>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>✉ Note from Anand Finco</div>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, fontStyle: 'italic' }}>"{user.welcomeNote}"</div>
          </Card>
        )}

        {/* Info */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Personal Information</div>
          {[['📧', 'Email', user.email || '—'], ['📱', 'Phone', user.phone || '—'], ['📍', 'City', user.city || '—'], ['🗓', 'Member Since', user.joinDate ? `Since ${user.joinDate}` : '—']].map(([ic, l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>{ic}</span>
              <div>
                <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, color: C.text2, fontWeight: 600 }}>{v}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* PAN */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>KYC · PAN Card</div>
              <div style={{ fontSize: 11, color: pan ? C.green : C.muted, marginTop: 3 }}>{pan ? 'Verified ✅' : 'Not added yet'}</div>
            </div>
            {!editing && <button onClick={() => setEdit(true)}
              style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 9, padding: '5px 12px', color: C.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{pan ? 'Edit' : '+ Add'}</button>}
          </div>
          {!editing
            ? pan
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenBg, border: `1px solid ${C.green}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✅</div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>PAN Number</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: 2.5, marginTop: 3 }}>{pan}</div>
                </div>
              </div>
              : <div style={{ fontSize: 12, color: C.dim, textAlign: 'center', padding: '8px 0' }}>Add your PAN to complete KYC verification.</div>
            : <div>
              <Field label="PAN Number" value={pan} onChange={v => setPan(v.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" note="Format: AAAAA0000A" />
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn label="Cancel" onClick={() => setEdit(false)} outline full sm />
                <Btn label="Save PAN" onClick={savePan} loading={saving} full sm />
              </div>
            </div>
          }
        </Card>

        <button onClick={() => signOut(auth)}
          style={{ width: '100%', background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 14, padding: 15, color: C.red, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
          🚪 Sign Out
        </button>
        <div style={{ textAlign: 'center', fontSize: 10, color: C.dim, marginTop: 18 }}>Anand Finco · SEBI Registered · © 2025</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — COMPANIES
// ─────────────────────────────────────────────────────────────────────────────
const SECTORS = ['Technology','Healthcare','Logistics','Infrastructure','Renewables','Finance','FMCG','Real Estate','Others']
const RISKS   = ['Low','Medium','High']
const BLANK_CO = { name:'', sector:'Technology', minInvest:'', currentValuation:'', initialValuation:'', expectedReturns:'', risk:'Medium', lotSize:'0.5% / lot', active:true, description:'' }

function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [sheet, setSheet]         = useState(false)
  const [form, setForm]           = useState(BLANK_CO)
  const [editId, setEditId]       = useState(null)
  const [valMap, setValMap]       = useState({})
  const [confirm, setConfirm]     = useState(null)
  const [toast, setToast]         = useState(null)
  const sf = k => v => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    const snap = await getDocs(collection(db, 'companies'))
    setCompanies(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!form.name.trim() || !form.minInvest || !form.currentValuation) {
      setToast({ m: 'Name, min investment and valuation required', t: 'error' }); return
    }
    const data = { ...form, minInvest: parseInt(form.minInvest) || 0, currentValuation: parseInt(form.currentValuation) || 0, initialValuation: parseInt(form.initialValuation || form.currentValuation) || 0 }
    try {
      if (editId) await updateDoc(doc(db, 'companies', editId), data)
      else        await addDoc(collection(db, 'companies'), data)
      setToast({ m: editId ? 'Company updated!' : 'Company added!' })
      setSheet(false); setEditId(null); setForm(BLANK_CO); load()
    } catch { setToast({ m: 'Save failed', t: 'error' }) }
  }

  async function updateVal(co) {
    const nv = parseInt(valMap[co.id])
    if (!nv || nv < 100) { setToast({ m: 'Enter a valid valuation', t: 'error' }); return }
    await updateDoc(doc(db, 'companies', co.id), { currentValuation: nv })
    setToast({ m: `${co.name} → ${fmtL(nv)} ✨ All portfolios updated live!` })
    setValMap(p => ({ ...p, [co.id]: '' })); load()
  }

  async function toggleActive(co) {
    await updateDoc(doc(db, 'companies', co.id), { active: !co.active }); load()
  }

  async function doDelete() {
    await deleteDoc(doc(db, 'companies', confirm.id))
    setToast({ m: 'Deleted' }); setConfirm(null); load()
  }

  function startEdit(co) {
    setForm({ ...co, minInvest: String(co.minInvest), currentValuation: String(co.currentValuation), initialValuation: String(co.initialValuation || co.currentValuation) })
    setEditId(co.id); setSheet(true)
  }

  const riskC = { Low: C.green, Medium: '#f59e0b', High: C.red }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />
      <Confirm msg={confirm?.msg} onYes={doDelete} onNo={() => setConfirm(null)} />

      <div style={{ background: C.bg2, padding: '52px 18px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Companies</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{companies.length} total · Controls what clients see</div>
        </div>
        <Btn label="+ Add" onClick={() => { setForm(BLANK_CO); setEditId(null); setSheet(true) }} sm />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {companies.length === 0 && <Empty icon="🏢" title="No companies yet" sub="Tap + Add to create your first opportunity" />}
        {companies.map(co => (
          <Card key={co.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 }}>{co.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge label={co.sector} color={C.blue} />
                  <Badge label={co.risk} color={riskC[co.risk] || C.muted} />
                  <Badge label={co.active ? 'Visible' : 'Hidden'} color={co.active ? C.green : C.muted} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, marginLeft: 8 }}>
                <button onClick={() => startEdit(co)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 9px', cursor: 'pointer', fontSize: 13 }}>✏️</button>
                <button onClick={() => setConfirm({ id: co.id, msg: `Delete "${co.name}"? This is permanent.` })} style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '6px 9px', cursor: 'pointer', fontSize: 13 }}>🗑️</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[['Min Invest', fmt(co.minInvest)], ['Valuation', fmtL(co.currentValuation)], ['Initial Val.', fmtL(co.initialValuation || co.currentValuation)], ['Returns', co.expectedReturns]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.text2, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Live valuation updater */}
            <div style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginBottom: 8 }}>🔄 Update Valuation — reflects live in all client portfolios</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={valMap[co.id] || ''} onChange={e => setValMap(p => ({ ...p, [co.id]: e.target.value }))}
                  placeholder={`New value (now: ${fmtL(co.currentValuation)})`} type="number"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                <Btn label="Update" onClick={() => updateVal(co)} sm />
              </div>
            </div>
            {/* Show/hide toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.muted }}>Show to clients</span>
              <button onClick={() => toggleActive(co)}
                style={{ background: co.active ? C.redBg : C.greenBg, border: `1px solid ${co.active ? C.red : C.green}44`, borderRadius: 8, padding: '5px 14px', color: co.active ? C.red : C.green, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {co.active ? '🔴 Hide from clients' : '🟢 Show to clients'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Sheet show={sheet} onClose={() => setSheet(false)} title={editId ? 'Edit Company' : 'Add New Company'}>
        <Field label="Company Name *" value={form.name} onChange={sf('name')} placeholder="XYZ Technologies Pvt Ltd" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Min Invest ₹ *" value={form.minInvest} onChange={sf('minInvest')} type="number" placeholder="50000" />
          <Field label="Valuation ₹ *" value={form.currentValuation} onChange={sf('currentValuation')} type="number" placeholder="5000000" />
        </div>
        <Field label="Expected Returns" value={form.expectedReturns} onChange={sf('expectedReturns')} placeholder="15–20%" />
        <Field label="Lot Size" value={form.lotSize} onChange={sf('lotSize')} placeholder="0.5% / lot" />
        <Field label="Sector" value={form.sector} onChange={sf('sector')} options={SECTORS} />
        <Field label="Risk Level" value={form.risk} onChange={sf('risk')} options={RISKS} />
        <Field label="Description" value={form.description} onChange={sf('description')} placeholder="About this company…" rows={3} />
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn label="Cancel" onClick={() => setSheet(false)} outline full />
          <Btn label={editId ? 'Save Changes' : 'Add Company'} onClick={save} full />
        </div>
      </Sheet>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
function AdminNotifications() {
  const [notifs, setNotifs]     = useState([])
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'notifications'), orderBy('timestamp', 'desc')))
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.log('notifs:', e.message) }
    setLoading(false)
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t) }, [load])

  async function markRead(n) {
    if (n.read) return
    await updateDoc(doc(db, 'notifications', n.id), { read: true }); load()
  }

  function openWA(n) {
    const ph = (n.clientPhone || '').replace(/\D/g, '')
    if (!ph || ph === 'NA') return
    const msg = encodeURIComponent(`Hello ${n.clientName}! 👋\n\nThis is Team Anand Finco. We received your interest in *${n.companyName}*.\n\nLet's connect to discuss the investment details!\n\n– Anand Finco`)
    window.open(`https://wa.me/${ph}?text=${msg}`, '_blank')
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: C.bg2, padding: '52px 18px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Invest Requests</div>
          <div style={{ fontSize: 11, color: unread > 0 ? C.gold : C.muted, marginTop: 2 }}>
            {unread > 0 ? `${unread} new unread` : 'All caught up ✓'}
          </div>
        </div>
        <button onClick={load} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 13px', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Refresh</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {loading && <Loader />}
        {!loading && notifs.length === 0 && <Empty icon="🔔" title="No requests yet" sub="When clients tap 'Invest Now', their requests appear here" />}
        {notifs.map(n => (
          <div key={n.id} onClick={() => markRead(n)}
            style={{ background: n.read ? C.card : 'rgba(201,162,39,0.07)', border: `1px solid ${n.read ? C.border : C.goldBd}`, borderRadius: 16, padding: 16, marginBottom: 12, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />}
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{n.clientName}</span>
              </div>
              <Badge label={n.read ? 'Read' : 'New'} color={n.read ? C.muted : C.blue} />
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>{n.message}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[['Company', n.companyName], ['Phone', n.clientPhone || 'N/A'], ['Min Interest', fmt(n.interestedMin || 0)], ['Time', n.timestamp?.toDate?.()?.toLocaleString('en-IN') || '—']].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <button onClick={e => { e.stopPropagation(); openWA(n) }}
              style={{ width: '100%', background: 'linear-gradient(90deg,#25D366,#128C7E)', border: 'none', borderRadius: 11, padding: 12, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              💬 WhatsApp {n.clientName?.split(' ')[0]} Now
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — PORTFOLIOS
// ─────────────────────────────────────────────────────────────────────────────
function AdminPortfolios() {
  const [clients,   setClients]   = useState([])
  const [companies, setCompanies] = useState([])
  const [selected,  setSelected]  = useState(null)
  const [holdings,  setHoldings]  = useState([])
  const [sheet,     setSheet]     = useState(false)
  const [confirm,   setConfirm]   = useState(null)
  const [toast,     setToast]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [form, setForm] = useState({ companyId: '', stake: '1', buyValuation: '', investedAmt: '', purchaseDate: new Date().toISOString().split('T')[0] })
  const sf = k => v => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    Promise.all([getDocs(collection(db, 'clients')), getDocs(collection(db, 'companies'))]).then(([cs, cos]) => {
      setClients(cs.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.email !== ADMIN_EMAIL))
      setCompanies(cos.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  async function selectClient(c) {
    setSelected(c)
    const snap = await getDoc(doc(db, 'portfolios', c.id))
    setHoldings(snap.exists() ? snap.data().holdings || [] : [])
  }

  async function addHolding() {
    const co = companies.find(c => c.id === form.companyId)
    if (!co || !form.stake || !form.buyValuation) { setToast({ m: 'Select company, stake and valuation', t: 'error' }); return }
    const stake  = parseFloat(form.stake)
    const buyV   = parseInt(form.buyValuation)
    const invAmt = parseInt(form.investedAmt) || Math.round((stake / 100) * buyV)
    const h = { companyId: co.id, companyName: co.name, sector: co.sector, stake, buyValuation: buyV, investedAmt: invAmt, purchaseDate: form.purchaseDate }
    setSaving(true)
    try {
      const next = [...holdings, h]
      await setDoc(doc(db, 'portfolios', selected.id), { holdings: next })
      setHoldings(next); setSheet(false); setToast({ m: 'Holding added! Client can see it now ✨' })
    } catch { setToast({ m: 'Save failed', t: 'error' }) }
    setSaving(false)
  }

  async function removeHolding() {
    const next = holdings.filter((_, i) => i !== confirm.idx)
    await setDoc(doc(db, 'portfolios', selected.id), { holdings: next })
    setHoldings(next); setConfirm(null); setToast({ m: 'Removed' })
  }

  if (!selected) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: C.bg2, padding: '52px 18px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Portfolios</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Select a client to manage their holdings</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {clients.length === 0 && <Empty icon="📋" title="No clients yet" sub="Add clients first from the Clients tab" />}
        {clients.map(c => (
          <Card key={c.id} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => selectClient(c)}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0f1e', fontSize: 18, flexShrink: 0 }}>{(c.name || '?')[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{c.name}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{c.username || c.id}</div>
            </div>
            <span style={{ color: C.gold, fontSize: 20 }}>›</span>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />
      <Confirm msg={confirm?.msg} onYes={removeHolding} onNo={() => setConfirm(null)} />
      <div style={{ background: C.bg2, padding: '52px 18px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => setSelected(null)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 13px', color: C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{selected.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{holdings.length} holdings</div>
        </div>
        <Btn label="+ Add" onClick={() => setSheet(true)} sm />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {holdings.length === 0 && <Empty icon="📊" title="No holdings" sub="Add holdings using the + Add button" />}
        {holdings.map((h, i) => {
          const co   = companies.find(c => c.id === h.companyId)
          const curr = (h.stake / 100) * (co?.currentValuation || h.buyValuation)
          const buy  = (h.stake / 100) * h.buyValuation
          const g    = curr - buy
          return (
            <Card key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, flex: 1 }}>{h.companyName}</div>
                <button onClick={() => setConfirm({ idx: i, msg: `Remove ${h.companyName} from ${selected.name}'s portfolio?` })}
                  style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 7, padding: '4px 10px', color: C.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[['Stake', `${h.stake}%`], ['Buy Val.', fmtL(h.buyValuation)], ['Now Val.', fmtL(co?.currentValuation || h.buyValuation)], ['Invested', fmt(buy)], ['Current', fmt(curr)], ['P&L', (g >= 0 ? '+' : '') + fmt(g)]].map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.text2, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
      <Sheet show={sheet} onClose={() => setSheet(false)} title={`Add Holding — ${selected.name}`}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Select Company *</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {companies.map(c => (
              <button key={c.id} onClick={() => { sf('companyId')(c.id); sf('buyValuation')(String(c.currentValuation)) }}
                style={{ background: form.companyId === c.id ? C.gold : 'rgba(255,255,255,0.05)', border: `1px solid ${form.companyId === c.id ? C.gold : C.border}`, borderRadius: 20, padding: '6px 13px', fontSize: 11, fontWeight: 700, color: form.companyId === c.id ? '#0a0f1e' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{c.name}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Stake (%) *" value={form.stake} onChange={sf('stake')} type="number" placeholder="1.0" />
          <Field label="Buy Valuation ₹ *" value={form.buyValuation} onChange={sf('buyValuation')} type="number" />
        </div>
        <Field label="Amount Invested ₹" value={form.investedAmt} onChange={sf('investedAmt')} type="number" note="Auto-calculated from stake if blank" />
        <Field label="Purchase Date" value={form.purchaseDate} onChange={sf('purchaseDate')} placeholder="2025-01-15" />
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn label="Cancel" onClick={() => setSheet(false)} outline full />
          <Btn label="Add Holding" onClick={addHolding} loading={saving} full />
        </div>
      </Sheet>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — CLIENTS
// ─────────────────────────────────────────────────────────────────────────────
function AdminClients() {
  const [clients, setClients]   = useState([])
  const [sheet, setSheet]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)
  const [form, setForm]         = useState({ name: '', username: '', password: '', phone: '', email: '', city: '', joinDate: String(new Date().getFullYear()), welcomeNote: '' })
  const sf = k => v => setForm(p => ({ ...p, [k]: v }))

  const load = useCallback(async () => {
    const snap = await getDocs(collection(db, 'clients'))
    setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.email !== ADMIN_EMAIL))
  }, [])
  useEffect(() => { load() }, [load])

  async function addClient() {
    if (!form.name || !form.username || !form.password) { setToast({ m: 'Name, username and password required', t: 'error' }); return }
    if (form.password.length < 6) { setToast({ m: 'Password must be at least 6 characters', t: 'error' }); return }
    setSaving(true)
    try {
      const email    = `${form.username.trim().toLowerCase().replace(/\s/g, '.')}@anandfinco.com`
      const userCred = await createUserWithEmailAndPassword(auth, email, form.password)
      await setDoc(doc(db, 'clients', userCred.user.uid), {
        name: form.name, email, phone: form.phone, city: form.city,
        pan: '', joinDate: form.joinDate, welcomeNote: form.welcomeNote,
        username: form.username.trim().toLowerCase(),
      })
      setToast({ m: `${form.name} added! Login: ${form.username} / ${form.password}` })
      setSheet(false); setForm({ name: '', username: '', password: '', phone: '', email: '', city: '', joinDate: String(new Date().getFullYear()), welcomeNote: '' }); load()
    } catch (e) {
      const map = { 'auth/email-already-in-use': 'Username already exists.', 'auth/weak-password': 'Password too weak.' }
      setToast({ m: map[e.code] || e.message, t: 'error' })
    }
    setSaving(false)
  }

  function openWA(c) {
    if (!c.phone) return
    const msg = encodeURIComponent(`Hello ${c.name}! 👋 Team Anand Finco here. Let's connect! – Anand Finco`)
    window.open(`https://wa.me/${c.phone.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />
      <div style={{ background: C.bg2, padding: '52px 18px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Clients</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{clients.length} registered</div>
        </div>
        <Btn label="+ Add Client" onClick={() => setSheet(true)} sm />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {clients.length === 0 && <Empty icon="👥" title="No clients yet" sub="Tap '+ Add Client' to create your first client account" />}
        {clients.map(c => (
          <Card key={c.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#0a0f1e', fontSize: 19, flexShrink: 0 }}>{(c.name || '?')[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{c.username || c.id} · {c.phone || 'No phone'} · {c.city || '—'}</div>
                {c.pan && <div style={{ fontSize: 10, color: C.gold, marginTop: 2, fontWeight: 700 }}>PAN: {c.pan}</div>}
              </div>
              {c.phone && (
                <button onClick={() => openWA(c)} style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 10, padding: '8px 11px', fontSize: 18, cursor: 'pointer', flexShrink: 0 }}>💬</button>
              )}
            </div>
            {c.welcomeNote && <div style={{ fontSize: 11, color: C.muted, marginTop: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontStyle: 'italic' }}>"{c.welcomeNote}"</div>}
          </Card>
        ))}
      </div>
      <Sheet show={sheet} onClose={() => setSheet(false)} title="Add New Client">
        <Field label="Full Name *" value={form.name} onChange={sf('name')} placeholder="Rahul Sharma" />
        <Field label="Username * (login ID)" value={form.username} onChange={sf('username')} placeholder="rahul.sharma" note="Client logs in with this. Email: username@anandfinco.com" />
        <Field label="Password * (min 6 chars)" value={form.password} onChange={sf('password')} type="password" placeholder="Set a strong password" />
        <Field label="Phone (with country code)" value={form.phone} onChange={sf('phone')} placeholder="919876543210" note="Used for WhatsApp contact" />
        <Field label="City" value={form.city} onChange={sf('city')} placeholder="Mumbai" />
        <Field label="Join Year" value={form.joinDate} onChange={sf('joinDate')} placeholder="2025" />
        <Field label="Welcome Note (shown in client profile)" value={form.welcomeNote} onChange={sf('welcomeNote')} placeholder="Personalized message for this client…" rows={3} />
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Btn label="Cancel" onClick={() => setSheet(false)} outline full />
          <Btn label="Add Client" onClick={addClient} loading={saving} full />
        </div>
      </Sheet>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
function AdminSettings({ user }) {
  const [waNum, setWaNum]   = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)

  useEffect(() => {
    getDoc(doc(db, 'adminConfig', 'main')).then(s => { if (s.exists()) setWaNum(s.data().whatsapp || '') }).catch(() => {})
  }, [])

  async function save() {
    const clean = waNum.replace(/\D/g, '')
    if (clean.length < 10) { setToast({ m: 'Enter a valid phone number with country code', t: 'error' }); return }
    setSaving(true)
    try {
      await setDoc(doc(db, 'adminConfig', 'main'), { whatsapp: clean }, { merge: true })
      setToast({ m: 'WhatsApp number saved! Clients will now contact this number ✅' })
    } catch { setToast({ m: 'Save failed. Check Firestore rules.', t: 'error' }) }
    setSaving(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />
      <div style={{ background: C.bg2, padding: '52px 18px 18px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Settings</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Admin configuration</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 50px' }}>
        {/* Admin Info */}
        <div style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#0a0f1e' }}>A</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Admin — Anand Finco</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{user?.email}</div>
          </div>
        </div>

        {/* WhatsApp */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>💬 WhatsApp Notification Number</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>
            When clients tap "Invest Now", a WhatsApp message opens to this number. Used for all direct client contact.
          </div>
          <Field label="Your WhatsApp Number" value={waNum} onChange={setWaNum} placeholder="919876543210" note="Country code + number, no spaces. Example: 919876543210" />
          <Btn label={saving ? 'Saving…' : 'Save Number'} onClick={save} loading={saving} full />
        </Card>

        {/* Firestore rules */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 10 }}>🔐 Firestore Security Rules</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Copy-paste in Firebase Console → Firestore → Rules tab:</div>
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 14, border: `1px solid rgba(255,255,255,0.06)` }}>
            <pre style={{ fontSize: 9, color: '#a5f3fc', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /companies/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email
        == "admin@anandfinco.com";
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
    match /adminConfig/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email
        =="admin@anandfinco.com";
    }
  }
}`}</pre>
          </div>
        </Card>

        <Btn label="🚪  Sign Out" onClick={() => signOut(auth)} danger full />
        <div style={{ textAlign: 'center', fontSize: 10, color: C.dim, marginTop: 18, lineHeight: 1.7 }}>Anand Finco Pvt Ltd · SEBI Registered Investment Advisor · © 2025</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
function ClientApp({ user }) {
  const [tab, setTab] = useState('home')
  const TABS = [
    { id: 'home',      icon: '🏠', label: 'Home' },
    { id: 'portfolio', icon: '📊', label: 'Portfolio' },
    { id: 'news',      icon: '📰', label: 'News' },
    { id: 'profile',   icon: '👤', label: 'Profile' },
  ]
  return (
    <>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'home'      && <HomeScreen      user={user} />}
        {tab === 'portfolio' && <PortfolioScreen user={user} />}
        {tab === 'news'      && <NewsScreen />}
        {tab === 'profile'   && <ProfileScreen   user={user} />}
      </div>
      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN APP SHELL
// ─────────────────────────────────────────────────────────────────────────────
function AdminApp({ user }) {
  const [tab, setTab]     = useState('companies')
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const check = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'notifications'), where('read', '==', false)))
        setUnread(snap.size)
      } catch {}
    }
    check(); const t = setInterval(check, 20000); return () => clearInterval(t)
  }, [])

  const TABS = [
    { id: 'companies',  icon: '🏢', label: 'Companies' },
    { id: 'portfolios', icon: '📊', label: 'Portfolios' },
    { id: 'notifs',     icon: '🔔', label: 'Requests', badge: unread },
    { id: 'clients',    icon: '👥', label: 'Clients' },
    { id: 'settings',   icon: '⚙️', label: 'Settings' },
  ]
  return (
    <>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'companies'  && <AdminCompanies />}
        {tab === 'portfolios' && <AdminPortfolios />}
        {tab === 'notifs'     && <AdminNotifications />}
        {tab === 'clients'    && <AdminClients />}
        {tab === 'settings'   && <AdminSettings user={user} />}
      </div>
      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        const isAdmin = fbUser.email === ADMIN_EMAIL
        if (!isAdmin) {
          try {
            const snap = await getDoc(doc(db, 'clients', fbUser.uid))
            setProfile(snap.exists() ? { uid: fbUser.uid, email: fbUser.email, isAdmin, ...snap.data() } : { uid: fbUser.uid, email: fbUser.email, isAdmin })
          } catch { setProfile({ uid: fbUser.uid, email: fbUser.email, isAdmin }) }
        } else {
          setProfile({ uid: fbUser.uid, email: fbUser.email, isAdmin })
        }
        setUser(fbUser)
      } else {
        setUser(null); setProfile(null)
      }
    })
  }, [])

  return (
    <>
      <InjectCSS />
      <Shell>
        {user === undefined
          ? <Loader />
          : !user
          ? <LoginScreen />
          : profile?.isAdmin
          ? <AdminApp user={profile} />
          : <ClientApp user={profile || { uid: user.uid, email: user.email, isAdmin: false }} />
        }
      </Shell>
    </>
  )
}
