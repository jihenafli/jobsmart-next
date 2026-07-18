'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';

const COUNTRIES = [
  { code: 'TN', label: '🇹🇳 Tunisie' }, { code: 'FR', label: '🇫🇷 France' },
  { code: 'MA', label: '🇲🇦 Maroc' },  { code: 'DE', label: '🇩🇪 Allemagne' },
  { code: 'CA', label: '🇨🇦 Canada' }, { code: 'OTHER', label: '🌍 International' },
];

const STEPS = ['Mon CV', 'Pays', 'Offres', 'Candidature', 'Historique'];

function AgentBadge({ name, active }: { name: string; active: boolean }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:20,
      background: active?'var(--green-gl)':'var(--bg3)',
      border:`1px solid ${active?'rgba(0,214,143,0.3)':'var(--border)'}`,
      fontSize:11, color: active?'var(--green)':'var(--muted)', transition:'all 0.3s' }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background: active?'var(--green)':'var(--muted)', boxShadow: active?'0 0 6px var(--green)':'none' }}/>
      {name}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score>=80?'var(--green)':score>=65?'var(--amber)':'var(--muted)';
  return (
    <div style={{ width:52, height:52, borderRadius:'50%', background:`${color}11`, color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14, border:`2px solid ${color}`, flexShrink:0 }}>
      {score}%
    </div>
  );
}

function UpgradeModal({ onClose }: { onClose:()=>void }) {
  const router = useRouter();
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:20, backdropFilter:'blur(4px)' }}>
      <div className="glass" style={{ padding:36, maxWidth:460, width:'100%', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🚀</div>
        <h2 style={{ fontSize:22, marginBottom:10 }}>Limite gratuite atteinte</h2>
        <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.7, marginBottom:28 }}>
          Tu as utilisé ta candidature gratuite.<br/>Choisis un forfait pour continuer.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            { name:'Basic', price:'10€', limit:'10/mois', color:'var(--blue)' },
            { name:'Pro',   price:'25€', limit:'50/mois', color:'var(--green)', popular:true },
            { name:'Premium',price:'50€',limit:'∞',       color:'var(--purple)' },
          ].map(p=>(
            <div key={p.name} onClick={()=>router.push('/pricing')}
              style={{ border:`1px solid ${p.color}33`, borderRadius:10, padding:'14px 10px', cursor:'pointer', background:`${p.color}08`, textAlign:'center' }}>
              <p style={{ fontWeight:700, fontSize:14, color:p.color }}>{p.name}</p>
              <p style={{ fontSize:20, fontWeight:800, margin:'6px 0 2px' }}>{p.price}</p>
              <p style={{ fontSize:11, color:'var(--muted)' }}>{p.limit}</p>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px' }} onClick={()=>router.push('/pricing')}>
          Voir les forfaits →
        </button>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12, cursor:'pointer', marginTop:14 }}>
          Continuer sans postuler
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout, refresh } = useAuth();
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [step, setStep]           = useState(0);
  const [cv, setCv]               = useState<any>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [country, setCountry]     = useState(user?.country || 'TN');
  const [jobs, setJobs]           = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [letter, setLetter]       = useState('');
  const [letterLoading, setLetterLoading] = useState(false);
  const [recEmail, setRecEmail]   = useState('');
  const [sending, setSending]     = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const [history, setHistory]     = useState<any[]>([]);
  const [error, setError]         = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);

  const withAgent = async (agents: string[], fn: ()=>Promise<void>) => {
    setActiveAgents(agents);
    try { await fn(); } finally { setActiveAgents([]); }
  };

  const uploadCV = async (file: File) => {
    setCvLoading(true); setError('');
    const fd = new FormData(); fd.append('cv', file);
    await withAgent(['Resume Agent'], async () => {
      try { const res = await api.post('/api/cv/upload', fd); setCv(res.data); }
      catch (e:any) { setError(e.response?.data?.error || 'Erreur upload CV'); }
      finally { setCvLoading(false); }
    });
  };

  const searchJobs = async () => {
    setJobsLoading(true); setError(''); setJobs([]);
    await withAgent(['Hunter Agent'], async () => {
      try {
        const res = await api.post('/api/jobs/search', { country, platforms: [] });
        setJobs(res.data.jobs || []);
        if (!res.data.jobs?.length) setError('Aucune offre trouvée. Vérifie ta clé JSEARCH_API_KEY dans le backend.');
        setStep(2);
      } catch (e:any) { setError(e.response?.data?.error || 'Erreur recherche'); }
      finally { setJobsLoading(false); }
    });
  };

  const generateLetter = async (job: any) => {
    const used = user?.applicationsUsed||0, limit = user?.applicationsLimit||1;
    if (used >= limit) { setShowUpgrade(true); return; }
    setActiveJob(job); setLetterLoading(true); setLetter(''); setSendResult(null);
    setRecEmail(job.companyEmail||'');
    setStep(3);
    await withAgent(['Apply Agent','Email Agent'], async () => {
      try { const res = await api.post('/api/applications/generate', { job }); setLetter(res.data.coverLetter); }
      catch (e:any) { setError(e.response?.data?.error||'Erreur génération'); }
      finally { setLetterLoading(false); }
    });
  };

  const sendApp = async () => {
    setSending(true); setError('');
    await withAgent(['Email Agent'], async () => {
      try {
        const res = await api.post('/api/applications/send', { job:activeJob, coverLetter:letter, recipientEmail:recEmail });
        setSendResult(res.data); await refresh();
        if (res.data.remaining===0) setTimeout(()=>setShowUpgrade(true), 2500);
      } catch (e:any) {
        if (e.response?.data?.upgradeRequired) setShowUpgrade(true);
        else setError(e.response?.data?.error||'Erreur envoi');
      } finally { setSending(false); }
    });
  };

  const loadHistory = async () => {
    try { const r = await api.get('/api/applications'); setHistory(r.data); setStep(4); }
    catch { setError('Erreur chargement'); }
  };

  const used  = user?.applicationsUsed||0;
  const limit = user?.applicationsLimit||1;
  const pct   = Math.min((used/limit)*100, 100);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {showUpgrade && <UpgradeModal onClose={()=>setShowUpgrade(false)}/>}

      {/* Navbar */}
      <nav style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)' }}/>
          <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:16 }}>JobSmart AI</span>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {['Resume Agent','Hunter Agent','Apply Agent','Email Agent'].map(a=>(
            <AgentBadge key={a} name={a} active={activeAgents.includes(a)}/>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color: used>=limit?'var(--red)':'var(--green)', fontWeight:600 }}>{used}/{limit===999999?'∞':limit}</span>
              <div style={{ height:4, width:80, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background: used>=limit?'var(--red)':'linear-gradient(90deg,var(--green),var(--blue))', borderRadius:2 }}/>
              </div>
            </div>
            <p style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>candidatures</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Link href="/cv" className="btn" style={{ fontSize:11, padding:'5px 10px' }}>📄 CV</Link>
            <Link href="/interview" className="btn" style={{ fontSize:11, padding:'5px 10px' }}>🎤 Interview</Link>
            {user?.plan==='free' && <Link href="/pricing" className="btn btn-primary" style={{ fontSize:11, padding:'5px 10px' }}>Upgrade ↑</Link>}
          </div>
          <span style={{ fontSize:12, color:'var(--muted)' }}>{user?.name}</span>
          <button className="btn" style={{ fontSize:11, padding:'5px 10px' }} onClick={logout}>Déco</button>
        </div>
      </nav>

      <div style={{ maxWidth:840, margin:'0 auto', padding:'28px 20px' }}>
        {/* Steps */}
        <div style={{ display:'flex', marginBottom:24, background:'var(--bg2)', borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
          {STEPS.map((s,i)=>(
            <button key={i} onClick={()=>i<step&&setStep(i)}
              style={{ flex:1, padding:'11px 4px', border:'none', borderRight: i<STEPS.length-1?'1px solid var(--border)':'none',
                background: i===step?'var(--green)':'transparent',
                color: i===step?'#000':i<step?'var(--green)':'var(--muted)',
                cursor: i<step?'pointer':'default', fontSize:12, fontWeight:600, fontFamily:'Inter' }}>
              <span style={{ display:'block', fontSize:9, opacity:.6, marginBottom:2 }}>0{i+1}</span>{s}
            </button>
          ))}
        </div>

        {error && <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'11px 16px', marginBottom:16, fontSize:13, color:'var(--red)' }}>{error}</div>}

        {/* ════ STEP 0: CV ════ */}
        {step===0 && (
          <div className="glass" style={{ padding:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <AgentBadge name="Resume Agent" active={cvLoading}/>
              <h2 style={{ fontSize:20 }}>Télécharge ton CV</h2>
            </div>
            <p style={{ color:'var(--muted)', fontSize:13, marginBottom:24 }}>
              Le Resume Agent analyse ton CV automatiquement — zéro saisie manuelle.
            </p>
            {!cv && !cvLoading && (
              <>
                <div onClick={()=>fileRef.current?.click()}
                  style={{ border:'2px dashed var(--border)', borderRadius:12, padding:'52px 24px', textAlign:'center', cursor:'pointer', transition:'all .2s' }}
                  onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--green)';(e.currentTarget as HTMLElement).style.background='var(--green-gl)';}}
                  onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.background='transparent';}}>
                  <div style={{ fontSize:42, marginBottom:12 }}>📄</div>
                  <p style={{ fontWeight:600, fontSize:15 }}>Clique pour uploader ton CV</p>
                  <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>PDF — max 5 MB</p>
                </div>
                <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&uploadCV(e.target.files[0])}/>
              </>
            )}
            {cvLoading && (
              <div style={{ textAlign:'center', padding:48 }}>
                <div style={{ fontSize:36, marginBottom:12 }}>⏳</div>
                <p style={{ color:'var(--green)', fontWeight:500 }}>Resume Agent analyse ton CV...</p>
              </div>
            )}
            {cv && !cvLoading && (
              <div>
                <div style={{ background:'var(--green-gl)', border:'1px solid rgba(0,214,143,.2)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                  <div style={{ width:42, height:42, borderRadius:8, background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', color:'#000', fontWeight:700, fontSize:12, flexShrink:0 }}>CV</div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:600, color:'var(--green)', fontSize:14 }}>CV analysé ✓</p>
                    <p style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{cv.analysis?.experience} · {cv.analysis?.education} · {cv.analysis?.skills?.length} compétences</p>
                  </div>
                  <button className="btn" style={{ fontSize:12, padding:'5px 12px' }} onClick={()=>{setCv(null);if(fileRef.current)fileRef.current.value='';}}>Changer</button>
                </div>
                <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px', marginBottom:20 }}>
                  <p style={{ fontSize:10, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:.6, marginBottom:14 }}>Profil détecté</p>
                  {cv.analysis?.jobTitles?.length>0 && (
                    <div style={{ marginBottom:12 }}>
                      <p style={{ fontSize:12, color:'var(--muted)', marginBottom:7 }}>Postes recommandés :</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {cv.analysis.jobTitles.map((t:string)=>(
                          <span key={t} style={{ fontSize:12, padding:'4px 11px', borderRadius:20, background:'rgba(139,92,246,.08)', color:'var(--purple)', border:'1px solid rgba(139,92,246,.2)' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cv.analysis?.skills?.length>0 && (
                    <div style={{ marginBottom:12 }}>
                      <p style={{ fontSize:12, color:'var(--muted)', marginBottom:7 }}>Compétences :</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {cv.analysis.skills.slice(0,12).map((s:string)=>(
                          <span key={s} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'var(--green-gl)', color:'var(--green)', border:'1px solid rgba(0,214,143,.2)' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cv.analysis?.languages?.length>0 && (
                    <div>
                      <p style={{ fontSize:12, color:'var(--muted)', marginBottom:7 }}>Langues :</p>
                      <div style={{ display:'flex', gap:5 }}>
                        {cv.analysis.languages.map((l:string)=>(
                          <span key={l} style={{ fontSize:12, padding:'3px 10px', borderRadius:20, background:'rgba(245,158,11,.08)', color:'var(--amber)', border:'1px solid rgba(245,158,11,.2)' }}>{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button className="btn btn-primary" onClick={()=>setStep(1)}>Continuer → Choisir le pays</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 1: PAYS SEULEMENT ════ */}
        {step===1 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="glass" style={{ padding:24 }}>
              <h2 style={{ fontSize:18, marginBottom:6 }}>Dans quel pays cherches-tu ?</h2>
              <p style={{ color:'var(--muted)', fontSize:13, marginBottom:18 }}>
                L'IA va chercher les offres compatibles avec ton CV sur les meilleures plateformes de ce pays.
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {COUNTRIES.map(c=>(
                  <div key={c.code} onClick={()=>setCountry(c.code)}
                    style={{ border: country===c.code?'2px solid var(--green)':'1px solid var(--border)', borderRadius:12, padding:'18px 12px', textAlign:'center', cursor:'pointer', background: country===c.code?'var(--green-gl)':'var(--bg3)', transition:'all .15s' }}>
                    <p style={{ fontSize:28, marginBottom:6 }}>{c.label.split(' ')[0]}</p>
                    <p style={{ fontSize:13, fontWeight: country===c.code?600:400, color: country===c.code?'var(--green)':'var(--muted)' }}>
                      {c.label.split(' ').slice(1).join(' ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <button className="btn" onClick={()=>setStep(0)}>← Retour</button>
              <button className="btn btn-primary" onClick={searchJobs} disabled={jobsLoading}>
                {jobsLoading?'🤖 Hunter Agent en cours...':'🤖 Lancer la recherche →'}
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 2: OFFRES ════ */}
        {step===2 && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <h2 style={{ fontSize:20 }}>Offres trouvées</h2>
                <p style={{ color:'var(--muted)', fontSize:13, marginTop:2 }}>{jobs.length} offres · triées par compatibilité CV</p>
              </div>
              <button className="btn" onClick={()=>setStep(1)}>← Modifier</button>
            </div>
            {jobs.length===0 && (
              <div className="glass" style={{ textAlign:'center', padding:56 }}>
                <p style={{ fontSize:40, marginBottom:14 }}>😔</p>
                <p style={{ fontWeight:600, fontSize:16 }}>Aucune offre trouvée</p>
                <p style={{ fontSize:13, color:'var(--muted)', marginTop:8 }}>Vérifie que <code style={{ background:'var(--bg3)', padding:'2px 6px', borderRadius:4 }}>JSEARCH_API_KEY</code> est dans le .env backend</p>
                <button className="btn btn-primary" style={{ marginTop:20 }} onClick={()=>setStep(1)}>← Réessayer</button>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {jobs.map((job,i)=>(
                <div key={i} className="glass" style={{ padding:'18px 20px', display:'flex', gap:14, alignItems:'flex-start', border:'1px solid var(--border)', borderRadius:12, transition:'border-color .2s' }}
                  onMouseOver={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border2)'}
                  onMouseOut={e=>(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}>
                  <div style={{ width:46, height:46, borderRadius:10, background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'var(--blue)', flexShrink:0 }}>
                    {job.company?.slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:600, fontSize:15 }}>{job.title}</p>
                    <p style={{ fontSize:13, color:'var(--muted)', marginTop:2 }}>{job.company} · {job.location}</p>
                    <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'var(--bg3)', color:'var(--muted)', border:'1px solid var(--border)' }}>{job.platform}</span>
                      {job.salary&&job.salary!=='Selon profil'&&<span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'var(--bg3)', color:'var(--muted)', border:'1px solid var(--border)' }}>{job.salary}</span>}
                      {job.isRemote&&<span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'rgba(79,142,247,.08)', color:'var(--blue)', border:'1px solid rgba(79,142,247,.2)' }}>🌍 Remote</span>}
                      {job.companyEmail&&<span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:'var(--green-gl)', color:'var(--green)', border:'1px solid rgba(0,214,143,.2)' }}>📧 Email trouvé</span>}
                    </div>
                    {job.matchReasons?.[0]&&<p style={{ fontSize:12, color:'var(--muted)', marginTop:8 }}>✓ {job.matchReasons[0]}</p>}
                    {job.url&&<a href={job.url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'var(--green)', textDecoration:'none', display:'inline-block', marginTop:8 }}>Voir l'offre →</a>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, flexShrink:0 }}>
                    <ScoreRing score={job.matchScore}/>
                    <button className="btn btn-primary" style={{ fontSize:11, padding:'7px 14px' }} onClick={()=>generateLetter(job)}>Postuler →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ STEP 3: CANDIDATURE ════ */}
        {step===3 && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="glass" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:42, height:42, borderRadius:8, background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, color:'var(--blue)', flexShrink:0 }}>
                {activeJob?.company?.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:600, fontSize:14 }}>{activeJob?.title}</p>
                <p style={{ fontSize:13, color:'var(--muted)' }}>{activeJob?.company} · {activeJob?.location}</p>
              </div>
              <button className="btn" style={{ fontSize:11, padding:'5px 10px' }} onClick={()=>setStep(2)}>← Retour</button>
            </div>
            <div className="glass" style={{ padding:24 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <AgentBadge name="Apply Agent" active={letterLoading}/>
                  <h2 style={{ fontSize:18 }}>Lettre de motivation</h2>
                </div>
                <span style={{ fontSize:11, background:'var(--green-gl)', color:'var(--green)', padding:'3px 10px', borderRadius:20, border:'1px solid rgba(0,214,143,.2)' }}>IA · modifiable</span>
              </div>
              {letterLoading ? (
                <div style={{ textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:28, marginBottom:10 }}>✨</div>
                  <p style={{ color:'var(--green)', fontWeight:500 }}>Apply Agent génère ta lettre pour {activeJob?.company}...</p>
                </div>
              ) : (
                <textarea value={letter} onChange={e=>setLetter(e.target.value)}
                  style={{ width:'100%', minHeight:300, padding:16, fontSize:14, lineHeight:1.8, resize:'vertical' }}/>
              )}
            </div>
            <div className="glass" style={{ padding:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <AgentBadge name="Email Agent" active={sending}/>
                <h3 style={{ fontSize:16 }}>Envoyer la candidature</h3>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:600, display:'block', marginBottom:6, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5 }}>
                  Email du recruteur
                  {activeJob?.companyEmail&&<span style={{ fontSize:10, color:'var(--green)', marginLeft:8, background:'var(--green-gl)', padding:'2px 8px', borderRadius:12, border:'1px solid rgba(0,214,143,.2)' }}>✓ Auto-détecté</span>}
                </label>
                <input value={recEmail} onChange={e=>setRecEmail(e.target.value)} placeholder="recruteur@entreprise.com" style={{ maxWidth:400 }}/>
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>📎 CV joint automatiquement</p>
              </div>
              {sendResult ? (
                <div style={{ background:'var(--green-gl)', border:'1px solid rgba(0,214,143,.2)', borderRadius:10, padding:'16px 20px' }}>
                  <p style={{ color:'var(--green)', fontWeight:700, fontSize:15 }}>✓ Candidature envoyée !</p>
                  <p style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>{sendResult.emailSent?`Email + CV envoyés`:'Candidature enregistrée'} · Reste: {sendResult.remaining===999998?'∞':sendResult.remaining}</p>
                  <div style={{ display:'flex', gap:10, marginTop:14 }}>
                    <button className="btn btn-primary" onClick={()=>{setSendResult(null);setStep(2);}}>← Autres offres</button>
                    <button className="btn" onClick={loadHistory}>Historique</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={sendApp} disabled={sending||!letter||letterLoading} style={{ padding:'11px 24px', fontSize:14 }}>
                  {sending?'📨 Envoi...':'📨 Envoyer Lettre + CV'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════ STEP 4: HISTORIQUE ════ */}
        {step===4 && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:20 }}>Mes candidatures</h2>
              <button className="btn btn-primary" onClick={()=>setStep(0)}>+ Nouvelle recherche</button>
            </div>
            {history.length===0 ? (
              <div className="glass" style={{ textAlign:'center', padding:56 }}>
                <p style={{ fontSize:36, marginBottom:12 }}>📋</p>
                <p style={{ fontWeight:600 }}>Aucune candidature encore</p>
                <button className="btn btn-primary" style={{ marginTop:20 }} onClick={()=>setStep(0)}>Commencer</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {history.map((app,i)=>(
                  <div key={i} className="glass" style={{ padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:38, height:38, borderRadius:8, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, color:'var(--blue)', flexShrink:0 }}>
                      {app.job?.company?.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:500, fontSize:14 }}>{app.job?.title} — {app.job?.company}</p>
                      <p style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>{new Date(app.createdAt).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}{app.matchScore?` · ${app.matchScore}%`:''}</p>
                    </div>
                    <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'var(--green-gl)', color:'var(--green)', border:'1px solid rgba(0,214,143,.2)' }}>{app.status==='sent'?'✓ Envoyée':app.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step<4 && (
          <div style={{ textAlign:'center', marginTop:20 }}>
            <button style={{ background:'none', border:'none', color:'var(--muted)', fontSize:12, cursor:'pointer' }} onClick={loadHistory}>📋 Voir mes candidatures</button>
          </div>
        )}
      </div>
    </div>
  );
}
