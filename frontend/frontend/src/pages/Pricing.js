import React, { useState } from 'react';
import api from '../api'; 
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    key: 'basic', name: 'Basic', color: '#185FA5',
    monthly: { key:'basic_month', price:10, label:'10€/mois' },
    yearly:  { key:'basic_year',  price:8,  label:'8€/mois', total:'96€/an', saving:'20%' },
    limit: '10 candidatures/mois',
    features: ['10 candidatures/mois','Analyse CV IA','Matching offres','Lettre de motivation IA','CV joint automatiquement'],
  },
  {
    key: 'pro', name: 'Pro', color: '#1D9E75', popular: true,
    monthly: { key:'pro_month', price:25, label:'25€/mois' },
    yearly:  { key:'pro_year',  price:20, label:'20€/mois', total:'240€/an', saving:'20%' },
    limit: '50 candidatures/mois',
    features: ['50 candidatures/mois','Tout du Basic','Email recruteur auto-détecté','Recherche multi-pays','Dashboard historique'],
  },
  {
    key: 'premium', name: 'Premium', color: '#7F77DD',
    monthly: { key:'premium_month', price:50, label:'50€/mois' },
    yearly:  { key:'premium_year',  price:40, label:'40€/mois', total:'480€/an', saving:'20%' },
    limit: 'Candidatures illimitées',
    features: ['Illimité','Tout du Pro','Support dédié','Analytics avancés','API access'],
  },
];

export default function Pricing() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [yearly, setYearly]   = useState(false);
  const [loading, setLoading] = useState('');

  const upgrade = async (planKey) => {
    if (!user) return navigate('/register');
    setLoading(planKey);
    try {
      const res = await api.post('/api/payments/create-checkout', { planKey });
      window.location.href = res.data.url;
    } catch (e) { alert('Erreur: ' + (e.response?.data?.error || e.message)); }
    finally { setLoading(''); }
  };

  const currentPlan = user?.plan || 'free';

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'48px 20px' }}>
      <div style={{ maxWidth:920, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--g)' }}/>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20 }}>JobSmart AI</span>
          </div>
          <h1 style={{ fontSize:32, marginBottom:10 }}>Choisis ton forfait</h1>
          <p style={{ color:'var(--m)', marginBottom:24 }}>Commence gratuitement · Annulation à tout moment</p>

          {/* Toggle mensuel/annuel */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, background:'#fff', border:'1px solid var(--b)', borderRadius:30, padding:'6px 8px' }}>
            <button onClick={()=>setYearly(false)}
              style={{ padding:'8px 20px', borderRadius:24, border:'none', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:14, fontWeight:500, transition:'all .2s',
                background: !yearly ? 'var(--g)' : 'transparent', color: !yearly ? '#fff' : 'var(--m)' }}>
              Mensuel
            </button>
            <button onClick={()=>setYearly(true)}
              style={{ padding:'8px 20px', borderRadius:24, border:'none', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:14, fontWeight:500, transition:'all .2s', display:'flex', alignItems:'center', gap:8,
                background: yearly ? 'var(--g)' : 'transparent', color: yearly ? '#fff' : 'var(--m)' }}>
              Annuel
              <span style={{ background: yearly ? 'rgba(255,255,255,0.25)' : '#E1F5EE', color: yearly ? '#fff' : '#0F6E56', fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan gratuit */}
        <div style={{ background:'#fff', border:'1px solid var(--b)', borderRadius:12, padding:'16px 24px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <p style={{ fontWeight:600, fontSize:16 }}>Plan Gratuit</p>
            <p style={{ fontSize:13, color:'var(--m)', marginTop:2 }}>1 candidature/mois · Analyse CV IA · Matching offres · Lettre IA</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:22, fontWeight:700 }}>0€</span>
            {currentPlan === 'free' ? (
              <span style={{ fontSize:12, background:'var(--gl)', color:'var(--gd)', padding:'5px 14px', borderRadius:20, fontWeight:500 }}>✓ Plan actuel</span>
            ) : (
              <button className="btn" onClick={()=>navigate('/dashboard')} style={{ fontSize:13 }}>Dashboard →</button>
            )}
          </div>
        </div>

        {/* Plans payants */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16, marginBottom:32 }}>
          {PLANS.map(plan => {
            const pricing  = yearly ? plan.yearly : plan.monthly;
            const isCurrent = currentPlan === plan.key;

            return (
              <div key={plan.key}
                style={{ background:'#fff', border: plan.popular ? `2px solid ${plan.color}` : '1px solid var(--b)', borderRadius:16, padding:'28px 24px', position:'relative', display:'flex', flexDirection:'column' }}>

                {plan.popular && (
                  <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'#fff', padding:'4px 18px', borderRadius:20, fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>
                    ⭐ Le plus populaire
                  </div>
                )}

                <div style={{ marginBottom:20 }}>
                  <p style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:20, color:plan.color }}>{plan.name}</p>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4, margin:'10px 0 2px' }}>
                    <span style={{ fontSize:36, fontWeight:700, fontFamily:'Syne,sans-serif' }}>{pricing.price}€</span>
                    <span style={{ fontSize:13, color:'var(--m)' }}>/mois</span>
                  </div>
                  {yearly && (
                    <p style={{ fontSize:12, color:'var(--m)' }}>Facturé {pricing.total} · <span style={{ color:'#0F6E56', fontWeight:500 }}>Économie {pricing.saving}</span></p>
                  )}
                  <p style={{ fontSize:13, color:'var(--m)', marginTop:4 }}>{plan.limit}</p>
                </div>

                <ul style={{ listStyle:'none', flex:1, display:'flex', flexDirection:'column', gap:9, marginBottom:24 }}>
                  {plan.features.map(f=>(
                    <li key={f} style={{ fontSize:13, display:'flex', alignItems:'flex-start', gap:8 }}>
                      <span style={{ color:plan.color, fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => upgrade(pricing.key)}
                  disabled={loading===pricing.key || isCurrent}
                  style={{ width:'100%', padding:'12px', border: plan.popular ? 'none' : `1px solid ${plan.color}`, borderRadius:9, fontFamily:'DM Sans,sans-serif', fontSize:14, fontWeight:600, cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? '#f3f4f6' : plan.popular ? plan.color : 'transparent',
                    color: isCurrent ? 'var(--m)' : plan.popular ? '#fff' : plan.color,
                    transition:'all .2s', opacity: loading===pricing.key ? .7 : 1 }}>
                  {loading===pricing.key ? 'Chargement...' : isCurrent ? '✓ Plan actuel' : `Choisir ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ rapide */}
        <div style={{ background:'#fff', border:'1px solid var(--b)', borderRadius:12, padding:'24px' }}>
          <h3 style={{ fontSize:16, marginBottom:16 }}>Questions fréquentes</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[
              { q:'Puis-je annuler à tout moment ?', r:'Oui, sans engagement. Ton plan reste actif jusqu\'à la fin de la période.' },
              { q:'Le CV est-il vraiment joint ?', r:'Oui, ton CV est automatiquement joint en pièce jointe à chaque email envoyé.' },
              { q:'Les offres sont-elles vraies ?', r:'Oui, via JSearch API qui agrège Indeed, LinkedIn, Glassdoor en temps réel.' },
              { q:'Que se passe-t-il après ma limite ?', r:'Un écran de mise à niveau s\'affiche. Tu choisis un forfait pour continuer.' },
            ].map(({q,r})=>(
              <div key={q}>
                <p style={{ fontWeight:500, fontSize:14, marginBottom:4 }}>{q}</p>
                <p style={{ fontSize:13, color:'var(--m)', lineHeight:1.6 }}>{r}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign:'center', marginTop:24, fontSize:13, color:'var(--m)' }}>
          Paiement sécurisé par Stripe ·{' '}
          <span style={{ color:'var(--g)', cursor:'pointer' }} onClick={()=>navigate('/dashboard')}>← Retour au dashboard</span>
        </p>
      </div>
    </div>
  );
}
