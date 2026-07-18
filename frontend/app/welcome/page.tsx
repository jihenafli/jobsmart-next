'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';

export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading]);
  if (loading || !user) return null;

  const cards = [
    { id:'jobs', icon:'🔍', title:'Chercher des offres', desc:'L\'IA analyse ton CV, trouve les offres compatibles dans ton pays et envoie les candidatures automatiquement avec lettre + CV joint.', features:['Hunter Agent actif','Score matching IA','Lettre + CV auto'], color:'var(--green)', bg:'var(--green-gl)', border:'rgba(0,214,143,0.3)', action:()=>router.push('/dashboard'), label:'Lancer la recherche →', primary:true },
    { id:'cv', icon:'📊', title:'Améliorer mon score ATS', desc:'Analyse ton CV avec le scanner IA, obtiens ton score ATS /100, les mots-clés manquants et des recommandations concrètes.', features:['Score ATS /100','Mots-clés manquants','Chat IA personnalisé'], color:'var(--blue)', bg:'rgba(79,142,247,0.08)', border:'rgba(79,142,247,0.3)', action:()=>router.push('/cv'), label:'Scanner mon CV →', primary:false },
    { id:'interview', icon:'🎤', title:'Préparer mon entretien', desc:'Simule des entretiens RH et techniques, reçois un feedback IA instantané et améliore ton score de confiance.', features:['Mock interviews IA','Feedback instantané','Score de confiance'], color:'var(--purple)', bg:'rgba(139,92,246,0.08)', border:'rgba(139,92,246,0.3)', action:()=>router.push('/interview'), label:'Commencer l\'entraînement →', primary:false },
    {
        id:'creation-cv',
        icon:'📄',
        title:'Créer un CV ATS avec IA',
        desc:'Génère un CV professionnel optimisé pour les systèmes ATS grâce à l’intelligence artificielle. Analyse automatique, mots-clés et design moderne.',
        
        features:[
          'Optimisation ATS automatique',
          'Analyse des mots-clés',
          'CV professionnel moderne',
          'Suggestions IA en temps réel',
          'Score ATS intelligent'
        ],
      
        color:'var(--blue)',
        bg:'rgba(59,130,246,0.08)',
        border:'rgba(59,130,246,0.3)',
      
        action:()=>router.push('/cv-builder'),
      
        label:'Créer mon CV IA →',
      
        primary:true
      }
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      <nav style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)' }}/>
          <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:16 }}>JobSmart AI</span>
        </div>
        <span style={{ fontSize:13, color:'var(--muted)' }}>Bonjour {user.name} 👋</span>
      </nav>

      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--green-gl)', border:'1px solid rgba(0,214,143,.2)', borderRadius:20, padding:'6px 16px', marginBottom:20 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)' }}/>
            <span style={{ fontSize:12, color:'var(--green)', fontWeight:500 }}>6 agents IA prêts</span>
          </div>
          <h1 style={{ fontSize:'clamp(28px,5vw,44px)', lineHeight:1.1, marginBottom:12 }}>
            Que veux-tu faire <span className="gradient-text">aujourd'hui ?</span>
          </h1>
          <p style={{ color:'var(--muted)', fontSize:14 }}>Choisis ton objectif — l'IA s'occupe du reste.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:20, maxWidth:940, width:'100%' }}>
          {cards.map(card=>(
            <div key={card.id}
              style={{ background:'var(--bg2)', border:`1.5px solid ${card.border}`, borderRadius:16, padding:28, cursor:'pointer', transition:'all .25s', position:'relative', overflow:'hidden' }}
              onMouseOver={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateY(-4px)';el.style.boxShadow=`0 16px 40px ${card.color}22`;}}
              onMouseOut={e=>{const el=e.currentTarget as HTMLElement;el.style.transform='translateY(0)';el.style.boxShadow='none';}}
              onClick={card.action}>
              <div style={{ position:'absolute', top:-40, right:-40, width:100, height:100, borderRadius:'50%', background:card.bg, filter:'blur(35px)', pointerEvents:'none' }}/>
              <div style={{ position:'relative' }}>
                <div style={{ width:52, height:52, borderRadius:14, background:card.bg, border:`1px solid ${card.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:16 }}>{card.icon}</div>
                <h2 style={{ fontSize:19, marginBottom:8, color:card.color }}>{card.title}</h2>
                <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7, marginBottom:18 }}>{card.desc}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:22 }}>
                  {card.features.map(f=>(
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                      <span style={{ color:card.color, fontWeight:700 }}>✓</span>
                      <span style={{ color:'var(--muted)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button style={{ width:'100%', padding:'11px', border:`1px solid ${card.color}`, borderRadius:9, fontFamily:'Inter', fontSize:13, fontWeight:600, cursor:'pointer', background:card.primary?card.color:'transparent', color:card.primary?'#000':card.color, transition:'all .2s' }}>
                  {card.label}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:24, marginTop:32 }}>
          <Link href="/pricing" style={{ fontSize:13, color:'var(--muted)', textDecoration:'none' }}>💎 Forfaits</Link>
          <Link href="/dashboard" style={{ fontSize:13, color:'var(--muted)', textDecoration:'none' }}>📋 Candidatures</Link>
        </div>
      </div>
    </div>
  );
}
