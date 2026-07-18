'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';

interface Message { role: 'user'|'assistant'; content: string; loading?: boolean; }
interface ScanResult {
  atsScore: number; atsLevel: string; atsExplanation: string;
  keywordsPresent: string[]; keywordsMissing: string[];
  strengths: string[]; improvements: string[]; atsIssues: string[];
  sectionScores: Record<string,number>;
  recommendations: {priority:string;section:string;action:string;reason:string}[];
  optimizedSummary: string; quickWins: string[];
}

function ATSRing({ score }: { score: number }) {
  const color = score >= 80 ? '#00D68F' : score >= 60 ? '#F59E0B' : '#EF4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Bon' : 'À améliorer';
  const r = 52, c = 64, circ = 2*Math.PI*r, dash = (score/100)*circ;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <svg width="128" height="128">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg3)" strokeWidth="9"/>
        <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dasharray 1.2s ease' }}/>
        <text x={c} y={c-8} textAnchor="middle" style={{ fill:color, fontSize:28, fontWeight:800, fontFamily:'Syne,sans-serif' }}>{score}</text>
        <text x={c} y={c+12} textAnchor="middle" style={{ fill:'#7A8499', fontSize:10 }}>/ 100</text>
        <text x={c} y={c+26} textAnchor="middle" style={{ fill:'#7A8499', fontSize:9 }}>ATS Score</text>
      </svg>
      <span style={{ fontSize:12, fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}44`, padding:'4px 14px', borderRadius:20 }}>{label}</span>
    </div>
  );
}

function Bar({ label, value, color='var(--green)' }: { label:string; value:number; color?:string }) {
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:12, color:'var(--text)' }}>{label}</span>
        <span style={{ fontSize:12, color, fontWeight:700 }}>{value}%</span>
      </div>
      <div style={{ height:5, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${value}%`, background:color, borderRadius:3, transition:'width 1s ease' }}/>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role==='user';
  return (
    <div style={{ display:'flex', justifyContent:isUser?'flex-end':'flex-start', marginBottom:12, alignItems:'flex-end', gap:6 }}>
      {!isUser && (
        <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#000', fontWeight:700, flexShrink:0 }}>AI</div>
      )}
      <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:isUser?'16px 16px 4px 16px':'16px 16px 16px 4px', background:isUser?'var(--green)':'var(--bg3)', color:isUser?'#000':'var(--text)', fontSize:13, lineHeight:1.6, border:isUser?'none':'1px solid var(--border)' }}>
        {msg.loading
          ? <span style={{ display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(i=><span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', display:'inline-block', animation:`bounce .9s ${i*.2}s infinite ease-in-out` }}/>)}
            </span>
          : msg.content}
      </div>
    </div>
  );
}

export default function CVPage() {
  const { user }   = useAuth();
  const fileRef    = useRef<HTMLInputElement>(null);
  const chatRef    = useRef<HTMLDivElement>(null);

  const [cv, setCv]               = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [scan, setScan]           = useState<ScanResult|null>(null);
  const [scanning, setScanning]   = useState(false);
  const [jobDesc, setJobDesc]     = useState('');
  const [showJobInput, setShowJobInput] = useState(false);
  const [error, setError]         = useState('');
  const [tab, setTab]             = useState<'overview'|'details'|'optimize'>('overview');

  const [chatOpen, setChatOpen]   = useState(false);
  const [messages, setMessages]   = useState<Message[]>([
    { role:'assistant', content:'👋 Bonjour ! Je suis ton assistant CV IA.\n\nPose-moi n\'importe quelle question sur ton CV — comment l\'améliorer, quels mots-clés ajouter, comment décrocher plus d\'entretiens !' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, chatOpen]);

  const uploadCV = async (file: File) => {
    setUploading(true); setError(''); setScan(null);
    const fd = new FormData(); fd.append('cv', file);
    try {
      const res = await api.post('/api/cv/upload', fd);
      setCv(res.data);
    } catch (e:any) { setError(e.response?.data?.error || 'Erreur upload'); }
    finally { setUploading(false); }
  };

  const runScan = async () => {
    if (!cv) return;
    setScanning(true); setError('');
    try {
      const res = await api.post('/api/cv/scan', { cvId: cv.cvId, jobDescription: jobDesc });
      setScan(res.data);
      setTab('details');
    } catch (e:any) { setError(e.response?.data?.error || 'Erreur scan'); }
    finally { setScanning(false); }
  };

  const sendChat = async (q?: string) => {
    const question = q || chatInput.trim();
    if (!question || chatLoading) return;
    setChatInput('');
    const userMsg: Message = { role:'user', content:question };
    const loadMsg: Message = { role:'assistant', content:'', loading:true };
    setMessages(p=>[...p, userMsg, loadMsg]);
    setChatLoading(true);
    try {
      const res = await api.post('/api/cv/chat', { question, cvId:cv?.cvId, history:messages.slice(-6) });
      setMessages(p=>[...p.slice(0,-1), { role:'assistant', content:res.data.answer }]);
    } catch {
      setMessages(p=>[...p.slice(0,-1), { role:'assistant', content:'❌ Erreur — réessaie.' }]);
    } finally { setChatLoading(false); }
  };

  const QUICK = ['Comment améliorer mon score ATS ?', 'Quels mots-clés me manquent ?', 'Mon CV passe-t-il les filtres automatiques ?', 'Comment présenter mes projets ?'];
  const analysis = cv?.analysis;
  const ats = scan?.atsScore ?? analysis?.atsScore ?? 0;

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideChat { from{opacity:0;transform:scale(.95) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .fu { animation: fadeUp .35s ease forwards; }
        .sc { animation: slideChat .28s ease forwards; }
        .pill { display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500; }
      `}</style>

      <div style={{ minHeight:'100vh', background:'var(--bg)' }}>

        {/* Navbar */}
        <nav style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'0 24px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)' }}/>
            <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:16 }}>JobSmart AI</span>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Link href="/dashboard" className="btn" style={{ fontSize:12, padding:'5px 14px' }}>← Dashboard</Link>
            <Link href="/interview" className="btn" style={{ fontSize:12, padding:'5px 14px' }}>🎤 Interview Coach</Link>
          </div>
        </nav>

        <div style={{ maxWidth:1000, margin:'0 auto', padding:'32px 20px' }}>
          <div style={{ marginBottom:24 }}>
            <h1 style={{ fontSize:28, marginBottom:4 }}>Mon CV <span className="gradient-text">IA</span></h1>
            <p style={{ color:'var(--muted)', fontSize:13 }}>Score ATS · Scanner · Recommandations · Assistant IA</p>
          </div>

          {error && <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'11px 16px', marginBottom:16, fontSize:13, color:'var(--red)' }}>{error}</div>}

          {/* ─── UPLOAD ─── */}
          {!cv && !uploading && (
            <div className="glass fu" style={{ padding:52, textAlign:'center' }}>
              <div style={{ width:72, height:72, borderRadius:20, background:'var(--green-gl)', border:'1px solid rgba(0,214,143,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, margin:'0 auto 20px' }}>📄</div>
              <h2 style={{ fontSize:22, marginBottom:8 }}>Upload ton CV</h2>
              <p style={{ color:'var(--muted)', fontSize:13, marginBottom:28, lineHeight:1.8, maxWidth:480, margin:'0 auto 28px' }}>
                Le <strong style={{ color:'var(--green)' }}>Resume Agent IA</strong> analyse ton CV, calcule ton score ATS, détecte tes compétences et te donne des recommandations personnalisées pour être sélectionné.
              </p>
              <button className="btn btn-primary" onClick={()=>fileRef.current?.click()} style={{ padding:'12px 36px', fontSize:15 }}>
                📂 Choisir mon CV (PDF)
              </button>
              <p style={{ color:'var(--muted)', fontSize:11, marginTop:12 }}>PDF uniquement · max 5 MB</p>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&uploadCV(e.target.files[0])}/>
            </div>
          )}

          {/* ─── UPLOADING ─── */}
          {uploading && (
            <div className="glass" style={{ padding:56, textAlign:'center' }}>
              <div style={{ fontSize:44, marginBottom:16, animation:'bounce 1s infinite' }}>🤖</div>
              <p style={{ color:'var(--green)', fontWeight:700, fontSize:18, marginBottom:8 }}>Resume Agent analyse ton CV...</p>
              <p style={{ color:'var(--muted)', fontSize:13 }}>Extraction compétences · Score ATS · Mots-clés · Recommandations</p>
              <div style={{ marginTop:24, height:4, background:'var(--bg3)', borderRadius:2, overflow:'hidden', maxWidth:280, margin:'24px auto 0' }}>
                <div style={{ height:'100%', background:'linear-gradient(90deg,var(--green),var(--blue))', width:'70%', borderRadius:2, animation:'bounce 1s infinite' }}/>
              </div>
            </div>
          )}

          {/* ─── CV LOADED ─── */}
          {cv && !uploading && (
            <div className="fu">
              {/* Top bar */}
              <div className="glass" style={{ padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', color:'#000', fontWeight:800, fontSize:13, flexShrink:0 }}>CV</div>
                  <div>
                    <p style={{ fontWeight:600, color:'var(--green)', fontSize:14 }}>{cv.originalName}</p>
                    <p style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>Resume Agent ✓ · {analysis?.skills?.length || 0} compétences · {analysis?.experience}</p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button className="btn" onClick={()=>fileRef.current?.click()} style={{ fontSize:12, padding:'6px 12px' }}>🔄 Changer</button>
                  <button className="btn" onClick={()=>setShowJobInput(!showJobInput)} style={{ fontSize:12, padding:'6px 12px' }}>+ Ajouter une offre</button>
                  <button className="btn btn-primary" onClick={runScan} disabled={scanning} style={{ fontSize:12, padding:'6px 14px' }}>
                    {scanning ? '🔍 Analyse en cours...' : '🔍 Scanner & Optimiser'}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept=".pdf" style={{ display:'none' }} onChange={e=>e.target.files?.[0]&&uploadCV(e.target.files[0])}/>
              </div>

              {/* Job description input */}
              {showJobInput && (
                <div className="glass fu" style={{ padding:20, marginBottom:20, border:'1px solid rgba(0,214,143,.2)' }}>
                  <p style={{ fontSize:12, color:'var(--green)', fontWeight:600, marginBottom:8 }}>🎯 OFFRE D'EMPLOI (optionnel — pour matching précis)</p>
                  <textarea value={jobDesc} onChange={e=>setJobDesc(e.target.value)}
                    placeholder="Colle ici la description du poste pour obtenir un score de matching précis et des recommandations adaptées..."
                    style={{ width:'100%', minHeight:100, padding:12, fontSize:13, lineHeight:1.6, resize:'vertical' }}/>
                  <p style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>Plus tu donnes de détails sur l'offre, plus le score de matching sera précis.</p>
                </div>
              )}

              {/* TABS */}
              <div style={{ display:'flex', gap:4, marginBottom:20, background:'var(--bg2)', padding:4, borderRadius:10, border:'1px solid var(--border)', width:'fit-content' }}>
                {([['overview','Vue d\'ensemble'],['details','Analyse détaillée'],['optimize','Optimiser']] as const).map(([k,l])=>(
                  <button key={k} onClick={()=>setTab(k)}
                    style={{ padding:'8px 18px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'Inter', fontSize:13, fontWeight:500, transition:'all .2s',
                      background:tab===k?'var(--green)':'transparent', color:tab===k?'#000':'var(--muted)' }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* ═══ TAB: OVERVIEW ═══ */}
              {tab==='overview' && (
                <div className="fu">
                  <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20, marginBottom:20 }}>
                    {/* ATS Ring */}
                    <div className="glass" style={{ padding:24, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                      <ATSRing score={ats}/>
                      {scan && (
                        <p style={{ fontSize:12, color:'var(--muted)', marginTop:14, lineHeight:1.5 }}>
                          {scan.atsExplanation}
                        </p>
                      )}
                    </div>

                    {/* Right side */}
                    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                      {/* Section scores */}
                      {scan?.sectionScores && (
                        <div className="glass" style={{ padding:20 }}>
                          <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>Score par section</p>
                          {Object.entries(scan.sectionScores).map(([k,v])=>(
                            <Bar key={k} label={k.charAt(0).toUpperCase()+k.slice(1)} value={v}
                              color={v>=80?'var(--green)':v>=60?'var(--amber)':'var(--red)'}/>
                          ))}
                        </div>
                      )}

                      {/* Profile info */}
                      <div className="glass" style={{ padding:20 }}>
                        <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>Profil détecté</p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                          <span className="pill" style={{ background:'var(--green-gl)', color:'var(--green)', border:'1px solid rgba(0,214,143,.2)' }}>📊 {analysis?.experience}</span>
                          <span className="pill" style={{ background:'var(--bg3)', color:'var(--muted)', border:'1px solid var(--border)' }}>🎓 {analysis?.education}</span>
                          {analysis?.languages?.map((l:string)=>(
                            <span key={l} className="pill" style={{ background:'rgba(245,158,11,.08)', color:'var(--amber)', border:'1px solid rgba(245,158,11,.2)' }}>🌍 {l}</span>
                          ))}
                        </div>
                        {analysis?.jobTitles?.length>0 && (
                          <>
                            <p style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>Postes recommandés :</p>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                              {analysis.jobTitles.map((t:string)=>(
                                <span key={t} className="pill" style={{ background:'rgba(139,92,246,.08)', color:'var(--purple)', border:'1px solid rgba(139,92,246,.2)' }}>{t}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {analysis?.skills?.length>0 && (
                    <div className="glass" style={{ padding:20, marginBottom:16 }}>
                      <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>✅ {analysis.skills.length} compétences détectées</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {analysis.skills.map((s:string)=>(
                          <span key={s} className="pill" style={{ background:'var(--green-gl)', color:'var(--green)', border:'1px solid rgba(0,214,143,.2)' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick wins */}
                  {scan?.quickWins?.length>0 && (
                    <div className="glass" style={{ padding:20, border:'1px solid rgba(0,214,143,.15)', background:'rgba(0,214,143,.03)' }}>
                      <p style={{ fontSize:11, color:'var(--green)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>⚡ Actions rapides à faire maintenant</p>
                      {scan.quickWins.map((w,i)=>(
                        <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--green)', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</div>
                          <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>{w}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {!scan && (
                    <div style={{ textAlign:'center', marginTop:24, padding:24, border:'1px dashed var(--border)', borderRadius:12 }}>
                      <p style={{ color:'var(--muted)', fontSize:14, marginBottom:16 }}>🔍 Lance le scan pour obtenir l'analyse complète avec score ATS, mots-clés et recommandations</p>
                      <button className="btn btn-primary" onClick={runScan} style={{ padding:'10px 28px' }}>
                        Lancer le Scanner IA →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: DETAILS ═══ */}
              {tab==='details' && (
                <div className="fu">
                  {!scan ? (
                    <div style={{ textAlign:'center', padding:48 }}>
                      <p style={{ color:'var(--muted)', marginBottom:16 }}>Lance d'abord le scanner pour voir l'analyse détaillée</p>
                      <button className="btn btn-primary" onClick={runScan}>Scanner mon CV →</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

                      {/* Keywords grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                        {scan.keywordsPresent?.length>0 && (
                          <div className="glass" style={{ padding:20 }}>
                            <p style={{ fontSize:11, color:'var(--green)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>✅ Mots-clés présents ({scan.keywordsPresent.length})</p>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                              {scan.keywordsPresent.map(k=><span key={k} className="pill" style={{ background:'var(--green-gl)', color:'var(--green)', border:'1px solid rgba(0,214,143,.2)' }}>{k}</span>)}
                            </div>
                          </div>
                        )}
                        {scan.keywordsMissing?.length>0 && (
                          <div className="glass" style={{ padding:20, border:'1px solid rgba(239,68,68,.15)' }}>
                            <p style={{ fontSize:11, color:'var(--red)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>❌ Mots-clés manquants ({scan.keywordsMissing.length})</p>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                              {scan.keywordsMissing.map(k=><span key={k} className="pill" style={{ background:'rgba(239,68,68,.08)', color:'var(--red)', border:'1px solid rgba(239,68,68,.2)' }}>+ {k}</span>)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Strengths + Issues */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                        {scan.strengths?.length>0 && (
                          <div className="glass" style={{ padding:20 }}>
                            <p style={{ fontSize:11, color:'var(--green)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>💪 Points forts</p>
                            {scan.strengths.map((s,i)=>(
                              <div key={i} style={{ display:'flex', gap:8, marginBottom:10, fontSize:13 }}>
                                <span style={{ color:'var(--green)', flexShrink:0 }}>✓</span>{s}
                              </div>
                            ))}
                          </div>
                        )}
                        {scan.improvements?.length>0 && (
                          <div className="glass" style={{ padding:20 }}>
                            <p style={{ fontSize:11, color:'var(--amber)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>🔧 À améliorer</p>
                            {scan.improvements.map((s,i)=>(
                              <div key={i} style={{ display:'flex', gap:8, marginBottom:10, fontSize:13 }}>
                                <span style={{ color:'var(--amber)', flexShrink:0 }}>→</span>{s}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ATS Issues */}
                      {scan.atsIssues?.length>0 && (
                        <div className="glass" style={{ padding:20, border:'1px solid rgba(239,68,68,.15)', background:'rgba(239,68,68,.03)' }}>
                          <p style={{ fontSize:11, color:'var(--red)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>⚠️ Problèmes ATS détectés</p>
                          {scan.atsIssues.map((issue,i)=>(
                            <div key={i} style={{ display:'flex', gap:8, marginBottom:8, fontSize:13 }}>
                              <span style={{ color:'var(--red)', flexShrink:0 }}>!</span>{issue}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recommendations */}
                      {scan.recommendations?.length>0 && (
                        <div className="glass" style={{ padding:20 }}>
                          <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>📋 Recommandations prioritaires</p>
                          {scan.recommendations.map((r,i)=>(
                            <div key={i} style={{ display:'flex', gap:14, marginBottom:16, padding:'12px 14px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)' }}>
                              <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:12, background: r.priority==='high'?'rgba(239,68,68,.15)':'rgba(245,158,11,.15)', color: r.priority==='high'?'var(--red)':'var(--amber)', flexShrink:0, height:'fit-content', whiteSpace:'nowrap' }}>
                                {r.priority==='high'?'URGENT':'MOYEN'}
                              </span>
                              <div>
                                <p style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>{r.section}</p>
                                <p style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>{r.action}</p>
                                <p style={{ fontSize:12, color:'var(--muted)' }}>→ {r.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ TAB: OPTIMIZE ═══ */}
              {tab==='optimize' && (
                <div className="fu">
                  {scan?.optimizedSummary ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                      <div className="glass" style={{ padding:20, border:'1px solid rgba(0,214,143,.2)' }}>
                        <p style={{ fontSize:11, color:'var(--green)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>✨ Résumé optimisé ATS</p>
                        <p style={{ fontSize:14, color:'var(--text)', lineHeight:1.8 }}>{scan.optimizedSummary}</p>
                        <button onClick={()=>navigator.clipboard?.writeText(scan.optimizedSummary)} className="btn" style={{ marginTop:12, fontSize:11, padding:'5px 12px' }}>📋 Copier</button>
                      </div>

                      <div className="glass" style={{ padding:24, textAlign:'center' }}>
                        <p style={{ fontSize:14, color:'var(--muted)', marginBottom:16 }}>Veux-tu que l'IA réécrive complètement ton CV optimisé pour un poste spécifique ?</p>
                        <button className="btn btn-primary" onClick={()=>{ setChatOpen(true); sendChat('Réécris mon résumé professionnel de manière optimisée ATS pour maximiser mes chances'); }}
                          style={{ padding:'10px 24px' }}>
                          ✨ Optimiser avec l'IA Chat →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign:'center', padding:48 }}>
                      <p style={{ color:'var(--muted)', marginBottom:16 }}>Lance d'abord le scanner pour accéder à l'optimisation</p>
                      <button className="btn btn-primary" onClick={runScan}>🔍 Scanner mon CV →</button>
                    </div>
                  )}
                </div>
              )}

              {/* CTA bottom */}
              <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:24 }}>
                <Link href="/dashboard" className="btn btn-primary" style={{ padding:'11px 28px', fontSize:14 }}>🔍 Chercher des offres →</Link>
                <Link href="/interview" className="btn" style={{ padding:'11px 28px', fontSize:14 }}>🎤 Interview Coach</Link>
              </div>
            </div>
          )}
        </div>

        {/* ─── CHAT FAB ─── */}
        {cv && (
          <button onClick={()=>setChatOpen(!chatOpen)} style={{ position:'fixed', bottom:28, right:28, width:58, height:58, borderRadius:'50%', background:chatOpen?'var(--bg3)':'var(--green)', border:chatOpen?'1px solid var(--border)':'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow:chatOpen?'none':'0 0 24px rgba(0,214,143,.45)', transition:'all .3s', zIndex:200 }}>
            {chatOpen ? '✕' : '💬'}
          </button>
        )}

        {/* ─── CHAT PANEL ─── */}
        {chatOpen && cv && (
          <div className="sc" style={{ position:'fixed', bottom:100, right:28, width:370, height:510, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,.55)', zIndex:199, overflow:'hidden' }}>

            {/* Header */}
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg3)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#000', fontWeight:700, flexShrink:0 }}>AI</div>
              <div>
                <p style={{ fontWeight:600, fontSize:14 }}>Assistant CV IA</p>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 4px var(--green)' }}/>
                  <span style={{ fontSize:10, color:'var(--green)' }}>En ligne · Répond en 2 sec</span>
                </div>
              </div>
              <button onClick={()=>setChatOpen(false)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>

            {/* Messages */}
            <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'14px 14px 6px' }}>
              {messages.map((m,i)=><Bubble key={i} msg={m}/>)}
            </div>

            {/* Quick questions */}
            {messages.length<=2 && (
              <div style={{ padding:'0 14px 8px', display:'flex', flexWrap:'wrap', gap:5 }}>
                {QUICK.map(q=>(
                  <button key={q} onClick={()=>sendChat(q)}
                    style={{ fontSize:11, padding:'5px 10px', borderRadius:12, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer', transition:'all .15s' }}
                    onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--green)';(e.currentTarget as HTMLElement).style.color='var(--green)';}}
                    onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor='var(--border)';(e.currentTarget as HTMLElement).style.color='var(--muted)';}}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                placeholder="Pose ta question sur ton CV..."
                style={{ flex:1, padding:'9px 14px', borderRadius:20, fontSize:13 }}/>
              <button onClick={()=>sendChat()} disabled={!chatInput.trim()||chatLoading}
                style={{ width:38, height:38, borderRadius:'50%', background:chatInput.trim()?'var(--green)':'var(--bg3)', border:'1px solid var(--border)', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .2s', color:chatInput.trim()?'#000':'var(--muted)' }}>
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
