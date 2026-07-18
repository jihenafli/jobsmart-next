'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

const COUNTRIES = [
  { code: 'TN', label: '🇹🇳 Tunisie' }, { code: 'FR', label: '🇫🇷 France' },
  { code: 'MA', label: '🇲🇦 Maroc' },  { code: 'DE', label: '🇩🇪 Allemagne' },
  { code: 'CA', label: '🇨🇦 Canada' }, { code: 'OTHER', label: '🌍 International' },
];
const LEVELS = [
  { value: 'stage',    label: 'Stage' },     { value: 'junior',   label: 'Junior 0-2 ans' },
  { value: 'mid',      label: 'Confirmé 2-5 ans' }, { value: 'senior', label: 'Senior 5+ ans' },
  { value: 'lead',     label: 'Lead/Manager' }, { value: 'freelance', label: 'Freelance' },
];
const DOMAINS = [
  'Informatique & Tech', 'Santé & Médical', 'Finance & Comptabilité',
  'Marketing & Communication', 'Ingénierie & Industrie', 'Commerce & Vente',
  'RH & Management', 'Éducation', 'Juridique', 'Autre',
];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', country: 'TN', level: 'junior', domain: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.domain) return setError('Choisis ton domaine professionnel');
    setError(''); setLoading(true);
    try { await register(form); router.push('/dashboard'); }
    catch (err: any) { setError(err.response?.data?.error || 'Erreur inscription'); }
    finally { setLoading(false); }
  };

  const sel = { width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, background: 'var(--bg3)', color: 'var(--text)', outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }}/>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18 }}>JobSmart AI</span>
          </div>
          <h1 style={{ fontSize: 24, marginBottom: 6 }}>Crée ton compte</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Gratuit · 1 candidature offerte · Sans carte bancaire</p>
        </div>

        <div className="glass" style={{ padding: 28 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#EF4444' }}>
              {error}
            </div>
          )}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>NOM COMPLET</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ton nom complet" required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>EMAIL</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="ton@email.com" required />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>MOT DE PASSE</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 6 caractères" minLength={6} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>🌍 PAYS</label>
                <select value={form.country} onChange={e => set('country', e.target.value)} style={sel}>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>📊 NIVEAU</label>
                <select value={form.level} onChange={e => set('level', e.target.value)} style={sel}>
                  {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6, color: 'var(--muted)' }}>💼 DOMAINE</label>
              <select value={form.domain} onChange={e => set('domain', e.target.value)} style={sel} required>
                <option value="">-- Choisis ton domaine --</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '11px' }}>
              {loading ? 'Création...' : 'Créer mon compte →'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            Déjà un compte ? <Link href="/login" style={{ color: 'var(--green)', fontWeight: 500 }}>Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
