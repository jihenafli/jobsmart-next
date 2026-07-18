import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await login(email, password); navigate('/dashboard'); }
    catch (err) { setError(err.response?.data?.error || 'Email ou mot de passe incorrect'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:'100%', maxWidth:400, padding:'0 20px' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--g)' }}/>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20 }}>JobSmart AI</span>
          </div>
          <p style={{ color:'var(--m)', fontSize:14 }}>Connecte-toi à ton compte</p>
        </div>
        <div className="card">
          {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#dc2626' }}>{error}</div>}
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ton@email.com" required />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>Mot de passe</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width:'100%', marginTop:4 }}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--m)' }}>
            Pas de compte ? <Link to="/register" style={{ color:'var(--g)', fontWeight:500 }}>Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
