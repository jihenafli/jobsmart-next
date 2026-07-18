import React, { useState, useRef, useEffect } from 'react';
import api from '../api';   
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SITES = {
  TN: [
    { name:'Indeed Tunisie', flag:'🔍' }, { name:'Keejob',          flag:'🇹🇳' },
    { name:'LinkedIn',       flag:'💼' }, { name:'ATCT',            flag:'🇹🇳' },
    { name:'Tunisie Travail',flag:'🇹🇳' }, { name:'Emploi.com.tn',  flag:'🇹🇳' },
  ],
  FR: [
    { name:'Indeed France',         flag:'🔍' }, { name:'LinkedIn',    flag:'💼' },
    { name:'Welcome to the Jungle', flag:'🌿' }, { name:'Pôle Emploi', flag:'🇫🇷' },
    { name:'APEC',                  flag:'🇫🇷' }, { name:'Glassdoor',   flag:'🔎' },
  ],
  MA: [
    { name:'Rekrute', flag:'🇲🇦' }, { name:'Indeed Maroc', flag:'🔍' },
    { name:'LinkedIn', flag:'💼' }, { name:'Emploi.ma', flag:'🇲🇦' },
  ],
  DE: [
    { name:'Indeed Allemagne', flag:'🔍' }, { name:'LinkedIn', flag:'💼' },
    { name:'StepStone', flag:'🇩🇪' }, { name:'XING', flag:'🇩🇪' },
  ],
  CA: [
    { name:'Indeed Canada', flag:'🔍' }, { name:'LinkedIn', flag:'💼' },
    { name:'Job Bank', flag:'🇨🇦' },
  ],
  OTHER: [
    { name:'LinkedIn', flag:'💼' }, { name:'Indeed', flag:'🔍' },
    { name:'Glassdoor', flag:'🔎' }, { name:'Remote.co', flag:'🌍' },
  ],
};

const COUNTRIES = [
  { code:'TN', label:'🇹🇳 Tunisie' }, { code:'FR', label:'🇫🇷 France' },
  { code:'MA', label:'🇲🇦 Maroc' },  { code:'DE', label:'🇩🇪 Allemagne' },
  { code:'CA', label:'🇨🇦 Canada' }, { code:'OTHER', label:'🌍 International' },
];

const STEPS = ['Mon CV','Pays & Sites','Offres','Candidature','Historique'];

/* ─── Mini composants ─── */
const Tag = ({children, c='#0F6E56', bg='#E1F5EE', border='#9FE1CB'}) => (
  <span style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:bg, color:c, border:`1px solid ${border}`, display:'inline-block' }}>{children}</span>
);

const Score = ({ n }) => {
  const col = n>=80 ? '#0F6E56' : n>=65 ? '#b45309' : '#6b7280';
  const bg  = n>=80 ? '#E1F5EE' : n>=65 ? '#FEF3C7' : '#f3f4f6';
  return (
    <div style={{ width:50, height:50, borderRadius:'50%', background:bg, color:col, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, border:`2px solid ${col}`, flexShrink:0 }}>
      {n}%
    </div>
  );
};

/* ─── Mur de mise à niveau ─── */
function UpgradeWall({ onClose }) {
  const navigate = useNavigate();
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:480, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🚀</div>
        <h2 style={{ fontSize:22, marginBottom:8 }}>Tu as utilisé ta candidature gratuite !</h2>
        <p style={{ color:'#6b7280', fontSize:14, marginBottom:24, lineHeight:1.7 }}>
          Le plan gratuit inclut <strong>1 candidature</strong> par mois.<br/>
          Pour continuer à postuler automatiquement, choisis un forfait.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:24 }}>
          {[
            { name:'Basic', price:'10€', limit:'10/mois', color:'#185FA5' },
            { name:'Pro',   price:'25€', limit:'50/mois', color:'#1D9E75', popular:true },
            { name:'Premium',price:'50€',limit:'Illimité', color:'#7F77DD' },
          ].map(p=>(
            <div key={p.name} onClick={() => navigate('/pricing')}
              style={{ border: p.popular ? '2px solid #1D9E75' : '1px solid #e5e7eb', borderRadius:10, padding:'14px 10px', cursor:'pointer', position:'relative', transition:'all .2s' }}
              onMouseOver={e=>e.currentTarget.style.background='#f9fafb'}
              onMouseOut={e=>e.currentTarget.style.background='#fff'}>
              {p.popular && <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'#1D9E75', color:'#fff', fontSize:9, padding:'2px 8px', borderRadius:10, whiteSpace:'nowrap' }}>Populaire</div>}
              <p style={{ fontWeight:700, fontSize:14, color:p.color }}>{p.name}</p>
              <p style={{ fontSize:20, fontWeight:700, margin:'6px 0 2px' }}>{p.price}</p>
              <p style={{ fontSize:11, color:'#6b7280' }}>{p.limit}</p>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width:'100%', padding:'12px', fontSize:15 }} onClick={()=>navigate('/pricing')}>
          Voir les forfaits →
        </button>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#9ca3af', fontSize:13, cursor:'pointer', marginTop:12 }}>
          Continuer sans postuler
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ DASHBOARD ══ */
export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const fileRef      = useRef();

  const [step, setStep]                     = useState(0);
  const [cv, setCv]                         = useState(null);
  const [cvLoading, setCvLoading]           = useState(false);
  const [country, setCountry]               = useState(user?.country || 'TN');
  const [selectedSites, setSelectedSites]   = useState([]);
  const [jobs, setJobs]                     = useState([]);
  const [jobsLoading, setJobsLoading]       = useState(false);
  const [activeJob, setActiveJob]           = useState(null);
  const [letter, setLetter]                 = useState('');
  const [letterLoading, setLetterLoading]   = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sending, setSending]               = useState(false);
  const [sendResult, setSendResult]         = useState(null);
  const [history, setHistory]               = useState([]);
  const [error, setError]                   = useState('');
  const [showUpgrade, setShowUpgrade]       = useState(false);

  // Détecter retour paiement Stripe
  useEffect(() => {
    if (params.get('payment') === 'success') {
      refreshUser();
      setError('');
      alert('✅ Paiement réussi ! Ton forfait est activé.');
    }
  }, []);

  /* ── Upload CV ── */
  const uploadCV = async (file) => {
    if (!file) return;
    setCvLoading(true); setError('');
    const fd = new FormData(); fd.append('cv', file);
    try {
      const res = await api.post('/api/cv/upload', fd);
      setCv(res.data);
    } catch (e) { setError(e.response?.data?.error || 'Erreur upload CV'); }
    finally { setCvLoading(false); }
  };

  /* ── Pays ── */
  const changeCountry = (code) => { setCountry(code); setSelectedSites([]); };

  /* ── Sites ── */
  const toggleSite = (name) =>
    setSelectedSites(prev => prev.includes(name) ? prev.filter(s=>s!==name) : [...prev, name]);

  const toggleAll = () => {
    const all = (SITES[country]||[]).map(s=>s.name);
    setSelectedSites(selectedSites.length === all.length ? [] : all);
  };

  /* ── Recherche offres ── */
  const searchJobs = async () => {
    setJobsLoading(true); setError(''); setJobs([]);
    try {
      const res = await api.post('/api/jobs/search', { country, platforms: selectedSites });
      if (res.data.jobs?.length === 0) {
        setError('Aucune offre trouvée. Vérifie que JSEARCH_API_KEY est bien configurée dans le .env du backend.');
      }
      setJobs(res.data.jobs || []);
      setStep(2);
    } catch (e) { setError(e.response?.data?.error || 'Erreur recherche'); }
    finally { setJobsLoading(false); }
  };

  /* ── Générer lettre ── */
  const generateLetter = async (job) => {
    // Vérifier limite avant de continuer
    const used  = user?.applicationsUsed || 0;
    const limit = user?.applicationsLimit || 1;
    if (used >= limit) { setShowUpgrade(true); return; }

    setActiveJob(job); setLetterLoading(true); setLetter(''); setSendResult(null);
    setRecipientEmail(job.companyEmail || '');
    setStep(3);
    try {
      const res = await api.post('/api/applications/generate', { job });
      setLetter(res.data.coverLetter);
    } catch (e) { setError(e.response?.data?.error || 'Erreur génération lettre'); }
    finally { setLetterLoading(false); }
  };

  /* ── Envoyer candidature ── */
  const sendApp = async () => {
    setSending(true); setError(''); setSendResult(null);
    try {
      const res = await api.post('/api/applications/send', { job: activeJob, coverLetter: letter, recipientEmail });
      setSendResult(res.data);
      await refreshUser(); // mettre à jour le compteur
      // Si plus de crédit après envoi → afficher upgrade
      if (res.data.remaining === 0) {
        setTimeout(() => setShowUpgrade(true), 2000);
      }
    } catch (e) {
      if (e.response?.data?.upgradeRequired) setShowUpgrade(true);
      else setError(e.response?.data?.error || 'Erreur envoi');
    } finally { setSending(false); }
  };

  /* ── Historique ── */
  const loadHistory = async () => {
    try {
      const res = await api.get('/api/applications');
      setHistory(res.data); setStep(4);
    } catch { setError('Erreur chargement historique'); }
  };

  const sites   = SITES[country] || SITES.OTHER;
  const used    = user?.applicationsUsed || 0;
  const limit   = user?.applicationsLimit || 1;
  const isFree  = user?.plan === 'free';

  /* ════════════════════ RENDER ═════════════════════ */
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

      {showUpgrade && <UpgradeWall onClose={() => setShowUpgrade(false)} />}

      {/* ── Navbar ── */}
      <nav style={{ background:'#fff', borderBottom:'1px solid var(--b)', padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:9, height:9, borderRadius:'50%', background:'var(--g)' }}/>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:18 }}>JobSmart AI</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Compteur candidatures */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ background:'#f3f4f6', borderRadius:8, padding:'4px 12px', fontSize:12 }}>
              <span style={{ fontWeight:600, color: used>=limit ? '#dc2626' : 'var(--g)' }}>{used}</span>
              <span style={{ color:'var(--m)' }}>/{limit === 999999 ? '∞' : limit} candidatures</span>
            </div>
            {isFree && (
              <button className="btn btn-primary" style={{ padding:'5px 12px', fontSize:12 }} onClick={()=>navigate('/pricing')}>
                Upgrade ↑
              </button>
            )}
          </div>
          <span style={{ fontSize:13, color:'var(--m)' }}>{user?.name}</span>
          <button className="btn" style={{ padding:'5px 12px', fontSize:12 }} onClick={()=>{ logout(); navigate('/login'); }}>Déco</button>
        </div>
      </nav>

      <div style={{ maxWidth:840, margin:'0 auto', padding:'28px 20px' }}>

        {/* ── Steps ── */}
        <div style={{ display:'flex', marginBottom:24, background:'#fff', borderRadius:12, border:'1px solid var(--b)', overflow:'hidden' }}>
          {STEPS.map((s,i) => (
            <button key={i} onClick={()=> i<step && setStep(i)}
              style={{ flex:1, padding:'11px 4px', border:'none', borderRight: i<STEPS.length-1 ? '1px solid var(--b)' : 'none',
                background: i===step ? 'var(--g)' : i<step ? 'var(--gl)' : '#fff',
                color: i===step ? '#fff' : i<step ? 'var(--gd)' : '#9ca3af',
                cursor: i<step ? 'pointer' : 'default', fontSize:12, fontWeight:500, fontFamily:'DM Sans,sans-serif' }}>
              <span style={{ display:'block', fontSize:10, opacity:.65, marginBottom:2 }}>{i+1}</span>{s}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'11px 16px', marginBottom:16, fontSize:13, color:'#dc2626' }}>
            {error}
          </div>
        )}

        {/* ════ STEP 0 : CV ════ */}
        {step===0 && (
          <div className="card">
            <h2 style={{ fontSize:20, marginBottom:6 }}>Télécharge ton CV</h2>
            <p style={{ color:'var(--m)', fontSize:13, marginBottom:22 }}>
              L'IA analyse ton CV et détecte automatiquement ton profil — zéro saisie manuelle.
            </p>

            {!cv && !cvLoading && (
              <>
                <div onClick={()=>fileRef.current?.click()}
                  style={{ border:'2px dashed var(--b)', borderRadius:12, padding:'52px 24px', textAlign:'center', cursor:'pointer', transition:'border-color .2s' }}
                  onMouseOver={e=>e.currentTarget.style.borderColor='var(--g)'}
                  onMouseOut={e=>e.currentTarget.style.borderColor='var(--b)'}>
                  <div style={{ fontSize:42, marginBottom:10 }}>📄</div>
                  <p style={{ fontWeight:600, fontSize:15 }}>Clique pour uploader ton CV</p>
                  <p style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>PDF — max 5 MB</p>
                </div>
                <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e=>uploadCV(e.target.files[0])}/>
              </>
            )}

            {cvLoading && (
              <div style={{ textAlign:'center', padding:48 }}>
                <div style={{ fontSize:36, marginBottom:10 }}>⏳</div>
                <p style={{ color:'var(--m)', fontSize:14 }}>Analyse IA en cours...</p>
              </div>
            )}

            {cv && !cvLoading && (
              <div>
                <div style={{ background:'var(--gl)', border:'1px solid #9FE1CB', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                  <div style={{ width:42, height:42, borderRadius:8, background:'var(--g)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:12, flexShrink:0 }}>CV</div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, color:'#085041', fontSize:14 }}>CV analysé ✓</p>
                    <p style={{ fontSize:12, color:'var(--gd)', marginTop:2 }}>{cv.analysis?.experience} · {cv.analysis?.education} · {cv.analysis?.skills?.length} compétences</p>
                  </div>
                  <button className="btn" style={{ fontSize:12, padding:'5px 12px', flexShrink:0 }}
                    onClick={()=>{ setCv(null); if(fileRef.current) fileRef.current.value=''; }}>Changer</button>
                </div>

                <div style={{ background:'#f9fafb', border:'1px solid var(--b)', borderRadius:10, padding:'16px 18px', marginBottom:20 }}>
                  <p style={{ fontSize:11, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:.6, marginBottom:14 }}>Profil détecté par l'IA</p>

                  {cv.analysis?.jobTitles?.length>0 && (
                    <div style={{ marginBottom:12 }}>
                      <p style={{ fontSize:12, color:'var(--m)', marginBottom:7 }}>Postes recommandés :</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {cv.analysis.jobTitles.map(t=><Tag key={t} c="#3C3489" bg="#EEEDFE" border="#AFA9EC">{t}</Tag>)}
                      </div>
                    </div>
                  )}
                  {cv.analysis?.skills?.length>0 && (
                    <div style={{ marginBottom:12 }}>
                      <p style={{ fontSize:12, color:'var(--m)', marginBottom:7 }}>Compétences :</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {cv.analysis.skills.slice(0,12).map(s=><Tag key={s}>{s}</Tag>)}
                      </div>
                    </div>
                  )}
                  {cv.analysis?.languages?.length>0 && (
                    <div>
                      <p style={{ fontSize:12, color:'var(--m)', marginBottom:7 }}>Langues :</p>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        {cv.analysis.languages.map(l=><Tag key={l} c="#b45309" bg="#FEF3C7" border="#FDE68A">{l}</Tag>)}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button className="btn btn-primary" onClick={()=>setStep(1)}>Continuer → Choisir les sites</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 1 : PAYS + SITES ════ */}
        {step===1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card">
              <h2 style={{ fontSize:18, marginBottom:6 }}>Dans quel pays cherches-tu ?</h2>
              <p style={{ color:'var(--m)', fontSize:13, marginBottom:18 }}>Les sites d'emploi s'adaptent à ton pays automatiquement.</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {COUNTRIES.map(c=>(
                  <div key={c.code} onClick={()=>changeCountry(c.code)}
                    style={{ border: country===c.code ? '2px solid var(--g)' : '1px solid var(--b)', borderRadius:10, padding:'14px 12px', textAlign:'center', cursor:'pointer', background: country===c.code ? 'var(--gl)' : '#fff', transition:'all .15s' }}>
                    <p style={{ fontSize:22, marginBottom:4 }}>{c.label.split(' ')[0]}</p>
                    <p style={{ fontSize:13, fontWeight: country===c.code ? 600 : 400, color: country===c.code ? 'var(--gd)' : 'var(--t)' }}>
                      {c.label.split(' ').slice(1).join(' ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <h2 style={{ fontSize:18 }}>Sites d'emploi — {COUNTRIES.find(c=>c.code===country)?.label}</h2>
                <button onClick={toggleAll} style={{ background:'none', border:'none', color:'var(--g)', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                  {selectedSites.length===sites.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              <p style={{ color:'var(--m)', fontSize:13, marginBottom:16 }}>Laisse tout coché pour chercher partout, ou choisis des sites spécifiques.</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {sites.map(s=>{
                  const checked = selectedSites.includes(s.name);
                  return (
                    <div key={s.name} onClick={()=>toggleSite(s.name)}
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:20, cursor:'pointer', transition:'all .15s',
                        border: checked ? '1.5px solid var(--g)' : '1px solid var(--b)',
                        background: checked ? 'var(--gl)' : '#fff',
                        color: checked ? 'var(--gd)' : 'var(--t)',
                        fontWeight: checked ? 500 : 400, fontSize:13 }}>
                      <span style={{ fontSize:14 }}>{s.flag}</span>{s.name}
                    </div>
                  );
                })}
              </div>
              {selectedSites.length===0 && <p style={{ fontSize:12, color:'#9ca3af', marginTop:10 }}>✓ Aucune sélection = tous les sites</p>}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <button className="btn" onClick={()=>setStep(0)}>← Retour</button>
              <button className="btn btn-primary" onClick={searchJobs} disabled={jobsLoading}>
                {jobsLoading ? '🔍 Recherche en cours...' : '🤖 Lancer la recherche →'}
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 2 : OFFRES ════ */}
        {step===2 && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div>
                <h2 style={{ fontSize:20 }}>Offres trouvées</h2>
                <p style={{ color:'var(--m)', fontSize:13, marginTop:2 }}>{jobs.length} offres · triées par compatibilité CV</p>
              </div>
              <button className="btn" onClick={()=>setStep(1)}>← Modifier</button>
            </div>

            {jobs.length===0 && (
              <div className="card" style={{ textAlign:'center', padding:48 }}>
                <p style={{ fontSize:36, marginBottom:12 }}>😔</p>
                <p style={{ fontWeight:500 }}>Aucune offre trouvée</p>
                <p style={{ fontSize:13, color:'var(--m)', marginTop:6 }}>Vérifie que <strong>JSEARCH_API_KEY</strong> est bien dans ton .env backend</p>
                <button className="btn btn-primary" style={{ marginTop:16 }} onClick={()=>setStep(1)}>← Réessayer</button>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {jobs.map((job,i)=>(
                <div key={i} className="card" style={{ padding:'16px 20px', display:'flex', gap:14, alignItems:'flex-start' }}>
                  <div style={{ width:46, height:46, borderRadius:10, background:'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13, color:'#185FA5', flexShrink:0 }}>
                    {job.company?.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:600, fontSize:15 }}>{job.title}</p>
                    <p style={{ fontSize:13, color:'var(--m)', marginTop:2 }}>{job.company} · {job.location}</p>
                    <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap', alignItems:'center' }}>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'#f3f4f6', color:'var(--m)' }}>{job.platform}</span>
                      {job.salary && job.salary !== 'Selon profil' && (
                        <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'#f3f4f6', color:'var(--m)' }}>{job.salary}</span>
                      )}
                      {job.isRemote && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'#EEF2FF', color:'#3730a3' }}>🌍 Remote</span>}
                      {job.companyEmail && (
                        <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'var(--gl)', color:'var(--gd)' }}>📧 Email trouvé</span>
                      )}
                    </div>
                    {job.matchReasons?.[0] && (
                      <p style={{ fontSize:12, color:'var(--m)', marginTop:8, lineHeight:1.5 }}>✓ {job.matchReasons[0]}</p>
                    )}
                    {job.missingSkills?.length>0 && (
                      <p style={{ fontSize:12, color:'#b45309', marginTop:4 }}>⚠ Manque : {job.missingSkills.slice(0,2).join(', ')}</p>
                    )}
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noreferrer"
                        style={{ fontSize:12, color:'var(--g)', textDecoration:'none', display:'inline-block', marginTop:8 }}>
                        Voir l'offre →
                      </a>
                    )}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, flexShrink:0 }}>
                    <Score n={job.matchScore}/>
                    <button className="btn btn-primary" style={{ fontSize:12, padding:'7px 14px', whiteSpace:'nowrap' }}
                      onClick={()=>generateLetter(job)}>
                      Postuler →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ STEP 3 : CANDIDATURE ════ */}
        {step===3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:42, height:42, borderRadius:8, background:'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, color:'#185FA5', flexShrink:0 }}>
                {activeJob?.company?.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:600, fontSize:14 }}>{activeJob?.title}</p>
                <p style={{ fontSize:13, color:'var(--m)' }}>{activeJob?.company} · {activeJob?.location}</p>
              </div>
              <button className="btn" style={{ fontSize:12, padding:'5px 12px' }} onClick={()=>setStep(2)}>← Retour</button>
            </div>

            <div className="card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <h2 style={{ fontSize:18 }}>Lettre de motivation</h2>
                <span style={{ fontSize:12, background:'var(--gl)', color:'var(--gd)', padding:'3px 10px', borderRadius:20 }}>IA · modifiable</span>
              </div>
              {letterLoading ? (
                <div style={{ textAlign:'center', padding:40, color:'var(--m)' }}>
                  <div style={{ fontSize:28, marginBottom:10 }}>✨</div>
                  <p>Génération pour {activeJob?.company}...</p>
                </div>
              ) : (
                <textarea value={letter} onChange={e=>setLetter(e.target.value)}
                  style={{ width:'100%', minHeight:300, padding:14, border:'1px solid var(--b)', borderRadius:8, fontSize:14, lineHeight:1.8, resize:'vertical', fontFamily:'DM Sans,sans-serif' }}/>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize:16, marginBottom:14 }}>📨 Envoyer la candidature</h3>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:500, display:'block', marginBottom:6 }}>
                  Email du recruteur
                  {activeJob?.companyEmail && (
                    <span style={{ fontSize:11, color:'var(--g)', marginLeft:8, background:'var(--gl)', padding:'2px 8px', borderRadius:12 }}>✓ Auto-détecté</span>
                  )}
                </label>
                <input value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} placeholder="recruteur@entreprise.com" style={{ maxWidth:400 }}/>
                <p style={{ fontSize:12, color:'#9ca3af', marginTop:6 }}>📎 Ton CV est joint automatiquement</p>
              </div>

              {sendResult ? (
                <div style={{ background:'var(--gl)', border:'1px solid #9FE1CB', borderRadius:10, padding:'16px 20px' }}>
                  <p style={{ color:'#085041', fontWeight:600, fontSize:15 }}>✓ Candidature envoyée !</p>
                  <p style={{ fontSize:13, color:'var(--gd)', marginTop:4 }}>
                    {sendResult.emailSent ? `Email + CV envoyés` : 'Candidature enregistrée'}
                  </p>
                  <p style={{ fontSize:13, color:'var(--gd)', marginTop:2 }}>
                    Reste : {sendResult.remaining === 999998 ? '∞' : sendResult.remaining} candidature(s)
                  </p>
                  <div style={{ display:'flex', gap:10, marginTop:14 }}>
                    <button className="btn btn-primary" onClick={()=>{ setSendResult(null); setStep(2); }}>← Autres offres</button>
                    <button className="btn" onClick={loadHistory}>Historique</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={sendApp}
                  disabled={sending || !letter || letterLoading}
                  style={{ padding:'11px 24px', fontSize:14 }}>
                  {sending ? '📨 Envoi...' : '📨 Envoyer Lettre + CV'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════ STEP 4 : HISTORIQUE ════ */}
        {step===4 && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <h2 style={{ fontSize:20 }}>Mes candidatures</h2>
              <button className="btn btn-primary" onClick={()=>setStep(0)}>+ Nouvelle recherche</button>
            </div>
            {history.length===0 ? (
              <div className="card" style={{ textAlign:'center', padding:48 }}>
                <p style={{ fontSize:32, marginBottom:12 }}>📋</p>
                <p style={{ fontWeight:500 }}>Aucune candidature encore</p>
                <button className="btn btn-primary" style={{ marginTop:16 }} onClick={()=>setStep(0)}>Commencer</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {history.map((app,i)=>(
                  <div key={i} className="card" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:38, height:38, borderRadius:8, background:'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, color:'#185FA5', flexShrink:0 }}>
                      {app.job?.company?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:500, fontSize:14 }}>{app.job?.title} — {app.job?.company}</p>
                      <p style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>
                        {new Date(app.createdAt).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
                        {app.matchScore ? ` · ${app.matchScore}%` : ''}
                        {app.job?.companyEmail ? ` · ${app.job.companyEmail}` : ''}
                      </p>
                    </div>
                    <Tag c="#0F6E56" bg="var(--gl)" border="#9FE1CB">
                      {app.status==='sent' ? '✓ Envoyée' : app.status}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step<4 && (
          <div style={{ textAlign:'center', marginTop:20 }}>
            <button style={{ background:'none', border:'none', color:'#9ca3af', fontSize:13, cursor:'pointer' }} onClick={loadHistory}>
              📋 Voir mes candidatures
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
