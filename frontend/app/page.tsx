'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)' }}/>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18 }}>JobSmart AI</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" className="btn btn-ghost">Se connecter</Link>
          <Link href="/register" className="btn btn-primary">Commencer gratuit →</Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 40px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--green-gl)', border: '1px solid rgba(0,214,143,0.2)', borderRadius: 20, padding: '6px 16px', marginBottom: 32 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }}/>
          <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>Propulsé par Groq LLaMA 3.3 · 6 agents IA</span>
        </div>

        <h1 style={{ fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.1, marginBottom: 24, maxWidth: 800 }}>
          Ton <span className="gradient-text">Career AI</span><br/>qui postule à ta place
        </h1>

        <p style={{ fontSize: 18, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.7, marginBottom: 48 }}>
          Upload ton CV. L'IA analyse ton profil, trouve les offres compatibles en Tunisie, France et partout dans le monde, génère les lettres et envoie les candidatures automatiquement.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          <Link href="/register" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 15 }}>
            Commencer gratuitement
          </Link>
          <Link href="/login" className="btn" style={{ padding: '14px 32px', fontSize: 15 }}>
            Voir la démo
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { n: '6', label: 'Agents IA actifs' },
            { n: '10k+', label: 'Offres analysées/mois' },
            { n: '92%', label: 'Score matching moyen' },
            { n: '3 min', label: 'Pour postuler' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Syne' }} className="gradient-text">{s.n}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontSize: 36, textAlign: 'center', marginBottom: 48 }}>
          6 Agents IA qui travaillent <span className="gradient-text">pour toi</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {[
            { icon: '📄', name: 'Resume Agent', desc: 'Analyse ton CV, calcule ton score ATS, détecte les compétences manquantes et suggère des améliorations.' },
            { icon: '🔍', name: 'Hunter Agent', desc: 'Cherche les offres sur Indeed, LinkedIn, Keejob et 20+ plateformes selon ton pays et ton profil.' },
            { icon: '✉️', name: 'Apply Agent', desc: 'Génère une lettre personnalisée pour chaque entreprise et envoie ta candidature avec CV joint automatiquement.' },
            { icon: '🎤', name: 'Interview Agent', desc: 'Simule des entretiens techniques et RH, analyse tes réponses et te donne un score de confiance.' },
            { icon: '🗺️', name: 'Coach Agent', desc: 'Génère ton plan de carrière personnalisé, suggère des certifications et technologies à apprendre.' },
            { icon: '📊', name: 'Analytics Agent', desc: 'Suit tes KPIs, taux de réponse, score moyen par plateforme et génère des insights hebdomadaires.' },
          ].map(f => (
            <div key={f.name} className="glass glass-hover" style={{ padding: '24px' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--green)' }}>{f.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', padding: '80px 40px', borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 36, marginBottom: 16 }}>Prêt à automatiser ta recherche ?</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 32 }}>1 candidature gratuite sans carte bancaire.</p>
        <Link href="/register" className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 16 }}>
          Créer mon compte gratuit →
        </Link>
      </div>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: 12 }}>
        <span>© 2026 JobSmart AI</span>
        <span>Propulsé par Groq · JSearch · MongoDB</span>
      </footer>
    </main>
  );
}
