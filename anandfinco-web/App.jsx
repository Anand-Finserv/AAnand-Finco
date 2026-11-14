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
const gc    = n => n >= 0 ? C.green : C.red
const uid   = () => Math.random().toString(36).slice(2, 10)
const nowTs = () => new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
const ADMIN_EMAIL = 'admin@anandfinco.com'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:'var(--bg)', bg2:'var(--bg2)', bg3:'var(--bg3)',
  gold:'#00b386', goldL:'#00d09c', goldBg:'rgba(0,179,134,0.08)', goldBd:'rgba(0,179,134,0.24)',
  text:'var(--text)', text2:'var(--text2)', muted:'var(--muted)', dim:'var(--dim)',
  card:'var(--card)', border:'var(--border)',
  green:'#16a34a', greenBg:'rgba(22,163,74,0.09)', greenBd:'rgba(22,163,74,0.26)',
  red:'#e11d48',   redBg:'rgba(225,29,72,0.08)',    redBd:'rgba(225,29,72,0.24)',
  blue:'#2563eb',
}

// ── CSS inject ────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{color-scheme:light dark;--bg:#f6f8f7;--bg2:#ffffff;--bg3:#eef5f1;--surface:#ffffff;--card:#ffffff;--text:#0f1512;--text2:#3d4a45;--muted:#6b7670;--dim:#aab4ae;--border:rgba(15,23,32,0.09);--tint:15,23,32;--shade:15,23,32;--label:#5b665f;--brandText:#0a7a52;--code:#0a6b4a;--shim:#0f7a5c;--mintA:#eafaf3;--mintB:#e6f7f0;--mintC:#dff7ec;--pg1:#e1f5ec;--pg2:#f4f8f6;--pg3:#e3edfb;--sg1:#d2f3e5;--sg2:#eaf7f2;--sg3:#dbe9fd;--letterbox:#e7edea;--glass-bg:rgba(255,255,255,.58);--glass-bd:rgba(255,255,255,.78);--glass-soft-bg:rgba(255,255,255,.52);--glass-soft-bd:rgba(255,255,255,.72);--glass-shadow:0 8px 30px rgba(15,23,32,.08);--hi:rgba(255,255,255,.9);--glass-bd2:rgba(255,255,255,.7);--glass-open:rgba(255,255,255,.74);--glass-panel:rgba(255,255,255,.7);--shine:rgba(255,255,255,.6);--glass-fallback:rgba(255,255,255,.94)}
@media (prefers-color-scheme:dark){:root{--bg:#0b1210;--bg2:#121c18;--bg3:#1a2923;--surface:#141f1b;--card:#16231e;--text:#e9f2ee;--text2:#b9c9c1;--muted:#8fa198;--dim:#66776f;--border:rgba(255,255,255,0.10);--tint:255,255,255;--shade:0,0,0;--label:#9db0a7;--brandText:#3fe0a8;--code:#7fe6c0;--shim:#34d9a5;--mintA:#10241d;--mintB:#12291f;--mintC:#163026;--pg1:#0d1f18;--pg2:#0b1210;--pg3:#0c1626;--sg1:#11291f;--sg2:#0f1c17;--sg3:#0d1829;--letterbox:#050807;--glass-bg:rgba(255,255,255,.06);--glass-bd:rgba(255,255,255,.12);--glass-soft-bg:rgba(255,255,255,.07);--glass-soft-bd:rgba(255,255,255,.12);--glass-shadow:0 8px 30px rgba(0,0,0,.35);--hi:rgba(255,255,255,.10);--glass-bd2:rgba(255,255,255,.10);--glass-open:rgba(255,255,255,.10);--glass-panel:rgba(255,255,255,.08);--shine:rgba(255,255,255,.08);--glass-fallback:#16231e}}
body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.text};height:100dvh;overflow:hidden}
#root{height:100dvh;display:flex;flex-direction:column;align-items:center;background:var(--letterbox)}
input::placeholder,textarea::placeholder{color:${C.dim}}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
select option{background:${C.bg2}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes floatOrb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(24px,-30px) scale(1.15)}}
@keyframes floatOrb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-28px,26px) scale(1.1)}}
@keyframes glowPulse{0%,100%{box-shadow:0 12px 40px rgba(0,179,134,0.28)}50%{box-shadow:0 18px 64px rgba(0,179,134,0.5)}}
@keyframes logoIn{0%{opacity:0;transform:scale(0.6) rotate(-12deg)}60%{opacity:1;transform:scale(1.08) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes cardIn{from{opacity:0;transform:translateY(22px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.fadeUp{animation:fadeUp .35s ease both}
.live-dot{animation:pulse 1.5s ease infinite}
.orb1{animation:floatOrb1 7s ease-in-out infinite}
.orb2{animation:floatOrb2 9s ease-in-out infinite}
.logoAnim{animation:logoIn .9s cubic-bezier(.34,1.56,.64,1) both, glowPulse 3.2s ease-in-out infinite .9s}
.cardAnim{animation:cardIn .6s cubic-bezier(.22,1,.36,1) .15s both}
.shimmerText{background:linear-gradient(90deg,var(--shim) 0%,#00d09c 25%,var(--shim) 50%,#00b386 75%,var(--shim) 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:shimmerSweep 4s linear infinite}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes bounceIn{0%{opacity:0;transform:translateY(26px) scale(.93)}55%{opacity:1;transform:translateY(-7px) scale(1.012)}78%{transform:translateY(2px) scale(.997)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes panelIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes orbDrift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-22px) scale(1.08)}}
@keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.glass{background:var(--glass-bg);-webkit-backdrop-filter:blur(14px) saturate(165%);backdrop-filter:blur(14px) saturate(165%);border:1px solid var(--glass-bd);box-shadow:var(--glass-shadow),inset 0 1px 0 var(--hi)}
.glassSoft{background:var(--glass-soft-bg);border:1px solid var(--glass-soft-bd)}
.bounceIn{animation:bounceIn .75s cubic-bezier(.34,1.56,.64,1) backwards}
.bounceFloat{animation:bounceIn .75s cubic-bezier(.34,1.56,.64,1) backwards,floatY 5.5s ease-in-out .8s infinite}
.pressable{transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
.pressable:active{transform:scale(.985)}
.tap{transition:transform .18s cubic-bezier(.34,1.56,.64,1)}
.tap:active{transform:scale(.96)}
.sheetUp{animation:sheetUp .38s cubic-bezier(.22,1,.36,1) backwards}
.panelIn{animation:panelIn .28s ease backwards}
.orbDrift{animation:orbDrift 9s ease-in-out infinite}
.growX{transform-origin:left center;animation:growX .9s cubic-bezier(.22,1,.36,1) .25s backwards}
@supports not (-webkit-backdrop-filter:blur(1px)){@supports not (backdrop-filter:blur(1px)){.glass{background:var(--glass-fallback)}}}
@media (prefers-reduced-motion:reduce){.bounceIn,.bounceFloat,.sheetUp,.panelIn,.orbDrift,.growX,.orb1,.orb2{animation:none!important}}
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

// ── Icon system (line-style SVG icons, no emoji, no dependency) ────────────────
const ICONS = {
  home:        <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V10"/></>,
  portfolio:   <><line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="19" y1="20" x2="19" y2="15"/></>,
  news:        <><path d="M6 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M17 8h1a2 2 0 0 1 2 2v9a1.5 1.5 0 0 1-3 0"/><line x1="7" y1="7" x2="14" y2="7"/><line x1="7" y1="11" x2="14" y2="11"/><line x1="7" y1="15" x2="11" y2="15"/></>,
  user:        <><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><circle cx="12" cy="7" r="4"/></>,
  users:       <><path d="M2 20v-1a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1"/><circle cx="7.5" cy="8" r="3"/><path d="M15 20v-1a4 4 0 0 0-2.3-3.6"/><path d="M13 4.2a3 3 0 0 1 0 5.7"/></>,
  building:    <><rect x="4" y="3" width="16" height="18" rx="1.5"/><line x1="8" y1="7.5" x2="8.01" y2="7.5"/><line x1="12" y1="7.5" x2="12.01" y2="7.5"/><line x1="16" y1="7.5" x2="16.01" y2="7.5"/><line x1="8" y1="11.5" x2="8.01" y2="11.5"/><line x1="12" y1="11.5" x2="12.01" y2="11.5"/><line x1="16" y1="11.5" x2="16.01" y2="11.5"/><path d="M9.5 21v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v4"/></>,
  bank:        <><path d="M3 10 12 4l9 6"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="5.5" y1="10" x2="5.5" y2="18"/><line x1="9.5" y1="10" x2="9.5" y2="18"/><line x1="14.5" y1="10" x2="14.5" y2="18"/><line x1="18.5" y1="10" x2="18.5" y2="18"/><line x1="3" y1="20.5" x2="21" y2="20.5"/></>,
  bell:        <><path d="M6.5 8.5a5.5 5.5 0 0 1 11 0c0 5.5 2 7 2 7h-15s2-1.5 2-7Z"/><path d="M10.3 19a1.7 1.7 0 0 0 3.4 0"/></>,
  banknote:    <><rect x="2.5" y="6.5" width="19" height="11" rx="1.5"/><circle cx="12" cy="12" r="2.3"/><line x1="6" y1="12" x2="6.01" y2="12"/><line x1="18" y1="12" x2="18.01" y2="12"/></>,
  trendUp:     <><polyline points="3.5 17 10 10.5 14 14.5 20.5 8"/><polyline points="15 8 20.5 8 20.5 13.5"/></>,
  trendDown:   <><polyline points="3.5 7 10 13.5 14 9.5 20.5 16"/><polyline points="15 16 20.5 16 20.5 10.5"/></>,
  settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 8.2 3.5l.1.1a1.7 1.7 0 0 0 1.9.3H10.4a1.7 1.7 0 0 0 1-1.6V4a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10.4a1.7 1.7 0 0 0 1.6 1H20a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/></>,
  checkCircle: <><circle cx="12" cy="12" r="9"/><polyline points="8 12.5 11 15.5 16 9"/></>,
  xCircle:     <><circle cx="12" cy="12" r="9"/><line x1="14.5" y1="9.5" x2="9.5" y2="14.5"/><line x1="9.5" y1="9.5" x2="14.5" y2="14.5"/></>,
  lock:        <><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5"/></>,
  chat:        <path d="M20.5 11a8 8 0 0 1-8.5 8 8.2 8.2 0 0 1-3.6-.8L3.5 20l1.8-4.6A8 8 0 1 1 20.5 11Z"/>,
  inbox:       <><polyline points="21 12.5 15.5 12.5 13.7 15 10.3 15 8.5 12.5 3 12.5"/><path d="M6 6 3 12.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5.5L18 6a2 2 0 0 0-1.8-1.1H7.8A2 2 0 0 0 6 6Z"/></>,
  refresh:     <><polyline points="22 4.5 22 9.5 17 9.5"/><polyline points="2 15.5 2 20.5 7 20.5"/><path d="M3.6 9.5a8.5 8.5 0 0 1 14-3.2L22 9.5M2 15.5l4.4 3.2a8.5 8.5 0 0 0 14-3.2"/></>,
  shield:      <><path d="M12 21s7.5-3.5 7.5-9V6L12 3 4.5 6v6c0 5.5 7.5 9 7.5 9Z"/><polyline points="9 12 11 14 15 9.5"/></>,
  logout:      <><path d="M9.5 20h-4a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5.5 4h4"/><polyline points="15.5 16 20 11.5 15.5 7"/><line x1="20" y1="11.5" x2="9.5" y2="11.5"/></>,
  eye:         <><path d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff:      <><path d="M17 17.2A10.6 10.6 0 0 1 12 18.5c-6.5 0-10.5-6.5-10.5-6.5A18 18 0 0 1 6.2 6.8M9.7 5a9 9 0 0 1 2.3-.3c6.5 0 10.5 6.8 10.5 6.8a17.7 17.7 0 0 1-2 2.9M14.1 14.1a3 3 0 1 1-4.2-4.2"/><line x1="2" y1="2" x2="22" y2="22"/></>,
  award:       <><circle cx="12" cy="8.5" r="6.5"/><polyline points="8 14.5 6.8 21.5 12 19 17.2 21.5 16 14.5"/></>,
  clipboard:   <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></>,
  mail:        <><rect x="2.5" y="5" width="19" height="14" rx="2"/><polyline points="2.5 6.5 12 13.5 21.5 6.5"/></>,
  wallet:      <><path d="M2.5 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><path d="M17 12h3v3.5h-3a1.75 1.75 0 0 1 0-3.5Z"/><path d="M5 6 15.5 3l1.5 3"/></>,
  bulb:        <><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6.5 6.5 0 0 0-3.5 12c.6.4 1 1.1 1 1.9v.1h5v-.1c0-.8.4-1.5 1-1.9A6.5 6.5 0 0 0 12 3Z"/></>,
  edit:        <><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M13.5 6.5l4 4"/></>,
  trash:       <><polyline points="3.5 6.5 6 6.5 20.5 6.5"/><path d="M17.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V6.5m2.5 0V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v2.5"/></>,
  phone:       <path d="M21 16.5v2.5a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.2 2 2 0 0 1 3.1 1h2.5a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L6.6 8.6a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.5 2Z"/>,
  mapPin:      <><path d="M19.5 10.2c0 6-7.5 11.3-7.5 11.3s-7.5-5.3-7.5-11.3a7.5 7.5 0 0 1 15 0Z"/><circle cx="12" cy="10" r="2.6"/></>,
  calendar:    <><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><line x1="15.5" y1="2.5" x2="15.5" y2="6.5"/><line x1="8.5" y1="2.5" x2="8.5" y2="6.5"/><line x1="3" y1="9.5" x2="21" y2="9.5"/></>,
  pie:         <><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5"/><path d="M20.5 10A8.5 8.5 0 0 0 14 3.5V10Z"/></>,
}
function Icon({ name, size = 18, color = 'currentColor', sw = 2, style }) {
  const p = ICONS[name]
  if (!p) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ stroke: color, flexShrink: 0, display: 'block', ...style }}>
      {p}
    </svg>
  )
}

// ── Tiny UI atoms ─────────────────────────────────────────────────────────────
function Btn({ label, onClick, color, outline, danger, full, sm, disabled, loading, icon }) {
  const bg  = outline ? 'transparent' : (danger ? C.red : (color || C.gold))
  const tc  = outline ? (danger ? C.red : (color || C.gold)) : (danger ? '#fff' : '#ffffff')
  const bdc = outline ? `${danger ? C.red : (color || C.gold)}55` : 'transparent'
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{
        background: bg, border: `1px solid ${bdc}`, borderRadius: 12,
        padding: sm ? '8px 14px' : '13px 18px', color: tc,
        fontWeight: 800, fontSize: sm ? 12 : 14, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: 6, width: full ? '100%' : 'auto',
        flex: full ? '1 1 0%' : '0 0 auto', minWidth: 0, boxSizing: 'border-box',
        fontFamily: 'inherit', transition: 'opacity .15s', whiteSpace: 'nowrap',
      }}>
      {icon && <span>{icon}</span>}
      {loading ? '…' : label}
    </button>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder, note, rows, options }) {
  const base = {
    width: '100%', background: 'rgba(var(--tint),0.06)', border: '1px solid rgba(var(--tint),0.12)',
    borderRadius: 10, padding: '10px 13px', color: C.text, fontSize: 14,
    outline: 'none', fontFamily: 'inherit',
  }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 10, color: 'var(--label)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>}
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
        style={{ width: '100%', maxWidth: 430, background: 'var(--surface)', borderTopLeftRadius: 24, borderTopRightRadius: 24, border: '1px solid rgba(var(--tint),0.08)', maxHeight: '90dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 40px rgba(var(--shade),0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px 14px', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'rgba(var(--tint),0.07)', border: 'none', borderRadius: 8, width: 30, height: 30, color: C.muted, fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ overflowY: 'auto', overflowX: 'hidden', padding: '0 20px 24px', width: '100%', boxSizing: 'border-box' }}>{children}</div>
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
        <div style={{ display: 'flex', gap: 10, width: '100%', boxSizing: 'border-box' }}>
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
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.goldBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <Icon name={icon} size={28} color={C.gold} sw={1.6} />
      </div>
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

// ── Sparkline valuation chart ─────────────────────────────────────────────────
function Sparkline({ data, color, height = 46, id }) {
  if (!data || data.length < 2) return null
  const w = 300, h = height, pad = 4
  const min = Math.min(...data), max = Math.max(...data)
  const range = (max - min) || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (w - pad * 2) + pad,
    h - pad - ((v - min) / range) * (h - pad * 2),
  ])
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`
  const gid = `spk-${id || color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gid})`} stroke="none" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={color} />
    </svg>
  )
}

// ── Entry / Current / Peak range indicator ────────────────────────────────────
function ValueRangeBar({ entry, current, peak }) {
  const lo = Math.min(entry, current, peak) * 0.96
  const hi = Math.max(entry, current, peak) * 1.04
  const span = (hi - lo) || 1
  const pos = v => Math.max(2, Math.min(98, ((v - lo) / span) * 100))
  const pE = pos(entry), pC = pos(current), pP = pos(peak)
  const isUp = current >= entry
  const showPeak = peak > entry + entry * 0.001 && Math.abs(peak - current) > peak * 0.001
  return (
    <div style={{ position: 'relative', height: 6, background: 'rgba(var(--tint),0.08)', borderRadius: 99, margin: '20px 4px 26px' }}>
      <div style={{ position: 'absolute', left: `${Math.min(pE, pC)}%`, width: `${Math.abs(pC - pE)}%`, height: '100%', background: isUp ? C.green : C.red, opacity: 0.45, borderRadius: 99 }} />
      <div style={{ position: 'absolute', left: `${pE}%`, top: -15, transform: 'translateX(-50%)', fontSize: 8, color: C.muted, whiteSpace: 'nowrap' }}>Entry</div>
      <div style={{ position: 'absolute', left: `${pE}%`, top: 0, width: 2, height: 6, background: C.muted, transform: 'translateX(-50%)' }} />
      {showPeak && <>
        <div style={{ position: 'absolute', left: `${pP}%`, top: -15, transform: 'translateX(-50%)', fontSize: 8, color: C.gold, whiteSpace: 'nowrap' }}>Peak</div>
        <div style={{ position: 'absolute', left: `${pP}%`, top: -3, width: 2, height: 12, background: C.gold, transform: 'translateX(-50%)' }} />
      </>}
      <div style={{ position: 'absolute', left: `${pC}%`, top: '50%', width: 13, height: 13, borderRadius: '50%', background: isUp ? C.green : C.red, border: '2px solid var(--surface)', transform: 'translate(-50%,-50%)', boxShadow: `0 0 10px ${isUp ? C.green : C.red}99` }} />
    </div>
  )
}

// ── Animated count-up number ───────────────────────────────────────────────────
function CountUp({ value, format }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  useEffect(() => {
    const start = prevRef.current
    const t0 = performance.now()
    const dur = 700
    let raf
    function tick(now) {
      const p = Math.min((now - t0) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(start + (value - start) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else { setDisplay(value); prevRef.current = value }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format ? format(display) : Math.round(display)}</>
}

// ── Portfolio allocation popup (donut chart) ──────────────────────────────────
const PIE_COLORS = ['#00b386', '#2563eb', '#f59e0b', '#8b5cf6', '#e11d48', '#0ea5e9', '#14b8a6', '#f97316', '#84cc16', '#ec4899']

// staggered animation delays: [entrance bounce, start of floating]
const stagger = (i, base = 0) => {
  const d = base + i * 0.07
  return { animationDelay: `${d.toFixed(2)}s, ${(d + 0.8).toFixed(2)}s` }
}

// One row per company (same company held twice is merged)
function buildAllocItems(holdings, companies) {
  const map = new Map()
  ;(Array.isArray(holdings) ? holdings : []).forEach((h, idx) => {
    const stake  = Number(h.stake) || 0
    const buyVal = Number(h.buyValuation) || 0
    const co     = (Array.isArray(companies) ? companies : []).find(c => c.id === h.companyId)
    const nowVal = Number(co?.currentValuation) || buyVal
    const invested = (stake / 100) * buyVal
    const current  = (stake / 100) * nowVal
    const key = h.companyId || h.companyName || `h${idx}`
    const prev = map.get(key)
    if (prev) { prev.invested += invested; prev.current += current; prev.stake += stake }
    else map.set(key, { key, name: h.companyName || co?.name || 'Unknown', sector: h.sector || co?.sector || '', stake, invested, current })
  })
  return [...map.values()]
}

// Percentages with 1 decimal that add up to exactly 100.0 (largest-remainder method)
function sharePcts(values) {
  const tot = values.reduce((a, b) => a + b, 0)
  if (!(tot > 0)) return values.map(() => 0)
  const raw = values.map(v => (v / tot) * 1000)
  const fl  = raw.map(Math.floor)
  let rem = 1000 - fl.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0])
  for (let k = 0; k < order.length && rem > 0; k++, rem--) fl[order[k][1]]++
  return fl.map(x => x / 10)
}

function AllocationSheet({ show, onClose, items }) {
  const [mode,   setMode]   = useState('current')   // 'current' | 'invested'
  const [active, setActive] = useState(null)        // key of highlighted company
  const [ready,  setReady]  = useState(false)       // triggers donut draw-in

  useEffect(() => {
    if (!show) { setReady(false); setActive(null); return }
    const t = setTimeout(() => setReady(true), 80)
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [show])

  if (!show) return null

  const list  = Array.isArray(items) ? items : []
  const totI  = list.reduce((s, x) => s + x.invested, 0)
  const totC  = list.reduce((s, x) => s + x.current, 0)
  const totG  = totC - totI
  const totP  = totI > 0 ? (totG / totI) * 100 : 0

  const val    = x => (mode === 'current' ? x.current : x.invested)
  const total  = mode === 'current' ? totC : totI
  const hasData = total > 0

  // colours stay with a company when switching view
  const base    = [...list].sort((a, b) => b.current - a.current)
  const colorOf = new Map(base.map((x, i) => [x.key, PIE_COLORS[i % PIE_COLORS.length]]))
  const sorted  = [...list].sort((a, b) => val(b) - val(a))
  const shares  = sharePcts(sorted.map(val))
  const visible = shares.filter(s => s > 0).length

  const R = 76, SW = 26, CIRC = 2 * Math.PI * R
  let cum = 0
  const segs = sorted.map((x, i) => {
    const frac = shares[i] / 100
    const gap  = visible > 1 ? 2.4 : 0
    const len  = Math.max(0, frac * CIRC - gap)
    const seg  = { key: x.key, color: colorOf.get(x.key), len, offset: -(cum * CIRC + gap / 2) }
    cum += frac
    return seg
  })
  const act     = active ? sorted.findIndex(x => x.key === active) : -1
  const actItem = act >= 0 ? sorted[act] : null

  const stats = [
    ['Total Invested', fmt(totI),                        C.text,  'wallet',    C.blue],
    ['Current Value',  fmt(totC),                        'var(--brandText)', 'portfolio', C.gold],
    ['Total Gain / Loss', (totG >= 0 ? '+' : '') + fmt(totG), gc(totG), totG >= 0 ? 'trendUp' : 'trendDown', gc(totG)],
    ['Overall Return', pct(totP),                        gc(totP), 'award',     gc(totP)],
  ]

  return (
    <div onClick={onClose} role="presentation"
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,20,16,0.55)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" aria-label="Portfolio overview" onClick={e => e.stopPropagation()} className="sheetUp"
        style={{ position: 'relative', width: '100%', maxWidth: 430, maxHeight: '92dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          borderTopLeftRadius: 28, borderTopRightRadius: 28, boxShadow: '0 -10px 50px rgba(0,0,0,0.25)',
          background: 'linear-gradient(165deg,var(--sg1) 0%,var(--sg2) 40%,var(--sg3) 100%)' }}>

        {/* floating colour orbs (give the glass something to blur) */}
        <div className="orbDrift" style={{ position: 'absolute', top: -50, left: -60, width: 230, height: 230, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,179,134,.5) 0%,transparent 68%)', filter: 'blur(28px)', pointerEvents: 'none' }} />
        <div className="orbDrift" style={{ position: 'absolute', top: '30%', right: -80, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,.4) 0%,transparent 68%)', filter: 'blur(30px)', pointerEvents: 'none', animationDelay: '-3s', animationDuration: '11s' }} />
        <div className="orbDrift" style={{ position: 'absolute', bottom: -60, left: '20%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,.32) 0%,transparent 68%)', filter: 'blur(30px)', pointerEvents: 'none', animationDelay: '-6s', animationDuration: '13s' }} />

        {/* header */}
        <div style={{ position: 'relative', zIndex: 2, padding: '10px 20px 8px', flexShrink: 0 }}>
          <div style={{ width: 42, height: 4, borderRadius: 99, background: 'rgba(var(--tint),0.18)', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>Portfolio Overview</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{list.length} {list.length === 1 ? 'company' : 'companies'} · live valuation</div>
            </div>
            <button onClick={onClose} aria-label="Close" className="glassSoft tap"
              style={{ width: 34, height: 34, borderRadius: 11, cursor: 'pointer', color: C.muted, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '8px 18px 28px' }}>
          {list.length === 0 ? (
            <div className="glass bounceIn" style={{ borderRadius: 22, padding: 28, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              No holdings to show yet.
            </div>
          ) : (<>
            {/* totals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {stats.map(([label, value, color, icon, tint], i) => (
                <div key={label} className="bounceFloat" style={stagger(i)}>
                  <div className="glass" style={{ borderRadius: 18, padding: '13px 14px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 7, background: `${tint}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={icon} size={12} color={tint} />
                      </div>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 900, color }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* donut chart */}
            <div className="bounceFloat" style={stagger(4)}>
              <div className="glass" style={{ borderRadius: 24, padding: '16px 16px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Allocation</div>
                  <div className="glassSoft" style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 12 }}>
                    {[['current', 'Current Value'], ['invested', 'Invested']].map(([id, label]) => (
                      <button key={id} onClick={() => setMode(id)} aria-pressed={mode === id}
                        style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 9, padding: '6px 10px', fontSize: 10, fontWeight: 800,
                          background: mode === id ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'transparent',
                          color: mode === id ? '#ffffff' : C.muted, transition: 'background .2s, color .2s' }}>{label}</button>
                    ))}
                  </div>
                </div>

                {!hasData ? (
                  <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, padding: '30px 0' }}>No investment data to chart yet.</div>
                ) : (
                  <div style={{ position: 'relative', width: 230, height: 230, margin: '4px auto 0' }}>
                    <svg viewBox="0 0 200 200" width="230" height="230" role="img" aria-label="Portfolio allocation donut chart" style={{ display: 'block' }}>
                      <circle cx="100" cy="100" r={R} fill="none" style={{ stroke: 'rgba(var(--tint),0.06)' }} strokeWidth={SW} />
                      {segs.map((s, i) => {
                        const isAct = act === i
                        return (
                          <circle key={s.key} cx="100" cy="100" r={R} fill="none" stroke={s.color} transform="rotate(-90 100 100)"
                            onClick={() => setActive(a => (a === s.key ? null : s.key))}
                            style={{ cursor: 'pointer', strokeLinecap: 'butt', strokeWidth: isAct ? SW + 5 : SW,
                              strokeDasharray: `${ready ? s.len : 0} ${CIRC}`, strokeDashoffset: s.offset,
                              opacity: act >= 0 && !isAct ? 0.38 : 1,
                              transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1), stroke-dashoffset .9s cubic-bezier(.22,1,.36,1), stroke-width .25s, opacity .25s' }} />
                        )
                      })}
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', textAlign: 'center', padding: '0 48px' }}>
                      {actItem ? (<>
                        <div style={{ fontSize: 10, color: C.muted, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actItem.name}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: colorOf.get(actItem.key), lineHeight: 1.2 }}>{shares[act].toFixed(1)}%</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.text }}>{fmtL(val(actItem))}</div>
                      </>) : (<>
                        <div style={{ fontSize: 10, color: C.muted }}>{mode === 'current' ? 'Total Value' : 'Total Invested'}</div>
                        <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--brandText)', lineHeight: 1.25 }}>{fmtL(total)}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>100%</div>
                      </>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* company legend */}
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, margin: '4px 4px 10px' }}>
              {mode === 'current' ? 'By current value' : 'By amount invested'}
            </div>
            {sorted.map((x, i) => {
              const color = colorOf.get(x.key)
              const isAct = act === i
              const g  = x.current - x.invested
              const gp = x.invested > 0 ? (g / x.invested) * 100 : 0
              return (
                <button key={x.key} className="glassSoft bounceIn tap" onClick={() => setActive(a => (a === x.key ? null : x.key))}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 18, padding: '12px 14px', marginBottom: 10,
                    cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', boxShadow: '0 6px 20px rgba(var(--shade),0.06)', border: isAct ? `1.5px solid ${color}` : undefined, ...stagger(i, 0.35) }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: color, flexShrink: 0, boxShadow: `0 0 10px ${color}77` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      {x.sector ? `${x.sector} · ` : ''}Invested {fmtL(x.invested)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color }}>{shares[i].toFixed(1)}%</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: gc(g), marginTop: 2 }}>{fmtL(x.current)} · {pct(gp)}</div>
                  </div>
                </button>
              )
            })}
            <div className="glassSoft" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: '11px 14px', marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.text2 }}>Total</span>
              <span style={{ fontSize: 12, fontWeight: 900, color: C.text }}>{shares.reduce((a, b) => a + b, 0).toFixed(1)}% · {fmt(total)}</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, color: C.dim, marginTop: 14 }}>Based on live company valuations · tap a slice or row to highlight</div>
          </>)}
        </div>
      </div>
    </div>
  )
}

// ── Bottom Nav ────────────────────────────────────────────────────────────────
function BottomNav({ tabs, active, onChange }) {
  return (
    <div style={{ height: 64, background: 'var(--surface)', borderTop: `1px solid ${C.border}`, display: 'flex', flexShrink: 0, position: 'relative', zIndex: 10, boxShadow: '0 -2px 12px rgba(var(--shade),0.05)' }}>
      {tabs.map(t => {
        const on = active === t.id
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative', fontFamily: 'inherit' }}>
            {t.badge > 0 && <div style={{ position: 'absolute', top: 8, right: '25%', width: 16, height: 16, background: C.red, borderRadius: '50%', fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</div>}
            <Icon name={t.icon} size={on ? 22 : 20} color={on ? C.gold : C.muted} sw={on ? 2.2 : 1.8} />
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
  const [legal, setLegal]   = useState(null)

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

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: C.bg }}>
      {/* Animated background blobs */}
      <div className="orb1" style={{ position: 'absolute', top: '8%', left: '-10%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,179,134,0.20) 0%,transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div className="orb2" style={{ position: 'absolute', bottom: '10%', right: '-12%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.16) 0%,transparent 70%)', filter: 'blur(34px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 390, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="logoAnim" style={{ width: 76, height: 76, borderRadius: 22, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 34 }}>₹</div>
          <div className="shimmerText" style={{ fontFamily: 'Playfair Display,serif', fontSize: 26, fontWeight: 800 }}>Anand Finco</div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2.5, marginTop: 5, textTransform: 'uppercase' }}>Private Wealth Management</div>
        </div>

        {/* Card */}
        <div className="cardAnim" style={{ background: 'var(--surface)', border: `1px solid ${C.border}`, borderRadius: 22, padding: 24, boxShadow: '0 8px 32px rgba(var(--shade),0.08)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>Welcome Back</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 22 }}>Sign in to your investment account</div>

          <div className="staggerIn">
            <Field label="Username" value={un} onChange={setUn} placeholder="e.g. rahul.sharma" />
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--label)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>Password</div>
              <div style={{ position: 'relative' }}>
                <input value={pw} onChange={e => setPw(e.target.value)} type={showPw ? 'text' : 'password'}
                  placeholder="Enter password"
                  onKeyDown={e => e.key === 'Enter' && login()}
                  style={{ width: '100%', background: 'rgba(var(--tint),0.06)', border: '1px solid rgba(var(--tint),0.12)', borderRadius: 10, padding: '10px 44px 10px 13px', color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>
                  <Icon name={showPw ? 'eyeOff' : 'eye'} size={17} color={C.muted} />
                </button>
              </div>
            </div>

            {error && <div style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 10, padding: '10px 13px', color: C.red, fontSize: 12, marginBottom: 14 }}>⚠️ {error}</div>}

            <Btn label="Sign In" onClick={login} loading={loading} full />
          </div>
        </div>
        <div className="fadeUp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 10, color: C.dim, marginTop: 18, animationDelay: '.4s' }}>
          <Icon name="lock" size={11} color={C.dim} /> Secured by Firebase Auth · SEBI Compliant
        </div>
        <div className="fadeUp" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 11, marginTop: 10, animationDelay: '.5s' }}>
          <button onClick={() => setLegal('terms')} style={{ background: 'none', border: 'none', color: C.muted, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, textDecoration: 'underline' }}>Terms &amp; Conditions</button>
          <span style={{ color: C.dim }}>·</span>
          <button onClick={() => setLegal('privacy')} style={{ background: 'none', border: 'none', color: C.muted, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, textDecoration: 'underline' }}>Privacy Policy</button>
        </div>
        <LegalSheet show={!!legal} doc={legal || 'terms'} onClose={() => setLegal(null)} />
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
  const [allocOpen,  setAllocOpen]  = useState(false)

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
      <AllocationSheet show={allocOpen} onClose={() => setAllocOpen(false)} items={buildAllocItems(portfolio, companies)} />

      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg,var(--mintA),var(--surface))', padding: '52px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: C.muted }}>Good day,</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {(user.name || 'Investor').split(' ')[0]} 👋
            </div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#ffffff', fontSize: 18, boxShadow: `0 4px 20px ${C.gold}40` }}>
            {(user.name || 'I')[0]}
          </div>
        </div>
        {/* Summary card — tap to see allocation */}
        <div className="pressable" role="button" tabIndex={0} aria-label="View portfolio allocation"
          onClick={() => setAllocOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAllocOpen(true) } }}
          style={{ background: 'var(--surface)', border: `1px solid ${C.goldBd}`, borderRadius: 18, padding: 18, boxShadow: '0 4px 20px rgba(var(--shade),0.06)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>TOTAL PORTFOLIO VALUE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 99, padding: '4px 10px', fontSize: 10, fontWeight: 800, color: C.gold, flexShrink: 0 }}>
              <Icon name="pie" size={12} color={C.gold} /> View breakdown <span style={{ fontSize: 12, lineHeight: 1 }}>›</span>
            </div>
          </div>
          <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 30, fontWeight: 800, color: 'var(--brandText)', margin: '6px 0 14px' }}>{fmt(totC)}</div>
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
          ? <Empty icon="bank" title="No investments yet" sub="Your holdings will appear here" />
          : portfolio.map((h, i) => {
            const co   = companies.find(c => c.id === h.companyId)
            const curr = (h.stake / 100) * (co?.currentValuation || h.buyValuation)
            const buy  = (h.stake / 100) * h.buyValuation
            const g    = curr - buy
            const gp   = buy > 0 ? (g / buy) * 100 : 0
            return (
              <Card key={i} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--mintA)', border: '1px solid #00b38640', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="building" size={20} color={C.gold} /></div>
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
          ? <Empty icon="inbox" title="No opportunities right now" sub="Check back soon" />
          : <div style={{ display: 'flex', gap: 12, overflowX: 'auto', marginLeft: -18, paddingLeft: 18, paddingRight: 18, paddingBottom: 8 }}>
            {companies.map(co => (
              <div key={co.id} style={{ minWidth: 210, background: 'var(--mintB)', border: `1px solid ${C.goldBd}`, borderRadius: 18, padding: 16, flexShrink: 0 }}>
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
                  style={{ width: '100%', marginTop: 12, background: `linear-gradient(90deg,${C.gold},${C.goldL})`, border: 'none', borderRadius: 10, padding: 10, color: '#ffffff', fontWeight: 900, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
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
            <Card style={{ marginBottom: 16, background: 'rgba(var(--tint),0.05)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>{investing.name}</div>
              {[['Sector', investing.sector], ['Min Investment', fmt(investing.minInvest)], ['Valuation', fmtL(investing.currentValuation)], ['Expected Returns', investing.expectedReturns], ['Risk', investing.risk]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{v}</span>
                </div>
              ))}
            </Card>
            <div style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 10, padding: '10px 13px', marginBottom: 16, fontSize: 12, color: C.gold, lineHeight: 1.6, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <Icon name="bell" size={13} color={C.gold} style={{ marginTop: 2 }} />
              <span>Our team will contact you on <b>{user.phone || 'your registered number'}</b> within 24 hours.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%', boxSizing: 'border-box' }}>
              <Btn label="Cancel" onClick={() => setInvesting(null)} outline full />
              <Btn label={sending ? 'Sending…' : 'Confirm Interest'} onClick={confirmInvest} loading={sending} color={C.green} full />
            </div>
          </>
        )}
        {done && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Icon name="checkCircle" size={38} color={C.green} sw={1.7} /></div>
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
// SELL FLOW  (3 steps: amount → bank → review)
// ─────────────────────────────────────────────────────────────────────────────
function SellFlow({ holding, nowVal, adminPhone, user, onClose, onSuccess }) {
  const [step,     setStep]    = useState('amount')
  const [sellPct,  setSellPct] = useState(100)
  const [askVal,   setAskVal]  = useState(String(nowVal || holding.buyValuation || 0))
  const [reason,   setReason]  = useState('')
  const [bank,     setBank]    = useState({ accountName:'', accountNo:'', confirmNo:'', ifsc:'', bankName:'', accountType:'savings' })
  const [errors,   setErrors]  = useState({})
  const [loading,  setLoad]    = useState(false)
  const [agree,    setAgree]   = useState(false)
  const [legal,    setLegal]   = useState(null)
  const legalLink = { background: 'none', border: 'none', padding: 0, color: C.gold, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }

  const stakeToSell  = parseFloat(((holding.stake * sellPct) / 100).toFixed(6))
  const askValNum    = parseInt(askVal) || 0
  const invested     = holding.investedAmt || (holding.stake / 100) * holding.buyValuation
  const sellCost     = (sellPct / 100) * invested
  const sellValue    = (stakeToSell / 100) * askValNum
  const gainLoss     = sellValue - sellCost
  const gainPct      = sellCost > 0 ? (gainLoss / sellCost) * 100 : 0
  const currVal      = (holding.stake / 100) * nowVal

  function validateBank() {
    const e = {}
    if (!bank.accountName.trim())                          e.accountName = 'Required'
    if (!bank.bankName.trim())                             e.bankName    = 'Required'
    if (!/^\d{9,18}$/.test(bank.accountNo))               e.accountNo   = 'Enter valid 9–18 digit account number'
    if (bank.accountNo !== bank.confirmNo)                 e.confirmNo   = 'Account numbers do not match'
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifsc.toUpperCase())) e.ifsc = 'Invalid IFSC (e.g. SBIN0001234)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submitSell() {
    if (!agree) { setErrors({ submit: 'Please tick the box to accept the Terms & Conditions.' }); return }
    setLoad(true)
    try {
      await addDoc(collection(db, 'sellRequests'), {
        clientId:        user.uid,
        clientName:      user.name || user.email,
        clientEmail:     user.email,
        clientPhone:     user.phone || '',
        companyId:       holding.companyId,
        companyName:     holding.companyName,
        sector:          holding.sector,
        totalStake:      holding.stake,
        sellPercent:     sellPct,
        stakeToSell,
        askingValuation: askValNum,
        expectedPayout:  sellValue,
        gainLoss,
        gainPct,
        reason:          reason || 'Not specified',
        bankAccountName: bank.accountName,
        bankName:        bank.bankName,
        bankAccountNo:   '●●●●' + bank.accountNo.slice(-4),
        bankIFSC:        bank.ifsc.toUpperCase(),
        bankAccountType: bank.accountType,
        termsAccepted:   true,
        termsVersion:    LEGAL.version,
        termsAcceptedAt: Timestamp.now(),
        timestamp:       Timestamp.now(),
        status:          'pending',
        read:            false,
      })
      const clean = (adminPhone || '').replace(/\D/g, '')
      if (clean) {
        const msg = encodeURIComponent(
          `🔔 *Sell Request – Anand Finco*\n\n` +
          `Client: ${user.name || user.email}\n` +
          `Company: ${holding.companyName}\n` +
          `Selling: ${sellPct}% of stake (${stakeToSell}%)\n` +
          `Asking Valuation: ${fmtL(askValNum)}\n` +
          `*Expected Payout: ${fmt(sellValue)}*\n\nPlease review in app.`
        )
        window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
      }
      setStep('done')
    } catch (e) { setErrors({ submit: e.message }) }
    setLoad(false)
  }

  const prog = { amount:1, bank:2, review:3, done:4 }[step]

  if (holding.sellAllowed === false) return (
    <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(var(--tint),0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Icon name="lock" size={28} color={C.muted} /></div>
      <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6 }}>Selling not available</div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 18 }}>{holding.companyName} is not open for sale right now. Please contact us if you have questions.</div>
      <Btn label="Close" onClick={onClose} full />
    </div>
  )

  return (
    <div>
      {/* Progress */}
      {step !== 'done' && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {['Sell Details', 'Bank Details', 'Review'].map((s, i) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%',
                  background: prog > i+1 ? C.green : prog === i+1 ? C.gold : 'rgba(var(--tint),0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900, color: prog > i+1 ? '#ffffff' : prog === i+1 ? '#ffffff' : C.muted }}>
                  {prog > i+1 ? '✓' : i+1}
                </div>
                <div style={{ fontSize: 8, color: prog === i+1 ? C.gold : C.muted, fontWeight: 700, textAlign: 'center' }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 3, background: 'rgba(var(--tint),0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((prog-1)/2)*100}%`, background: `linear-gradient(90deg,${C.gold},${C.goldL})`, borderRadius: 99, transition: 'width .4s' }} />
          </div>
        </div>
      )}

      {/* STEP 1 — Sell Details */}
      {step === 'amount' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg,var(--mintA),var(--surface))', border: `1px solid ${C.goldBd}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 4 }}>{holding.companyName}</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>{holding.sector} · {holding.stake}% total stake</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[['Invested', fmt(invested), C.text2], ['Current', fmt(currVal), C.gold], ['P&L', (currVal-invested >= 0 ? '+' : '')+fmt(currVal-invested), gc(currVal-invested)]].map(([l,v,c]) => (
                <div key={l} style={{ background: 'rgba(var(--tint),0.035)', borderRadius: 9, padding: '8px 10px' }}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 10 }}>How much stake to sell?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              {[25, 50, 75, 100].map(p => {
                const partialVal = ((holding.stake * p / 100) / 100) * (parseInt(askVal) || nowVal)
                return (
                  <button key={p} onClick={() => setSellPct(p)}
                    style={{ background: sellPct === p ? `linear-gradient(135deg,${C.red},${C.red}cc)` : 'rgba(var(--tint),0.06)',
                      border: `1.5px solid ${sellPct === p ? 'transparent' : C.border}`,
                      borderRadius: 10, padding: '12px 4px', cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: sellPct === p ? '#fff' : C.text }}>{p}%</div>
                    <div style={{ fontSize: 9, color: sellPct === p ? 'rgba(255,255,255,0.7)' : C.muted }}>{fmt(partialVal)}</div>
                  </button>
                )
              })}
            </div>
            <div style={{ background: 'rgba(var(--tint),0.04)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginTop: 10, textAlign: 'center', fontSize: 12, color: C.muted }}>
              Selling <strong style={{ color: C.gold }}>{sellPct}%</strong> of your stake
              {' · '}Est. payout <strong style={{ color: C.green }}>{fmt(((holding.stake * sellPct / 100) / 100) * (parseInt(askVal) || nowVal))}</strong>
            </div>
          </div>

          <Field label="Asking Company Valuation (₹) *" value={askVal} onChange={setAskVal} type="number"
            placeholder={String(nowVal)} note={`Current valuation: ${fmtL(nowVal)} · Set your asking price`} />

          <div style={{ background: gainLoss >= 0 ? C.greenBg : C.redBg, border: `1px solid ${gainLoss >= 0 ? C.green : C.red}44`, borderRadius: 12, padding: 16, marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Expected Payout Breakdown</div>
            {[['Selling', `${sellPct}% of stake (${stakeToSell}%)`, C.text], ['Your Cost (portion)', fmt(sellCost), C.text2], ['At Asking Valuation', fmtL(askValNum), C.text2], ['Expected Payout', fmt(sellValue), C.gold]].map(([l,v,c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'rgba(var(--tint),0.07)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{gainLoss >= 0 ? 'Estimated Profit' : 'Estimated Loss'}</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: gc(gainLoss) }}>{gainLoss >= 0 ? '+' : ''}{fmt(gainLoss)} ({gainLoss >= 0 ? '+' : ''}{gainPct.toFixed(1)}%)</span>
            </div>
          </div>

          <Field label="Reason for Selling (optional)" value={reason} onChange={setReason} rows={2} placeholder="e.g. Need liquidity, Portfolio rebalancing…" />

          <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 13px', marginBottom: 18, fontSize: 11, color: '#f59e0b', lineHeight: 1.7 }}>
            ⏳ A sale needs a new buyer at your asking valuation, with no fixed time or guarantee. After the sale is completed, payout reaches your bank within {LEGAL.payoutDays} days.
          </div>
          <Btn label="Continue to Bank Details →" onClick={() => setStep('bank')} full />
        </div>
      )}

      {/* STEP 2 — Bank Details */}
      {step === 'bank' && (
        <div>
          <div style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 10, padding: '10px 13px', marginBottom: 18, fontSize: 11, color: C.gold, lineHeight: 1.7, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <Icon name="lock" size={13} color={C.gold} style={{ marginTop: 2 }} />
            <span>Bank details are used only for payout. Account number is masked in our records.</span>
          </div>

          <div style={{ background: 'rgba(var(--tint),0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 12 }}>Account Holder</div>
            <Field label="Full Name (as per bank) *" value={bank.accountName}
              onChange={v => { setBank(b => ({...b, accountName:v})); setErrors(e => ({...e, accountName:null})) }}
              placeholder="Rahul Sharma" note={errors.accountName ? `⚠ ${errors.accountName}` : 'Must match bank account name exactly'} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--label)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Account Type *</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['savings', 'current'].map(t => (
                  <button key={t} onClick={() => setBank(b => ({...b, accountType:t}))}
                    style={{ flex: 1, background: bank.accountType === t ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'rgba(var(--tint),0.05)',
                      border: `1.5px solid ${bank.accountType === t ? 'transparent' : C.border}`,
                      borderRadius: 9, padding: 9, color: bank.accountType === t ? '#ffffff' : C.muted,
                      fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(var(--tint),0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="bank" size={14} /> Bank Account</div>
            <Field label="Bank Name *" value={bank.bankName}
              onChange={v => { setBank(b => ({...b, bankName:v})); setErrors(e => ({...e, bankName:null})) }}
              placeholder="State Bank of India" note={errors.bankName ? `⚠ ${errors.bankName}` : ''} />
            <Field label="Account Number *" value={bank.accountNo} type="password"
              onChange={v => { setBank(b => ({...b, accountNo:v.replace(/\D/g,'')})); setErrors(e => ({...e, accountNo:null})) }}
              placeholder="Enter account number"
              note={errors.accountNo ? `⚠ ${errors.accountNo}` : '9–18 digits. Hidden for security.'} />
            <Field label="Confirm Account Number *" value={bank.confirmNo}
              onChange={v => { setBank(b => ({...b, confirmNo:v.replace(/\D/g,'')})); setErrors(e => ({...e, confirmNo:null})) }}
              placeholder="Re-enter account number"
              note={errors.confirmNo ? `⚠ ${errors.confirmNo}` : bank.confirmNo && bank.accountNo === bank.confirmNo ? '✅ Numbers match' : ''} />
            <Field label="IFSC Code *" value={bank.ifsc.toUpperCase()}
              onChange={v => { setBank(b => ({...b, ifsc:v.toUpperCase().slice(0,11)})); setErrors(e => ({...e, ifsc:null})) }}
              placeholder="SBIN0001234" note={errors.ifsc ? `⚠ ${errors.ifsc}` : '11 characters · On your cheque/passbook'} />
          </div>

          <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '10px 13px', marginBottom: 18, fontSize: 11, color: C.blue, lineHeight: 1.7, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <Icon name="lock" size={13} color={C.blue} style={{ marginTop: 2 }} />
            <span>Account number is masked in storage. Admin initiates NEFT/IMPS after buyer payment clears.</span>
          </div>

          {errors.submit && <div style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '8px 12px', color: C.red, fontSize: 11, marginBottom: 12 }}>⚠ {errors.submit}</div>}
          <div style={{ display: 'flex', gap: 10, width: '100%', boxSizing: 'border-box' }}>
            <Btn label="← Back" onClick={() => setStep('amount')} outline full />
            <Btn label="Review →" onClick={() => { if (validateBank()) setStep('review') }} full />
          </div>
        </div>
      )}

      {/* STEP 3 — Review */}
      {step === 'review' && (
        <div>
          <div style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 10, padding: '10px 13px', marginBottom: 16, fontSize: 11, color: C.red, lineHeight: 1.7 }}>
            ⚠ Review carefully. Once submitted, request cannot be cancelled without admin approval.
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.goldBd}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="portfolio" size={13} color={C.gold} /> Sell Summary</div>
            {[['Company', holding.companyName], ['Selling', `${sellPct}% of stake (${stakeToSell}%)`], ['Asking Valuation', fmtL(askValNum)], ['Expected Payout', fmt(sellValue)], ['Est. Profit/Loss', `${gainLoss >= 0 ? '+' : ''}${fmt(gainLoss)} (${gainLoss >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)`]].map(([l,v], i) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
                <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: l === 'Expected Payout' ? C.gold : l.includes('Profit') ? gc(gainLoss) : C.text }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="bank" size={13} /> Payout Bank Account</div>
            {[['Account Name', bank.accountName], ['Bank', bank.bankName], ['Account No.', `●●●●${bank.accountNo.slice(-4)}`], ['IFSC', bank.ifsc.toUpperCase()], ['Type', bank.accountType.charAt(0).toUpperCase()+bank.accountType.slice(1)]].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: C.goldBg, border: `1px solid ${agree ? C.gold : C.goldBd}`, borderRadius: 12, padding: '14px 14px 12px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 8 }}>Please read before you submit</div>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {[
                'Your stake is sold only when we arrange a new buyer at your asking valuation. There is no guaranteed buyer, price or timeline.',
                `After the sale is completed, the payout is credited to your bank account within ${LEGAL.payoutDays} days.`,
                'Payout goes only to the bank account above, which must be in your own name. Taxes such as TDS may be deducted.',
              ].map(t => <li key={t} style={{ fontSize: 11, color: C.text2, lineHeight: 1.7, marginBottom: 4 }}>{t}</li>)}
            </ul>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginTop: 12 }}>
              <input type="checkbox" checked={agree} onChange={e => { setAgree(e.target.checked); setErrors(p => ({ ...p, submit: null })) }}
                style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: C.gold, cursor: 'pointer' }} />
              <span style={{ fontSize: 11, color: C.text, lineHeight: 1.65 }}>
                I have read and agree to the{' '}
                <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setLegal('terms') }} style={legalLink}>Terms &amp; Conditions</button>
                {' '}and the{' '}
                <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setLegal('privacy') }} style={legalLink}>Privacy Policy</button>
                , and I confirm that the details above are correct.
              </span>
            </label>
          </div>
          <LegalSheet show={!!legal} doc={legal || 'terms'} onClose={() => setLegal(null)} />

          {errors.submit && <div style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '8px 12px', color: C.red, fontSize: 11, marginBottom: 12 }}>⚠ {errors.submit}</div>}
          <div style={{ display: 'flex', gap: 10, width: '100%', boxSizing: 'border-box' }}>
            <Btn label="← Edit" onClick={() => setStep('bank')} outline full />
            <Btn label="Submit Sell Request" onClick={submitSell} loading={loading} disabled={!agree} danger full />
          </div>
        </div>
      )}

      {/* STEP 4 — Done */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Icon name="checkCircle" size={38} color={C.green} sw={1.7} /></div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.green, marginBottom: 8 }}>Request Submitted!</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8, marginBottom: 22 }}>
            Your sell request for <strong style={{ color: C.text }}>{holding.companyName}</strong> has been sent.<br />Admin has been notified on WhatsApp.
          </div>
          <div style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="clipboard" size={13} color={C.gold} /> What happens next?</div>
            {[['Admin Reviews', 'Your request is listed in the investor network.'], ['Buyer Matched', 'We look for a new buyer at your asking valuation. There is no fixed time.'], ['Sale Completed', 'Buyer payment received and verified, share transfer done.'], ['Payout to You', `Credited to your bank within ${LEGAL.payoutDays} days after the sale is completed.`]].map(([t,d], i) => (
              <div key={t} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#ffffff', flexShrink: 0 }}>{i+1}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.text }}>{t}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
          <Btn label="Back to Portfolio" onClick={() => { onSuccess && onSuccess(); onClose() }} full />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BUY MORE FLOW
// ─────────────────────────────────────────────────────────────────────────────
function BuyMoreFlow({ holding, nowVal, adminPhone, user, onClose }) {
  const [addPct,   setAddPct]  = useState(50)
  const [done,     setDone]    = useState(false)
  const [loading,  setLoad]    = useState(false)
  const [toast,    setToast]   = useState(null)

  const addStake = parseFloat(((holding.stake * addPct) / 100).toFixed(6))
  const estCost  = (addStake / 100) * nowVal

  async function submit() {
    setLoad(true)
    try {
      await addDoc(collection(db, 'notifications'), {
        type:                'buyMore',
        clientId:            user.uid,
        clientName:          user.name || user.email,
        clientEmail:         user.email,
        clientPhone:         user.phone || '',
        companyId:           holding.companyId,
        companyName:         holding.companyName,
        sector:              holding.sector,
        addPercent:          addPct,
        stakeToAdd:          addStake,
        currentValuation:    nowVal,
        estimatedInvestment: estCost,
        message:             `${user.name || 'Client'} wants to buy ${addPct}% more (+${addStake}%) of ${holding.companyName}. Est: ${fmt(estCost)}`,
        timestamp:           Timestamp.now(),
        read:                false,
      })
      const clean = (adminPhone || '').replace(/\D/g, '')
      if (clean) {
        const msg = encodeURIComponent(
          `🔔 *Buy More Request – Anand Finco*\n\n` +
          `Client: ${user.name || user.email}\n` +
          `Company: ${holding.companyName}\n` +
          `Adding: ${addPct}% more (+${addStake}% stake)\n` +
          `Valuation: ${fmtL(nowVal)}\n` +
          `*Est. Investment: ${fmt(estCost)}*`
        )
        window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
      }
      setDone(true)
    } catch (e) { setToast({ m: e.message, t: 'error' }) }
    setLoad(false)
  }

  if (done) return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />
      <div style={{ width: 76, height: 76, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Icon name="award" size={38} color={C.green} sw={1.7} /></div>
      <div style={{ fontSize: 18, fontWeight: 900, color: C.green, marginBottom: 8 }}>Interest Recorded!</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>Admin notified. They will contact you to arrange the additional investment.</div>
      <Btn label="Close" onClick={onClose} full />
    </div>
  )

  return (
    <div>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />
      <div style={{ background: 'linear-gradient(135deg,var(--mintA),var(--surface))', border: `1px solid ${C.goldBd}`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 3 }}>{holding.companyName}</div>
        <div style={{ fontSize: 11, color: C.muted }}>Current stake: {holding.stake}% · Valuation: {fmtL(nowVal)}</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, marginBottom: 10 }}>How much more to add?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {[25, 50, 75, 100].map(p => {
            const partialCost = ((holding.stake * p / 100) / 100) * nowVal
            return (
              <button key={p} onClick={() => setAddPct(p)}
                style={{ background: addPct === p ? `linear-gradient(135deg,${C.green},${C.green}cc)` : 'rgba(var(--tint),0.06)',
                  border: `1.5px solid ${addPct === p ? 'transparent' : C.border}`,
                  borderRadius: 10, padding: '12px 4px', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: addPct === p ? '#fff' : C.text }}>{p}%</div>
                <div style={{ fontSize: 9, color: addPct === p ? 'rgba(255,255,255,0.7)' : C.muted }}>{fmt(partialCost)}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 12, padding: 14, marginBottom: 18 }}>
        {[['Adding', `${addPct}% more (+${addStake}% stake)`], ['At Valuation', fmtL(nowVal)], ['Est. Investment', fmt(estCost)]].map(([l,v], i) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 2 ? `1px solid rgba(34,197,94,0.1)` : 'none' }}>
            <span style={{ fontSize: 11, color: C.muted }}>{l}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: i === 2 ? C.green : C.text }}>{v}</span>
          </div>
        ))}
      </div>
      <Btn label={loading ? 'Submitting…' : 'Submit Interest to Admin →'} onClick={submit} loading={loading} color={C.green} full />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT — PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioScreen({ user }) {
  const [holdings,    setHoldings]    = useState([])
  const [companies,   setCompanies]   = useState([])
  const [adminPhone,  setAdminPhone]  = useState('')
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState(null)   // expanded holding index
  const [activeSheet, setActiveSheet] = useState(null)   // 'sell' | 'buyMore'
  const [toast,       setToast]       = useState(null)
  const [allocOpen,   setAllocOpen]   = useState(false)
  const [legalDoc,    setLegalDoc]    = useState(null)

  function load() {
    Promise.all([
      getDoc(doc(db, 'portfolios', user.uid)),
      getDocs(collection(db, 'companies')),
      getDoc(doc(db, 'adminConfig', 'main')),
    ]).then(([pd, co, cfg]) => {
      setHoldings(pd.exists() ? pd.data().holdings || [] : [])
      setCompanies(co.docs.map(d => ({ id: d.id, ...d.data() })))
      if (cfg.exists()) setAdminPhone(cfg.data().whatsapp || '')
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user.uid])

  const enriched = holdings.map(h => {
    const co    = companies.find(c => c.id === h.companyId)
    const nowV  = co?.currentValuation || h.buyValuation
    const prevV = co?.previousValuation ?? h.buyValuation
    const peakV = Math.max(co?.peakValuation || nowV, h.buyValuation, nowV)
    const histRaw = Array.isArray(co?.valuationHistory) ? co.valuationHistory.map(x => x.v) : []
    const history = [h.buyValuation, ...histRaw, nowV]
    const curr = (h.stake / 100) * nowV
    const buy  = (h.stake / 100) * h.buyValuation
    const g    = curr - buy
    const gp   = buy > 0 ? (g / buy) * 100 : 0
    const vp   = h.buyValuation > 0 ? ((nowV - h.buyValuation) / h.buyValuation * 100) : 0
    const sinceLastPct = prevV > 0 ? ((nowV - prevV) / prevV * 100) : 0
    const sinceLastAmt = (h.stake / 100) * (nowV - prevV)
    const peakDrawPct  = peakV > 0 ? ((nowV - peakV) / peakV * 100) : 0
    const peakDrawAmt  = (h.stake / 100) * (nowV - peakV)
    return { ...h, curr, buy, g, gp, vp, nowVal: nowV, prevVal: prevV, peakVal: peakV, history, sinceLastPct, sinceLastAmt, peakDrawPct, peakDrawAmt, sellAllowed: co?.sellAllowed !== false }
  })
  const totI = enriched.reduce((s, h) => s + h.buy, 0)
  const totC = enriched.reduce((s, h) => s + h.curr, 0)
  const totG = totC - totI
  const totP = totI > 0 ? (totG / totI) * 100 : 0

  const selH = selected !== null ? enriched[selected] : null
  const allocItems = buildAllocItems(holdings, companies)

  if (loading) return <Loader />

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(165deg,var(--pg1) 0%,var(--pg2) 42%,var(--pg3) 100%)' }}>
      {/* soft floating colour orbs behind the glass */}
      <div className="orbDrift" style={{ position: 'absolute', top: -60, right: -70, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,179,134,.40) 0%,transparent 68%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div className="orbDrift" style={{ position: 'absolute', top: '38%', left: -100, width: 270, height: 270, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,.28) 0%,transparent 68%)', filter: 'blur(32px)', pointerEvents: 'none', animationDelay: '-3s', animationDuration: '11s' }} />
      <div className="orbDrift" style={{ position: 'absolute', bottom: -70, right: -40, width: 230, height: 230, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,.22) 0%,transparent 68%)', filter: 'blur(32px)', pointerEvents: 'none', animationDelay: '-6s', animationDuration: '13s' }} />

      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />

      <div className="glass" style={{ position: 'relative', zIndex: 2, flexShrink: 0, padding: '52px 18px 16px', border: 'none', borderBottom: '1px solid var(--glass-bd2)', borderRadius: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>My Portfolio</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{enriched.length} holdings · Tap a card to buy / sell</div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 18px 40px' }}>
        {/* Summary — tap to open the allocation popup */}
        <div className="bounceFloat" style={{ marginBottom: 20, ...stagger(0) }}>
          <div className="glass pressable" role="button" tabIndex={0} aria-label="View portfolio allocation"
            onClick={() => setAllocOpen(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAllocOpen(true) } }}
            style={{ position: 'relative', borderRadius: 26, padding: 20, cursor: 'pointer' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 26, background: 'linear-gradient(135deg,var(--shine) 0%,rgba(255,255,255,0) 55%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, fontWeight: 700 }}>TOTAL PORTFOLIO VALUE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 99, padding: '5px 10px', fontSize: 10, fontWeight: 800, color: C.gold, flexShrink: 0 }}>
                  <Icon name="pie" size={12} color={C.gold} /> View breakdown <span style={{ fontSize: 12, lineHeight: 1 }}>›</span>
                </div>
              </div>
              <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 32, fontWeight: 800, color: 'var(--brandText)', margin: '8px 0 6px' }}>
                <CountUp value={totC} format={fmt} />
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${gc(totP)}18`, border: `1px solid ${gc(totP)}40`, borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 800, color: gc(totP) }}>
                <Icon name={totP >= 0 ? 'trendUp' : 'trendDown'} size={12} color={gc(totP)} />
                <span><CountUp value={totP} format={pct} /> overall return</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                {[['Total Invested', totI, v => fmt(v), C.text2], ['Gain / Loss', totG, v => (v >= 0 ? '+' : '') + fmt(v), gc(totG)]].map(([l, raw, f, c]) => (
                  <div key={l} className="glassSoft" style={{ borderRadius: 14, padding: '10px 12px' }}>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: c }}><CountUp value={raw} format={f} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sector bars */}
        {enriched.length > 0 && (() => {
          const sectors = enriched.reduce((a, h) => { a[h.sector] = (a[h.sector] || 0) + h.curr; return a }, {})
          return (
            <div className="bounceIn" style={stagger(1)}>
              <div className="glass" style={{ borderRadius: 22, padding: 18, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 14 }}>
                  <Icon name="portfolio" size={15} color={C.gold} /> Sector Breakdown
                </div>
                {Object.entries(sectors).sort(([, a], [, b]) => b - a).map(([sec, val]) => {
                  const p = totC > 0 ? (val / totC) * 100 : 0
                  return (
                    <div key={sec} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>{sec}</span>
                        <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{p.toFixed(1)}% · {fmt(val)}</span>
                      </div>
                      <div style={{ height: 7, background: 'rgba(var(--tint),0.07)', borderRadius: 99, overflow: 'hidden' }}>
                        <div className="growX" style={{ height: '100%', width: `${p}%`, background: `linear-gradient(90deg,${C.gold},${C.goldL})`, borderRadius: 99 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {enriched.length === 0 && <Empty icon="portfolio" title="No holdings yet" sub="Your portfolio will appear here once your advisor adds your investments" />}

        {/* Holdings */}
        {enriched.map((h, i) => {
          const isOpen = selected === i
          const hasMoved = Math.abs(h.sinceLastPct) > 0.01
          const belowPeak = h.peakDrawPct < -0.05
          return (
            <div key={i} className={enriched.length <= 6 ? 'bounceFloat' : 'bounceIn'} style={{ marginBottom: 16, ...stagger(i, 0.15) }}>
              {/* Card */}
              <div className="glass pressable" onClick={() => setSelected(isOpen ? null : i)}
                style={{ position: 'relative', background: isOpen ? 'var(--glass-open)' : undefined, border: `1px solid ${isOpen ? C.goldBd : 'var(--glass-bd)'}`, borderRadius: isOpen ? '24px 24px 0 0' : 24, padding: 16, cursor: 'pointer', boxShadow: `0 10px 32px ${gc(h.g)}22, inset 0 1px 0 var(--hi)` }}>
                <div style={{ position: 'absolute', left: 18, right: 18, top: 0, height: 3, borderRadius: '0 0 6px 6px', background: `linear-gradient(90deg,transparent,${gc(h.g)},transparent)`, opacity: 0.55, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,var(--mintC),var(--surface))', border: '1px solid rgba(0,179,134,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,179,134,0.18)' }}><Icon name="building" size={22} color={C.gold} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{h.companyName}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{h.sector}</div>
                  </div>
                  <div style={{ background: `${gc(h.g)}18`, border: `1px solid ${gc(h.g)}44`, borderRadius: 10, padding: '5px 10px', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: gc(h.g) }}>{pct(h.gp)}</div>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="glassSoft" style={{ marginBottom: 12, borderRadius: 14, padding: '8px 10px' }}>
                  <Sparkline data={h.history} color={gc(h.g)} height={40} id={`h${i}`} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[['Stake', `${h.stake}%`, C.text2], ['Invested', fmt(h.buy), C.text2], ['Current', fmt(h.curr), C.gold], ['P&L', (h.g >= 0 ? '+' : '') + fmt(h.g), gc(h.g)], ['Buy Val.', fmtL(h.buyValuation), C.muted], ['Now Val.', fmtL(h.nowVal), gc(h.vp)]].map(([l, v, c]) => (
                    <div key={l} className="glassSoft" style={{ borderRadius: 12, padding: '8px 10px', minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: c, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Since last update / Peak drawdown badges */}
                {(hasMoved || belowPeak) && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {hasMoved && (
                      <div style={{ background: `${gc(h.sinceLastPct)}14`, border: `1px solid ${gc(h.sinceLastPct)}40`, borderRadius: 12, padding: '7px 10px', flex: 1, minWidth: 130 }}>
                        <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase' }}>Since Last Update</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: gc(h.sinceLastPct) }}>
                          {h.sinceLastPct >= 0 ? '+' : ''}{h.sinceLastPct.toFixed(1)}% ({h.sinceLastAmt >= 0 ? '+' : ''}{fmt(h.sinceLastAmt)})
                        </div>
                      </div>
                    )}
                    {belowPeak && (
                      <div style={{ background: `${C.red}14`, border: `1px solid ${C.red}40`, borderRadius: 12, padding: '7px 10px', flex: 1, minWidth: 130 }}>
                        <div style={{ fontSize: 8, color: C.muted, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="trendDown" size={10} color={C.red} /> Below Peak ({fmtL(h.peakVal)})
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: C.red }}>
                          {h.peakDrawPct.toFixed(1)}% ({fmt(h.peakDrawAmt)})
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Entry / Current / Peak range */}
                <ValueRangeBar entry={h.buyValuation} current={h.nowVal} peak={h.peakVal} />

                <div style={{ textAlign: 'center', marginTop: -8, fontSize: 10, color: C.muted }}>
                  {isOpen ? '▲ tap to collapse' : '▼ tap to sell / buy more'}
                </div>
              </div>

              {/* Action panel */}
              {isOpen && (
                <div className="glass panelIn" style={{ background: 'var(--glass-panel)', border: `1px solid ${C.goldBd}`, borderTop: 'none', borderRadius: '0 0 24px 24px', padding: 16 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, textAlign: 'center' }}>
                    What would you like to do with <strong style={{ color: C.text }}>{h.companyName}</strong>?
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {h.sellAllowed ? (
                      <button className="tap" onClick={() => setActiveSheet('sell')}
                        style={{ background: C.redBg, border: `1.5px solid ${C.red}44`, borderRadius: 16, padding: '14px 8px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <Icon name="banknote" size={22} color={C.red} />
                        <div style={{ fontSize: 13, fontWeight: 900, color: C.red }}>Sell Stake</div>
                        <div style={{ fontSize: 9, color: C.muted, textAlign: 'center', lineHeight: 1.4 }}>Request a sale. Needs a buyer at your asking valuation.</div>
                      </button>
                    ) : (
                      <button className="tap" onClick={() => setLegalDoc('terms')}
                        style={{ background: 'rgba(var(--tint),0.05)', border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '14px 8px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <Icon name="lock" size={22} color={C.muted} />
                        <div style={{ fontSize: 13, fontWeight: 900, color: C.muted }}>Selling not available</div>
                        <div style={{ fontSize: 9, color: C.muted, textAlign: 'center', lineHeight: 1.4 }}>Not open for sale right now. Tap to see why.</div>
                      </button>
                    )}
                    <button className="tap" onClick={() => setActiveSheet('buyMore')}
                      style={{ background: C.greenBg, border: `1.5px solid ${C.green}44`, borderRadius: 16, padding: '14px 8px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Icon name="trendUp" size={22} color={C.green} />
                      <div style={{ fontSize: 13, fontWeight: 900, color: C.green }}>Buy More</div>
                      <div style={{ fontSize: 9, color: C.muted, textAlign: 'center', lineHeight: 1.4 }}>Increase your stake at current valuation.</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Allocation popup (donut chart) */}
      <AllocationSheet show={allocOpen} onClose={() => setAllocOpen(false)} items={allocItems} />
      <LegalSheet show={!!legalDoc} doc={legalDoc || 'terms'} onClose={() => setLegalDoc(null)} />

      {/* Sell Sheet */}
      <Sheet show={activeSheet === 'sell'} onClose={() => setActiveSheet(null)} title={`Sell Stake — ${selH?.companyName || ''}`}>
        {selH && (
          <SellFlow holding={selH} nowVal={selH.nowVal} adminPhone={adminPhone} user={user}
            onClose={() => setActiveSheet(null)}
            onSuccess={() => { setToast({ m: '✅ Sell request submitted!' }); load() }} />
        )}
      </Sheet>

      {/* Buy More Sheet */}
      <Sheet show={activeSheet === 'buyMore'} onClose={() => setActiveSheet(null)} title={`Buy More — ${selH?.companyName || ''}`}>
        {selH && (
          <BuyMoreFlow holding={selH} nowVal={selH.nowVal} adminPhone={adminPhone} user={user}
            onClose={() => { setActiveSheet(null); setToast({ m: '✅ Interest submitted!' }) }} />
        )}
      </Sheet>
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
            style={{ flexShrink: 0, background: filter === f ? `linear-gradient(90deg,${C.gold},${C.goldL})` : 'rgba(var(--tint),0.05)', border: filter === f ? 'none' : `1px solid ${C.border}`, borderRadius: 20, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: filter === f ? '#ffffff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{f}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {list.map((n, i) => (
          <Card key={n.id} style={{ marginBottom: 12, background: i === 0 ? 'var(--mintB)' : C.card }}>
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
  const [legal, setLegal]   = useState(null)

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
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 32, fontWeight: 900, color: '#ffffff', boxShadow: `0 8px 32px ${C.gold}35` }}>
            {(user.name || 'I')[0]}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{user.name || 'Investor'}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{user.email}</div>
          <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 20, padding: '4px 16px', fontSize: 11, color: C.gold, fontWeight: 700 }}><Icon name="award" size={12} color={C.gold} /> Premium Member</div>
        </div>

        {/* Welcome note */}
        {user.welcomeNote && (
          <Card style={{ marginBottom: 14, background: 'var(--mintB)', border: `1px solid ${C.goldBd}` }}>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="mail" size={12} color={C.gold} /> Note from Anand Finco</div>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, fontStyle: 'italic' }}>"{user.welcomeNote}"</div>
          </Card>
        )}

        {/* Info */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Personal Information</div>
          {[['mail', 'Email', user.email || '—'], ['phone', 'Phone', user.phone || '—'], ['mapPin', 'City', user.city || '—'], ['calendar', 'Member Since', user.joinDate ? `Since ${user.joinDate}` : '—']].map(([ic, l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.goldBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={ic} size={16} color={C.gold} /></div>
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
              <div style={{ fontSize: 11, color: pan ? C.green : C.muted, marginTop: 3 }}>{pan ? 'Verified' : 'Not added yet'}</div>
            </div>
            {!editing && <button onClick={() => setEdit(true)}
              style={{ background: C.goldBg, border: `1px solid ${C.goldBd}`, borderRadius: 9, padding: '5px 12px', color: C.gold, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{pan ? 'Edit' : '+ Add'}</button>}
          </div>
          {!editing
            ? pan
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenBg, border: `1px solid ${C.green}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="checkCircle" size={19} color={C.green} /></div>
                <div>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>PAN Number</div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: C.text, letterSpacing: 2.5, marginTop: 3 }}>{pan}</div>
                </div>
              </div>
              : <div style={{ fontSize: 12, color: C.dim, textAlign: 'center', padding: '8px 0' }}>Add your PAN to complete KYC verification.</div>
            : <div>
              <Field label="PAN Number" value={pan} onChange={v => setPan(v.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" note="Format: AAAAA0000A" />
              <div style={{ display: 'flex', gap: 10, width: '100%', boxSizing: 'border-box' }}>
                <Btn label="Cancel" onClick={() => setEdit(false)} outline full sm />
                <Btn label="Save PAN" onClick={savePan} loading={saving} full sm />
              </div>
            </div>
          }
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Legal</div>
          {[['terms', 'Terms & Conditions', 'clipboard'], ['privacy', 'Privacy Policy', 'shield']].map(([id, label, icon], i) => (
            <button key={id} onClick={() => setLegal(id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', borderTop: i ? `1px solid ${C.border}` : 'none', padding: '13px 0', cursor: 'pointer', fontFamily: 'inherit', color: C.text }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.goldBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={16} color={C.gold} /></div>
              <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>{label}</span>
              <span style={{ color: C.muted, fontSize: 18, lineHeight: 1 }}>›</span>
            </button>
          ))}
        </Card>
        <LegalSheet show={!!legal} doc={legal || 'terms'} onClose={() => setLegal(null)} />

        <button onClick={() => signOut(auth)}
          style={{ width: '100%', background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 14, padding: 15, color: C.red, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
          <Icon name="logout" size={16} /> Sign Out
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
    const oldVal = co.currentValuation || nv
    const peak   = Math.max(co.peakValuation || oldVal, oldVal, nv)
    const hist   = Array.isArray(co.valuationHistory) ? co.valuationHistory : []
    const newHist = [...hist, { v: oldVal, t: Date.now() }].slice(-24)
    await updateDoc(doc(db, 'companies', co.id), {
      currentValuation:  nv,
      previousValuation: oldVal,
      peakValuation:      peak,
      valuationHistory:  newHist,
    })
    setToast({ m: `${co.name} → ${fmtL(nv)} ✨ All portfolios updated live!` })
    setValMap(p => ({ ...p, [co.id]: '' })); load()
  }

  async function toggleActive(co) {
    await updateDoc(doc(db, 'companies', co.id), { active: !co.active }); load()
  }

  async function toggleSell(co) {
    await updateDoc(doc(db, 'companies', co.id), { sellAllowed: co.sellAllowed === false }); load()
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
        {companies.length === 0 && <Empty icon="building" title="No companies yet" sub="Tap + Add to create your first opportunity" />}
        {companies.map(co => (
          <Card key={co.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 }}>{co.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Badge label={co.sector} color={C.blue} />
                  <Badge label={co.risk} color={riskC[co.risk] || C.muted} />
                  <Badge label={co.active ? 'Visible' : 'Hidden'} color={co.active ? C.green : C.muted} />
                  {co.sellAllowed === false && <Badge label="No selling" color={C.red} />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7, marginLeft: 8 }}>
                <button onClick={() => startEdit(co)} style={{ background: 'rgba(var(--tint),0.06)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 9px', cursor: 'pointer', display: 'flex' }}><Icon name="edit" size={15} color={C.muted} /></button>
                <button onClick={() => setConfirm({ id: co.id, msg: `Delete "${co.name}"? This is permanent.` })} style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 8, padding: '6px 9px', cursor: 'pointer', display: 'flex' }}><Icon name="trash" size={15} color={C.red} /></button>
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
              <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="refresh" size={11} color={C.gold} /> Update Valuation — reflects live in all client portfolios</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={valMap[co.id] || ''} onChange={e => setValMap(p => ({ ...p, [co.id]: e.target.value }))}
                  placeholder={`New value (now: ${fmtL(co.currentValuation)})`} type="number"
                  style={{ flex: 1, background: 'rgba(var(--tint),0.06)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                <Btn label="Update" onClick={() => updateVal(co)} sm />
              </div>
            </div>
            {/* Show/hide toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.muted }}>Show to clients</span>
              <button onClick={() => toggleActive(co)}
                style={{ background: co.active ? C.redBg : C.greenBg, border: `1px solid ${co.active ? C.red : C.green}44`, borderRadius: 8, padding: '5px 14px', color: co.active ? C.red : C.green, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: co.active ? C.red : C.green, flexShrink: 0 }} />
                {co.active ? 'Hide from clients' : 'Show to clients'}
              </button>
            </div>
            {/* Sell allowed toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Clients can sell this stake</span>
              <button onClick={() => toggleSell(co)}
                style={{ background: co.sellAllowed === false ? C.redBg : C.greenBg, border: `1px solid ${co.sellAllowed === false ? C.red : C.green}44`, borderRadius: 8, padding: '5px 14px', color: co.sellAllowed === false ? C.red : C.green, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: co.sellAllowed === false ? C.red : C.green, flexShrink: 0 }} />
                {co.sellAllowed === false ? 'Selling blocked · tap to allow' : 'Selling allowed · tap to block'}
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
        <div style={{ display: 'flex', gap: 10, marginTop: 4, width: '100%', boxSizing: 'border-box' }}>
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
        <button onClick={load} style={{ background: 'rgba(var(--tint),0.05)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 13px', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="refresh" size={13} color={C.muted} /> Refresh</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {loading && <Loader />}
        {!loading && notifs.length === 0 && <Empty icon="bell" title="No requests yet" sub="When clients tap 'Invest Now', their requests appear here" />}
        {notifs.map(n => (
          <div key={n.id} onClick={() => markRead(n)}
            style={{ background: n.read ? C.card : 'rgba(0,179,134,0.07)', border: `1px solid ${n.read ? C.border : C.goldBd}`, borderRadius: 16, padding: 16, marginBottom: 12, cursor: 'pointer' }}>
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
              style={{ width: '100%', background: 'linear-gradient(90deg,#25D366,#128C7E)', border: 'none', borderRadius: 11, padding: 12, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Icon name="chat" size={15} color="#fff" /> WhatsApp {n.clientName?.split(' ')[0]} Now
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
        {clients.length === 0 && <Empty icon="clipboard" title="No clients yet" sub="Add clients first from the Clients tab" />}
        {clients.map(c => (
          <Card key={c.id} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => selectClient(c)}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#ffffff', fontSize: 18, flexShrink: 0 }}>{(c.name || '?')[0]}</div>
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
        <button onClick={() => setSelected(null)} style={{ background: 'rgba(var(--tint),0.06)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 13px', color: C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{selected.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{holdings.length} holdings</div>
        </div>
        <Btn label="+ Add" onClick={() => setSheet(true)} sm />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {holdings.length === 0 && <Empty icon="portfolio" title="No holdings" sub="Add holdings using the + Add button" />}
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
          <div style={{ fontSize: 10, color: 'var(--label)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>Select Company *</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {companies.map(c => (
              <button key={c.id} onClick={() => { sf('companyId')(c.id); sf('buyValuation')(String(c.currentValuation)) }}
                style={{ background: form.companyId === c.id ? C.gold : 'rgba(var(--tint),0.05)', border: `1px solid ${form.companyId === c.id ? C.gold : C.border}`, borderRadius: 20, padding: '6px 13px', fontSize: 11, fontWeight: 700, color: form.companyId === c.id ? '#ffffff' : C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{c.name}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Stake (%) *" value={form.stake} onChange={sf('stake')} type="number" placeholder="1.0" />
          <Field label="Buy Valuation ₹ *" value={form.buyValuation} onChange={sf('buyValuation')} type="number" />
        </div>
        <Field label="Amount Invested ₹" value={form.investedAmt} onChange={sf('investedAmt')} type="number" note="Auto-calculated from stake if blank" />
        <Field label="Purchase Date" value={form.purchaseDate} onChange={sf('purchaseDate')} placeholder="2025-01-15" />
        <div style={{ display: 'flex', gap: 10, marginTop: 4, width: '100%', boxSizing: 'border-box' }}>
          <Btn label="Cancel" onClick={() => setSheet(false)} outline full />
          <Btn label="Add Holding" onClick={addHolding} loading={saving} full />
        </div>
      </Sheet>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — SELL REQUESTS
// ─────────────────────────────────────────────────────────────────────────────
function AdminSellRequests() {
  const [reqs,  setReqs]  = useState([])
  const [toast, setToast] = useState(null)
  const [conf,  setConf]  = useState(null)

  const load = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'sellRequests'), orderBy('timestamp', 'desc')))
      setReqs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.log('sell reqs:', e.message) }
  }, [])
  useEffect(() => { load() }, [load])

  async function approve(r) {
    try {
      await updateDoc(doc(db, 'sellRequests', r.id), { status: 'approved', read: true })
      setToast({ m: `✅ Approved sell for ${r.clientName}` })
      setConf(null); load()
      const ph = (r.clientPhone || '').replace(/\D/g, '')
      if (ph) {
        const msg = encodeURIComponent(`Hello ${r.clientName}! ✅ Your sell request for *${r.companyName}* has been approved!\n\nPayout of *${fmt(r.expectedPayout)}* will be transferred to your bank account (${r.bankAccountNo}) within ${LEGAL.payoutDays} days.\n\n– Anand Finco`)
        window.open(`https://wa.me/${ph}?text=${msg}`, '_blank')
      }
    } catch (e) { setToast({ m: e.message, t: 'error' }) }
  }

  async function reject(r) {
    try {
      await updateDoc(doc(db, 'sellRequests', r.id), { status: 'rejected', read: true })
      setToast({ m: 'Request rejected' }); setConf(null); load()
    } catch (e) { setToast({ m: e.message, t: 'error' }) }
  }

  const pending  = reqs.filter(r => r.status === 'pending')
  const resolved = reqs.filter(r => r.status !== 'pending')
  const unread   = pending.filter(r => !r.read).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Toast msg={toast?.m} type={toast?.t} onDone={() => setToast(null)} />
      <Confirm msg={conf?.msg} onYes={conf?.onYes} onNo={() => setConf(null)} />
      <div style={{ background: C.bg2, padding: '52px 18px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Sell Requests</div>
          <div style={{ fontSize: 11, color: unread > 0 ? C.red : C.muted, marginTop: 2 }}>{unread > 0 ? `${unread} new pending` : 'All reviewed ✓'}</div>
        </div>
        <button onClick={load} style={{ background: 'rgba(var(--tint),0.05)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '7px 13px', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="refresh" size={13} color={C.muted} /> Refresh</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 40px' }}>
        {reqs.length === 0 && <Empty icon="inbox" title="No sell requests" sub="When clients submit sell requests, they appear here." />}

        {pending.length > 0 && <>
          <div style={{ fontSize: 10, color: C.red, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>⏳ Pending ({pending.length})</div>
          {pending.map(r => (
            <div key={r.id} style={{ background: C.redBg, border: `1px solid ${C.red}33`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {!r.read && <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.red, flexShrink: 0 }} />}
                  <div style={{ fontSize: 15, fontWeight: 900, color: C.text }}>{r.clientName}</div>
                </div>
                <Badge label="SELL REQUEST" color={C.red} />
              </div>
              <div style={{ background: 'rgba(var(--tint),0.035)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['Company', r.companyName || '—'], ['Selling', `${r.sellPercent}% of stake`], ['Asking Val.', fmtL(r.askingValuation)], ['Exp. Payout', fmt(r.expectedPayout)], ['P&L', `${r.gainLoss >= 0 ? '+' : ''}${fmt(r.gainLoss)}`], ['Date', r.timestamp?.toDate?.()?.toLocaleDateString('en-IN') || '—']].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>{l}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: l === 'Exp. Payout' ? C.gold : C.text2, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              {r.bankAccountName && (
                <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: C.blue, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="bank" size={12} color={C.blue} /> Payout Bank</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[['Name', r.bankAccountName], ['Bank', r.bankName], ['Account', r.bankAccountNo], ['IFSC', r.bankIFSC]].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' }}>{l}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.text2, marginTop: 2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {r.termsAccepted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: C.green, marginBottom: 12 }}>
                  <Icon name="checkCircle" size={13} color={C.green} /> Client accepted Terms v{r.termsVersion || '—'}{r.termsAcceptedAt?.toDate ? ` on ${r.termsAcceptedAt.toDate().toLocaleDateString('en-IN')}` : ''}
                </div>
              )}
              <div style={{ background: C.greenBg, border: `1px solid ${C.green}33`, borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 9, color: C.muted }}>PAYOUT AMOUNT</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: C.green }}>{fmt(r.expectedPayout)}</div>
                </div>
                <Icon name="wallet" size={26} color={C.green} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConf({ msg: `Approve sell of ${r.sellPercent}% stake in ${r.companyName} for ${fmt(r.expectedPayout)}?`, onYes: () => approve(r) })}
                  style={{ flex: 1, background: C.greenBg, border: `1px solid ${C.green}44`, borderRadius: 10, padding: 11, color: C.green, fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Icon name="checkCircle" size={15} /> Approve
                </button>
                <button onClick={() => setConf({ msg: `Reject ${r.clientName}'s sell request?`, onYes: () => reject(r) })}
                  style={{ background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 10, padding: '11px 16px', color: C.red, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center' }}><Icon name="xCircle" size={16} /></button>
              </div>
            </div>
          ))}
        </>}

        {resolved.length > 0 && <>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', margin: '14px 0 10px' }}>History</div>
          {resolved.map(r => (
            <div key={r.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.clientName} — {r.companyName}</div>
                <Badge label={r.status === 'approved' ? 'APPROVED' : 'REJECTED'} color={r.status === 'approved' ? C.green : C.red} />
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{r.sellPercent}% of stake · {fmt(r.expectedPayout)}</div>
            </div>
          ))}
        </>}
      </div>
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
        {clients.length === 0 && <Empty icon="users" title="No clients yet" sub="Tap '+ Add Client' to create your first client account" />}
        {clients.map(c => (
          <Card key={c.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#ffffff', fontSize: 19, flexShrink: 0 }}>{(c.name || '?')[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{c.username || c.id} · {c.phone || 'No phone'} · {c.city || '—'}</div>
                {c.pan && <div style={{ fontSize: 10, color: C.gold, marginTop: 2, fontWeight: 700 }}>PAN: {c.pan}</div>}
              </div>
              {c.phone && (
                <button onClick={() => openWA(c)} style={{ background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 10, padding: '8px 11px', cursor: 'pointer', flexShrink: 0, display: 'flex' }}><Icon name="chat" size={17} color="#128C7E" /></button>
              )}
            </div>
            {c.welcomeNote && <div style={{ fontSize: 11, color: C.muted, marginTop: 10, padding: '8px 12px', background: 'rgba(var(--tint),0.03)', borderRadius: 8, fontStyle: 'italic' }}>"{c.welcomeNote}"</div>}
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
        <div style={{ display: 'flex', gap: 10, marginTop: 4, width: '100%', boxSizing: 'border-box' }}>
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
          <div style={{ width: 48, height: 48, borderRadius: 13, background: `linear-gradient(135deg,${C.gold},${C.goldL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#ffffff' }}>A</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Admin — Anand Finco</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{user?.email}</div>
          </div>
        </div>

        {/* WhatsApp */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="chat" size={15} color="#25D366" /> WhatsApp Notification Number</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>
            When clients tap "Invest Now", a WhatsApp message opens to this number. Used for all direct client contact.
          </div>
          <Field label="Your WhatsApp Number" value={waNum} onChange={setWaNum} placeholder="919876543210" note="Country code + number, no spaces. Example: 919876543210" />
          <Btn label={saving ? 'Saving…' : 'Save Number'} onClick={save} loading={saving} full />
        </Card>

        {/* Firestore rules */}
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="lock" size={15} /> Firestore Security Rules</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Copy-paste in Firebase Console → Firestore → Rules tab:</div>
          <div style={{ background: 'rgba(var(--tint),0.04)', borderRadius: 10, padding: 14, border: `1px solid rgba(var(--tint),0.06)` }}>
            <pre style={{ fontSize: 9, color: 'var(--code)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{`rules_version = '2';
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
    match /sellRequests/{id} {
      allow create: if request.auth != null;
      allow read,update: if request.auth.uid == resource.data.clientId
        || request.auth.token.email =="admin@anandfinco.com";
    }
  }
}`}</pre>
          </div>
        </Card>

        <Btn label="Sign Out" icon={<Icon name="logout" size={15} />} onClick={() => signOut(auth)} danger full />
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
    { id: 'home',      icon: 'home',      label: 'Home' },
    { id: 'portfolio', icon: 'portfolio', label: 'Portfolio' },
    { id: 'news',      icon: 'news',      label: 'News' },
    { id: 'profile',   icon: 'user',      label: 'Profile' },
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
    { id: 'companies',  icon: 'building', label: 'Companies' },
    { id: 'portfolios', icon: 'portfolio', label: 'Portfolios' },
    { id: 'notifs',     icon: 'bell',     label: 'Requests', badge: unread },
    { id: 'sell',       icon: 'banknote', label: 'Sell Reqs' },
    { id: 'clients',    icon: 'users',    label: 'Clients' },
    { id: 'settings',   icon: 'settings', label: 'Settings' },
  ]
  return (
    <>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'companies'  && <AdminCompanies />}
        {tab === 'portfolios' && <AdminPortfolios />}
        {tab === 'notifs'     && <AdminNotifications />}
        {tab === 'sell'       && <AdminSellRequests />}
        {tab === 'clients'    && <AdminClients />}
        {tab === 'settings'   && <AdminSettings user={user} />}
      </div>
      <BottomNav tabs={TABS} active={tab} onChange={setTab} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL — Terms & Conditions and Privacy Policy
// Edit the details below (all optional). Anything left empty is simply not shown.
// ─────────────────────────────────────────────────────────────────────────────
const LEGAL = {
  company:          'Anand Finco',
  version:          '1.0',                 // change when you change the wording below
  updated:          '12 November 2026',
  payoutDays:       '15–30',               // payout after a sale is completed
  email:            '',                    // e.g. 'support@anandfinco.in'
  phone:            '',                    // e.g. '+91 98765 43210'
  address:          '',                    // registered office address
  grievanceOfficer: '',                    // name of grievance officer
  jurisdiction:     '',                    // city whose courts apply, e.g. 'Mumbai'
}

const LEGAL_DOCS = {
  terms: {
    title: 'Terms & Conditions',
    intro: `These Terms & Conditions ("Terms") apply when you use the ${LEGAL.company} app and submit buy or sell requests through it. Please read them carefully. By using the app, or by ticking the acceptance box before submitting a sell request, you agree to these Terms and to our Privacy Policy.`,
    sections: [
      { h: '1. About the app',
        p: [`${LEGAL.company} ("we", "us") helps its clients view their unlisted-share holdings and request to buy more or to sell. The app is a convenience tool. Submitting a request in the app does not by itself buy or sell any shares.`] },
      { h: '2. Your account',
        ul: ['You must be at least 18 years old and legally able to enter into a contract.',
             'Your account is created by us for you. Keep your username and password private and do not share them with anyone.',
             'You are responsible for everything done through your account. Tell us immediately if you think someone else has used it.',
             `We will never ask you for your password or any OTP. Do not share them with anyone, including people who say they are from ${LEGAL.company}.`] },
      { h: '3. Risks of unlisted shares',
        p: ['Unlisted shares are not traded on a stock exchange. Please understand the following before you invest or sell:'],
        ul: ['There may be no ready buyer, so you may not be able to sell when you want, or at all.',
             'The value of your investment can go down, and you can lose part or all of your money.',
             'Valuations shown in the app are indicative. They are updated by us from time to time and are not a price at which a sale is guaranteed.',
             'Gains, losses and returns shown are on paper only. They become real only when a sale is completed and the money is received.',
             'Past performance does not guarantee future results.'] },
      { h: '4. Selling your stake',
        p: ['Selling unlisted shares works differently from selling shares on an exchange. By submitting a sell request you accept the following:'],
        ul: ['**Some companies cannot be sold.** For certain companies the sell option is not available, for example because of a lock-in period, a transfer restriction or the company\'s own policy. For these companies the app shows "Selling not available". We may change this as conditions change.',
             '**A sell request is not a sale.** It is a request asking us to find a buyer for your stake.',
             '**A new buyer is needed.** Your stake is sold only when we arrange a new buyer who agrees to buy at your asking valuation. We do not guarantee that a buyer will be found, how long it will take, or the price. Until a sale is completed, you continue to hold the shares and they stay in your portfolio.',
             '**Your asking valuation matters.** If your asking valuation is higher than what buyers are willing to pay, your request may take longer or may not be fulfilled. To change or withdraw a request, contact us before a buyer is matched.',
             '**When is a sale completed?** A sale is completed when the buyer\'s payment has been received and verified by us and the share transfer formalities, including any approvals the company requires, are done. Only then is your portfolio updated.',
             `**Payout timeline.** After the sale is completed, the sale proceeds are credited to your bank account within ${LEGAL.payoutDays} days.`,
             '**Your bank account.** Payout is made only to the bank account you provided in the request, and it must be in your own name. We do not pay third-party accounts.',
             '**Deductions.** Taxes, including TDS where applicable, and any charges required by law may be deducted. The "Expected Payout" shown in the app is only an estimate.',
             '**We may decline or cancel a request** if, for example, your details do not match our records, a verification is pending, the company or a regulator does not permit the transfer, or we suspect misuse or fraud.'] },
      { h: '5. What you confirm when you sell',
        p: ['When you tick the box and submit a sell request, you confirm that:'],
        ul: ['You are the lawful owner of the stake and it is free from any pledge, loan or other claim.',
             'The details and bank information you gave are true and correct.',
             'You have read these Terms and understand that there is no guaranteed buyer, price or timeline.',
             `You understand that payout is credited within ${LEGAL.payoutDays} days after the sale is completed.`] },
      { h: '6. Buying more',
        p: ['A "Buy More" request only tells us that you are interested. It is not a confirmed purchase. Availability, price, company approvals and verification checks apply, and a purchase is confirmed only when our team confirms it to you. Make payments only as instructed by our team through our official contact details.'] },
      { h: '7. Your bank details',
        ul: ['Check your bank details carefully. Wrong details can delay or misdirect your payout, and we are not responsible for delay or loss caused by incorrect details you provide.',
             'For your safety, the app stores only the last 4 digits of your account number. Our team may contact you through a secure channel to confirm the full details before paying out.'] },
      { h: '8. Fees',
        p: ['If any fee or charge applies to a transaction, we will tell you before you confirm it.'] },
      { h: '9. Using the app',
        ul: ['Use the app only for lawful purposes. Do not try to break its security, copy its data or misuse another person\'s account.',
             'We try to keep the app available and accurate, but it is provided "as is". There may be delays, errors or interruptions. If the app and our official records or documents differ, the official records and documents prevail.',
             'We may suspend or close an account that is misused.'] },
      { h: '10. Limits on our responsibility',
        p: ['To the extent the law permits, we are not responsible for losses caused by market conditions, the lack of a buyer, delays by companies, banks, buyers or regulators, interruptions of the app or events outside our control, or for indirect or consequential losses. Nothing in these Terms limits any right you have under law that cannot be excluded.'] },
      { h: '11. Privacy',
        p: ['How we collect and use your information is explained in our Privacy Policy, which forms part of these Terms.'] },
      { h: '12. Changes to these Terms',
        p: ['We may update these Terms from time to time. The version and date are shown at the end of this page. When you submit a sell request, we record the version you accepted, and that version applies to that request.'] },
      { h: '13. Governing law and complaints',
        p: [`These Terms are governed by the laws of India. ${LEGAL.jurisdiction ? `Courts at ${LEGAL.jurisdiction} have jurisdiction` : 'Courts of competent jurisdiction in India have jurisdiction'}, subject to any rights you have under law.`,
            'If you have a complaint, please contact us first using the details below and we will try to resolve it promptly.'] },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    intro: `This Privacy Policy explains what personal information ${LEGAL.company} collects through the app, why we collect it, how we protect it and what choices you have. By using the app you agree to this Policy.`,
    sections: [
      { h: '1. Information we collect',
        ul: ['**Account details:** your name, username or email, phone number, city and the date you joined.',
             '**Identity details:** your PAN, if you choose to add it in your profile.',
             '**Portfolio details:** the companies you hold, your stake, amount invested and valuations.',
             '**Requests:** the buy and sell requests you submit, including your asking valuation and the reason you give.',
             '**Payout bank details:** account holder name, bank name, IFSC code, account type and only the last 4 digits of your account number.',
             '**Acceptance records:** the version of the Terms you accepted and when.',
             '**Technical information:** basic device, browser and connection details handled by our hosting and database providers to run the service securely, and login information kept in your browser so that you stay signed in.'] },
      { h: '2. How we use your information',
        ul: ['To run your account and show your portfolio.',
             'To handle your buy and sell requests and to pay out sale proceeds.',
             'To verify your identity and details and to prevent fraud.',
             'To contact you about your account, your requests and important updates, including by phone and WhatsApp.',
             'To meet legal, tax, accounting and regulatory requirements.',
             'To keep the app secure and to fix problems.'],
        p: ['We do not sell your personal information and we do not show advertisements in the app.'] },
      { h: '3. Who we share it with',
        p: ['We share information only when it is needed:'],
        ul: ['**Service providers** that run the app for us: Google Firebase (login and database) and Vercel (hosting).',
             '**Parties to a sale,** such as the buyer, the company or its registrar, and banks or payment partners, limited to what is needed to complete your sale and payout.',
             '**Authorities,** when the law requires it.',
             '**WhatsApp:** when you submit a request or tap a WhatsApp button, a message with details of your request may open in WhatsApp for you to send. Messages you send there are covered by WhatsApp\'s own policies.'] },
      { h: '4. Third-party content',
        p: ['The news section is loaded through our server from a news provider and does not send your personal details. Fonts are loaded from Google Fonts, which may receive your IP address.'] },
      { h: '5. Where your data is stored and how we protect it',
        ul: ['Your data is stored with Google Firebase, on servers operated by Google, which may be located outside India.',
             'Connections to the app are encrypted (HTTPS).',
             `Access rules mean each client can see only their own information, and only authorised ${LEGAL.company} staff can manage client data.`,
             'We store only the last 4 digits of your bank account number.',
             'No system is completely secure. Please protect your password and tell us if you notice anything suspicious.'] },
      { h: '6. How long we keep it',
        p: ['We keep your information while your account is active, and afterwards for as long as needed to provide our services and to meet legal, tax, accounting and regulatory requirements. After that we delete or anonymise it.'] },
      { h: '7. Your rights and choices',
        p: ['You can ask us to:'],
        ul: ['show you the information we hold about you;',
             'correct or update it;',
             'delete it (we may need to keep some records because the law requires it);',
             'stop using it by withdrawing your consent (this may mean we can no longer provide some services); and',
             'nominate another person to exercise your rights if you are unable to.'] },
      { h: '8. Children',
        p: ['The app is meant for adults aged 18 and above. It is not meant for children.'] },
      { h: '9. Changes to this Policy',
        p: ['We may update this Policy from time to time. The version and date are shown at the end of this page.'] },
    ],
  },
}

// tiny helper: turns **bold** markers into <strong>
function Rich({ text }) {
  return <>{String(text).split('**').map((t, i) => (i % 2 ? <strong key={i} style={{ color: C.text }}>{t}</strong> : <span key={i}>{t}</span>))}</>
}

function LegalBody({ doc }) {
  const d = LEGAL_DOCS[doc] || LEGAL_DOCS.terms
  const contact = [['Company', LEGAL.company], ['Email', LEGAL.email], ['Phone', LEGAL.phone], ['Address', LEGAL.address], ['Grievance officer', LEGAL.grievanceOfficer]].filter(([, v]) => v)
  const para = { fontSize: 12.5, color: C.text2, lineHeight: 1.75, marginBottom: 8 }
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8 }}>{d.title}</div>
      <div style={{ ...para, marginBottom: 14 }}>{d.intro}</div>
      {d.sections.map(s => (
        <div key={s.h} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>{s.h}</div>
          {(s.p || []).map((t, i) => <div key={'p' + i} style={para}><Rich text={t} /></div>)}
          {s.ul && (
            <ul style={{ paddingLeft: 18, margin: '0 0 4px' }}>
              {s.ul.map((t, i) => <li key={i} style={{ ...para, marginBottom: 6 }}><Rich text={t} /></li>)}
            </ul>
          )}
        </div>
      ))}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 6 }}>Contact us</div>
        {contact.map(([l, v]) => (
          <div key={l} style={{ ...para, marginBottom: 4 }}><strong style={{ color: C.text }}>{l}:</strong> {v}</div>
        ))}
        <div style={{ ...para, marginTop: 6 }}>You can also reach us on the phone or WhatsApp number shared with you by our team.</div>
      </div>
      <div style={{ fontSize: 10, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        Version {LEGAL.version} · Last updated {LEGAL.updated}
      </div>
    </div>
  )
}

// Pop-up reader used inside the app (login, profile, sell flow, portfolio)
function LegalSheet({ show, doc, onClose }) {
  const [tab, setTab] = useState(doc || 'terms')
  useEffect(() => { if (show) setTab(doc || 'terms') }, [show, doc])
  useEffect(() => {
    if (!show) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show])
  if (!show) return null
  return (
    <div onClick={onClose} role="presentation"
      style={{ position: 'fixed', inset: 0, background: 'rgba(8,20,16,0.6)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" aria-label="Legal" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, height: '90dvh', background: C.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 40px rgba(var(--shade),0.2)' }}>
        <div style={{ padding: '14px 18px 10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 4, background: C.bg3, borderRadius: 12, padding: 3 }}>
              {[['terms', 'Terms & Conditions'], ['privacy', 'Privacy Policy']].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id}
                  style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 800,
                    background: tab === id ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'transparent', color: tab === id ? '#ffffff' : C.muted }}>{label}</button>
              ))}
            </div>
            <button onClick={onClose} aria-label="Close legal"
              style={{ background: 'rgba(var(--tint),0.07)', border: 'none', borderRadius: 8, width: 30, height: 30, color: C.muted, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '4px 20px 28px' }}>
          <LegalBody doc={tab} />
          <div style={{ marginTop: 18 }}><Btn label="Close" onClick={onClose} full /></div>
        </div>
      </div>
    </div>
  )
}

// Full public page at /terms and /privacy (no login needed) – also usable as the
// privacy-policy link that Google Play asks for.
function LegalPage({ doc }) {
  const link = (id, label) => (
    <a key={id} href={'/' + id} style={{ textDecoration: 'none', borderRadius: 9, padding: '7px 12px', fontSize: 11, fontWeight: 800,
      background: doc === id ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'transparent', color: doc === id ? '#ffffff' : C.muted }}>{label}</a>
  )
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg2 }}>
      <div style={{ padding: '22px 18px 12px', flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 18, fontWeight: 800, color: 'var(--brandText)' }}>{LEGAL.company}</div>
          <a href="/" style={{ fontSize: 11, fontWeight: 800, color: C.gold, textDecoration: 'none' }}>← Back to app</a>
        </div>
        <div style={{ display: 'flex', gap: 4, background: C.bg3, borderRadius: 12, padding: 3, marginTop: 12, width: 'fit-content' }}>
          {link('terms', 'Terms & Conditions')}{link('privacy', 'Privacy Policy')}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 40px' }}>
        <LegalBody doc={doc} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
function AppMain() {
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

// Public legal pages (/terms and /privacy) work without logging in; everything else is the normal app.
export default function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '').toLowerCase() : ''
  if (path === '/terms' || path === '/privacy') {
    return (
      <>
        <InjectCSS />
        <Shell><LegalPage doc={path === '/terms' ? 'terms' : 'privacy'} /></Shell>
      </>
    )
  }
  return <AppMain />
}
