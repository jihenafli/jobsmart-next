

'use client';
// ─────────────────────────────────────────────────────────────────────────────
// FICHIER : app/interview/page.tsx
// CORRECTION CORS : appelle /api/interview/* (serveur) au lieu d'Anthropic direct
// CORRECTION BUILD : useSearchParams() enveloppé dans un <Suspense>
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Phase = 'home' | 'setup' | 'session' | 'result';
type QType = 'hr' | 'technical' | 'behavioral' | 'situational';

interface Question {
  id: number; type: QType; question: string;
  hint: string; difficulty: 'easy' | 'medium' | 'hard'; category?: string;
}
interface Answer {
  question: Question; answer: string; score: number;
  feedback: string; strengths: string[]; improvements: string[];
  betterAnswer: string; timeSpent: number;
}

const TYPE_CFG: Record<QType, { label: string; color: string; bg: string; icon: string }> = {
  hr:          { label:'RH',             color:'#00d68f', bg:'rgba(0,214,143,.08)',  icon:'🤝' },
  technical:   { label:'Technique',      color:'#4f8ef7', bg:'rgba(79,142,247,.08)', icon:'💻' },
  behavioral:  { label:'Comportemental', color:'#f59e0b', bg:'rgba(245,158,11,.08)', icon:'🧠' },
  situational: { label:'Situationnel',   color:'#8b5cf6', bg:'rgba(139,92,246,.08)', icon:'🎯' },
};

const INTERVIEW_TYPES = [
  { id:'mixed',      icon:'🎯', title:'Entretien complet',    desc:'RH + Technique + Comportemental', color:'#00d68f' },
  { id:'hr',         icon:'🤝', title:'Entretien RH',         desc:'Motivation, soft skills, parcours', color:'#4f8ef7' },
  { id:'technical',  icon:'💻', title:'Technique approfondi', desc:'Stack, projets, architecture',      color:'#8b5cf6' },
  { id:'behavioral', icon:'🧠', title:'Comportemental STAR',  desc:'Situations réelles, méthode STAR',  color:'#f59e0b' },
];

function ScoreArc({ score }: { score: number }) {
  const color = score >= 80 ? '#00d68f' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 85 ? 'Excellent !' : score >= 70 ? 'Bien joué' : score >= 55 ? 'Assez bien' : 'À améliorer';
  const circ  = 2 * Math.PI * 56;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r="56" fill="none" stroke="var(--bg3)" strokeWidth="10"/>
        <circle cx="66" cy="66" r="56" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
          style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dasharray 1.5s ease' }}/>
        <text x="66" y="61" textAnchor="middle" style={{ fill:color, fontSize:30, fontWeight:800, fontFamily:'Syne' }}>{score}</text>
        <text x="66" y="77" textAnchor="middle" style={{ fill:'#7a8499', fontSize:11 }}>/ 100</text>
      </svg>
      <span style={{ fontSize:13, fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}44`, padding:'5px 16px', borderRadius:20 }}>{label}</span>
    </div>
  );
}

function InterviewCoachContent() {
  const searchParams   = useSearchParams();
  const cvTitle        = searchParams.get('title') || '';
  const cvSkills       = searchParams.get('skills') || '';
  const fromCV         = searchParams.get('from') === 'cv';

  const [phase,        setPhase]        = useState<Phase>('home');
  const [interviewType,setInterviewType]= useState('mixed');
  const [jobTitle,     setJobTitle]     = useState(cvTitle);
  const [company,      setCompany]      = useState('');
  const [cvDescription,setCvDescription]= useState(cvSkills ? `Compétences : ${cvSkills}` : '');
  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [currentQ,     setCurrentQ]     = useState(0);
  const [answer,       setAnswer]       = useState('');
  const [answers,      setAnswers]      = useState<Answer[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [evaluating,   setEvaluating]   = useState(false);
  const [currentEval,  setCurrentEval]  = useState<Partial<Answer>|null>(null);
  const [timeLeft,     setTimeLeft]     = useState(120);
  const [timerActive,  setTimerActive]  = useState(false);
  const [showHint,     setShowHint]     = useState(false);
  const [finalScore,   setFinalScore]   = useState(0);
  const [activeTab,    setActiveTab]    = useState<'practice'|'tips'|'prep'>('practice');
  const [startTime,    setStartTime]    = useState(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textRef   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (timerActive && timeLeft > 0) timerRef.current = setTimeout(() => setTimeLeft(t => t-1), 1000);
    else if (timeLeft === 0) setTimerActive(false);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timerActive, timeLeft]);

  // ── GENERATE QUESTIONS via API route ─────────────────────────────────────
  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/interview/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle, company, skills: cvSkills || cvDescription,
          interviewType, cvDescription,
        }),
      });
      const data = await res.json();
      const qs: Question[] = (res.ok && data.questions?.length)
        ? data.questions
        : getFallback(interviewType);

      setQuestions(qs);
      setCurrentQ(0); setAnswers([]); setAnswer('');
      setTimeLeft(120); setTimerActive(false); setShowHint(false); setCurrentEval(null);
      setStartTime(Date.now());
      setPhase('session');
    } catch {
      setQuestions(getFallback(interviewType));
      setPhase('session');
    } finally {
      setLoading(false);
    }
  };

  const getFallback = (type: string): Question[] => {
    const all: Question[] = [
      { id:1, type:'hr',          question:'Parlez-moi de vous et de votre parcours.',                                                      hint:'Structure : Formation → Expériences clés → Objectif. Max 2 min.',             difficulty:'easy',   category:'Présentation' },
      { id:2, type:'hr',          question:`Pourquoi voulez-vous ce poste${jobTitle?` de ${jobTitle}`:''}?`,                                 hint:'Montre tes recherches sur l\'entreprise. Cite des projets ou valeurs.',        difficulty:'easy',   category:'Motivation'   },
      { id:3, type:'behavioral',  question:'Décrivez une situation où vous avez résolu un conflit dans une équipe.',                          hint:'STAR : Situation → Tâche → Action → Résultat mesurable.',                    difficulty:'medium', category:'Conflit'      },
      { id:4, type:'technical',   question:`Quels sont tes 2 projets techniques les plus marquants${cvSkills?` (en rapport avec ${cvSkills.split(',').slice(0,2).join(', ')})`:''}?`, hint:'Technologies, ton rôle, résultats mesurables.', difficulty:'medium', category:'Projets' },
      { id:5, type:'situational', question:'Un bug critique est découvert en prod 2h avant une démo client. Que fais-tu ?',                   hint:'Montre : priorisation, communication, résolution.',                           difficulty:'hard',   category:'Crise'        },
      { id:6, type:'behavioral',  question:'Parlez d\'un échec professionnel et ce que vous en avez appris.',                                 hint:'Sois honnête, montre ta capacité de recul et d\'apprentissage.',              difficulty:'medium', category:'Résilience'   },
    ];
    if (type === 'hr')        return all.filter(q => q.type==='hr'||q.type==='behavioral').slice(0,5);
    if (type === 'technical') return all.filter(q => q.type==='technical'||q.type==='situational').slice(0,5);
    if (type === 'behavioral')return all.filter(q => q.type==='behavioral'||q.type==='situational').slice(0,5);
    return all.slice(0,6);
  };

  // ── EVALUATE via API route ────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!answer.trim() || evaluating) return;
    setEvaluating(true);
    setTimerActive(false);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question:     questions[currentQ].question,
          answer,
          questionType: questions[currentQ].type,
          difficulty:   questions[currentQ].difficulty,
          skills:       cvSkills || cvDescription,
          jobTitle,
        }),
      });

      const data = await res.json();

      if (res.ok && data.score) {
        setCurrentEval({ question: questions[currentQ], answer, timeSpent, ...data });
      } else {
        throw new Error('Évaluation échouée');
      }
    } catch {
      // Fallback basé sur la longueur de la réponse
      const words = answer.split(' ').filter(Boolean).length;
      setCurrentEval({
        question: questions[currentQ], answer, timeSpent,
        score:        words > 60 ? 72 : words > 30 ? 58 : 42,
        feedback:     words > 60
          ? 'Réponse développée. Enrichis avec des chiffres concrets et la méthode STAR.'
          : words > 30
          ? 'Réponse correcte mais trop courte. Développe avec un exemple précis.'
          : 'Réponse insuffisante. Développe davantage avec des exemples concrets.',
        strengths:    words > 40 ? ['Tu as répondu à la question posée', 'Réponse structurée'] : ['Tu as tenté de répondre'],
        improvements: ['Ajoute des chiffres concrets (ex: -40% de temps, équipe de 5 pers.)', 'Structure avec STAR : Situation → Tâche → Action → Résultat'],
        betterAnswer: `Pour cette question, une réponse excellente utiliserait la méthode STAR avec des métriques précises. Exemple : "Dans mon expérience chez [Entreprise], j'ai rencontré [situation précise]. Ma responsabilité était de [tâche]. J'ai décidé de [actions concrètes], ce qui a permis d'obtenir [résultat chiffré]."`,
      });
    } finally {
      setEvaluating(false);
    }
  };

  const nextQuestion = () => {
    if (currentEval) setAnswers(prev => [...prev, currentEval as Answer]);
    if (currentQ < questions.length - 1) {
      setCurrentQ(q => q+1);
      setAnswer(''); setCurrentEval(null); setShowHint(false);
      setTimeLeft(120); setTimerActive(false); setStartTime(Date.now());
      textRef.current?.focus();
    } else {
      const all = [...answers, ...(currentEval ? [currentEval as Answer] : [])];
      setFinalScore(Math.round(all.reduce((s,a) => s+(a.score||70), 0) / (all.length||1)));
      setAnswers(all);
      setPhase('result');
    }
  };

  const q = questions[currentQ];
  const mm = Math.floor(timeLeft/60);
  const ss = (timeLeft%60).toString().padStart(2,'0');

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        .fu   { animation: fadeUp .3s ease forwards; }
        .spin { animation: spin 1s linear infinite; display:inline-block; }
        .pulse{ animation: pulse 1.5s ease infinite; }
        textarea, input { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px 14px; color:var(--text); font-size:14px; width:100%; outline:none; font-family:inherit; transition:border-color .15s; }
        textarea:focus, input:focus { border-color:#8b5cf6; }
        .btn  { padding:9px 18px; border-radius:10px; border:1px solid var(--border); background:transparent; color:var(--text); cursor:pointer; font-size:13px; font-weight:500; transition:all .2s; font-family:inherit; }
        .btn:hover { background:var(--bg3); }
        .btn-g  { background:var(--green); border-color:var(--green); color:#000; font-weight:700; }
        .btn-g:hover { opacity:.9; }
        .btn-g:disabled { opacity:.5; cursor:not-allowed; }
        .glass  { background:var(--bg2); border:1px solid var(--border); border-radius:14px; }
        .tag    { font-size:10px; padding:2px 8px; border-radius:10px; font-weight:600; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#8b5cf6', boxShadow:'0 0 8px #8b5cf6' }}/>
          <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:16 }}>Interview Coach <span style={{ color:'#8b5cf6' }}>IA</span></span>
          {fromCV && cvTitle && (
            <span style={{ fontSize:11, background:'rgba(139,92,246,.15)', color:'#8b5cf6', border:'1px solid rgba(139,92,246,.3)', borderRadius:20, padding:'2px 10px' }}>
              📄 {cvTitle}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link href="/welcome"   className="btn" style={{ fontSize:12, padding:'5px 14px' }}>← Accueil</Link>
          <Link href="/cv"        className="btn" style={{ fontSize:12, padding:'5px 14px' }}>📄 Mon CV</Link>
          <Link href="/dashboard" className="btn" style={{ fontSize:12, padding:'5px 14px' }}>🔍 Offres</Link>
        </div>
      </nav>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'32px 20px' }}>

        {/* ══════════════ HOME ══════════════ */}
        {phase === 'home' && (
          <div className="fu">

            {/* Banner CV */}
            {fromCV && cvTitle && (
              <div style={{ background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.3)', borderRadius:12, padding:'16px 20px', marginBottom:28, display:'flex', gap:16, alignItems:'center' }}>
                <span style={{ fontSize:24 }}>🎯</span>
                <div>
                  <p style={{ fontWeight:600, marginBottom:3 }}>Questions personnalisées depuis ton CV</p>
                  <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>
                    Poste : <strong style={{ color:'var(--text)' }}>{cvTitle}</strong>
                    {cvSkills && <> · Compétences : <strong style={{ color:'#8b5cf6' }}>{cvSkills.split(',').slice(0,4).join(', ')}{cvSkills.split(',').length>4?'...':''}</strong></>}
                  </p>
                </div>
              </div>
            )}

            <div style={{ textAlign:'center', marginBottom:36 }}>
              <div style={{ fontSize:52, marginBottom:14 }}>🎤</div>
              <h1 style={{ fontSize:30, marginBottom:8, fontFamily:'Syne' }}>Interview Coach <span style={{ color:'#8b5cf6' }}>IA</span></h1>
              <p style={{ color:'var(--muted)', fontSize:14, maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>
                L'IA génère des questions personnalisées basées sur ton profil, évalue chaque réponse avec un feedback détaillé et une réponse modèle complète.
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:4, marginBottom:28, background:'var(--bg2)', padding:4, borderRadius:10, border:'1px solid var(--border)', width:'fit-content', margin:'0 auto 28px' }}>
              {(['practice','tips','prep'] as const).map(k => (
                <button key={k} onClick={() => setActiveTab(k)}
                  style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:500, transition:'all .2s', background:activeTab===k?'#8b5cf6':'transparent', color:activeTab===k?'#fff':'var(--muted)' }}>
                  {k==='practice'?'🎯 S\'entraîner':k==='tips'?'💡 Conseils':'📋 Préparation'}
                </button>
              ))}
            </div>

            {/* TAB: PRACTICE */}
            {activeTab === 'practice' && (
              <div className="fu">
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:12, marginBottom:22 }}>
                  {INTERVIEW_TYPES.map(t => (
                    <div key={t.id} onClick={() => setInterviewType(t.id)}
                      style={{ border:`1.5px solid ${interviewType===t.id?t.color:'var(--border)'}`, borderRadius:12, padding:'16px 14px', cursor:'pointer', background:interviewType===t.id?`${t.color}10`:'var(--bg3)', transition:'all .2s' }}>
                      <div style={{ fontSize:26, marginBottom:8 }}>{t.icon}</div>
                      <p style={{ fontWeight:600, fontSize:13, color:interviewType===t.id?t.color:'var(--text)', marginBottom:3 }}>{t.title}</p>
                      <p style={{ fontSize:11, color:'var(--muted)' }}>{t.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="glass" style={{ padding:22, marginBottom:20 }}>
                  <p style={{ fontSize:11, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>
                    Personnalise l'entretien <span style={{ color:'#8b5cf6' }}>(recommandé)</span>
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                    <div>
                      <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Poste visé</label>
                      <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="ex: Développeur React Senior..."/>
                    </div>
                    <div>
                      <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Entreprise cible</label>
                      <input value={company} onChange={e => setCompany(e.target.value)} placeholder="ex: Google, Vermeg..."/>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>
                      Ton profil / compétences <span style={{ color:'#8b5cf6' }}>(pour questions ultra-personnalisées)</span>
                    </label>
                    <textarea value={cvDescription} onChange={e => setCvDescription(e.target.value)} rows={3} style={{ resize:'vertical' }}
                      placeholder="Ex: 4 ans React/Node.js, plateforme SaaS 10k users, Docker, AWS, MongoDB..."/>
                  </div>
                </div>

                <div style={{ textAlign:'center' }}>
                  <button className="btn btn-g" onClick={() => setPhase('setup')} style={{ padding:'13px 40px', fontSize:15 }}>
                    🎤 Commencer l'entretien →
                  </button>
                </div>
              </div>
            )}

            {/* TAB: TIPS */}
            {activeTab === 'tips' && (
              <div className="fu" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
                {[
                  { icon:'⏱️', c:'#00d68f', title:'Méthode STAR',      desc:'Situation → Tâche → Action → Résultat. Structure indispensable pour toute question comportementale. Chaque réponse doit finir par un résultat mesurable.' },
                  { icon:'📊', c:'#4f8ef7', title:'Quantifie tout',     desc:'Remplace "j\'ai amélioré les perfs" par "j\'ai réduit le temps de chargement de 8s à 2s, soit -75%". Les chiffres créent la crédibilité.' },
                  { icon:'🎯', c:'#8b5cf6', title:'Sois spécifique',    desc:'Cite des noms de technologies précis, des dates, des tailles d\'équipe. Évite les généralités comme "j\'ai géré un gros projet".' },
                  { icon:'🔄', c:'#f59e0b', title:'Reformule',          desc:'"Si je comprends bien, vous me demandez..." — Ça montre ton écoute, te donne du temps, et confirme que tu réponds à la bonne question.' },
                  { icon:'🧘', c:'#ef4444', title:'Gère les blancs',     desc:'"Bonne question, laissez-moi réfléchir 2 secondes." Bien vu par les recruteurs — mieux que de bafouiller immédiatement.' },
                  { icon:'❓', c:'#00d68f', title:'Prépare tes questions',desc:'3-5 questions intelligentes : challenges de l\'équipe, stack tech, processus d\'onboarding, évolution à 2 ans, prochaine étape RH.' },
                ].map((tip, i) => (
                  <div key={i} className="glass" style={{ padding:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <span style={{ fontSize:22 }}>{tip.icon}</span>
                      <h3 style={{ fontSize:14, color:tip.c, fontWeight:700 }}>{tip.title}</h3>
                    </div>
                    <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7 }}>{tip.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: PREP */}
            {activeTab === 'prep' && (
              <div className="fu" style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {[
                  { title:'📚 Avant l\'entretien', items:['Recherche l\'entreprise : news récentes, culture, concurrents, valeurs','Note 3 projets avec métriques (réduction X%, équipe N personnes, impact business)','Prépare 5 questions à poser au recruteur','Relis la fiche de poste et identifie les mots-clés importants','Liste tes forces ET faiblesses avec exemples concrets'] },
                  { title:'🎯 Pendant l\'entretien', items:['Arrive / connecte-toi 5 min en avance','Écoute la question COMPLÈTE avant de répondre','Parle lentement, structuré, avec des pauses','Reformule si une question est floue ou ambiguë','Prends des notes si possible'] },
                  { title:'📊 Structure STAR détaillée', items:['S → Situation : "Dans mon poste chez X, nous faisions face à..."','T → Tâche : "Ma responsabilité était de... dans ce contexte"','A → Action : "J\'ai décidé de... en faisant concrètement... étape par étape"','R → Résultat : "En résultat, nous avons obtenu +X%, -Y jours, N clients..."','Bonus : "Et j\'en ai appris que..."'] },
                  { title:'❓ Questions à poser au recruteur', items:['Quels sont les principaux challenges techniques de ce poste ?','Comment se passe l\'onboarding des nouveaux développeurs ?','Comment les décisions techniques sont-elles prises dans l\'équipe ?','Quelles sont les opportunités d\'évolution à 2 ans ?','Quelle est la prochaine étape du processus de recrutement ?'] },
                ].map((section, i) => (
                  <div key={i} className="glass" style={{ padding:20 }}>
                    <h3 style={{ fontSize:15, marginBottom:14 }}>{section.title}</h3>
                    <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
                      {section.items.map((item, j) => (
                        <li key={j} style={{ display:'flex', gap:10, fontSize:13 }}>
                          <span style={{ color:'var(--green)', flexShrink:0 }}>✓</span>
                          <span style={{ color:'var(--muted)', lineHeight:1.6 }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ SETUP ══════════════ */}
        {phase === 'setup' && (
          <div className="glass fu" style={{ padding:36, maxWidth:520, margin:'0 auto', textAlign:'center' }}>
            <div style={{ fontSize:44, marginBottom:16 }}>🤖</div>
            <h2 style={{ fontSize:22, marginBottom:8 }}>L'IA prépare tes questions</h2>
            <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.7, marginBottom:20 }}>
              Type : <strong style={{ color:'var(--text)' }}>{INTERVIEW_TYPES.find(t=>t.id===interviewType)?.title}</strong>
              {jobTitle && <><br/>Poste : <strong style={{ color:'#8b5cf6' }}>{jobTitle}</strong></>}
              {company && <> chez <strong>{company}</strong></>}
            </p>
            <div style={{ background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.2)', borderRadius:10, padding:'14px 18px', marginBottom:24, textAlign:'left' }}>
              <p style={{ fontSize:12, color:'#8b5cf6', fontWeight:700, marginBottom:10 }}>🧠 Ce que l'IA fait :</p>
              {['Analyse ton profil et tes compétences exactes','Génère des questions ciblées sur ta stack','Adapte la difficulté à ton niveau','Évalue chaque réponse avec une réponse modèle complète'].map((item,i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:12 }}>
                  <span style={{ color:'#8b5cf6' }}>→</span>
                  <span style={{ color:'var(--muted)' }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <button className="btn" onClick={() => setPhase('home')}>← Retour</button>
              <button className="btn btn-g" onClick={startInterview} disabled={loading} style={{ padding:'11px 28px' }}>
                {loading ? <><span className="spin">⟳</span> Génération IA...</> : '🚀 Démarrer →'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════ SESSION ══════════════ */}
        {phase === 'session' && q && (
          <div className="fu">
            {/* Progress */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, color:'var(--muted)' }}>Question {currentQ+1} / {questions.length}</span>
                  {q.category && <span className="tag" style={{ background:'rgba(139,92,246,.12)', color:'#8b5cf6', border:'1px solid rgba(139,92,246,.25)' }}>{q.category}</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg3)', border:`1px solid ${timeLeft<30?'rgba(239,68,68,.4)':'var(--border)'}`, borderRadius:20, padding:'5px 14px' }}>
                    <span style={{ fontSize:11, color:timeLeft<30?'#ef4444':'var(--muted)' }}>⏱</span>
                    <span style={{ fontSize:13, fontWeight:700, color:timeLeft<30?'#ef4444':'var(--text)', fontFamily:'monospace' }}>{mm}:{ss}</span>
                    {timerActive && timeLeft < 30 && <span className="pulse" style={{ fontSize:10, color:'#ef4444' }}>!</span>}
                  </div>
                  {!timerActive && !currentEval && (
                    <button onClick={() => { setTimerActive(true); setStartTime(Date.now()); }} className="btn" style={{ fontSize:11, padding:'5px 12px' }}>▶ Timer</button>
                  )}
                </div>
              </div>
              <div style={{ height:4, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${((currentQ+1)/questions.length)*100}%`, background:'linear-gradient(90deg,#8b5cf6,#4f8ef7)', borderRadius:2, transition:'width .5s' }}/>
              </div>
              <div style={{ display:'flex', gap:6, marginTop:8, justifyContent:'center' }}>
                {questions.map((_,i) => (
                  <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:i<currentQ?'var(--green)':i===currentQ?'#8b5cf6':'var(--bg3)', transition:'all .3s' }}/>
                ))}
              </div>
            </div>

            {/* Question card */}
            <div className="glass" style={{ padding:24, marginBottom:16, border:'1px solid rgba(139,92,246,.2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontSize:20 }}>{TYPE_CFG[q.type]?.icon}</span>
                <span className="tag" style={{ background:TYPE_CFG[q.type]?.bg, color:TYPE_CFG[q.type]?.color, border:`1px solid ${TYPE_CFG[q.type]?.color}44` }}>{TYPE_CFG[q.type]?.label}</span>
                <span className="tag" style={{ background:q.difficulty==='easy'?'rgba(0,214,143,.1)':q.difficulty==='medium'?'rgba(245,158,11,.1)':'rgba(239,68,68,.1)', color:q.difficulty==='easy'?'#00d68f':q.difficulty==='medium'?'#f59e0b':'#ef4444', border:'none' }}>
                  {q.difficulty==='easy'?'Facile':q.difficulty==='medium'?'Moyen':'Difficile'}
                </span>
              </div>
              <p style={{ fontSize:17, fontWeight:600, lineHeight:1.55, marginBottom:16 }}>{q.question}</p>
              <button onClick={() => setShowHint(!showHint)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5, padding:0 }}>
                💡 {showHint?'Cacher':'Voir'} l'indice
              </button>
              {showHint && (
                <div style={{ marginTop:10, padding:'12px 14px', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, fontSize:13, color:'#f59e0b', lineHeight:1.6 }}>
                  {q.hint}
                </div>
              )}
            </div>

            {/* Answer / Evaluation */}
            {!currentEval ? (
              <div className="glass" style={{ padding:20, marginBottom:16 }}>
                <label style={{ fontSize:11, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:10 }}>Ta réponse</label>
                <textarea ref={textRef} value={answer} onChange={e => setAnswer(e.target.value)} rows={6}
                  placeholder="Rédige ta réponse ici... Utilise des exemples concrets, des chiffres, et structure avec STAR si possible."
                  style={{ resize:'vertical', lineHeight:1.7 }}
                  onKeyDown={e => { if(e.key==='Enter'&&e.ctrlKey) submitAnswer(); }}/>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
                  <span style={{ fontSize:11, color:'var(--muted)' }}>
                    {answer.split(' ').filter(Boolean).length} mots · Ctrl+Enter pour valider
                  </span>
                  <button className="btn btn-g" onClick={submitAnswer} disabled={!answer.trim()||evaluating}
                    style={{ padding:'9px 22px', display:'flex', alignItems:'center', gap:8 }}>
                    {evaluating ? <><span className="spin">⟳</span> Évaluation IA...</> : '🤖 Évaluer ma réponse →'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="fu" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {/* Score */}
                <div className="glass" style={{ padding:20, border:`1px solid ${(currentEval.score||0)>=80?'rgba(0,214,143,.3)':(currentEval.score||0)>=60?'rgba(245,158,11,.3)':'rgba(239,68,68,.3)'}`, display:'flex', gap:18, alignItems:'flex-start' }}>
                  <div style={{ width:60, height:60, borderRadius:'50%', flexShrink:0,
                    background:`${(currentEval.score||0)>=80?'#00d68f':(currentEval.score||0)>=60?'#f59e0b':'#ef4444'}18`,
                    border:`2px solid ${(currentEval.score||0)>=80?'#00d68f':(currentEval.score||0)>=60?'#f59e0b':'#ef4444'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:800, fontSize:18,
                    color:(currentEval.score||0)>=80?'#00d68f':(currentEval.score||0)>=60?'#f59e0b':'#ef4444' }}>
                    {currentEval.score}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>Feedback IA</p>
                    <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>{currentEval.feedback}</p>
                    {currentEval.timeSpent && <p style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>⏱ {currentEval.timeSpent}s de réflexion</p>}
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {(currentEval.strengths?.length||0) > 0 && (
                    <div className="glass" style={{ padding:16 }}>
                      <p style={{ fontSize:11, color:'#00d68f', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>💪 Points forts</p>
                      {currentEval.strengths?.map((s,i) => (
                        <div key={i} style={{ display:'flex', gap:8, fontSize:12, marginBottom:7 }}>
                          <span style={{ color:'#00d68f', flexShrink:0 }}>✓</span>
                          <span style={{ color:'var(--muted)', lineHeight:1.6 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(currentEval.improvements?.length||0) > 0 && (
                    <div className="glass" style={{ padding:16 }}>
                      <p style={{ fontSize:11, color:'#f59e0b', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>🔧 À améliorer</p>
                      {currentEval.improvements?.map((s,i) => (
                        <div key={i} style={{ display:'flex', gap:8, fontSize:12, marginBottom:7 }}>
                          <span style={{ color:'#f59e0b', flexShrink:0 }}>→</span>
                          <span style={{ color:'var(--muted)', lineHeight:1.6 }}>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Better answer - la partie la plus importante */}
                {currentEval.betterAnswer && (
                  <div className="glass" style={{ padding:20, border:'1px solid rgba(79,142,247,.25)', background:'rgba(79,142,247,.06)' }}>
                    <p style={{ fontSize:11, color:'#4f8ef7', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>✨ Réponse modèle — apprends et adapte</p>
                    <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.8, fontStyle:'italic', borderLeft:'3px solid #4f8ef7', paddingLeft:14 }}>
                      "{currentEval.betterAnswer}"
                    </p>
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button className="btn btn-g" onClick={nextQuestion} style={{ padding:'11px 28px', fontSize:14 }}>
                    {currentQ < questions.length-1 ? 'Question suivante →' : 'Voir mon résultat final →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ RESULT ══════════════ */}
        {phase === 'result' && (
          <div className="fu">
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <h1 style={{ fontSize:28, marginBottom:6, fontFamily:'Syne' }}>Entretien terminé ! 🎉</h1>
              <p style={{ color:'var(--muted)', fontSize:14 }}>Score global et recommandations personnalisées</p>
            </div>

            <div className="glass" style={{ padding:32, textAlign:'center', marginBottom:24, border:`1px solid ${finalScore>=80?'rgba(0,214,143,.3)':finalScore>=60?'rgba(245,158,11,.3)':'rgba(239,68,68,.3)'}` }}>
              <ScoreArc score={finalScore}/>
              <p style={{ fontSize:14, color:'var(--muted)', marginTop:16, lineHeight:1.6 }}>
                {finalScore>=85?'🎉 Excellent ! Niveau de préparation remarquable. Continue à pratiquer pour maintenir ce niveau.':
                 finalScore>=70?'👍 Bien joué ! Peaufine les points d\'amélioration ci-dessous pour être imbattable.':
                 finalScore>=55?'💪 Bon début ! Focalise-toi sur la méthode STAR et les métriques chiffrées.':
                 '📚 Continue l\'entraînement régulièrement — la progression est rapide avec de la pratique quotidienne.'}
              </p>
              <div style={{ display:'flex', gap:24, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
                {[
                  { n:answers.filter(a=>a.score>=80).length, label:'Excellentes', color:'#00d68f' },
                  { n:answers.filter(a=>a.score>=60&&a.score<80).length, label:'Bonnes', color:'#f59e0b' },
                  { n:answers.filter(a=>a.score<60).length, label:'À améliorer', color:'#ef4444' },
                ].map(({ n, label, color }, i) => (
                  <div key={i} style={{ textAlign:'center' }}>
                    <p style={{ fontSize:26, fontWeight:800, color, margin:0 }}>{n}</p>
                    <p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>Analyse détaillée</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
              {answers.map((a,i) => (
                <div key={i} className="glass" style={{ padding:'16px 20px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:'50%', flexShrink:0,
                      background:`${a.score>=80?'#00d68f':a.score>=60?'#f59e0b':'#ef4444'}18`,
                      border:`2px solid ${a.score>=80?'#00d68f':a.score>=60?'#f59e0b':'#ef4444'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:800, fontSize:14,
                      color:a.score>=80?'#00d68f':a.score>=60?'#f59e0b':'#ef4444' }}>
                      {a.score}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', gap:8, marginBottom:4, flexWrap:'wrap', alignItems:'center' }}>
                        <span className="tag" style={{ background:TYPE_CFG[a.question?.type]?.bg, color:TYPE_CFG[a.question?.type]?.color }}>{TYPE_CFG[a.question?.type]?.icon} {TYPE_CFG[a.question?.type]?.label}</span>
                        {a.question?.category && <span style={{ fontSize:11, color:'var(--muted)' }}>{a.question.category}</span>}
                      </div>
                      <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Q{i+1}: {a.question?.question?.slice(0,90)}{(a.question?.question?.length||0)>90?'...':''}</p>
                      <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{a.feedback}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-g" onClick={() => { setPhase('home'); setAnswers([]); setCurrentQ(0); setAnswer(''); setCurrentEval(null); }} style={{ padding:'11px 22px' }}>
                🔄 Recommencer
              </button>
              <Link href="/cv"        className="btn" style={{ padding:'11px 22px' }}>📄 Améliorer mon CV</Link>
              <Link href="/dashboard" className="btn" style={{ padding:'11px 22px' }}>🔍 Chercher des offres</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper obligatoire : useSearchParams() doit être enveloppé dans <Suspense>
// pour permettre le pré-rendu statique (next build / next export).
export default function InterviewCoach() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', color:'var(--muted)' }}>
        Chargement...
      </div>
    }>
      <InterviewCoachContent />
    </Suspense>
  );
}









// 'use client';
// // ─────────────────────────────────────────────────────────────────────────────
// // FICHIER : app/interview/page.tsx
// // CORRECTION CORS : appelle /api/interview/* (serveur) au lieu d'Anthropic direct
// // ─────────────────────────────────────────────────────────────────────────────

// import { useState, useRef, useEffect } from 'react';
// import Link from 'next/link';
// import { useSearchParams } from 'next/navigation';

// type Phase = 'home' | 'setup' | 'session' | 'result';
// type QType = 'hr' | 'technical' | 'behavioral' | 'situational';

// interface Question {
//   id: number; type: QType; question: string;
//   hint: string; difficulty: 'easy' | 'medium' | 'hard'; category?: string;
// }
// interface Answer {
//   question: Question; answer: string; score: number;
//   feedback: string; strengths: string[]; improvements: string[];
//   betterAnswer: string; timeSpent: number;
// }

// const TYPE_CFG: Record<QType, { label: string; color: string; bg: string; icon: string }> = {
//   hr:          { label:'RH',             color:'#00d68f', bg:'rgba(0,214,143,.08)',  icon:'🤝' },
//   technical:   { label:'Technique',      color:'#4f8ef7', bg:'rgba(79,142,247,.08)', icon:'💻' },
//   behavioral:  { label:'Comportemental', color:'#f59e0b', bg:'rgba(245,158,11,.08)', icon:'🧠' },
//   situational: { label:'Situationnel',   color:'#8b5cf6', bg:'rgba(139,92,246,.08)', icon:'🎯' },
// };

// const INTERVIEW_TYPES = [
//   { id:'mixed',      icon:'🎯', title:'Entretien complet',    desc:'RH + Technique + Comportemental', color:'#00d68f' },
//   { id:'hr',         icon:'🤝', title:'Entretien RH',         desc:'Motivation, soft skills, parcours', color:'#4f8ef7' },
//   { id:'technical',  icon:'💻', title:'Technique approfondi', desc:'Stack, projets, architecture',      color:'#8b5cf6' },
//   { id:'behavioral', icon:'🧠', title:'Comportemental STAR',  desc:'Situations réelles, méthode STAR',  color:'#f59e0b' },
// ];

// function ScoreArc({ score }: { score: number }) {
//   const color = score >= 80 ? '#00d68f' : score >= 60 ? '#f59e0b' : '#ef4444';
//   const label = score >= 85 ? 'Excellent !' : score >= 70 ? 'Bien joué' : score >= 55 ? 'Assez bien' : 'À améliorer';
//   const circ  = 2 * Math.PI * 56;
//   return (
//     <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
//       <svg width="132" height="132" viewBox="0 0 132 132">
//         <circle cx="66" cy="66" r="56" fill="none" stroke="var(--bg3)" strokeWidth="10"/>
//         <circle cx="66" cy="66" r="56" fill="none" stroke={color} strokeWidth="10"
//           strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
//           style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dasharray 1.5s ease' }}/>
//         <text x="66" y="61" textAnchor="middle" style={{ fill:color, fontSize:30, fontWeight:800, fontFamily:'Syne' }}>{score}</text>
//         <text x="66" y="77" textAnchor="middle" style={{ fill:'#7a8499', fontSize:11 }}>/ 100</text>
//       </svg>
//       <span style={{ fontSize:13, fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}44`, padding:'5px 16px', borderRadius:20 }}>{label}</span>
//     </div>
//   );
// }

// export default function InterviewCoach() {
//   const searchParams   = useSearchParams();
//   const cvTitle        = searchParams.get('title') || '';
//   const cvSkills       = searchParams.get('skills') || '';
//   const fromCV         = searchParams.get('from') === 'cv';

//   const [phase,        setPhase]        = useState<Phase>('home');
//   const [interviewType,setInterviewType]= useState('mixed');
//   const [jobTitle,     setJobTitle]     = useState(cvTitle);
//   const [company,      setCompany]      = useState('');
//   const [cvDescription,setCvDescription]= useState(cvSkills ? `Compétences : ${cvSkills}` : '');
//   const [questions,    setQuestions]    = useState<Question[]>([]);
//   const [currentQ,     setCurrentQ]     = useState(0);
//   const [answer,       setAnswer]       = useState('');
//   const [answers,      setAnswers]      = useState<Answer[]>([]);
//   const [loading,      setLoading]      = useState(false);
//   const [evaluating,   setEvaluating]   = useState(false);
//   const [currentEval,  setCurrentEval]  = useState<Partial<Answer>|null>(null);
//   const [timeLeft,     setTimeLeft]     = useState(120);
//   const [timerActive,  setTimerActive]  = useState(false);
//   const [showHint,     setShowHint]     = useState(false);
//   const [finalScore,   setFinalScore]   = useState(0);
//   const [activeTab,    setActiveTab]    = useState<'practice'|'tips'|'prep'>('practice');
//   const [startTime,    setStartTime]    = useState(Date.now());
//   // const timerRef  = useRef<NodeJS.Timeout>();
//   const timerRef = useRef<NodeJS.Timeout | null>(null);
//   const textRef   = useRef<HTMLTextAreaElement>(null);

//   useEffect(() => {
//     if (timerActive && timeLeft > 0) timerRef.current = setTimeout(() => setTimeLeft(t => t-1), 1000);
//     else if (timeLeft === 0) setTimerActive(false);
//     return () => clearTimeout(timerRef.current);
//   }, [timerActive, timeLeft]);

//   // ── GENERATE QUESTIONS via API route ─────────────────────────────────────
//   const startInterview = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch('/api/interview/questions', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           jobTitle, company, skills: cvSkills || cvDescription,
//           interviewType, cvDescription,
//         }),
//       });
//       const data = await res.json();
//       const qs: Question[] = (res.ok && data.questions?.length)
//         ? data.questions
//         : getFallback(interviewType);

//       setQuestions(qs);
//       setCurrentQ(0); setAnswers([]); setAnswer('');
//       setTimeLeft(120); setTimerActive(false); setShowHint(false); setCurrentEval(null);
//       setStartTime(Date.now());
//       setPhase('session');
//     } catch {
//       setQuestions(getFallback(interviewType));
//       setPhase('session');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getFallback = (type: string): Question[] => {
//     const all: Question[] = [
//       { id:1, type:'hr',          question:'Parlez-moi de vous et de votre parcours.',                                                      hint:'Structure : Formation → Expériences clés → Objectif. Max 2 min.',             difficulty:'easy',   category:'Présentation' },
//       { id:2, type:'hr',          question:`Pourquoi voulez-vous ce poste${jobTitle?` de ${jobTitle}`:''}?`,                                 hint:'Montre tes recherches sur l\'entreprise. Cite des projets ou valeurs.',        difficulty:'easy',   category:'Motivation'   },
//       { id:3, type:'behavioral',  question:'Décrivez une situation où vous avez résolu un conflit dans une équipe.',                          hint:'STAR : Situation → Tâche → Action → Résultat mesurable.',                    difficulty:'medium', category:'Conflit'      },
//       { id:4, type:'technical',   question:`Quels sont tes 2 projets techniques les plus marquants${cvSkills?` (en rapport avec ${cvSkills.split(',').slice(0,2).join(', ')})`:''}?`, hint:'Technologies, ton rôle, résultats mesurables.', difficulty:'medium', category:'Projets' },
//       { id:5, type:'situational', question:'Un bug critique est découvert en prod 2h avant une démo client. Que fais-tu ?',                   hint:'Montre : priorisation, communication, résolution.',                           difficulty:'hard',   category:'Crise'        },
//       { id:6, type:'behavioral',  question:'Parlez d\'un échec professionnel et ce que vous en avez appris.',                                 hint:'Sois honnête, montre ta capacité de recul et d\'apprentissage.',              difficulty:'medium', category:'Résilience'   },
//     ];
//     if (type === 'hr')        return all.filter(q => q.type==='hr'||q.type==='behavioral').slice(0,5);
//     if (type === 'technical') return all.filter(q => q.type==='technical'||q.type==='situational').slice(0,5);
//     if (type === 'behavioral')return all.filter(q => q.type==='behavioral'||q.type==='situational').slice(0,5);
//     return all.slice(0,6);
//   };

//   // ── EVALUATE via API route ────────────────────────────────────────────────
//   const submitAnswer = async () => {
//     if (!answer.trim() || evaluating) return;
//     setEvaluating(true);
//     setTimerActive(false);
//     const timeSpent = Math.round((Date.now() - startTime) / 1000);

//     try {
//       const res = await fetch('/api/interview/evaluate', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           question:     questions[currentQ].question,
//           answer,
//           questionType: questions[currentQ].type,
//           difficulty:   questions[currentQ].difficulty,
//           skills:       cvSkills || cvDescription,
//           jobTitle,
//         }),
//       });

//       const data = await res.json();

//       if (res.ok && data.score) {
//         setCurrentEval({ question: questions[currentQ], answer, timeSpent, ...data });
//       } else {
//         throw new Error('Évaluation échouée');
//       }
//     } catch {
//       // Fallback basé sur la longueur de la réponse
//       const words = answer.split(' ').filter(Boolean).length;
//       setCurrentEval({
//         question: questions[currentQ], answer, timeSpent,
//         score:        words > 60 ? 72 : words > 30 ? 58 : 42,
//         feedback:     words > 60
//           ? 'Réponse développée. Enrichis avec des chiffres concrets et la méthode STAR.'
//           : words > 30
//           ? 'Réponse correcte mais trop courte. Développe avec un exemple précis.'
//           : 'Réponse insuffisante. Développe davantage avec des exemples concrets.',
//         strengths:    words > 40 ? ['Tu as répondu à la question posée', 'Réponse structurée'] : ['Tu as tenté de répondre'],
//         improvements: ['Ajoute des chiffres concrets (ex: -40% de temps, équipe de 5 pers.)', 'Structure avec STAR : Situation → Tâche → Action → Résultat'],
//         betterAnswer: `Pour cette question, une réponse excellente utiliserait la méthode STAR avec des métriques précises. Exemple : "Dans mon expérience chez [Entreprise], j'ai rencontré [situation précise]. Ma responsabilité était de [tâche]. J'ai décidé de [actions concrètes], ce qui a permis d'obtenir [résultat chiffré]."`,
//       });
//     } finally {
//       setEvaluating(false);
//     }
//   };

//   const nextQuestion = () => {
//     if (currentEval) setAnswers(prev => [...prev, currentEval as Answer]);
//     if (currentQ < questions.length - 1) {
//       setCurrentQ(q => q+1);
//       setAnswer(''); setCurrentEval(null); setShowHint(false);
//       setTimeLeft(120); setTimerActive(false); setStartTime(Date.now());
//       textRef.current?.focus();
//     } else {
//       const all = [...answers, ...(currentEval ? [currentEval as Answer] : [])];
//       setFinalScore(Math.round(all.reduce((s,a) => s+(a.score||70), 0) / (all.length||1)));
//       setAnswers(all);
//       setPhase('result');
//     }
//   };

//   const q = questions[currentQ];
//   const mm = Math.floor(timeLeft/60);
//   const ss = (timeLeft%60).toString().padStart(2,'0');

//   return (
//     <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
//       <style>{`
//         @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
//         @keyframes spin   { to{transform:rotate(360deg)} }
//         @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
//         .fu   { animation: fadeUp .3s ease forwards; }
//         .spin { animation: spin 1s linear infinite; display:inline-block; }
//         .pulse{ animation: pulse 1.5s ease infinite; }
//         textarea, input { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px 14px; color:var(--text); font-size:14px; width:100%; outline:none; font-family:inherit; transition:border-color .15s; }
//         textarea:focus, input:focus { border-color:#8b5cf6; }
//         .btn  { padding:9px 18px; border-radius:10px; border:1px solid var(--border); background:transparent; color:var(--text); cursor:pointer; font-size:13px; font-weight:500; transition:all .2s; font-family:inherit; }
//         .btn:hover { background:var(--bg3); }
//         .btn-g  { background:var(--green); border-color:var(--green); color:#000; font-weight:700; }
//         .btn-g:hover { opacity:.9; }
//         .btn-g:disabled { opacity:.5; cursor:not-allowed; }
//         .glass  { background:var(--bg2); border:1px solid var(--border); border-radius:14px; }
//         .tag    { font-size:10px; padding:2px 8px; border-radius:10px; font-weight:600; }
//       `}</style>

//       {/* NAVBAR */}
//       <nav style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
//         <div style={{ display:'flex', alignItems:'center', gap:8 }}>
//           <div style={{ width:8, height:8, borderRadius:'50%', background:'#8b5cf6', boxShadow:'0 0 8px #8b5cf6' }}/>
//           <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:16 }}>Interview Coach <span style={{ color:'#8b5cf6' }}>IA</span></span>
//           {fromCV && cvTitle && (
//             <span style={{ fontSize:11, background:'rgba(139,92,246,.15)', color:'#8b5cf6', border:'1px solid rgba(139,92,246,.3)', borderRadius:20, padding:'2px 10px' }}>
//               📄 {cvTitle}
//             </span>
//           )}
//         </div>
//         <div style={{ display:'flex', gap:10 }}>
//           <Link href="/welcome"   className="btn" style={{ fontSize:12, padding:'5px 14px' }}>← Accueil</Link>
//           <Link href="/cv"        className="btn" style={{ fontSize:12, padding:'5px 14px' }}>📄 Mon CV</Link>
//           <Link href="/dashboard" className="btn" style={{ fontSize:12, padding:'5px 14px' }}>🔍 Offres</Link>
//         </div>
//       </nav>

//       <div style={{ maxWidth:860, margin:'0 auto', padding:'32px 20px' }}>

//         {/* ══════════════ HOME ══════════════ */}
//         {phase === 'home' && (
//           <div className="fu">

//             {/* Banner CV */}
//             {fromCV && cvTitle && (
//               <div style={{ background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.3)', borderRadius:12, padding:'16px 20px', marginBottom:28, display:'flex', gap:16, alignItems:'center' }}>
//                 <span style={{ fontSize:24 }}>🎯</span>
//                 <div>
//                   <p style={{ fontWeight:600, marginBottom:3 }}>Questions personnalisées depuis ton CV</p>
//                   <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.5 }}>
//                     Poste : <strong style={{ color:'var(--text)' }}>{cvTitle}</strong>
//                     {cvSkills && <> · Compétences : <strong style={{ color:'#8b5cf6' }}>{cvSkills.split(',').slice(0,4).join(', ')}{cvSkills.split(',').length>4?'...':''}</strong></>}
//                   </p>
//                 </div>
//               </div>
//             )}

//             <div style={{ textAlign:'center', marginBottom:36 }}>
//               <div style={{ fontSize:52, marginBottom:14 }}>🎤</div>
//               <h1 style={{ fontSize:30, marginBottom:8, fontFamily:'Syne' }}>Interview Coach <span style={{ color:'#8b5cf6' }}>IA</span></h1>
//               <p style={{ color:'var(--muted)', fontSize:14, maxWidth:480, margin:'0 auto', lineHeight:1.7 }}>
//                 L'IA génère des questions personnalisées basées sur ton profil, évalue chaque réponse avec un feedback détaillé et une réponse modèle complète.
//               </p>
//             </div>

//             {/* Tabs */}
//             <div style={{ display:'flex', gap:4, marginBottom:28, background:'var(--bg2)', padding:4, borderRadius:10, border:'1px solid var(--border)', width:'fit-content', margin:'0 auto 28px' }}>
//               {(['practice','tips','prep'] as const).map(k => (
//                 <button key={k} onClick={() => setActiveTab(k)}
//                   style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:500, transition:'all .2s', background:activeTab===k?'#8b5cf6':'transparent', color:activeTab===k?'#fff':'var(--muted)' }}>
//                   {k==='practice'?'🎯 S\'entraîner':k==='tips'?'💡 Conseils':'📋 Préparation'}
//                 </button>
//               ))}
//             </div>

//             {/* TAB: PRACTICE */}
//             {activeTab === 'practice' && (
//               <div className="fu">
//                 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:12, marginBottom:22 }}>
//                   {INTERVIEW_TYPES.map(t => (
//                     <div key={t.id} onClick={() => setInterviewType(t.id)}
//                       style={{ border:`1.5px solid ${interviewType===t.id?t.color:'var(--border)'}`, borderRadius:12, padding:'16px 14px', cursor:'pointer', background:interviewType===t.id?`${t.color}10`:'var(--bg3)', transition:'all .2s' }}>
//                       <div style={{ fontSize:26, marginBottom:8 }}>{t.icon}</div>
//                       <p style={{ fontWeight:600, fontSize:13, color:interviewType===t.id?t.color:'var(--text)', marginBottom:3 }}>{t.title}</p>
//                       <p style={{ fontSize:11, color:'var(--muted)' }}>{t.desc}</p>
//                     </div>
//                   ))}
//                 </div>

//                 <div className="glass" style={{ padding:22, marginBottom:20 }}>
//                   <p style={{ fontSize:11, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>
//                     Personnalise l'entretien <span style={{ color:'#8b5cf6' }}>(recommandé)</span>
//                   </p>
//                   <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
//                     <div>
//                       <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Poste visé</label>
//                       <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="ex: Développeur React Senior..."/>
//                     </div>
//                     <div>
//                       <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Entreprise cible</label>
//                       <input value={company} onChange={e => setCompany(e.target.value)} placeholder="ex: Google, Vermeg..."/>
//                     </div>
//                   </div>
//                   <div>
//                     <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>
//                       Ton profil / compétences <span style={{ color:'#8b5cf6' }}>(pour questions ultra-personnalisées)</span>
//                     </label>
//                     <textarea value={cvDescription} onChange={e => setCvDescription(e.target.value)} rows={3} style={{ resize:'vertical' }}
//                       placeholder="Ex: 4 ans React/Node.js, plateforme SaaS 10k users, Docker, AWS, MongoDB..."/>
//                   </div>
//                 </div>

//                 <div style={{ textAlign:'center' }}>
//                   <button className="btn btn-g" onClick={() => setPhase('setup')} style={{ padding:'13px 40px', fontSize:15 }}>
//                     🎤 Commencer l'entretien →
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* TAB: TIPS */}
//             {activeTab === 'tips' && (
//               <div className="fu" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
//                 {[
//                   { icon:'⏱️', c:'#00d68f', title:'Méthode STAR',      desc:'Situation → Tâche → Action → Résultat. Structure indispensable pour toute question comportementale. Chaque réponse doit finir par un résultat mesurable.' },
//                   { icon:'📊', c:'#4f8ef7', title:'Quantifie tout',     desc:'Remplace "j\'ai amélioré les perfs" par "j\'ai réduit le temps de chargement de 8s à 2s, soit -75%". Les chiffres créent la crédibilité.' },
//                   { icon:'🎯', c:'#8b5cf6', title:'Sois spécifique',    desc:'Cite des noms de technologies précis, des dates, des tailles d\'équipe. Évite les généralités comme "j\'ai géré un gros projet".' },
//                   { icon:'🔄', c:'#f59e0b', title:'Reformule',          desc:'"Si je comprends bien, vous me demandez..." — Ça montre ton écoute, te donne du temps, et confirme que tu réponds à la bonne question.' },
//                   { icon:'🧘', c:'#ef4444', title:'Gère les blancs',     desc:'"Bonne question, laissez-moi réfléchir 2 secondes." Bien vu par les recruteurs — mieux que de bafouiller immédiatement.' },
//                   { icon:'❓', c:'#00d68f', title:'Prépare tes questions',desc:'3-5 questions intelligentes : challenges de l\'équipe, stack tech, processus d\'onboarding, évolution à 2 ans, prochaine étape RH.' },
//                 ].map((tip, i) => (
//                   <div key={i} className="glass" style={{ padding:20 }}>
//                     <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
//                       <span style={{ fontSize:22 }}>{tip.icon}</span>
//                       <h3 style={{ fontSize:14, color:tip.c, fontWeight:700 }}>{tip.title}</h3>
//                     </div>
//                     <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7 }}>{tip.desc}</p>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* TAB: PREP */}
//             {activeTab === 'prep' && (
//               <div className="fu" style={{ display:'flex', flexDirection:'column', gap:14 }}>
//                 {[
//                   { title:'📚 Avant l\'entretien', items:['Recherche l\'entreprise : news récentes, culture, concurrents, valeurs','Note 3 projets avec métriques (réduction X%, équipe N personnes, impact business)','Prépare 5 questions à poser au recruteur','Relis la fiche de poste et identifie les mots-clés importants','Liste tes forces ET faiblesses avec exemples concrets'] },
//                   { title:'🎯 Pendant l\'entretien', items:['Arrive / connecte-toi 5 min en avance','Écoute la question COMPLÈTE avant de répondre','Parle lentement, structuré, avec des pauses','Reformule si une question est floue ou ambiguë','Prends des notes si possible'] },
//                   { title:'📊 Structure STAR détaillée', items:['S → Situation : "Dans mon poste chez X, nous faisions face à..."','T → Tâche : "Ma responsabilité était de... dans ce contexte"','A → Action : "J\'ai décidé de... en faisant concrètement... étape par étape"','R → Résultat : "En résultat, nous avons obtenu +X%, -Y jours, N clients..."','Bonus : "Et j\'en ai appris que..."'] },
//                   { title:'❓ Questions à poser au recruteur', items:['Quels sont les principaux challenges techniques de ce poste ?','Comment se passe l\'onboarding des nouveaux développeurs ?','Comment les décisions techniques sont-elles prises dans l\'équipe ?','Quelles sont les opportunités d\'évolution à 2 ans ?','Quelle est la prochaine étape du processus de recrutement ?'] },
//                 ].map((section, i) => (
//                   <div key={i} className="glass" style={{ padding:20 }}>
//                     <h3 style={{ fontSize:15, marginBottom:14 }}>{section.title}</h3>
//                     <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:8 }}>
//                       {section.items.map((item, j) => (
//                         <li key={j} style={{ display:'flex', gap:10, fontSize:13 }}>
//                           <span style={{ color:'var(--green)', flexShrink:0 }}>✓</span>
//                           <span style={{ color:'var(--muted)', lineHeight:1.6 }}>{item}</span>
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {/* ══════════════ SETUP ══════════════ */}
//         {phase === 'setup' && (
//           <div className="glass fu" style={{ padding:36, maxWidth:520, margin:'0 auto', textAlign:'center' }}>
//             <div style={{ fontSize:44, marginBottom:16 }}>🤖</div>
//             <h2 style={{ fontSize:22, marginBottom:8 }}>L'IA prépare tes questions</h2>
//             <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.7, marginBottom:20 }}>
//               Type : <strong style={{ color:'var(--text)' }}>{INTERVIEW_TYPES.find(t=>t.id===interviewType)?.title}</strong>
//               {jobTitle && <><br/>Poste : <strong style={{ color:'#8b5cf6' }}>{jobTitle}</strong></>}
//               {company && <> chez <strong>{company}</strong></>}
//             </p>
//             <div style={{ background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.2)', borderRadius:10, padding:'14px 18px', marginBottom:24, textAlign:'left' }}>
//               <p style={{ fontSize:12, color:'#8b5cf6', fontWeight:700, marginBottom:10 }}>🧠 Ce que l'IA fait :</p>
//               {['Analyse ton profil et tes compétences exactes','Génère des questions ciblées sur ta stack','Adapte la difficulté à ton niveau','Évalue chaque réponse avec une réponse modèle complète'].map((item,i) => (
//                 <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:12 }}>
//                   <span style={{ color:'#8b5cf6' }}>→</span>
//                   <span style={{ color:'var(--muted)' }}>{item}</span>
//                 </div>
//               ))}
//             </div>
//             <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
//               <button className="btn" onClick={() => setPhase('home')}>← Retour</button>
//               <button className="btn btn-g" onClick={startInterview} disabled={loading} style={{ padding:'11px 28px' }}>
//                 {loading ? <><span className="spin">⟳</span> Génération IA...</> : '🚀 Démarrer →'}
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ══════════════ SESSION ══════════════ */}
//         {phase === 'session' && q && (
//           <div className="fu">
//             {/* Progress */}
//             <div style={{ marginBottom:20 }}>
//               <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
//                 <div style={{ display:'flex', alignItems:'center', gap:10 }}>
//                   <span style={{ fontSize:13, color:'var(--muted)' }}>Question {currentQ+1} / {questions.length}</span>
//                   {q.category && <span className="tag" style={{ background:'rgba(139,92,246,.12)', color:'#8b5cf6', border:'1px solid rgba(139,92,246,.25)' }}>{q.category}</span>}
//                 </div>
//                 <div style={{ display:'flex', alignItems:'center', gap:10 }}>
//                   <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg3)', border:`1px solid ${timeLeft<30?'rgba(239,68,68,.4)':'var(--border)'}`, borderRadius:20, padding:'5px 14px' }}>
//                     <span style={{ fontSize:11, color:timeLeft<30?'#ef4444':'var(--muted)' }}>⏱</span>
//                     <span style={{ fontSize:13, fontWeight:700, color:timeLeft<30?'#ef4444':'var(--text)', fontFamily:'monospace' }}>{mm}:{ss}</span>
//                     {timerActive && timeLeft < 30 && <span className="pulse" style={{ fontSize:10, color:'#ef4444' }}>!</span>}
//                   </div>
//                   {!timerActive && !currentEval && (
//                     <button onClick={() => { setTimerActive(true); setStartTime(Date.now()); }} className="btn" style={{ fontSize:11, padding:'5px 12px' }}>▶ Timer</button>
//                   )}
//                 </div>
//               </div>
//               <div style={{ height:4, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
//                 <div style={{ height:'100%', width:`${((currentQ+1)/questions.length)*100}%`, background:'linear-gradient(90deg,#8b5cf6,#4f8ef7)', borderRadius:2, transition:'width .5s' }}/>
//               </div>
//               <div style={{ display:'flex', gap:6, marginTop:8, justifyContent:'center' }}>
//                 {questions.map((_,i) => (
//                   <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:i<currentQ?'var(--green)':i===currentQ?'#8b5cf6':'var(--bg3)', transition:'all .3s' }}/>
//                 ))}
//               </div>
//             </div>

//             {/* Question card */}
//             <div className="glass" style={{ padding:24, marginBottom:16, border:'1px solid rgba(139,92,246,.2)' }}>
//               <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
//                 <span style={{ fontSize:20 }}>{TYPE_CFG[q.type]?.icon}</span>
//                 <span className="tag" style={{ background:TYPE_CFG[q.type]?.bg, color:TYPE_CFG[q.type]?.color, border:`1px solid ${TYPE_CFG[q.type]?.color}44` }}>{TYPE_CFG[q.type]?.label}</span>
//                 <span className="tag" style={{ background:q.difficulty==='easy'?'rgba(0,214,143,.1)':q.difficulty==='medium'?'rgba(245,158,11,.1)':'rgba(239,68,68,.1)', color:q.difficulty==='easy'?'#00d68f':q.difficulty==='medium'?'#f59e0b':'#ef4444', border:'none' }}>
//                   {q.difficulty==='easy'?'Facile':q.difficulty==='medium'?'Moyen':'Difficile'}
//                 </span>
//               </div>
//               <p style={{ fontSize:17, fontWeight:600, lineHeight:1.55, marginBottom:16 }}>{q.question}</p>
//               <button onClick={() => setShowHint(!showHint)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5, padding:0 }}>
//                 💡 {showHint?'Cacher':'Voir'} l'indice
//               </button>
//               {showHint && (
//                 <div style={{ marginTop:10, padding:'12px 14px', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, fontSize:13, color:'#f59e0b', lineHeight:1.6 }}>
//                   {q.hint}
//                 </div>
//               )}
//             </div>

//             {/* Answer / Evaluation */}
//             {!currentEval ? (
//               <div className="glass" style={{ padding:20, marginBottom:16 }}>
//                 <label style={{ fontSize:11, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:10 }}>Ta réponse</label>
//                 <textarea ref={textRef} value={answer} onChange={e => setAnswer(e.target.value)} rows={6}
//                   placeholder="Rédige ta réponse ici... Utilise des exemples concrets, des chiffres, et structure avec STAR si possible."
//                   style={{ resize:'vertical', lineHeight:1.7 }}
//                   onKeyDown={e => { if(e.key==='Enter'&&e.ctrlKey) submitAnswer(); }}/>
//                 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
//                   <span style={{ fontSize:11, color:'var(--muted)' }}>
//                     {answer.split(' ').filter(Boolean).length} mots · Ctrl+Enter pour valider
//                   </span>
//                   <button className="btn btn-g" onClick={submitAnswer} disabled={!answer.trim()||evaluating}
//                     style={{ padding:'9px 22px', display:'flex', alignItems:'center', gap:8 }}>
//                     {evaluating ? <><span className="spin">⟳</span> Évaluation IA...</> : '🤖 Évaluer ma réponse →'}
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               <div className="fu" style={{ display:'flex', flexDirection:'column', gap:12 }}>
//                 {/* Score */}
//                 <div className="glass" style={{ padding:20, border:`1px solid ${(currentEval.score||0)>=80?'rgba(0,214,143,.3)':(currentEval.score||0)>=60?'rgba(245,158,11,.3)':'rgba(239,68,68,.3)'}`, display:'flex', gap:18, alignItems:'flex-start' }}>
//                   <div style={{ width:60, height:60, borderRadius:'50%', flexShrink:0,
//                     background:`${(currentEval.score||0)>=80?'#00d68f':(currentEval.score||0)>=60?'#f59e0b':'#ef4444'}18`,
//                     border:`2px solid ${(currentEval.score||0)>=80?'#00d68f':(currentEval.score||0)>=60?'#f59e0b':'#ef4444'}`,
//                     display:'flex', alignItems:'center', justifyContent:'center',
//                     fontWeight:800, fontSize:18,
//                     color:(currentEval.score||0)>=80?'#00d68f':(currentEval.score||0)>=60?'#f59e0b':'#ef4444' }}>
//                     {currentEval.score}
//                   </div>
//                   <div style={{ flex:1 }}>
//                     <p style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>Feedback IA</p>
//                     <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>{currentEval.feedback}</p>
//                     {currentEval.timeSpent && <p style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>⏱ {currentEval.timeSpent}s de réflexion</p>}
//                   </div>
//                 </div>

//                 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
//                   {(currentEval.strengths?.length||0) > 0 && (
//                     <div className="glass" style={{ padding:16 }}>
//                       <p style={{ fontSize:11, color:'#00d68f', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>💪 Points forts</p>
//                       {currentEval.strengths?.map((s,i) => (
//                         <div key={i} style={{ display:'flex', gap:8, fontSize:12, marginBottom:7 }}>
//                           <span style={{ color:'#00d68f', flexShrink:0 }}>✓</span>
//                           <span style={{ color:'var(--muted)', lineHeight:1.6 }}>{s}</span>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                   {(currentEval.improvements?.length||0) > 0 && (
//                     <div className="glass" style={{ padding:16 }}>
//                       <p style={{ fontSize:11, color:'#f59e0b', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>🔧 À améliorer</p>
//                       {currentEval.improvements?.map((s,i) => (
//                         <div key={i} style={{ display:'flex', gap:8, fontSize:12, marginBottom:7 }}>
//                           <span style={{ color:'#f59e0b', flexShrink:0 }}>→</span>
//                           <span style={{ color:'var(--muted)', lineHeight:1.6 }}>{s}</span>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Better answer - la partie la plus importante */}
//                 {currentEval.betterAnswer && (
//                   <div className="glass" style={{ padding:20, border:'1px solid rgba(79,142,247,.25)', background:'rgba(79,142,247,.06)' }}>
//                     <p style={{ fontSize:11, color:'#4f8ef7', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:12 }}>✨ Réponse modèle — apprends et adapte</p>
//                     <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.8, fontStyle:'italic', borderLeft:'3px solid #4f8ef7', paddingLeft:14 }}>
//                       "{currentEval.betterAnswer}"
//                     </p>
//                   </div>
//                 )}

//                 <div style={{ display:'flex', justifyContent:'flex-end' }}>
//                   <button className="btn btn-g" onClick={nextQuestion} style={{ padding:'11px 28px', fontSize:14 }}>
//                     {currentQ < questions.length-1 ? 'Question suivante →' : 'Voir mon résultat final →'}
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* ══════════════ RESULT ══════════════ */}
//         {phase === 'result' && (
//           <div className="fu">
//             <div style={{ textAlign:'center', marginBottom:32 }}>
//               <h1 style={{ fontSize:28, marginBottom:6, fontFamily:'Syne' }}>Entretien terminé ! 🎉</h1>
//               <p style={{ color:'var(--muted)', fontSize:14 }}>Score global et recommandations personnalisées</p>
//             </div>

//             <div className="glass" style={{ padding:32, textAlign:'center', marginBottom:24, border:`1px solid ${finalScore>=80?'rgba(0,214,143,.3)':finalScore>=60?'rgba(245,158,11,.3)':'rgba(239,68,68,.3)'}` }}>
//               <ScoreArc score={finalScore}/>
//               <p style={{ fontSize:14, color:'var(--muted)', marginTop:16, lineHeight:1.6 }}>
//                 {finalScore>=85?'🎉 Excellent ! Niveau de préparation remarquable. Continue à pratiquer pour maintenir ce niveau.':
//                  finalScore>=70?'👍 Bien joué ! Peaufine les points d\'amélioration ci-dessous pour être imbattable.':
//                  finalScore>=55?'💪 Bon début ! Focalise-toi sur la méthode STAR et les métriques chiffrées.':
//                  '📚 Continue l\'entraînement régulièrement — la progression est rapide avec de la pratique quotidienne.'}
//               </p>
//               <div style={{ display:'flex', gap:24, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
//                 {[
//                   { n:answers.filter(a=>a.score>=80).length, label:'Excellentes', color:'#00d68f' },
//                   { n:answers.filter(a=>a.score>=60&&a.score<80).length, label:'Bonnes', color:'#f59e0b' },
//                   { n:answers.filter(a=>a.score<60).length, label:'À améliorer', color:'#ef4444' },
//                 ].map(({ n, label, color }, i) => (
//                   <div key={i} style={{ textAlign:'center' }}>
//                     <p style={{ fontSize:26, fontWeight:800, color, margin:0 }}>{n}</p>
//                     <p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>{label}</p>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <h3 style={{ fontSize:15, fontWeight:700, marginBottom:14 }}>Analyse détaillée</h3>
//             <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
//               {answers.map((a,i) => (
//                 <div key={i} className="glass" style={{ padding:'16px 20px' }}>
//                   <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
//                     <div style={{ width:44, height:44, borderRadius:'50%', flexShrink:0,
//                       background:`${a.score>=80?'#00d68f':a.score>=60?'#f59e0b':'#ef4444'}18`,
//                       border:`2px solid ${a.score>=80?'#00d68f':a.score>=60?'#f59e0b':'#ef4444'}`,
//                       display:'flex', alignItems:'center', justifyContent:'center',
//                       fontWeight:800, fontSize:14,
//                       color:a.score>=80?'#00d68f':a.score>=60?'#f59e0b':'#ef4444' }}>
//                       {a.score}
//                     </div>
//                     <div style={{ flex:1 }}>
//                       <div style={{ display:'flex', gap:8, marginBottom:4, flexWrap:'wrap', alignItems:'center' }}>
//                         <span className="tag" style={{ background:TYPE_CFG[a.question?.type]?.bg, color:TYPE_CFG[a.question?.type]?.color }}>{TYPE_CFG[a.question?.type]?.icon} {TYPE_CFG[a.question?.type]?.label}</span>
//                         {a.question?.category && <span style={{ fontSize:11, color:'var(--muted)' }}>{a.question.category}</span>}
//                       </div>
//                       <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Q{i+1}: {a.question?.question?.slice(0,90)}{(a.question?.question?.length||0)>90?'...':''}</p>
//                       <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{a.feedback}</p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
//               <button className="btn btn-g" onClick={() => { setPhase('home'); setAnswers([]); setCurrentQ(0); setAnswer(''); setCurrentEval(null); }} style={{ padding:'11px 22px' }}>
//                 🔄 Recommencer
//               </button>
//               <Link href="/cv"        className="btn" style={{ padding:'11px 22px' }}>📄 Améliorer mon CV</Link>
//               <Link href="/dashboard" className="btn" style={{ padding:'11px 22px' }}>🔍 Chercher des offres</Link>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// 'use client';
// // app/interview/page.tsx
// // Interview Coach IA — Questions personnalisées selon le profil CV

// import { useState, useRef, useEffect } from 'react';
// import Link from 'next/link';
// import { useAuth } from '../../lib/auth';
// import { useSearchParams } from 'next/navigation';
// import api from '../../lib/api';

// // ─── TYPES ────────────────────────────────────────────────────────────────────

// type Phase = 'home' | 'setup' | 'session' | 'result';
// type QType = 'hr' | 'technical' | 'behavioral' | 'situational';

// interface Question {
//   id: number;
//   type: QType;
//   question: string;
//   hint: string;
//   difficulty: 'easy' | 'medium' | 'hard';
//   category?: string; // ex: "React", "Gestion d'équipe", "Conflit"
// }

// interface Answer {
//   question: Question;
//   answer: string;
//   score: number;
//   feedback: string;
//   strengths: string[];
//   improvements: string[];
//   betterAnswer: string;
//   timeSpent: number;
// }

// interface CVProfile {
//   jobTitle?: string;
//   skills?: string; // comma-separated from URL
//   experience?: string;
// }

// // ─── CONFIG ───────────────────────────────────────────────────────────────────

// const TYPE_CONFIG: Record<QType, { label: string; color: string; bg: string; icon: string }> = {
//   hr:          { label: 'RH',              color: '#00d68f', bg: 'rgba(0,214,143,.08)',   icon: '🤝' },
//   technical:   { label: 'Technique',       color: '#4f8ef7', bg: 'rgba(79,142,247,.08)',  icon: '💻' },
//   behavioral:  { label: 'Comportemental',  color: '#f59e0b', bg: 'rgba(245,158,11,.08)',  icon: '🧠' },
//   situational: { label: 'Situationnel',    color: '#8b5cf6', bg: 'rgba(139,92,246,.08)',  icon: '🎯' },
// };

// const INTERVIEW_TYPES = [
//   { id: 'mixed',      icon: '🎯', title: 'Entretien complet',    desc: 'RH + Technique + Comportemental', color: '#00d68f' },
//   { id: 'hr',         icon: '🤝', title: 'Entretien RH',         desc: 'Motivation, soft skills, parcours', color: '#4f8ef7' },
//   { id: 'technical',  icon: '💻', title: 'Technique approfondi', desc: 'Stack technique, projets, problèmes', color: '#8b5cf6' },
//   { id: 'behavioral', icon: '🧠', title: 'Comportemental STAR',  desc: 'Situations réelles, méthode STAR', color: '#f59e0b' },
// ];

// // ─── SCORE ARC ────────────────────────────────────────────────────────────────

// function ScoreArc({ score }: { score: number }) {
//   const color = score >= 80 ? '#00d68f' : score >= 60 ? '#f59e0b' : '#ef4444';
//   const label = score >= 85 ? 'Excellent !' : score >= 70 ? 'Bien joué' : score >= 55 ? 'Assez bien' : 'À améliorer';
//   const r = 56;
//   const circ = 2 * Math.PI * r;
//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
//       <svg width="132" height="132" viewBox="0 0 132 132">
//         <circle cx="66" cy="66" r={r} fill="none" stroke="var(--bg3)" strokeWidth="10" />
//         <circle cx="66" cy="66" r={r} fill="none" stroke={color} strokeWidth="10"
//           strokeDasharray={`${(score / 100) * circ} ${circ}`}
//           strokeLinecap="round"
//           style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 1.5s ease' }} />
//         <text x="66" y="60" textAnchor="middle" style={{ fill: color, fontSize: 30, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>{score}</text>
//         <text x="66" y="76" textAnchor="middle" style={{ fill: '#7a8499', fontSize: 11 }}>/ 100</text>
//       </svg>
//       <span style={{ fontSize: 13, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}44`, padding: '5px 16px', borderRadius: 20 }}>{label}</span>
//     </div>
//   );
// }

// // ─── DIFFICULTY BADGE ─────────────────────────────────────────────────────────

// function DiffBadge({ d }: { d: string }) {
//   const c = d === 'easy' ? '#00d68f' : d === 'medium' ? '#f59e0b' : '#ef4444';
//   const l = d === 'easy' ? 'Facile' : d === 'medium' ? 'Moyen' : 'Difficile';
//   return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: `${c}18`, color: c, border: `1px solid ${c}44`, fontWeight: 600 }}>{l}</span>;
// }

// // ─── TIMER ───────────────────────────────────────────────────────────────────

// function Timer({ seconds, active }: { seconds: number; active: boolean }) {
//   const warn = seconds < 30;
//   const mm = Math.floor(seconds / 60);
//   const ss = (seconds % 60).toString().padStart(2, '0');
//   const pct = (seconds / 120) * 100;
//   const color = warn ? '#ef4444' : seconds < 60 ? '#f59e0b' : '#00d68f';
//   return (
//     <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', border: `1px solid ${warn ? '#ef444440' : 'var(--border)'}`, borderRadius: 20, padding: '5px 14px' }}>
//       <svg width="20" height="20" viewBox="0 0 20 20">
//         <circle cx="10" cy="10" r="8" fill="none" stroke="var(--bg)" strokeWidth="3" />
//         <circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="3"
//           strokeDasharray={`${(pct / 100) * 50.3} 50.3`} strokeLinecap="round"
//           style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
//       </svg>
//       <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace', minWidth: 36 }}>{mm}:{ss}</span>
//       {active && warn && <span style={{ fontSize: 10, color: '#ef4444', animation: 'pulse 1s infinite' }}>!</span>}
//     </div>
//   );
// }

// // ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

// export default function InterviewCoach() {
//   const { user } = useAuth();
//   const searchParams = useSearchParams();

//   // From CV page URL params
//   const cvTitle = searchParams.get('title') || '';
//   const cvSkills = searchParams.get('skills') || '';
//   const fromCV = searchParams.get('from') === 'cv';

//   const [phase, setPhase] = useState<Phase>('home');
//   const [interviewType, setInterviewType] = useState('mixed');
//   const [jobTitle, setJobTitle] = useState(cvTitle);
//   const [company, setCompany] = useState('');
//   const [cvDescription, setCvDescription] = useState('');
//   const [questions, setQuestions] = useState<Question[]>([]);
//   const [currentQ, setCurrentQ] = useState(0);
//   const [answer, setAnswer] = useState('');
//   const [answers, setAnswers] = useState<Answer[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [evaluating, setEvaluating] = useState(false);
//   const [currentEval, setCurrentEval] = useState<Partial<Answer> | null>(null);
//   const [timeLeft, setTimeLeft] = useState(120);
//   const [timerActive, setTimerActive] = useState(false);
//   const [showHint, setShowHint] = useState(false);
//   const [finalScore, setFinalScore] = useState(0);
//   const [activeTab, setActiveTab] = useState<'practice' | 'tips' | 'prep'>(fromCV ? 'practice' : 'practice');
//   const [questionStartTime, setQuestionStartTime] = useState(Date.now());
//   const timerRef = useRef<NodeJS.Timeout>();
//   const textRef = useRef<HTMLTextAreaElement>(null);

//   useEffect(() => {
//     if (timerActive && timeLeft > 0) {
//       timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
//     } else if (timeLeft === 0) {
//       setTimerActive(false);
//     }
//     return () => clearTimeout(timerRef.current);
//   }, [timerActive, timeLeft]);

//   // ── GENERATE QUESTIONS FROM AI ───────────────────────────────────────────────

//   const generateQuestionsWithAI = async (): Promise<Question[]> => {
//     const skillsList = cvSkills || cvDescription;
//     const aiPrompt = `Tu es un expert recruteur RH et technique international.

// MISSION : Générer des questions d'entretien PERSONNALISÉES et PERTINENTES pour ce candidat.

// PROFIL DU CANDIDAT :
// - Poste visé : ${jobTitle || 'Développeur'}
// - Entreprise cible : ${company || 'Non précisée'}
// - Compétences : ${skillsList || 'Non précisées'}
// - Description CV : ${cvDescription || 'Non fournie'}
// - Type d'entretien : ${interviewType}

// RÈGLES :
// 1. Retourne UNIQUEMENT du JSON valide — aucun texte avant/après
// 2. Les questions techniques DOIVENT cibler les compétences réelles du profil
// 3. Questions comportementales STAR adaptées au niveau et secteur
// 4. Mélange difficultés : 2 easy, 3 medium, 2 hard pour "mixed"
// 5. Chaque hint doit être une aide concrète et actionnable
// 6. 5 à 7 questions selon le type

// FORMAT JSON :
// {
//   "questions": [
//     {
//       "id": 1,
//       "type": "hr",
//       "question": "Question précise et contextualisée",
//       "hint": "Aide concrète : structure à utiliser, points à couvrir",
//       "difficulty": "easy",
//       "category": "Présentation"
//     }
//   ]
// }

// EXEMPLES DE BONNES QUESTIONS selon compétences :
// - Si React → "Explique la différence entre useCallback et useMemo avec un exemple concret de ton projet"
// - Si management → "Décris comment tu as géré un développeur junior qui livrait en retard systématiquement"
// - Si startup → "Comment priorisas-tu les features quand tout est urgent et les ressources limitées ?"`;

//     const res = await fetch('https://api.anthropic.com/v1/messages', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         model: 'claude-sonnet-4-20250514',
//         max_tokens: 2000,
//         messages: [{ role: 'user', content: aiPrompt }],
//       }),
//     });

//     const data = await res.json();
//     const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text || '';
//     const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
//     const start = clean.indexOf('{');
//     const end = clean.lastIndexOf('}');
//     const parsed = JSON.parse(clean.slice(start, end + 1));
//     return parsed.questions || [];
//   };

//   // ── EVALUATE ANSWER WITH AI ──────────────────────────────────────────────────

//   const evaluateWithAI = async (question: Question, userAnswer: string): Promise<Partial<Answer>> => {
//     const aiPrompt = `Tu es un recruteur expert qui évalue des réponses d'entretien.

// QUESTION : ${question.question}
// TYPE : ${TYPE_CONFIG[question.type].label}
// DIFFICULTÉ : ${question.difficulty}
// COMPÉTENCES DU CANDIDAT : ${cvSkills || jobTitle || 'Non précisées'}

// RÉPONSE DU CANDIDAT :
// "${userAnswer}"

// Évalue cette réponse et retourne UNIQUEMENT du JSON :
// {
//   "score": 78,
//   "feedback": "Feedback principal en 2-3 phrases directes et constructives",
//   "strengths": ["Point fort 1 spécifique", "Point fort 2 avec exemple"],
//   "improvements": ["Amélioration 1 concrète", "Ce qui manquait : exemple précis"],
//   "betterAnswer": "Exemple de réponse optimale en 2-3 phrases avec la méthode STAR si applicable et des métriques"
// }

// RÈGLES D'ÉVALUATION :
// - score entre 40 et 98 selon qualité réelle
// - Si la réponse est vide ou très courte → score 40-50
// - strengths et improvements : 2 éléments chacun minimum, spécifiques au profil
// - betterAnswer : toujours inclure une réponse modèle complète et contextualisée`;

//     const res = await fetch('https://api.anthropic.com/v1/messages', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         model: 'claude-sonnet-4-20250514',
//         max_tokens: 800,
//         messages: [{ role: 'user', content: aiPrompt }],
//       }),
//     });

//     const data = await res.json();
//     const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text || '';
//     const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
//     const start = clean.indexOf('{');
//     const end = clean.lastIndexOf('}');
//     return JSON.parse(clean.slice(start, end + 1));
//   };

//   // ── START INTERVIEW ──────────────────────────────────────────────────────────

//   const startInterview = async () => {
//     setLoading(true);
//     try {
//       let qs: Question[] = [];
//       try {
//         qs = await generateQuestionsWithAI();
//       } catch {
//         qs = getFallbackQuestions(interviewType);
//       }
//       setQuestions(qs);
//       setCurrentQ(0); setAnswers([]); setAnswer('');
//       setTimeLeft(120); setTimerActive(false); setShowHint(false); setCurrentEval(null);
//       setQuestionStartTime(Date.now());
//       setPhase('session');
//     } catch {
//       setQuestions(getFallbackQuestions(interviewType));
//       setPhase('session');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getFallbackQuestions = (type: string): Question[] => {
//     const all: Question[] = [
//       { id: 1, type: 'hr', question: 'Parlez-moi de vous et de votre parcours.', hint: 'Structure : Formation → Expériences clés → Pourquoi ce poste. Max 2 minutes.', difficulty: 'easy', category: 'Présentation' },
//       { id: 2, type: 'hr', question: `Pourquoi voulez-vous ce poste${jobTitle ? ` de ${jobTitle}` : ''} ?`, hint: 'Montre que tu t\'es renseigné. Cite des projets ou valeurs de l\'entreprise.', difficulty: 'easy', category: 'Motivation' },
//       { id: 3, type: 'behavioral', question: 'Décrivez une situation où vous avez résolu un conflit dans une équipe.', hint: 'STAR : Situation → Tâche → Action → Résultat mesurable.', difficulty: 'medium', category: 'Conflit' },
//       { id: 4, type: 'technical', question: `Quels sont les 2 projets techniques dont vous êtes le plus fier${cvSkills ? ` (en rapport avec ${cvSkills.split(',').slice(0, 2).join(', ')})` : ''} ?`, hint: 'Cite les technologies, ton rôle exact, les résultats mesurables.', difficulty: 'medium', category: 'Projets' },
//       { id: 5, type: 'situational', question: 'Un projet doit être livré dans 48h mais tu as découvert un bug critique. Que fais-tu ?', hint: 'Montre ton processus de priorisation, communication et résolution.', difficulty: 'hard', category: 'Gestion de crise' },
//       { id: 6, type: 'behavioral', question: 'Parlez d\'un échec professionnel et ce que vous en avez appris.', hint: 'Sois honnête, montre ta capacité de recul et d\'apprentissage.', difficulty: 'medium', category: 'Résilience' },
//       { id: 7, type: 'hr', question: 'Où vous voyez-vous dans 3 ans ?', hint: 'Aligne ta réponse avec l\'évolution possible dans cette entreprise.', difficulty: 'easy', category: 'Ambition' },
//     ];
//     if (type === 'hr') return all.filter(q => q.type === 'hr' || q.type === 'behavioral').slice(0, 5);
//     if (type === 'technical') return all.filter(q => q.type === 'technical' || q.type === 'situational').slice(0, 5);
//     if (type === 'behavioral') return all.filter(q => q.type === 'behavioral').concat(all.filter(q => q.type === 'situational')).slice(0, 5);
//     return all.slice(0, 6);
//   };

//   // ── SUBMIT ANSWER ────────────────────────────────────────────────────────────

//   const submitAnswer = async () => {
//     if (!answer.trim() || evaluating) return;
//     setEvaluating(true);
//     setTimerActive(false);
//     const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

//     try {
//       let evalResult: Partial<Answer>;
//       try {
//         const aiEval = await evaluateWithAI(questions[currentQ], answer);
//         evalResult = { question: questions[currentQ], answer, timeSpent, ...aiEval };
//       } catch {
//         evalResult = {
//           question: questions[currentQ], answer, timeSpent,
//           score: answer.split(' ').length > 30 ? 72 : 55,
//           feedback: 'Réponse enregistrée. Enrichis-la avec des exemples concrets et des chiffres.',
//           strengths: ['Tu as répondu directement à la question', 'Structure claire'],
//           improvements: ['Ajoute des métriques chiffrées', 'Utilise la méthode STAR pour structurer'],
//           betterAnswer: 'Une réponse idéale intégrerait : le contexte précis, les actions concrètes prises, et un résultat mesurable (ex: +30% de performance, équipe de 5 personnes...).',
//         };
//       }
//       setCurrentEval(evalResult);
//     } finally {
//       setEvaluating(false);
//     }
//   };

//   const nextQuestion = () => {
//     if (currentEval) setAnswers(prev => [...prev, currentEval as Answer]);
//     if (currentQ < questions.length - 1) {
//       setCurrentQ(q => q + 1);
//       setAnswer(''); setCurrentEval(null); setShowHint(false);
//       setTimeLeft(120); setTimerActive(false);
//       setQuestionStartTime(Date.now());
//       textRef.current?.focus();
//     } else {
//       const all = [...answers, ...(currentEval ? [currentEval as Answer] : [])];
//       setFinalScore(Math.round(all.reduce((s, a) => s + (a.score || 70), 0) / (all.length || 1)));
//       setAnswers(all);
//       setPhase('result');
//     }
//   };

//   const q = questions[currentQ];

//   return (
//     <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
//       <style>{`
//         @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
//         @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
//         @keyframes spin { to{transform:rotate(360deg)} }
//         .fu { animation: fadeUp .3s ease forwards; }
//         .pulse { animation: pulse 1.5s ease infinite; }
//         .spin { animation: spin 1s linear infinite; }
//         textarea, input { background:var(--bg3); border:1px solid var(--border); border-radius:10px; padding:12px 14px; color:var(--text); font-size:14px; width:100%; outline:none; font-family:inherit; transition:border-color .15s; }
//         textarea:focus, input:focus { border-color:var(--purple,#8b5cf6); }
//         .btn { padding:9px 18px; border-radius:10px; border:1px solid var(--border); background:transparent; color:var(--text); cursor:pointer; font-size:13px; font-weight:500; transition:all .2s; font-family:inherit; }
//         .btn:hover { background:var(--bg3); }
//         .btn-primary { background:var(--green); border-color:var(--green); color:#000; font-weight:700; }
//         .btn-primary:hover { opacity:.9; }
//         .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
//         .glass { background:var(--bg2); border:1px solid var(--border); border-radius:14px; }
//         .tag { font-size:10px; padding:2px 8px; border-radius:10px; font-weight:600; }
//       `}</style>

//       {/* ── NAVBAR ── */}
//       <nav style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
//           <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
//           <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16 }}>Interview Coach <span style={{ color: '#8b5cf6' }}>IA</span></span>
//           {fromCV && cvTitle && (
//             <span style={{ fontSize: 11, background: 'rgba(139,92,246,.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,.3)', borderRadius: 20, padding: '2px 10px' }}>
//               📄 Depuis CV : {cvTitle}
//             </span>
//           )}
//         </div>
//         <div style={{ display: 'flex', gap: 10 }}>
//           <Link href="/welcome" className="btn" style={{ fontSize: 12, padding: '5px 14px' }}>← Accueil</Link>
//           <Link href="/cv" className="btn" style={{ fontSize: 12, padding: '5px 14px' }}>📄 Mon CV</Link>
//           <Link href="/dashboard" className="btn" style={{ fontSize: 12, padding: '5px 14px' }}>🔍 Offres</Link>
//         </div>
//       </nav>

//       <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>

//         {/* ════════════════════════════════════════════════════════
//             PHASE: HOME
//         ════════════════════════════════════════════════════════ */}
//         {phase === 'home' && (
//           <div className="fu">

//             {/* Banner from CV */}
//             {fromCV && cvTitle && (
//               <div style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
//                 <span style={{ fontSize: 24 }}>🎯</span>
//                 <div>
//                   <p style={{ fontWeight: 600, marginBottom: 4 }}>CV détecté — Interview personnalisé</p>
//                   <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
//                     Poste : <strong style={{ color: 'var(--text)' }}>{cvTitle}</strong>
//                     {cvSkills && <> · Compétences : <strong style={{ color: '#8b5cf6' }}>{cvSkills.split(',').slice(0, 4).join(', ')}{cvSkills.split(',').length > 4 ? '...' : ''}</strong></>}
//                     <br />L'IA va générer des questions basées exactement sur ton profil.
//                   </p>
//                 </div>
//               </div>
//             )}

//             <div style={{ textAlign: 'center', marginBottom: 36 }}>
//               <div style={{ fontSize: 52, marginBottom: 14 }}>🎤</div>
//               <h1 style={{ fontSize: 30, marginBottom: 8, fontFamily: 'Syne' }}>Interview Coach <span style={{ color: '#8b5cf6' }}>IA</span></h1>
//               <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
//                 L'IA génère des questions personnalisées basées sur ton profil, puis évalue chaque réponse avec un feedback actionnable.
//               </p>
//             </div>

//             {/* Tabs */}
//             <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg2)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content', margin: '0 auto 28px' }}>
//               {(['practice', 'tips', 'prep'] as const).map((k) => (
//                 <button key={k} onClick={() => setActiveTab(k)}
//                   style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, transition: 'all .2s', background: activeTab === k ? '#8b5cf6' : 'transparent', color: activeTab === k ? '#fff' : 'var(--muted)' }}>
//                   {k === 'practice' ? '🎯 S\'entraîner' : k === 'tips' ? '💡 Conseils' : '📋 Préparation'}
//                 </button>
//               ))}
//             </div>

//             {/* ── TAB: PRACTICE ── */}
//             {activeTab === 'practice' && (
//               <div className="fu">
//                 {/* Interview types */}
//                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 24 }}>
//                   {INTERVIEW_TYPES.map(t => (
//                     <div key={t.id} onClick={() => setInterviewType(t.id)}
//                       style={{ border: `1.5px solid ${interviewType === t.id ? t.color : 'var(--border)'}`, borderRadius: 12, padding: '16px 14px', cursor: 'pointer', background: interviewType === t.id ? `${t.color}10` : 'var(--bg3)', transition: 'all .2s' }}>
//                       <div style={{ fontSize: 26, marginBottom: 8 }}>{t.icon}</div>
//                       <p style={{ fontWeight: 600, fontSize: 13, color: interviewType === t.id ? t.color : 'var(--text)', marginBottom: 3 }}>{t.title}</p>
//                       <p style={{ fontSize: 11, color: 'var(--muted)' }}>{t.desc}</p>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Customization */}
//                 <div className="glass" style={{ padding: 22, marginBottom: 20 }}>
//                   <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
//                     Personnalise l'entretien <span style={{ color: '#8b5cf6' }}>(optionnel mais recommandé)</span>
//                   </p>
//                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
//                     <div>
//                       <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Poste visé</label>
//                       <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="ex: Développeur React Senior, Data Analyst..." />
//                     </div>
//                     <div>
//                       <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Entreprise cible</label>
//                       <input value={company} onChange={e => setCompany(e.target.value)} placeholder="ex: Google, Vermeg, BNP Paribas..." />
//                     </div>
//                   </div>
//                   <div>
//                     <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
//                       Colle ton profil / compétences ici <span style={{ color: '#8b5cf6' }}>(pour des questions ultra-personnalisées)</span>
//                     </label>
//                     <textarea
//                       value={cvDescription}
//                       onChange={e => setCvDescription(e.target.value)}
//                       placeholder="Ex: 4 ans d'expérience React/Node.js, j'ai travaillé sur une plateforme SaaS avec 10k users, je maîtrise Docker, AWS, MongoDB..."
//                       rows={3}
//                       style={{ resize: 'vertical' }}
//                     />
//                   </div>
//                   <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
//                     💡 Plus tu donnes d'infos, plus les questions seront précises et pertinentes pour ton profil réel.
//                   </p>
//                 </div>

//                 <div style={{ textAlign: 'center' }}>
//                   <button className="btn btn-primary" onClick={() => setPhase('setup')} style={{ padding: '13px 40px', fontSize: 15 }}>
//                     🎤 Commencer l'entretien →
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* ── TAB: TIPS ── */}
//             {activeTab === 'tips' && (
//               <div className="fu" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
//                 {[
//                   { icon: '⏱️', title: 'Méthode STAR', c: '#00d68f', desc: 'Situation → Tâche → Action → Résultat. Structure indispensable pour toute question comportementale. Entraîne-toi à l\'appliquer sur chaque réponse.' },
//                   { icon: '📊', title: 'Quantifie tout', c: '#4f8ef7', desc: 'Remplace "j\'ai amélioré les performances" par "j\'ai réduit le temps de chargement de 60% passant de 8s à 3s". Les chiffres créent la crédibilité.' },
//                   { icon: '🎯', title: 'Sois spécifique', c: '#8b5cf6', desc: 'Cite des noms de technologies précis, des dates, des tailles d\'équipe. Évite les généralités qui sonnent comme des clichés.' },
//                   { icon: '🔄', title: 'Reformule la question', c: '#f59e0b', desc: '"Si je comprends bien, vous me demandez..." — Ça montre que tu écoutes, te donne du temps et confirme que tu réponds à la bonne question.' },
//                   { icon: '🧘', title: 'Gère les blancs', c: '#ef4444', desc: '"Bonne question, laissez-moi réfléchir 2 secondes." C\'est bien vu par les recruteurs — bien mieux que de bafouiller immédiatement.' },
//                   { icon: '❓', title: 'Prépare tes questions', c: '#00d68f', desc: '3-5 questions intelligentes à poser au recruteur : challenges de l\'équipe, stack technique, processus d\'onboarding, évolution possible.' },
//                 ].map((tip, i) => (
//                   <div key={i} className="glass" style={{ padding: 20 }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
//                       <span style={{ fontSize: 24 }}>{tip.icon}</span>
//                       <h3 style={{ fontSize: 14, color: tip.c, fontWeight: 700 }}>{tip.title}</h3>
//                     </div>
//                     <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>{tip.desc}</p>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* ── TAB: PREP ── */}
//             {activeTab === 'prep' && (
//               <div className="fu" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
//                 {[
//                   { title: '📚 Avant l\'entretien', items: ['Recherche l\'entreprise : news récentes, concurrents, culture, valeurs', 'Note 3 projets avec métriques (réduction de X%, équipe de N personnes)', 'Prépare 5 questions à poser au recruteur', 'Relis la fiche de poste et identifie les mots-clés ATS', 'Fais une liste de tes forces et faiblesses avec exemples concrets'] },
//                   { title: '🎯 Pendant l\'entretien', items: ['Arrive / connecte-toi 5 min en avance', 'Écoute la question complète avant de répondre', 'Parle lentement, structuré, avec des pauses', 'Reformule si une question est floue', 'Prends des notes discrètes si possible'] },
//                   { title: '📊 Structure STAR détaillée', items: ['S → Situation : "Dans mon poste chez X, nous faisions face à..."', 'T → Tâche : "Ma responsabilité était de..."', 'A → Action : "J\'ai décidé de... en faisant concrètement..."', 'R → Résultat : "En résultat, nous avons obtenu... (+X%, -Y jours...)"', 'Toujours terminer par l\'apprentissage / leçon tirée'] },
//                   { title: '❓ Questions à poser au recruteur', items: ['Quels sont les principaux challenges techniques de ce poste ?', 'Comment se passe l\'onboarding des nouveaux développeurs ?', 'Quelle est la stack et comment les décisions techniques sont-elles prises ?', 'Quelles sont les opportunités d\'évolution à 2 ans ?', 'Quelle est la prochaine étape du processus de recrutement ?'] },
//                 ].map((section, i) => (
//                   <div key={i} className="glass" style={{ padding: 20 }}>
//                     <h3 style={{ fontSize: 15, marginBottom: 14 }}>{section.title}</h3>
//                     <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
//                       {section.items.map((item, j) => (
//                         <li key={j} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
//                           <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
//                           <span style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{item}</span>
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {/* ════════════════════════════════════════════════════════
//             PHASE: SETUP
//         ════════════════════════════════════════════════════════ */}
//         {phase === 'setup' && (
//           <div className="glass fu" style={{ padding: 36, maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
//             <div style={{ fontSize: 44, marginBottom: 16 }}>🤖</div>
//             <h2 style={{ fontSize: 22, marginBottom: 8 }}>L'IA prépare tes questions</h2>
//             <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
//               Type : <strong style={{ color: 'var(--text)' }}>{INTERVIEW_TYPES.find(t => t.id === interviewType)?.title}</strong>
//               {jobTitle && <><br />Poste : <strong style={{ color: '#8b5cf6' }}>{jobTitle}</strong></>}
//               {company && <> chez <strong style={{ color: 'var(--text)' }}>{company}</strong></>}
//             </p>

//             {/* What AI will do */}
//             <div style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
//               <p style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 700, marginBottom: 10 }}>🧠 Ce que l'IA va faire :</p>
//               {[
//                 'Analyser ton profil et tes compétences',
//                 'Générer des questions ciblées sur ta stack',
//                 'Adapter la difficulté à ton niveau',
//                 'Évaluer chaque réponse avec feedback détaillé',
//               ].map((item, i) => (
//                 <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
//                   <span style={{ color: '#8b5cf6' }}>→</span>
//                   <span style={{ color: 'var(--muted)' }}>{item}</span>
//                 </div>
//               ))}
//             </div>

//             <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, textAlign: 'left' }}>
//               <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 }}>Rappels :</p>
//               {['2 minutes par question · Ctrl+Enter pour valider', 'Utilise la méthode STAR pour les questions comportementales', 'Sois spécifique — des chiffres valent mille mots'].map((c, i) => (
//                 <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
//                   <span style={{ color: 'var(--green)' }}>✓</span>
//                   <span style={{ color: 'var(--muted)' }}>{c}</span>
//                 </div>
//               ))}
//             </div>

//             <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
//               <button className="btn" onClick={() => setPhase('home')}>← Retour</button>
//               <button className="btn btn-primary" onClick={startInterview} disabled={loading} style={{ padding: '11px 28px' }}>
//                 {loading
//                   ? <><span className="spin" style={{ display: 'inline-block', marginRight: 6 }}>⟳</span> IA génère les questions...</>
//                   : '🚀 Démarrer l\'entretien →'}
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ════════════════════════════════════════════════════════
//             PHASE: SESSION
//         ════════════════════════════════════════════════════════ */}
//         {phase === 'session' && q && (
//           <div className="fu">

//             {/* Progress bar */}
//             <div style={{ marginBottom: 20 }}>
//               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
//                   <span style={{ fontSize: 13, color: 'var(--muted)' }}>Question {currentQ + 1} / {questions.length}</span>
//                   {q.category && <span className="tag" style={{ background: 'rgba(139,92,246,.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,.25)' }}>{q.category}</span>}
//                 </div>
//                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
//                   <Timer seconds={timeLeft} active={timerActive} />
//                   {!timerActive && !currentEval && (
//                     <button onClick={() => { setTimerActive(true); setQuestionStartTime(Date.now()); }} className="btn" style={{ fontSize: 11, padding: '5px 12px' }}>
//                       ▶ Timer
//                     </button>
//                   )}
//                 </div>
//               </div>
//               <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
//                 <div style={{ height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`, background: 'linear-gradient(90deg, #8b5cf6, #4f8ef7)', borderRadius: 2, transition: 'width .5s' }} />
//               </div>

//               {/* Question dots */}
//               <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center' }}>
//                 {questions.map((_, i) => (
//                   <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < currentQ ? 'var(--green)' : i === currentQ ? '#8b5cf6' : 'var(--bg3)', border: `1px solid ${i === currentQ ? '#8b5cf6' : 'var(--border)'}`, transition: 'all .3s' }} />
//                 ))}
//               </div>
//             </div>

//             {/* Question card */}
//             <div className="glass" style={{ padding: 24, marginBottom: 16, border: '1px solid rgba(139,92,246,.2)' }}>
//               <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
//                 <span style={{ fontSize: 20 }}>{TYPE_CONFIG[q.type]?.icon}</span>
//                 <span className="tag" style={{ background: TYPE_CONFIG[q.type]?.bg, color: TYPE_CONFIG[q.type]?.color, border: `1px solid ${TYPE_CONFIG[q.type]?.color}44` }}>
//                   {TYPE_CONFIG[q.type]?.label}
//                 </span>
//                 <DiffBadge d={q.difficulty} />
//                 {q.category && <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {q.category}</span>}
//               </div>

//               <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }}>{q.question}</p>

//               <button onClick={() => setShowHint(!showHint)}
//                 style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
//                 💡 {showHint ? 'Cacher' : 'Voir'} l'indice
//               </button>
//               {showHint && (
//                 <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, fontSize: 13, color: '#f59e0b', lineHeight: 1.6 }}>
//                   {q.hint}
//                 </div>
//               )}
//             </div>

//             {/* Answer zone */}
//             {!currentEval ? (
//               <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
//                 <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, display: 'block', marginBottom: 10 }}>Ta réponse</label>
//                 <textarea
//                   ref={textRef}
//                   value={answer}
//                   onChange={e => setAnswer(e.target.value)}
//                   placeholder="Rédige ta réponse ici... Utilise des exemples concrets, des chiffres, et structure avec STAR si possible."
//                   rows={6}
//                   style={{ resize: 'vertical', lineHeight: 1.7 }}
//                   onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) submitAnswer(); }}
//                 />
//                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
//                   <span style={{ fontSize: 11, color: 'var(--muted)' }}>
//                     {answer.split(' ').filter(Boolean).length} mots · Ctrl+Enter pour valider
//                   </span>
//                   <button className="btn btn-primary" onClick={submitAnswer} disabled={!answer.trim() || evaluating}
//                     style={{ padding: '9px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
//                     {evaluating
//                       ? <><span className="spin" style={{ display: 'inline-block' }}>⟳</span> Évaluation IA...</>
//                       : '🤖 Évaluer ma réponse →'}
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               /* ── EVALUATION ── */
//               <div className="fu" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

//                 {/* Score + feedback */}
//                 <div className="glass" style={{
//                   padding: 20,
//                   border: `1px solid ${(currentEval.score || 0) >= 80 ? 'rgba(0,214,143,.3)' : (currentEval.score || 0) >= 60 ? 'rgba(245,158,11,.3)' : 'rgba(239,68,68,.3)'}`,
//                   display: 'flex', gap: 18, alignItems: 'flex-start',
//                 }}>
//                   <div style={{
//                     width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
//                     background: `${(currentEval.score || 0) >= 80 ? '#00d68f' : (currentEval.score || 0) >= 60 ? '#f59e0b' : '#ef4444'}18`,
//                     border: `2px solid ${(currentEval.score || 0) >= 80 ? '#00d68f' : (currentEval.score || 0) >= 60 ? '#f59e0b' : '#ef4444'}`,
//                     display: 'flex', alignItems: 'center', justifyContent: 'center',
//                     fontWeight: 800, fontSize: 18,
//                     color: (currentEval.score || 0) >= 80 ? '#00d68f' : (currentEval.score || 0) >= 60 ? '#f59e0b' : '#ef4444',
//                   }}>
//                     {currentEval.score}
//                   </div>
//                   <div style={{ flex: 1 }}>
//                     <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Feedback IA</p>
//                     <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{currentEval.feedback}</p>
//                     {currentEval.timeSpent && (
//                       <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
//                         ⏱ Temps de réponse : {currentEval.timeSpent}s
//                       </p>
//                     )}
//                   </div>
//                 </div>

//                 {/* Strengths + improvements */}
//                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
//                   {(currentEval.strengths?.length || 0) > 0 && (
//                     <div className="glass" style={{ padding: 16 }}>
//                       <p style={{ fontSize: 11, color: '#00d68f', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>💪 Points forts</p>
//                       {currentEval.strengths?.map((s, i) => (
//                         <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 7 }}>
//                           <span style={{ color: '#00d68f', flexShrink: 0 }}>✓</span>
//                           <span style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{s}</span>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                   {(currentEval.improvements?.length || 0) > 0 && (
//                     <div className="glass" style={{ padding: 16 }}>
//                       <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>🔧 À améliorer</p>
//                       {currentEval.improvements?.map((s, i) => (
//                         <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 7 }}>
//                           <span style={{ color: '#f59e0b', flexShrink: 0 }}>→</span>
//                           <span style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{s}</span>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {/* Better answer */}
//                 {currentEval.betterAnswer && (
//                   <div className="glass" style={{ padding: 16, border: '1px solid rgba(79,142,247,.2)', background: 'rgba(79,142,247,.04)' }}>
//                     <p style={{ fontSize: 11, color: '#4f8ef7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>✨ Exemple de réponse optimale</p>
//                     <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, fontStyle: 'italic' }}>"{currentEval.betterAnswer}"</p>
//                   </div>
//                 )}

//                 <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
//                   <button className="btn btn-primary" onClick={nextQuestion} style={{ padding: '11px 28px', fontSize: 14 }}>
//                     {currentQ < questions.length - 1 ? 'Question suivante →' : 'Voir mon résultat final →'}
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* ════════════════════════════════════════════════════════
//             PHASE: RESULT
//         ════════════════════════════════════════════════════════ */}
//         {phase === 'result' && (
//           <div className="fu">
//             <div style={{ textAlign: 'center', marginBottom: 32 }}>
//               <h1 style={{ fontSize: 28, marginBottom: 6, fontFamily: 'Syne' }}>Entretien terminé ! 🎉</h1>
//               <p style={{ color: 'var(--muted)', fontSize: 14 }}>Voici ton score global et tes recommandations personnalisées</p>
//             </div>

//             {/* Global score */}
//             <div className="glass" style={{ padding: 32, textAlign: 'center', marginBottom: 24, border: `1px solid ${finalScore >= 80 ? 'rgba(0,214,143,.3)' : finalScore >= 60 ? 'rgba(245,158,11,.3)' : 'rgba(239,68,68,.3)'}` }}>
//               <ScoreArc score={finalScore} />
//               <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 16, marginBottom: 16, lineHeight: 1.6 }}>
//                 {finalScore >= 85 ? '🎉 Excellent ! Tu es prêt pour les vrais entretiens. Continue à pratiquer pour maintenir ce niveau.' :
//                   finalScore >= 70 ? '👍 Bien joué ! Peaufine les points d\'amélioration ci-dessous et tu seras imbattable.' :
//                     finalScore >= 55 ? '💪 Bon début ! Focalise-toi sur la méthode STAR et les métriques chiffrées.' :
//                       '📚 Continue l\'entraînement quotidiennement — la progression est rapide avec de la pratique régulière.'}
//               </p>

//               <div style={{ display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
//                 {[
//                   { n: answers.filter(a => a.score >= 80).length, label: 'Excellentes', color: '#00d68f' },
//                   { n: answers.filter(a => a.score >= 60 && a.score < 80).length, label: 'Bonnes', color: '#f59e0b' },
//                   { n: answers.filter(a => a.score < 60).length, label: 'À améliorer', color: '#ef4444' },
//                   { n: Math.round(answers.reduce((s, a) => s + (a.timeSpent || 60), 0) / 60), label: 'min total', color: '#8b5cf6' },
//                 ].map(({ n, label, color }, i) => (
//                   <div key={i} style={{ textAlign: 'center' }}>
//                     <p style={{ fontSize: 26, fontWeight: 800, color, margin: 0 }}>{n}</p>
//                     <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{label}</p>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             {/* Per-question review */}
//             <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Analyse question par question</h3>
//             <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
//               {answers.map((a, i) => (
//                 <div key={i} className="glass" style={{ padding: '16px 20px' }}>
//                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
//                     <div style={{
//                       width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
//                       background: `${a.score >= 80 ? '#00d68f' : a.score >= 60 ? '#f59e0b' : '#ef4444'}18`,
//                       border: `2px solid ${a.score >= 80 ? '#00d68f' : a.score >= 60 ? '#f59e0b' : '#ef4444'}`,
//                       display: 'flex', alignItems: 'center', justifyContent: 'center',
//                       fontWeight: 800, fontSize: 14,
//                       color: a.score >= 80 ? '#00d68f' : a.score >= 60 ? '#f59e0b' : '#ef4444',
//                     }}>
//                       {a.score}
//                     </div>
//                     <div style={{ flex: 1 }}>
//                       <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
//                         <span className="tag" style={{ background: TYPE_CONFIG[a.question?.type]?.bg, color: TYPE_CONFIG[a.question?.type]?.color }}>
//                           {TYPE_CONFIG[a.question?.type]?.icon} {TYPE_CONFIG[a.question?.type]?.label}
//                         </span>
//                         {a.question?.category && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{a.question.category}</span>}
//                       </div>
//                       <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Q{i + 1}: {a.question?.question?.slice(0, 90)}{(a.question?.question?.length || 0) > 90 ? '...' : ''}</p>
//                       <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{a.feedback}</p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* CTA buttons */}
//             <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
//               <button className="btn btn-primary"
//                 onClick={() => { setPhase('home'); setAnswers([]); setCurrentQ(0); setAnswer(''); setCurrentEval(null); }}
//                 style={{ padding: '11px 22px' }}>
//                 🔄 Recommencer
//               </button>
//               <Link href="/cv" className="btn" style={{ padding: '11px 22px' }}>📄 Améliorer mon CV</Link>
//               <Link href="/dashboard" className="btn" style={{ padding: '11px 22px' }}>🔍 Chercher des offres</Link>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
// 'use client';
// import { useState, useRef, useEffect } from 'react';
// import Link from 'next/link';
// import { useAuth } from '../../lib/auth';
// import api from '../../lib/api';

// type Phase = 'home' | 'setup' | 'session' | 'result';
// type QType = 'hr' | 'technical' | 'behavioral' | 'situational';

// interface Question {
//   id: number;
//   type: QType;
//   question: string;
//   hint: string;
//   difficulty: 'easy' | 'medium' | 'hard';
// }

// interface Answer {
//   question: Question;
//   answer: string;
//   score: number;
//   feedback: string;
//   strengths: string[];
//   improvements: string[];
//   betterAnswer: string;
// }

// const TYPE_CONFIG: Record<QType, { label: string; color: string; bg: string; icon: string }> = {
//   hr:          { label: 'RH',          color: 'var(--green)',  bg: 'var(--green-gl)',            icon: '🤝' },
//   technical:   { label: 'Technique',   color: 'var(--blue)',   bg: 'rgba(79,142,247,.08)',        icon: '💻' },
//   behavioral:  { label: 'Comportemental', color: 'var(--amber)',  bg: 'rgba(245,158,11,.08)',     icon: '🧠' },
//   situational: { label: 'Situationnel', color: 'var(--purple)', bg: 'rgba(139,92,246,.08)',       icon: '🎯' },
// };

// const INTERVIEW_TYPES = [
//   { id: 'mixed',      icon: '🎯', title: 'Entretien complet',    desc: 'Mix RH + Technique + Comportemental', color: 'var(--green)' },
//   { id: 'hr',         icon: '🤝', title: 'Entretien RH',         desc: 'Soft skills, motivation, parcours',   color: 'var(--blue)' },
//   { id: 'technical',  icon: '💻', title: 'Entretien technique',  desc: 'Compétences, projets, problèmes',     color: 'var(--purple)' },
//   { id: 'behavioral', icon: '🧠', title: 'Questions comportement', desc: 'Méthode STAR, situations concrètes', color: 'var(--amber)' },
// ];

// const TIPS = [
//   { icon: '⏱️', title: 'Méthode STAR', desc: 'Situation → Tâche → Action → Résultat. Utilise cette structure pour chaque réponse comportementale.' },
//   { icon: '🎯', title: 'Sois spécifique', desc: 'Cite des chiffres, des dates, des technologies précises. Évite les généralités comme "j\'ai amélioré le projet".' },
//   { icon: '🔄', title: 'Reformule', desc: 'Reformule la question avant de répondre. Ça montre que tu écoutes et te donne le temps de réfléchir.' },
//   { icon: '💡', title: 'Questions à poser', desc: 'Prépare 3-5 questions sur l\'équipe, les challenges, la culture. Ça montre ton intérêt réel.' },
//   { icon: '🧘', title: 'Gère le stress', desc: 'Si tu ne sais pas, dis "Bonne question, laissez-moi réfléchir 2 secondes". Ça montre de la maturité.' },
//   { icon: '📊', title: 'Quantifie tout', desc: 'Remplace "j\'ai géré une grosse équipe" par "j\'ai managé une équipe de 8 personnes sur 6 mois".' },
// ];

// function ScoreArc({ score }: { score: number }) {
//   const color = score >= 80 ? '#00D68F' : score >= 60 ? '#F59E0B' : '#EF4444';
//   const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Bien' : 'À améliorer';
//   const r = 60, cx = 72, cy = 72;
//   const circ = 2 * Math.PI * r;
//   const dash = (score / 100) * circ;
//   return (
//     <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
//       <svg width="144" height="144">
//         <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg3)" strokeWidth="10"/>
//         <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
//           strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
//           style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dasharray 1.5s ease' }}/>
//         <text x={cx} y={cy-8} textAnchor="middle" style={{ fill:color, fontSize:32, fontWeight:800, fontFamily:'Syne,sans-serif' }}>{score}</text>
//         <text x={cx} y={cy+14} textAnchor="middle" style={{ fill:'#7A8499', fontSize:11 }}>/ 100</text>
//       </svg>
//       <span style={{ fontSize:13, fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}44`, padding:'5px 16px', borderRadius:20 }}>{label}</span>
//     </div>
//   );
// }

// function DifficultyBadge({ d }: { d: string }) {
//   const c = d==='easy'?'var(--green)':d==='medium'?'var(--amber)':'var(--red)';
//   const l = d==='easy'?'Facile':d==='medium'?'Moyen':'Difficile';
//   return <span style={{ fontSize:10, padding:'3px 8px', borderRadius:12, background:`${c}18`, color:c, border:`1px solid ${c}44`, fontWeight:600 }}>{l}</span>;
// }

// export default function InterviewCoach() {
//   const { user } = useAuth();
//   const [phase, setPhase]           = useState<Phase>('home');
//   const [interviewType, setInterviewType] = useState('mixed');
//   const [jobTitle, setJobTitle]     = useState('');
//   const [company, setCompany]       = useState('');
//   const [questions, setQuestions]   = useState<Question[]>([]);
//   const [currentQ, setCurrentQ]     = useState(0);
//   const [answer, setAnswer]         = useState('');
//   const [answers, setAnswers]       = useState<Answer[]>([]);
//   const [loading, setLoading]       = useState(false);
//   const [evaluating, setEvaluating] = useState(false);
//   const [currentEval, setCurrentEval] = useState<Partial<Answer>|null>(null);
//   const [timeLeft, setTimeLeft]     = useState(120);
//   const [timerActive, setTimerActive] = useState(false);
//   const [showHint, setShowHint]     = useState(false);
//   const [finalScore, setFinalScore] = useState(0);
//   const [activeTab, setActiveTab]   = useState<'practice'|'tips'|'prep'>('practice');
//   const timerRef = useRef<NodeJS.Timeout>();
//   const textRef  = useRef<HTMLTextAreaElement>(null);

//   useEffect(() => {
//     if (timerActive && timeLeft > 0) {
//       timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
//     } else if (timeLeft === 0) {
//       setTimerActive(false);
//     }
//     return () => clearTimeout(timerRef.current);
//   }, [timerActive, timeLeft]);

//   const startInterview = async () => {
//     setLoading(true);
//     try {
//       const cvRes = await api.get('/api/cv/my').catch(() => null);
//       const res = await api.post('/api/applications/interview/questions', {
//         job: { title: jobTitle || 'Développeur', company: company || 'Entreprise', description: '' },
//         type: interviewType,
//         cv: cvRes?.data?.analysis || {},
//       });
//       setQuestions(res.data.questions || generateFallbackQuestions(interviewType));
//       setCurrentQ(0); setAnswers([]); setAnswer('');
//       setTimeLeft(120); setTimerActive(false); setShowHint(false); setCurrentEval(null);
//       setPhase('session');
//     } catch {
//       setQuestions(generateFallbackQuestions(interviewType));
//       setPhase('session');
//     } finally { setLoading(false); }
//   };

//   const generateFallbackQuestions = (type: string): Question[] => {
//     const hr: Question[] = [
//       { id:1, type:'hr', question:'Parlez-moi de vous et de votre parcours professionnel.', hint:'Structure: Formation → Expériences → Pourquoi ce poste. Maximum 2 minutes.', difficulty:'easy' },
//       { id:2, type:'hr', question:'Pourquoi voulez-vous rejoindre notre entreprise ?', hint:'Montre que tu as fait des recherches sur la société. Cite des projets ou valeurs spécifiques.', difficulty:'easy' },
//       { id:3, type:'behavioral', question:'Décrivez une situation où vous avez résolu un conflit dans une équipe.', hint:'Utilise STAR: Situation → Tâche → Action → Résultat. Sois spécifique.', difficulty:'medium' },
//     ];
//     const tech: Question[] = [
//       { id:4, type:'technical', question:'Quels sont les 3 projets techniques dont vous êtes le plus fier ?', hint:'Cite les technologies utilisées, ton rôle précis, et les résultats mesurables.', difficulty:'medium' },
//       { id:5, type:'technical', question:'Comment gérez-vous la dette technique dans un projet ?', hint:'Montre que tu comprends le compromis entre vitesse et qualité. Donne un exemple concret.', difficulty:'hard' },
//     ];
//     const situation: Question[] = [
//       { id:6, type:'situational', question:'Si vous deviez livrer un projet en retard, comment géreriez-vous la situation ?', hint:'Montre ta capacité à communiquer proactivement et à proposer des solutions.', difficulty:'medium' },
//       { id:7, type:'situational', question:'Votre manager vous demande de faire quelque chose que vous trouvez techniquement incorrect. Que faites-vous ?', hint:'Montre que tu sais t\'affirmer professionnellement tout en restant constructif.', difficulty:'hard' },
//     ];
//     if (type === 'hr') return hr;
//     if (type === 'technical') return tech;
//     if (type === 'behavioral') return [...hr.filter(q=>q.type==='behavioral'), ...situation];
//     return [...hr, ...tech, ...situation].slice(0, 5);
//   };

//   const submitAnswer = async () => {
//     if (!answer.trim() || evaluating) return;
//     setEvaluating(true); setTimerActive(false);
//     try {
//       const res = await api.post('/api/applications/interview/evaluate', {
//         question: questions[currentQ].question,
//         answer,
//       });
//       const evalResult: Partial<Answer> = {
//         question: questions[currentQ],
//         answer,
//         score: res.data.score || 70,
//         feedback: res.data.feedback || 'Bonne réponse globalement.',
//         strengths: res.data.strengths || [],
//         improvements: res.data.improvements || [],
//         betterAnswer: res.data.betterAnswer || '',
//       };
//       setCurrentEval(evalResult);
//     } catch {
//       setCurrentEval({ question:questions[currentQ], answer, score:70, feedback:'Réponse enregistrée.', strengths:[], improvements:[], betterAnswer:'' });
//     } finally { setEvaluating(false); }
//   };

//   const nextQuestion = () => {
//     if (currentEval) {
//       setAnswers(prev => [...prev, currentEval as Answer]);
//     }
//     if (currentQ < questions.length - 1) {
//       setCurrentQ(q => q + 1);
//       setAnswer(''); setCurrentEval(null); setShowHint(false);
//       setTimeLeft(120); setTimerActive(false);
//     } else {
//       const all = [...answers, ...(currentEval ? [currentEval as Answer] : [])];
//       const avg = Math.round(all.reduce((s,a) => s + (a.score||70), 0) / (all.length||1));
//       setFinalScore(avg);
//       setAnswers(all);
//       setPhase('result');
//     }
//   };

//   const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
//   const q = questions[currentQ];
//   const progress = questions.length > 0 ? ((currentQ) / questions.length) * 100 : 0;

//   return (
//     <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
//       <style>{`
//         @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
//         @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
//         .fu { animation: fadeUp .3s ease forwards; }
//         .pulse { animation: pulse 1.5s ease infinite; }
//       `}</style>

//       {/* Navbar */}
//       <nav style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
//         <div style={{ display:'flex', alignItems:'center', gap:8 }}>
//           <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--purple)', boxShadow:'0 0 8px var(--purple)' }}/>
//           <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:16 }}>Interview Coach <span style={{ color:'var(--purple)' }}>IA</span></span>
//         </div>
//         <div style={{ display:'flex', gap:10 }}>
//           <Link href="/welcome" className="btn" style={{ fontSize:12, padding:'5px 14px' }}>← Accueil</Link>
//           <Link href="/cv" className="btn" style={{ fontSize:12, padding:'5px 14px' }}>📄 Mon CV</Link>
//           <Link href="/dashboard" className="btn" style={{ fontSize:12, padding:'5px 14px' }}>🔍 Offres</Link>
//         </div>
//       </nav>

//       <div style={{ maxWidth:860, margin:'0 auto', padding:'32px 20px' }}>

//         {/* ════ HOME ════ */}
//         {phase === 'home' && (
//           <div className="fu">
//             <div style={{ textAlign:'center', marginBottom:40 }}>
//               <div style={{ fontSize:56, marginBottom:16 }}>🎤</div>
//               <h1 style={{ fontSize:32, marginBottom:8 }}>Interview Coach <span className="gradient-text">IA</span></h1>
//               <p style={{ color:'var(--muted)', fontSize:14, maxWidth:500, margin:'0 auto', lineHeight:1.7 }}>
//                 Entraîne-toi avec des entretiens simulés, reçois un feedback IA instantané et améliore tes chances de décrocher le poste.
//               </p>
//             </div>

//             {/* Tabs */}
//             <div style={{ display:'flex', gap:4, marginBottom:28, background:'var(--bg2)', padding:4, borderRadius:10, border:'1px solid var(--border)', width:'fit-content', margin:'0 auto 28px' }}>
//               {([['practice','🎯 S\'entraîner'],['tips','💡 Conseils'],['prep','📋 Préparation']] as const).map(([k,l])=>(
//                 <button key={k} onClick={()=>setActiveTab(k)}
//                   style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Inter', fontSize:13, fontWeight:500,
//                     background:activeTab===k?'var(--purple)':'transparent', color:activeTab===k?'#fff':'var(--muted)', transition:'all .2s' }}>
//                   {l}
//                 </button>
//               ))}
//             </div>

//             {/* TAB: PRACTICE */}
//             {activeTab === 'practice' && (
//               <div className="fu">
//                 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:28 }}>
//                   {INTERVIEW_TYPES.map(t=>(
//                     <div key={t.id} onClick={()=>setInterviewType(t.id)}
//                       style={{ border:`1.5px solid ${interviewType===t.id?t.color:'var(--border)'}`, borderRadius:12, padding:'18px 16px', cursor:'pointer', background: interviewType===t.id?`${t.color}10`:'var(--bg3)', transition:'all .2s' }}>
//                       <div style={{ fontSize:28, marginBottom:10 }}>{t.icon}</div>
//                       <p style={{ fontWeight:600, fontSize:14, color: interviewType===t.id?t.color:'var(--text)', marginBottom:4 }}>{t.title}</p>
//                       <p style={{ fontSize:12, color:'var(--muted)' }}>{t.desc}</p>
//                     </div>
//                   ))}
//                 </div>

//                 {/* Setup form */}
//                 <div className="glass" style={{ padding:24, marginBottom:20 }}>
//                   <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>Personnalise ton entretien (optionnel)</p>
//                   <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
//                     <div>
//                       <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Poste visé</label>
//                       <input value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="ex: Développeur IA, Data Scientist..."/>
//                     </div>
//                     <div>
//                       <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6 }}>Entreprise</label>
//                       <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="ex: Google, Vermeg, Capgemini..."/>
//                     </div>
//                   </div>
//                   <p style={{ fontSize:12, color:'var(--muted)', marginTop:10 }}>
//                     💡 L'IA adapte les questions à ton CV si tu en as uploadé un.
//                   </p>
//                 </div>

//                 <div style={{ textAlign:'center' }}>
//                   <button className="btn btn-primary" onClick={()=>setPhase('setup')} style={{ padding:'13px 40px', fontSize:15 }}>
//                     🎤 Commencer l'entretien →
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* TAB: TIPS */}
//             {activeTab === 'tips' && (
//               <div className="fu">
//                 <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
//                   {TIPS.map((tip,i)=>(
//                     <div key={i} className="glass" style={{ padding:20 }}>
//                       <div style={{ fontSize:28, marginBottom:10 }}>{tip.icon}</div>
//                       <h3 style={{ fontSize:15, marginBottom:8, color:'var(--green)' }}>{tip.title}</h3>
//                       <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7 }}>{tip.desc}</p>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* TAB: PREP */}
//             {activeTab === 'prep' && (
//               <div className="fu" style={{ display:'flex', flexDirection:'column', gap:16 }}>
//                 {[
//                   { title:'📚 Avant l\'entretien', items:['Recherche l\'entreprise sur LinkedIn, leur site et Glassdoor','Note 3 projets concrets avec des métriques (réduction de 30%, équipe de 5 personnes...)','Prépare 5 questions à poser au recruteur','Fais une liste de tes forces et faiblesses avec exemples','Réécoute ou relis la description du poste'] },
//                   { title:'🎯 Pendant l\'entretien', items:['Arriver 5 min en avance (ou être connecté 2 min avant en visio)','Écoute attentivement avant de répondre','Parle lentement et clairement','Prends des notes si permis','Reformule si la question est floue'] },
//                   { title:'📊 Structure de réponse STAR', items:['S → Situation: Contexte de la situation','T → Tâche: Quel était ton rôle / objectif','A → Action: Ce que tu as fait concrètement','R → Résultat: Résultat mesurable obtenu'] },
//                   { title:'❓ Questions à poser au recruteur', items:['Quels sont les principaux challenges de ce poste ?','Comment se passe l\'onboarding ?','Quelles sont les opportunités d\'évolution ?','Comment fonctionne la collaboration dans l\'équipe ?','Quelle est la prochaine étape du processus de recrutement ?'] },
//                 ].map((section,i)=>(
//                   <div key={i} className="glass" style={{ padding:20 }}>
//                     <h3 style={{ fontSize:15, marginBottom:14, color:'var(--text)' }}>{section.title}</h3>
//                     <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:9 }}>
//                       {section.items.map((item,j)=>(
//                         <li key={j} style={{ display:'flex', gap:10, fontSize:13 }}>
//                           <span style={{ color:'var(--green)', flexShrink:0, marginTop:1 }}>✓</span>
//                           <span style={{ color:'var(--muted)', lineHeight:1.6 }}>{item}</span>
//                         </li>
//                       ))}
//                     </ul>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         )}

//         {/* ════ SETUP CONFIRMATION ════ */}
//         {phase === 'setup' && (
//           <div className="glass fu" style={{ padding:36, maxWidth:500, margin:'0 auto', textAlign:'center' }}>
//             <div style={{ fontSize:48, marginBottom:16 }}>🎤</div>
//             <h2 style={{ fontSize:22, marginBottom:8 }}>Prêt pour l'entretien ?</h2>
//             <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.7, marginBottom:24 }}>
//               {INTERVIEW_TYPES.find(t=>t.id===interviewType)?.title}<br/>
//               {jobTitle && `Poste: ${jobTitle}`}{company && ` chez ${company}`}
//               <br/><br/>
//               Tu auras <strong style={{ color:'var(--text)' }}>2 minutes</strong> par question.<br/>
//               L'IA évaluera chacune de tes réponses en temps réel.
//             </p>
//             <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 20px', marginBottom:24, textAlign:'left' }}>
//               <p style={{ fontSize:12, color:'var(--muted)', marginBottom:8 }}>Conseils :</p>
//               <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
//                 {['Réponds à voix haute si possible','Utilise la méthode STAR','Sois spécifique avec des exemples concrets'].map((c,i)=>(
//                   <li key={i} style={{ fontSize:12, display:'flex', gap:8 }}>
//                     <span style={{ color:'var(--green)' }}>✓</span>
//                     <span style={{ color:'var(--muted)' }}>{c}</span>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//             <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
//               <button className="btn" onClick={()=>setPhase('home')}>← Retour</button>
//               <button className="btn btn-primary" onClick={startInterview} disabled={loading} style={{ padding:'11px 28px' }}>
//                 {loading ? '⏳ Préparation...' : '🚀 Démarrer →'}
//               </button>
//             </div>
//           </div>
//         )}

//         {/* ════ SESSION ════ */}
//         {phase === 'session' && q && (
//           <div className="fu">
//             {/* Progress */}
//             <div style={{ marginBottom:20 }}>
//               <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
//                 <span style={{ fontSize:13, color:'var(--muted)' }}>Question {currentQ+1} / {questions.length}</span>
//                 <div style={{ display:'flex', alignItems:'center', gap:10 }}>
//                   {/* Timer */}
//                   <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--bg3)', border:`1px solid ${timeLeft<30?'var(--red)':'var(--border)'}`, borderRadius:20, padding:'4px 12px' }}>
//                     <span style={{ fontSize:12, color: timeLeft<30?'var(--red)':'var(--muted)' }}>⏱</span>
//                     <span style={{ fontSize:13, fontWeight:700, color: timeLeft<30?'var(--red)':'var(--text)', fontFamily:'monospace' }}>{formatTime(timeLeft)}</span>
//                   </div>
//                   {!timerActive && !currentEval && (
//                     <button onClick={()=>setTimerActive(true)} className="btn" style={{ fontSize:11, padding:'4px 10px' }}>
//                       ▶ Démarrer le timer
//                     </button>
//                   )}
//                 </div>
//               </div>
//               <div style={{ height:4, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
//                 <div style={{ height:'100%', width:`${((currentQ+1)/questions.length)*100}%`, background:'linear-gradient(90deg,var(--purple),var(--blue))', borderRadius:2, transition:'width .5s ease' }}/>
//               </div>
//             </div>

//             {/* Question card */}
//             <div className="glass" style={{ padding:24, marginBottom:16, border:'1px solid rgba(139,92,246,.2)' }}>
//               <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
//                 <span style={{ fontSize:20 }}>{TYPE_CONFIG[q.type]?.icon}</span>
//                 <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:12, background: TYPE_CONFIG[q.type]?.bg, color: TYPE_CONFIG[q.type]?.color, border:`1px solid ${TYPE_CONFIG[q.type]?.color}44` }}>
//                   {TYPE_CONFIG[q.type]?.label}
//                 </span>
//                 <DifficultyBadge d={q.difficulty}/>
//               </div>
//               <p style={{ fontSize:17, fontWeight:600, lineHeight:1.5, marginBottom:14 }}>{q.question}</p>

//               {/* Hint */}
//               <button onClick={()=>setShowHint(!showHint)} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
//                 💡 {showHint ? 'Cacher' : 'Voir'} l'indice
//               </button>
//               {showHint && (
//                 <div style={{ marginTop:10, padding:'12px 14px', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, fontSize:13, color:'var(--amber)', lineHeight:1.6 }}>
//                   {q.hint}
//                 </div>
//               )}
//             </div>

//             {/* Answer */}
//             {!currentEval ? (
//               <div className="glass" style={{ padding:20, marginBottom:16 }}>
//                 <label style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:10 }}>Ta réponse</label>
//                 <textarea ref={textRef} value={answer} onChange={e=>setAnswer(e.target.value)}
//                   placeholder="Tape ta réponse ici... Sois précis et utilise des exemples concrets."
//                   style={{ width:'100%', minHeight:160, padding:14, fontSize:14, lineHeight:1.7, resize:'vertical' }}
//                   onKeyDown={e=>{ if(e.key==='Enter'&&e.ctrlKey) submitAnswer(); }}/>
//                 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
//                   <span style={{ fontSize:11, color:'var(--muted)' }}>Ctrl+Enter pour valider · {answer.split(' ').filter(Boolean).length} mots</span>
//                   <button className="btn btn-primary" onClick={submitAnswer} disabled={!answer.trim()||evaluating} style={{ padding:'9px 20px' }}>
//                     {evaluating ? '🤖 Évaluation IA...' : 'Valider la réponse →'}
//                   </button>
//                 </div>
//               </div>
//             ) : (
//               /* Evaluation result */
//               <div className="fu" style={{ display:'flex', flexDirection:'column', gap:14 }}>
//                 {/* Score */}
//                 <div className="glass" style={{ padding:20, display:'flex', alignItems:'center', gap:20, border:`1px solid ${(currentEval.score||0)>=80?'rgba(0,214,143,.3)':(currentEval.score||0)>=60?'rgba(245,158,11,.3)':'rgba(239,68,68,.3)'}` }}>
//                   <div style={{ width:64, height:64, borderRadius:'50%', background:`${(currentEval.score||0)>=80?'var(--green)':(currentEval.score||0)>=60?'var(--amber)':'var(--red)'}18`, border:`2px solid ${(currentEval.score||0)>=80?'var(--green)':(currentEval.score||0)>=60?'var(--amber)':'var(--red)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:20, color:(currentEval.score||0)>=80?'var(--green)':(currentEval.score||0)>=60?'var(--amber)':'var(--red)', flexShrink:0 }}>
//                     {currentEval.score}
//                   </div>
//                   <div style={{ flex:1 }}>
//                     <p style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>Feedback IA</p>
//                     <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6 }}>{currentEval.feedback}</p>
//                   </div>
//                 </div>

//                 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
//                   {currentEval.strengths?.length > 0 && (
//                     <div className="glass" style={{ padding:16 }}>
//                       <p style={{ fontSize:11, color:'var(--green)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>💪 Points forts</p>
//                       {currentEval.strengths?.map((s,i)=>(
//                         <div key={i} style={{ display:'flex', gap:8, fontSize:13, marginBottom:8 }}>
//                           <span style={{ color:'var(--green)', flexShrink:0 }}>✓</span>
//                           <span style={{ color:'var(--muted)' }}>{s}</span>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                   {currentEval.improvements?.length > 0 && (
//                     <div className="glass" style={{ padding:16 }}>
//                       <p style={{ fontSize:11, color:'var(--amber)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>🔧 À améliorer</p>
//                       {currentEval.improvements?.map((s,i)=>(
//                         <div key={i} style={{ display:'flex', gap:8, fontSize:13, marginBottom:8 }}>
//                           <span style={{ color:'var(--amber)', flexShrink:0 }}>→</span>
//                           <span style={{ color:'var(--muted)' }}>{s}</span>
//                         </div>
//                       ))}
//                     </div>
//                   )}
//                 </div>

//                 {currentEval.betterAnswer && (
//                   <div className="glass" style={{ padding:16, border:'1px solid rgba(79,142,247,.2)', background:'rgba(79,142,247,.04)' }}>
//                     <p style={{ fontSize:11, color:'var(--blue)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginBottom:10 }}>✨ Exemple de meilleure réponse</p>
//                     <p style={{ fontSize:13, color:'var(--muted)', lineHeight:1.7, fontStyle:'italic' }}>"{currentEval.betterAnswer}"</p>
//                   </div>
//                 )}

//                 <div style={{ display:'flex', justifyContent:'flex-end' }}>
//                   <button className="btn btn-primary" onClick={nextQuestion} style={{ padding:'11px 28px', fontSize:14 }}>
//                     {currentQ < questions.length - 1 ? 'Question suivante →' : 'Voir mon résultat final →'}
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* ════ RESULT ════ */}
//         {phase === 'result' && (
//           <div className="fu">
//             <div style={{ textAlign:'center', marginBottom:40 }}>
//               <h1 style={{ fontSize:28, marginBottom:6 }}>Entretien terminé !</h1>
//               <p style={{ color:'var(--muted)', fontSize:14 }}>Voici ton score global et tes recommandations</p>
//             </div>

//             {/* Global score */}
//             <div className="glass" style={{ padding:36, textAlign:'center', marginBottom:24, border:`1px solid ${finalScore>=80?'rgba(0,214,143,.3)':finalScore>=60?'rgba(245,158,11,.3)':'rgba(239,68,68,.3)'}` }}>
//               <ScoreArc score={finalScore}/>
//               <div style={{ marginTop:20 }}>
//                 <p style={{ fontSize:15, color:'var(--muted)', marginBottom:8 }}>
//                   {finalScore>=80?'🎉 Excellent ! Tu es prêt pour les vrais entretiens.':finalScore>=65?'👍 Bien joué ! Quelques points à peaufiner.':'💪 Continue l\'entraînement — tu progresseras rapidement !'}
//                 </p>
//                 <div style={{ display:'flex', gap:20, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
//                   <div style={{ textAlign:'center' }}>
//                     <p style={{ fontSize:24, fontWeight:800, color:'var(--green)' }}>{answers.filter(a=>a.score>=80).length}</p>
//                     <p style={{ fontSize:12, color:'var(--muted)' }}>Excellentes réponses</p>
//                   </div>
//                   <div style={{ textAlign:'center' }}>
//                     <p style={{ fontSize:24, fontWeight:800, color:'var(--amber)' }}>{answers.filter(a=>a.score>=60&&a.score<80).length}</p>
//                     <p style={{ fontSize:12, color:'var(--muted)' }}>Bonnes réponses</p>
//                   </div>
//                   <div style={{ textAlign:'center' }}>
//                     <p style={{ fontSize:24, fontWeight:800, color:'var(--red)' }}>{answers.filter(a=>a.score<60).length}</p>
//                     <p style={{ fontSize:12, color:'var(--muted)' }}>À améliorer</p>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Per-question review */}
//             <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:28 }}>
//               {answers.map((a,i)=>(
//                 <div key={i} className="glass" style={{ padding:'16px 20px' }}>
//                   <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
//                     <div style={{ width:44, height:44, borderRadius:'50%', background:`${a.score>=80?'var(--green)':a.score>=60?'var(--amber)':'var(--red)'}18`, border:`2px solid ${a.score>=80?'var(--green)':a.score>=60?'var(--amber)':'var(--red)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, color:a.score>=80?'var(--green)':a.score>=60?'var(--amber)':'var(--red)', flexShrink:0 }}>
//                       {a.score}
//                     </div>
//                     <div style={{ flex:1 }}>
//                       <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Q{i+1}: {a.question?.question?.slice(0,80)}...</p>
//                       <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>{a.feedback}</p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* CTA */}
//             <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
//               <button className="btn btn-primary" onClick={()=>{ setPhase('home'); setAnswers([]); setCurrentQ(0); setAnswer(''); setCurrentEval(null); }} style={{ padding:'11px 24px' }}>
//                 🔄 Recommencer
//               </button>
//               <Link href="/dashboard" className="btn" style={{ padding:'11px 24px' }}>🔍 Chercher des offres</Link>
//               <Link href="/cv" className="btn" style={{ padding:'11px 24px' }}>📄 Améliorer mon CV</Link>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
