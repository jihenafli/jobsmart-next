'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';

export default function Login() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router    = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await login(email, password);
      router.push('/welcome'); // ← Redirige vers la page de choix
    } catch (err: any) {
      setError(err.response?.data?.error || 'Email ou mot de passe incorrect');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:'100%', maxWidth:400, padding:'0 20px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)' }}/>
            <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:20 }}>JobSmart AI</span>
          </div>
          <h1 style={{ fontSize:24, marginBottom:6 }}>Bon retour 👋</h1>
          <p style={{ color:'var(--muted)', fontSize:13 }}>Connecte-toi à ton compte</p>
        </div>
        <div className="glass" style={{ padding:28 }}>
          {error && <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'var(--red)' }}>{error}</div>}
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, display:'block', marginBottom:6, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ton@email.com" required />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, display:'block', marginBottom:6, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', justifyContent:'center', marginTop:4, padding:'11px' }}>
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>
          <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'var(--muted)' }}>
            Pas de compte ? <Link href="/register" style={{ color:'var(--green)', fontWeight:500 }}>Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
