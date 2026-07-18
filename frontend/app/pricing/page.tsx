'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';

const PLANS = [
  {
    key: 'basic', name: 'Basic', color: 'var(--blue)',
    monthly: { key: 'basic_month', price: 10 },
    yearly:  { key: 'basic_year',  price: 8, total: '96€/an' },
    limit: '10 candidatures/mois',
    features: ['10 candidatures/mois', 'Resume Agent', 'Hunter Agent', 'Apply Agent', 'Email auto'],
  },
  {
    key: 'pro', name: 'Pro', color: 'var(--green)', popular: true,
    monthly: { key: 'pro_month', price: 25 },
    yearly:  { key: 'pro_year',  price: 20, total: '240€/an' },
    limit: '50 candidatures/mois',
    features: ['50 candidatures/mois', 'Tout du Basic', 'Coach Agent', 'Analytics Agent', 'Multi-pays'],
  },
  {
    key: 'premium', name: 'Premium', color: 'var(--purple)',
    monthly: { key: 'premium_month', price: 50 },
    yearly:  { key: 'premium_year',  price: 40, total: '480€/an' },
    limit: 'Illimité',
    features: ['Candidatures illimitées', 'Tout du Pro', 'Interview Agent', 'API access', 'Support dédié'],
  },
];

export default function Pricing() {
  const { user }     = useAuth();
  const router       = useRouter();
  const [yearly, setYearly]   = useState(false);
  const [loading, setLoading] = useState('');

  const upgrade = async (planKey: string) => {
    if (!user) return router.push('/register');
    setLoading(planKey);
    try {
      const res = await api.post('/api/payments/create-checkout', { planKey });
      window.location.href = res.data.url;
    } catch (e: any) { alert('Erreur: ' + (e.response?.data?.error || e.message)); }
    finally { setLoading(''); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '48px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, color: 'var(--muted)', fontSize: 13, textDecoration: 'none' }}>
            ← Dashboard
          </Link>
          <h1 style={{ fontSize: 40, marginBottom: 12 }}>Choisis ton <span className="gradient-text">forfait</span></h1>
          <p style={{ color: 'var(--muted)', marginBottom: 32 }}>Commence gratuitement · Sans engagement · Annulation à tout moment</p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 30, padding: '4px' }}>
            <button onClick={() => setYearly(false)}
              style={{ padding: '8px 20px', borderRadius: 24, border: 'none', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 500, background: !yearly ? 'var(--green)' : 'transparent', color: !yearly ? '#000' : 'var(--muted)', transition: 'all .2s' }}>
              Mensuel
            </button>
            <button onClick={() => setYearly(true)}
              style={{ padding: '8px 20px', borderRadius: 24, border: 'none', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, background: yearly ? 'var(--green)' : 'transparent', color: yearly ? '#000' : 'var(--muted)', transition: 'all .2s' }}>
              Annuel <span style={{ background: yearly ? 'rgba(0,0,0,0.15)' : 'var(--green-gl)', color: yearly ? '#000' : 'var(--green)', fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>-20%</span>
            </button>
          </div>
        </div>

        {/* Free plan */}
        <div className="glass" style={{ padding: '16px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Plan Gratuit</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>1 candidature/mois · Resume Agent · Hunter Agent · Apply Agent</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Syne' }}>0€</span>
            {user?.plan === 'free'
              ? <span className="tag tag-green">✓ Plan actuel</span>
              : <Link href="/dashboard" className="btn">Dashboard →</Link>}
          </div>
        </div>

        {/* Paid plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
          {PLANS.map(plan => {
            const pricing = yearly ? plan.yearly : plan.monthly;
            const isCurrent = user?.plan === plan.key;
            return (
              <div key={plan.key} className="glass" style={{ padding: '28px 24px', position: 'relative', display: 'flex', flexDirection: 'column', border: plan.popular ? `1.5px solid var(--green)` : '1px solid var(--border)', boxShadow: plan.popular ? 'var(--glow)' : 'none' }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'var(--green)', color: '#000', padding: '4px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    ⭐ Le plus populaire
                  </div>
                )}
                <p style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: plan.color }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '12px 0 4px' }}>
                  <span style={{ fontSize: 40, fontWeight: 800, fontFamily: 'Syne' }}>{pricing.price}€</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>/mois</span>
                </div>
                {yearly && 'total' in pricing && (
                  <p style={{ fontSize: 12, color: 'var(--green)', marginBottom: 4 }}>Facturé {pricing.total} · Économie 20%</p>
                )}
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{plan.limit}</p>
                <ul style={{ listStyle: 'none', flex: 1, display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: 13, display: 'flex', gap: 8 }}>
                      <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => upgrade(pricing.key)} disabled={loading === pricing.key || isCurrent}
                  style={{ width: '100%', padding: '12px', border: `1px solid ${plan.color}`, borderRadius: 9, fontFamily: 'Inter', fontSize: 14, fontWeight: 600, cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? 'var(--bg3)' : plan.popular ? 'var(--green)' : 'transparent',
                    color: isCurrent ? 'var(--muted)' : plan.popular ? '#000' : plan.color, transition: 'all .2s', opacity: loading === pricing.key ? .6 : 1 }}>
                  {loading === pricing.key ? 'Chargement...' : isCurrent ? '✓ Plan actuel' : `Choisir ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          Paiement sécurisé par Stripe · Annulation à tout moment
        </p>
      </div>
    </div>
  );
}
