import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const COUNTRIES = [
  { code:'TN', label:'🇹🇳 Tunisie' }, { code:'FR', label:'🇫🇷 France' },
  { code:'MA', label:'🇲🇦 Maroc' },  { code:'DE', label:'🇩🇪 Allemagne' },
  { code:'CA', label:'🇨🇦 Canada' }, { code:'OTHER', label:'🌍 International' },
];
const LEVELS = [
  { value:'stage',    label:'Stage / Internship' },
  { value:'junior',   label:'Junior (0–2 ans)' },
  { value:'mid',      label:'Confirmé (2–5 ans)' },
  { value:'senior',   label:'Senior (5+ ans)' },
  { value:'lead',     label:'Lead / Manager' },
  { value:'freelance',label:'Freelance' },
];
const DOMAINS = [
  'Informatique & Tech','Santé & Médical','Finance & Comptabilité',
  'Marketing & Communication','Ingénierie & Industrie','Éducation & Formation',
  'Commerce & Vente','RH & Management','Juridique','Architecture & BTP','Autre',
];

export default function Register() {
  const [form, setForm]     = useState({ name:'', email:'', password:'', country:'TN', level:'junior', domain:'' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { register }        = useAuth();
  const navigate            = useNavigate();

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.domain) return setError('Choisis ton domaine professionnel');
    setError(''); setLoading(true);
    try { await register(form); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Erreur inscription'); }
    finally { setLoading(false); }
  };

  const sel = { width:'100%', padding:'10px 14px', border:'1px solid var(--b)', borderRadius:8, fontSize:14, background:'var(--w)', color:'var(--t)', outline:'none' };
  const lbl = { fontSize:13, fontWeight:500, display:'block', marginBottom:6 };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 }}>
      <div style={{ width:'100%', maxWidth:480 }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--g)' }}/>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20 }}>JobSmart AI</span>
          </div>
          <p style={{ color:'var(--m)', fontSize:14 }}>Crée ton compte gratuit</p>
        </div>
        <div className="card">
          {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626' }}>{error}</div>}
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={lbl}>Nom complet</label>
              <input type="text" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ton nom complet" required />
            </div>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="ton@email.com" required />
            </div>
            <div>
              <label style={lbl}>Mot de passe</label>
              <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min. 6 caractères" minLength={6} required />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>🌍 Pays</label>
                <select value={form.country} onChange={e=>set('country',e.target.value)} style={sel}>
                  {COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>📊 Niveau</label>
                <select value={form.level} onChange={e=>set('level',e.target.value)} style={sel}>
                  {LEVELS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>💼 Domaine professionnel</label>
              <select value={form.domain} onChange={e=>set('domain',e.target.value)} style={sel} required>
                <option value="">-- Choisis ton domaine --</option>
                {DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', marginTop:4 }}>
              {loading ? 'Création...' : 'Créer mon compte gratuitement'}
            </button>
          </form>
          <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--m)' }}>
            Déjà un compte ? <Link to="/login" style={{ color:'var(--g)', fontWeight:500 }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
