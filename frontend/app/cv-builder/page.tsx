'use client';
// app/cv/page.tsx — CV Builder avec photo de profil + assistant IA chat

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Exp  { id: number; role: string; co: string; period: string; location: string; bullets: string; }
interface Edu  { id: number; degree: string; school: string; period: string; detail: string; }
interface Lang { id: number; name: string; level: string; }
interface ChatMsg { role: 'user' | 'ai'; text: string; }

interface CVData {
  prenom: string; nom: string; titre: string;
  email: string; tel: string; ville: string;
  linkedin: string; github: string; summary: string;
  photo?: string; // base64
  exps:  { role: string; co: string; period: string; location: string; bullets: string[] }[];
  edus:  { degree: string; school: string; period: string; detail: string }[];
  skills: string[];
  langs: { name: string; level: string }[];
}

type Style   = 'fr' | 'ca' | 'uk';
type Section = 'perso' | 'summary' | 'exp' | 'edu' | 'skills' | 'langs';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const STYLES = {
  fr: { label: 'France',       flag: '🇫🇷', hint: 'Classique · Sobre',    color: '#2d4a8f', bg: '#e8ecf7', photoNote: 'Photo optionnelle mais souvent demandée' },
  ca: { label: 'Canada',       flag: '🇨🇦', hint: 'Moderne · Aéré',       color: '#c41e3a', bg: '#fce8ea', photoNote: 'Photo non recommandée au Canada' },
  uk: { label: 'UK / Anglais', flag: '🇬🇧', hint: 'Élégant · Structuré',  color: '#1a3a6b', bg: '#e6edf8', photoNote: 'Photo déconseillée au Royaume-Uni' },
};
const LEVELS = ['A1 — Débutant','A2 — Élémentaire','B1 — Intermédiaire','B2 — Indépendant','C1 — Avancé','C2 — Maîtrise','Natif'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const esc  = (s: string) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const buls = (arr: string[], ac: string) => arr.length
  ? `<ul style="list-style:none;padding:0;margin:4px 0 0">${arr.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px;padding-left:10px;position:relative"><span style="position:absolute;left:0;color:${ac};font-size:9px;top:3px">▸</span>${esc(b)}</li>`).join('')}</ul>`
  : '';

// ─── CV RENDERERS ─────────────────────────────────────────────────────────────

function renderFR(cv: CVData): string {
  const ac = STYLES.fr.color;
  const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
  const photoHtml = cv.photo
    ? `<div style="position:absolute;right:28px;top:50%;transform:translateY(-50%);width:72px;height:72px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,.4);flex-shrink:0">
        <img src="${cv.photo}" style="width:100%;height:100%;object-fit:cover" />
       </div>`
    : '';
  return `
<div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714">
  <div style="background:${ac};padding:24px 32px 20px;position:relative;overflow:hidden">
    <div style="position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
    ${photoHtml}
    <div style="padding-right:${cv.photo?'90px':'0'}">
      <div style="font-family:'Georgia',serif;font-size:24px;color:#fff;margin-bottom:2px">${esc(cv.prenom)} ${esc(cv.nom)}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px">${esc(cv.titre)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px">${contacts.map(c=>`<span style="font-size:10px;color:rgba(255,255,255,.65)">◦ ${esc(c)}</span>`).join('')}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 168px;min-height:720px">
    <div style="padding:18px 20px;border-right:1px solid #eee">
      ${cv.summary?`<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Profil</div><p style="font-size:11px;color:#4a4540;line-height:1.75;margin-bottom:14px">${esc(cv.summary)}</p>`:''}
      ${cv.exps.length?`<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Expériences Professionnelles</div>${cv.exps.map(e=>`
        <div style="margin-bottom:13px;padding-left:10px;border-left:2px solid #d0d8f0">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.role)}</span>
            <span style="font-size:10px;color:#8a8480">${esc(e.period)}</span>
          </div>
          <div style="font-size:11px;color:${ac};font-weight:500;margin-bottom:2px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
          ${buls(e.bullets,ac)}
        </div>`).join('')}`:''}
      ${cv.edus.length?`<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin:14px 0 8px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Formation</div>${cv.edus.map(e=>`
        <div style="margin-bottom:9px">
          <div style="display:flex;justify-content:space-between">
            <div>
              <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.degree)}</span>
              <div style="font-size:11px;color:${ac};font-weight:500">${esc(e.school)}</div>
              ${e.detail?`<div style="font-size:9.5px;color:#8a8480">${esc(e.detail)}</div>`:''}
            </div>
            <span style="font-size:10px;color:#8a8480;flex-shrink:0;margin-left:8px">${esc(e.period)}</span>
          </div>
        </div>`).join('')}`:''}
    </div>
    <div style="padding:16px;background:#f8faff">
      ${cv.skills.length?`<div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin-bottom:7px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Compétences</div><div style="margin-bottom:12px">${cv.skills.map(s=>`<span style="display:inline-block;background:#e8ecf7;color:${ac};border-radius:3px;padding:2px 6px;font-size:9px;font-weight:600;margin:2px 2px 2px 0">${esc(s)}</span>`).join('')}</div>`:''}
      ${cv.langs.filter(l=>l.name).length?`<div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin-bottom:7px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Langues</div>${cv.langs.filter(l=>l.name).map(l=>`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><span style="font-size:10px;color:#1a1714">${esc(l.name)}</span><span style="font-size:8px;background:#e8ecf7;color:${ac};padding:1px 5px;border-radius:2px;font-weight:600">${esc(l.level?.split(' — ')[0]||l.level||'')}</span></div>`).join('')}`:''}
      ${cv.linkedin||cv.github?`<div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin:12px 0 6px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Liens</div>${cv.linkedin?`<div style="font-size:9px;color:#4a4540;word-break:break-all;margin-bottom:3px">${esc(cv.linkedin)}</div>`:''}${cv.github?`<div style="font-size:9px;color:#4a4540;word-break:break-all">${esc(cv.github)}</div>`:''}`:''}
    </div>
  </div>
  <div style="background:${ac};padding:7px 32px;display:flex;justify-content:space-between">
    <span style="font-size:8px;color:rgba(255,255,255,.35);letter-spacing:.06em">CV · ${esc(cv.prenom)} ${esc(cv.nom)}</span>
    <span style="font-size:8px;color:rgba(255,255,255,.35)">JOBSMART AI</span>
  </div>
</div>`;
}

function renderCA(cv: CVData): string {
  const ac = STYLES.ca.color;
  const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
  const sec = (t: string) => `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin:16px 0 8px;padding-bottom:3px;border-bottom:2px solid ${ac}">${t}</div>`;
  const photoHtml = cv.photo
    ? `<div style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:3px solid ${ac};flex-shrink:0;margin-left:16px">
        <img src="${cv.photo}" style="width:100%;height:100%;object-fit:cover" />
       </div>`
    : '';
  return `
<div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714">
  <div style="background:#fff;padding:22px 32px 14px;border-bottom:4px solid ${ac};display:flex;align-items:center">
    <div style="flex:1">
      <div style="font-family:'Georgia',serif;font-size:26px;color:#1a1714;margin-bottom:2px">${esc(cv.prenom)} ${esc(cv.nom)}</div>
      <div style="font-size:13px;color:${ac};font-weight:600;margin-bottom:9px">${esc(cv.titre)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px">${contacts.map(c=>`<span style="font-size:10px;color:#6a6460">• ${esc(c)}</span>`).join('')}</div>
    </div>
    ${photoHtml}
  </div>
  <div style="padding:0 32px 22px">
    ${cv.summary?sec('Sommaire Professionnel')+`<p style="font-size:11px;color:#4a4540;line-height:1.75">${esc(cv.summary)}</p>`:''}
    ${cv.exps.length?sec('Expérience Professionnelle')+cv.exps.map(e=>`
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:12px;font-weight:700;color:#1a1714">${esc(e.role)}</span>
        <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
      </div>
      <div style="font-size:11px;color:#4a4540;font-style:italic;margin-bottom:3px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
      <ul style="list-style:disc;padding-left:14px;margin:0">${e.bullets.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px">${esc(b)}</li>`).join('')}</ul>
    </div>`).join(''):''}
    ${cv.edus.length?sec('Formation')+cv.edus.map(e=>`
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:12px;font-weight:700;color:#1a1714">${esc(e.degree)}</span>
        <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
      </div>
      <div style="font-size:11px;color:#4a4540;font-style:italic">${esc(e.school)}${e.detail?' · '+esc(e.detail):''}</div>
    </div>`).join(''):''}
    ${cv.skills.length?sec('Compétences')+`<div style="display:flex;flex-wrap:wrap;gap:5px">${cv.skills.map(s=>`<span style="background:#fce8ea;color:${ac};border-radius:4px;padding:3px 8px;font-size:9px;font-weight:600">${esc(s)}</span>`).join('')}</div>`:''}
    ${cv.langs.filter(l=>l.name).length?sec('Langues')+`<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px">${cv.langs.filter(l=>l.name).map(l=>`<div style="display:flex;justify-content:space-between;font-size:10.5px"><span style="color:#1a1714">${esc(l.name)}</span><span style="color:#8a8480">${esc(l.level?.split(' — ')[1]||l.level||'')}</span></div>`).join('')}</div>`:''}
  </div>
</div>`;
}

function renderUK(cv: CVData): string {
  const ac = STYLES.uk.color;
  const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
  const sec = (t: string) => `<div style="font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${ac};margin:14px 0 7px;background:#e6edf8;padding:4px 8px;border-left:3px solid ${ac}">${t}</div>`;
  // UK: photo generally not recommended — show smaller if provided
  const photoHtml = cv.photo
    ? `<div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid ${ac};flex-shrink:0;margin-left:16px;opacity:.85">
        <img src="${cv.photo}" style="width:100%;height:100%;object-fit:cover" />
       </div>`
    : '';
  return `
<div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714">
  <div style="background:#fff;padding:24px 32px 16px;border-left:5px solid ${ac};display:flex;align-items:center">
    <div style="flex:1">
      <div style="font-family:'Georgia',serif;font-size:28px;color:#1a1714;font-style:italic;margin-bottom:2px">${esc(cv.prenom)} ${esc(cv.nom)}</div>
      <div style="font-size:12px;color:${ac};font-weight:500;margin-bottom:10px;letter-spacing:.04em">${esc(cv.titre)}</div>
      <div style="font-size:10px;color:#6a6460">${contacts.join(' &nbsp;·&nbsp; ')}</div>
    </div>
    ${photoHtml}
  </div>
  <div style="padding:0 32px 22px">
    ${cv.summary?sec('Personal Statement')+`<p style="font-size:11px;color:#4a4540;line-height:1.75;font-style:italic;border-left:3px solid #d0ddf0;padding-left:10px;margin-bottom:2px">${esc(cv.summary)}</p>`:''}
    ${cv.exps.length?sec('Work Experience')+cv.exps.map(e=>`
    <div style="margin-bottom:13px">
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.role)}</span>
        <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
      </div>
      <div style="font-size:11px;color:#4a4540;margin-bottom:3px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
      <ul style="list-style:none;padding:0;margin:0">${e.bullets.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px;padding-left:12px;position:relative"><span style="position:absolute;left:0;color:${ac}">—</span>${esc(b)}</li>`).join('')}</ul>
    </div>`).join(''):''}
    ${cv.edus.length?sec('Education')+cv.edus.map(e=>`
    <div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.degree)}</span>
        <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
      </div>
      <div style="font-size:11px;color:#4a4540">${esc(e.school)}${e.detail?' · '+esc(e.detail):''}</div>
    </div>`).join(''):''}
    ${cv.skills.length?sec('Key Skills')+`<div style="display:flex;flex-wrap:wrap;gap:4px">${cv.skills.map(s=>`<span style="border:1px solid #c5d4e8;color:${ac};border-radius:2px;padding:2px 7px;font-size:9px;font-weight:500">${esc(s)}</span>`).join('')}</div>`:''}
    ${cv.langs.filter(l=>l.name).length?sec('Languages')+cv.langs.filter(l=>l.name).map(l=>`<div style="font-size:10.5px;color:#4a4540;margin-bottom:3px">${esc(l.name)} — ${esc(l.level?.split(' — ')[1]||l.level||'')}</div>`).join(''):''}
  </div>
</div>`;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function CVBuilderPage() {
  const [style,     setStyle]     = useState<Style>('fr');
  const [section,   setSection]   = useState<Section>('perso');
  const [loading,   setLoading]   = useState(false);
  const [generated, setGenerated] = useState(false);
  const [cvHtml,    setCvHtml]    = useState('');
  const [pdfLoad,   setPdfLoad]   = useState(false);
  const [error,     setError]     = useState('');

  // Identité
  const [prenom,   setPrenom]   = useState('');
  const [nom,      setNom]      = useState('');
  const [titre,    setTitre]    = useState('');
  const [email,    setEmail]    = useState('');
  const [tel,      setTel]      = useState('');
  const [ville,    setVille]    = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github,   setGithub]   = useState('');
  const [summary,  setSummary]  = useState('');

  // Photo
  const [photo,    setPhoto]    = useState<string>('');
  const photoRef = useRef<HTMLInputElement>(null);

  // Sections
  const [exps,   setExps]   = useState<Exp[]>([{ id: 1, role:'', co:'', period:'', location:'', bullets:'' }]);
  const [edus,   setEdus]   = useState<Edu[]>([{ id: 1, degree:'', school:'', period:'', detail:'' }]);
  const [skills, setSkills] = useState<string[]>([]);
  const [langs,  setLangs]  = useState<Lang[]>([{ id: 1, name:'', level:'' }]);
  const [skillIn, setSkillIn] = useState('');

  // Chat assistant
  const [chatOpen,   setChatOpen]   = useState(false);
  const [chatMsgs,   setChatMsgs]   = useState<ChatMsg[]>([
    { role:'ai', text:'👋 Bonjour ! Je suis ton assistant expert en rédaction de CV.\n\nJe connais ton CV en temps réel et je peux :\n✨ Rédiger ton résumé professionnel\n⚡ Améliorer tes bullet points avec des métriques\n🎯 Suggérer des compétences ATS\n🌍 Donner des conseils selon le pays (France, Canada, UK)\n📊 Analyser ton score ATS\n🔄 Traduire en anglais\n\nPose ta question ou clique sur un raccourci ci-dessous !' }
  ]);
  const [chatInput,  setChatInput]  = useState('');
  const [chatLoading,setChatLoading]= useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  // ── Photo handler ──────────────────────────────────────────────────────────
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhoto(ev.target?.result as string);
      if (generated) setTimeout(() => handleGenerate(), 100);
    };
    reader.readAsDataURL(file);
  };

  // ── CV data builder ────────────────────────────────────────────────────────
  const getData = (): CVData => ({
    prenom, nom, titre, email, tel, ville, linkedin, github, summary, photo,
    exps:  exps.map(e => ({ ...e, bullets: e.bullets.split('\n').filter(Boolean) })),
    edus:  edus.map(e => ({ degree:e.degree, school:e.school, period:e.period, detail:e.detail })),
    skills,
    langs: langs.map(l => ({ name:l.name, level:l.level })),
  });

  const doRender = useCallback((cv: CVData, s: Style) => {
    if (s === 'fr') return renderFR(cv);
    if (s === 'ca') return renderCA(cv);
    return renderUK(cv);
  }, []);

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const d = getData();
    setLoading(true); setError('');
    setCvHtml(doRender(d, style));
    setGenerated(true);

    try {
      const expText = d.exps.map(e =>
        `- ${e.role} chez ${e.co} (${e.period}, ${e.location})\n${e.bullets.map(b=>'  • '+b).join('\n')}`
      ).join('\n\n');

      const res = await fetch('/api/cv/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          prompt: `Style: ${style}. Améliore ce CV. Nom: ${d.prenom} ${d.nom}. Titre: ${d.titre}. Résumé: ${d.summary}. Exps:\n${expText||'Aucune'}. Formations: ${d.edus.map(e=>`${e.degree} ${e.school} ${e.period}`).join('; ')||'Aucune'}. Skills: ${d.skills.join(', ')||'Aucune'}. Langues: ${d.langs.map(l=>l.name+' '+l.level).join(', ')||'Aucune'}. RÈGLES: JSON uniquement, améliore résumé si vide, améliore bullets. {"prenom":"","nom":"","titre":"","email":"","tel":"","ville":"","linkedin":"","github":"","summary":"","exps":[{"role":"","co":"","period":"","location":"","bullets":[""]}],"edus":[{"degree":"","school":"","period":"","detail":""}],"skills":[""],"langs":[{"name":"","level":""}]}`,
          template: style,
        }),
      });
      if (res.ok) {
        const { cv } = await res.json();
        if (cv?.summary) {
          if (!summary && cv.summary) setSummary(cv.summary);
          const enhanced: CVData = {
            prenom: cv.prenom||d.prenom, nom: cv.nom||d.nom, titre: cv.titre||d.titre,
            email: cv.email||d.email, tel: cv.tel||d.tel, ville: cv.ville||d.ville,
            linkedin: cv.linkedin||d.linkedin, github: cv.github||d.github,
            summary: cv.summary||d.summary, photo: d.photo,
            exps:  (cv.exps||d.exps).map((e: { bullets: string | string[] } & Omit<CVData['exps'][0], 'bullets'>) => ({ ...e, bullets: Array.isArray(e.bullets)?e.bullets:[e.bullets] })),
            edus:  cv.edus||d.edus, skills: cv.skills||d.skills, langs: cv.langs||d.langs,
          };
          setCvHtml(doRender(enhanced, style));
        }
      }
    } catch { /* keep immediate render */ }
    finally { setLoading(false); }
  };

  const changeStyle = (s: Style) => {
    setStyle(s);
    if (generated) setCvHtml(doRender(getData(), s));
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const handlePdf = async () => {
    if (!generated) return;
    setPdfLoad(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf'),
      ]);
      const el = document.getElementById('cv-paper')!;
      const canvas = await html2canvas(el, { scale:2.5, useCORS:true, backgroundColor:'#fff', logging:false });
      const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const w = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height*w)/canvas.width);
      pdf.save(`cv-${(prenom+'-'+nom).toLowerCase().replace(/\s+/g,'-')}.pdf`);
    } catch { setError('Erreur PDF. npm install jspdf html2canvas'); }
    finally { setPdfLoad(false); }
  };

  // ── Chat AI ────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMsgs(p => [...p, { role:'user', text:msg }]);
    setChatLoading(true);

    const d = getData();

    // Contexte complet du CV pour l'IA
    const expLines = d.exps.filter(e=>e.role).map(e =>
      `  - ${e.role} chez ${e.co} (${e.period}${e.location?', '+e.location:''})${e.bullets.length?'\n    Réalisations: '+e.bullets.slice(0,3).join(' | '):''}`
    ).join('\n');
    const eduLines = d.edus.filter(e=>e.degree).map(e =>
      `  - ${e.degree} — ${e.school} (${e.period})${e.detail?' · '+e.detail:''}`
    ).join('\n');
    const context = [
      `Style CV: ${style==='fr'?'France (classique 2 colonnes)':style==='ca'?'Canada/Québec (moderne 1 colonne)':'UK/Anglais (élégant)'}`,
      `Nom complet: ${d.prenom} ${d.nom}`,
      `Titre / Poste visé: ${d.titre||'(non renseigné)'}`,
      `Ville: ${d.ville||'(non renseignée)'}`,
      `Résumé actuel: ${d.summary||'(vide — à rédiger)'}`,
      expLines ? `Expériences:\n${expLines}` : 'Expériences: (aucune saisie)',
      eduLines ? `Formations:\n${eduLines}` : 'Formations: (aucune saisie)',
      d.skills.length ? `Compétences: ${d.skills.join(', ')}` : 'Compétences: (aucune)',
      d.langs.filter(l=>l.name).length
        ? `Langues: ${d.langs.filter(l=>l.name).map(l=>l.name+' ('+l.level+')').join(', ')}`
        : '',
    ].filter(Boolean).join('\n');

    try {
      // Récupère le token depuis localStorage ou ton contexte auth
const token = localStorage.getItem('token'); // ou depuis useAuth()
console.log("SEND CHAT →", {
  message: msg,
  context,
  lang: style,
});

const res = await fetch('/api/cv/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,   // ← ajoute ça
  },
  body: JSON.stringify({ message: msg, context, lang: style }),
});
console.log("STATUS →", res.status);
      // const res = await fetch('/api/cv/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: msg, context, lang: style }),
      // });
      
      // console.log('STATUS =', res.status);
      
      // const text = await res.text();
      // console.log('RESPONSE =', text);
      // const res = await fetch('/api/cv/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: msg, context, lang: style }),
      // });
      if (res.ok) {
        const data = await res.json();
        setChatMsgs(p => [...p, { role:'ai', text: data.message || 'Je ne peux pas répondre.' }]);
      } else {
        const err = await res.json().catch(()=>({}));
        throw new Error((err as {error?:string}).error || `Erreur ${res.status}`);
      }
    } catch (e: unknown) {
      const msg2 = e instanceof Error ? e.message : 'Erreur inconnue';
      setChatMsgs(p => [...p, { role:'ai', text:`⚠ ${msg2}\n\nVérifie que GROQ_API_KEY est dans ton fichier .env.local` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Helpers helpers ────────────────────────────────────────────────────────
  const addExp    = () => setExps(p=>[...p,{id:Date.now(),role:'',co:'',period:'',location:'',bullets:''}]);
  const delExp    = (id:number) => setExps(p=>p.filter(e=>e.id!==id));
  const updExp    = (id:number,f:keyof Exp,v:string) => setExps(p=>p.map(e=>e.id===id?{...e,[f]:v}:e));
  const addEdu    = () => setEdus(p=>[...p,{id:Date.now(),degree:'',school:'',period:'',detail:''}]);
  const delEdu    = (id:number) => setEdus(p=>p.filter(e=>e.id!==id));
  const updEdu    = (id:number,f:keyof Edu,v:string) => setEdus(p=>p.map(e=>e.id===id?{...e,[f]:v}:e));
  const addSkill  = () => { skillIn.split(',').map(s=>s.trim()).filter(Boolean).forEach(v=>setSkills(p=>p.includes(v)?p:[...p,v])); setSkillIn(''); };
  const delSkill  = (s:string) => setSkills(p=>p.filter(k=>k!==s));
  const addLang   = () => setLangs(p=>[...p,{id:Date.now(),name:'',level:''}]);
  const delLang   = (id:number) => setLangs(p=>p.filter(l=>l.id!==id));
  const updLang   = (id:number,f:keyof Lang,v:string) => setLangs(p=>p.map(l=>l.id===id?{...l,[f]:v}:l));

  const ac = STYLES[style].color;
  const SECS: Section[] = ['perso','summary','exp','edu','skills','langs'];
  const LABS = ['👤 Identité','📝 Profil','💼 Expériences','🎓 Formation','⚡ Compétences','🌍 Langues'];

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{display:'grid',gridTemplateColumns:'480px 1fr',height:'100vh',overflow:'hidden',fontFamily:"'DM Sans','Inter',sans-serif",position:'relative'}}>
      <style>{`
        *{box-sizing:border-box}
        input,textarea,select{background:#faf8f4;border:1px solid #e8e4df;border-radius:7px;padding:8px 11px;font-family:inherit;font-size:13px;color:#1a1714;outline:none;transition:border-color .15s;width:100%}
        input:focus,textarea:focus,select:focus{border-color:${ac}}
        textarea{resize:vertical}
        label{font-size:11px;font-weight:600;color:#8a8480;letter-spacing:.04em;text-transform:uppercase;display:block;margin-bottom:4px}
        .card{background:#fff;border:1px solid #e8e4df;border-radius:10px;padding:14px;margin-bottom:10px}
        .add-btn{border:1px dashed #e8e4df;border-radius:8px;padding:8px;width:100%;background:none;cursor:pointer;font-size:12px;color:#8a8480;font-family:inherit;transition:all .15s;margin-bottom:12px}
        .add-btn:hover{border-color:#8a8480;color:#1a1714;background:#faf8f4}
        .del-btn{border:none;background:none;cursor:pointer;color:#ccc;font-size:18px;padding:2px 6px;border-radius:4px;line-height:1;transition:color .15s}
        .del-btn:hover{color:#c00;background:#fee}
        .s-tab{padding:8px 13px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;color:#8a8480;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s}
        .s-tab:hover{color:#1a1714}
        .s-tab.active{color:#1a1714;border-bottom-color:#1a1714}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
        .chat-spinner{display:inline-block;width:10px;height:10px;border:1.5px solid #ccc;border-top-color:#666;border-radius:50%;animation:spin .7s linear infinite}
        .chat-bubble-ai{background:#f0f0f0;color:#1a1714;border-radius:14px 14px 14px 4px;padding:10px 13px;font-size:13px;line-height:1.6;max-width:85%;white-space:pre-wrap}
        .chat-bubble-user{background:${ac};color:#fff;border-radius:14px 14px 4px 14px;padding:10px 13px;font-size:13px;line-height:1.6;max-width:85%;white-space:pre-wrap;margin-left:auto}
        .quick-btn{border:1px solid #e8e4df;border-radius:20px;padding:5px 11px;background:#fff;cursor:pointer;font-size:11px;color:#4a4540;font-family:inherit;transition:all .15s;white-space:nowrap}
        .quick-btn:hover{border-color:${ac};color:${ac}}
      `}</style>

      {/* ══════════ EDITOR ══════════ */}
      <div style={{background:'#faf8f4',borderRight:'1px solid #e8e4df',display:'flex',flexDirection:'column',overflow:'hidden'}}>

        {/* Header */}
        <div style={{padding:'16px 24px 0',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
            <div style={{fontFamily:'Georgia,serif',fontSize:19,color:'#1a1714'}}>CV Builder</div>
            <Link href="/welcome" style={{fontSize:11,color:'#8a8480',textDecoration:'none'}}>← Accueil</Link>
          </div>
          <div style={{fontSize:12,color:'#8a8480',marginBottom:14}}>Remplis les champs · Choisis ton style · Génère</div>

          {/* Style selector */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginBottom:16}}>
            {(Object.entries(STYLES) as [Style, typeof STYLES.fr][]).map(([k,s])=>(
              <div key={k} onClick={()=>changeStyle(k)}
                style={{border:`${style===k?'2px':'1.5px'} solid ${style===k?s.color:'#e8e4df'}`,borderRadius:9,padding:'9px 7px',cursor:'pointer',textAlign:'center',background:style===k?s.bg:'#fff',transition:'all .15s'}}>
                <div style={{fontSize:17,marginBottom:3}}>{s.flag}</div>
                <div style={{fontSize:11,fontWeight:600,color:style===k?s.color:'#4a4540'}}>{s.label}</div>
                <div style={{fontSize:9,color:'#8a8480',marginTop:1}}>{s.hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',padding:'0 24px',borderBottom:'1px solid #e8e4df',overflowX:'auto',flexShrink:0}}>
          {SECS.map((s,i)=>(
            <button key={s} className={`s-tab${section===s?' active':''}`} onClick={()=>setSection(s)}>{LABS[i]}</button>
          ))}
        </div>

        {/* Form body */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>

          {/* ── IDENTITÉ ── */}
          {section==='perso' && (
            <div>
              {/* Photo upload */}
              <div style={{marginBottom:16,padding:14,background:'#fff',border:'1px solid #e8e4df',borderRadius:10,display:'flex',alignItems:'center',gap:14}}>
                <div onClick={()=>photoRef.current?.click()} style={{width:60,height:60,borderRadius:'50%',overflow:'hidden',border:`2px dashed ${photo?ac:'#e8e4df'}`,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:photo?'transparent':'#faf8f4',transition:'border-color .15s'}}>
                  {photo
                    ? <img src={photo} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                    : <span style={{fontSize:22,opacity:.4}}>📷</span>}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:'#1a1714',marginBottom:3}}>Photo de profil</div>
                  <div style={{fontSize:11,color:'#8a8480',marginBottom:8,lineHeight:1.5}}>{STYLES[style].photoNote}</div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>photoRef.current?.click()} style={{border:`1px solid ${ac}`,borderRadius:6,padding:'4px 12px',background:'transparent',color:ac,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
                      {photo?'Changer':'Ajouter photo'}
                    </button>
                    {photo && <button onClick={()=>{setPhoto('');if(generated)setTimeout(handleGenerate,100)}} style={{border:'1px solid #e8e4df',borderRadius:6,padding:'4px 10px',background:'transparent',color:'#8a8480',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Supprimer</button>}
                  </div>
                </div>
                <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto} />
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                <div><label>Prénom</label><input value={prenom} onChange={e=>setPrenom(e.target.value)} placeholder="Marie" /></div>
                <div><label>Nom</label><input value={nom} onChange={e=>setNom(e.target.value)} placeholder="Dupont" /></div>
              </div>
              <div style={{marginBottom:10}}><label>Titre / Poste visé</label><input value={titre} onChange={e=>setTitre(e.target.value)} placeholder="Ingénieure Développement Logiciel" /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                <div><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="marie@email.com" /></div>
                <div><label>Téléphone</label><input value={tel} onChange={e=>setTel(e.target.value)} placeholder="+33 6 12 34 56 78" /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                <div><label>Ville</label><input value={ville} onChange={e=>setVille(e.target.value)} placeholder="Paris, France" /></div>
                <div><label>LinkedIn</label><input value={linkedin} onChange={e=>setLinkedin(e.target.value)} placeholder="linkedin.com/in/marie" /></div>
              </div>
              <div><label>GitHub / Portfolio</label><input value={github} onChange={e=>setGithub(e.target.value)} placeholder="github.com/marie" /></div>
            </div>
          )}

          {/* ── PROFIL ── */}
          {section==='summary' && (
            <div>
              <label>Résumé professionnel</label>
              <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={6}
                placeholder="Ingénieure logiciel avec 5 ans d'expérience en développement web fullstack. Spécialisée en React et Node.js, j'ai livré des solutions SaaS à forte valeur ajoutée pour des clients fintech..." />
              <p style={{fontSize:11,color:'#8a8480',marginTop:8}}>💡 3-4 phrases · Titre + années d'expérience · L'IA améliorera si vide</p>
              <button onClick={()=>{setChatOpen(true);setChatInput('Aide-moi à rédiger mon résumé professionnel')}}
                style={{marginTop:10,border:`1px solid ${ac}`,borderRadius:8,padding:'7px 14px',background:'transparent',color:ac,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
                🤖 Aide IA pour rédiger le résumé
              </button>
            </div>
          )}

          {/* ── EXPÉRIENCES ── */}
          {section==='exp' && (
            <div>
              {exps.map((e,i)=>(
                <div className="card" key={e.id}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:600,color:'#4a4540'}}>Expérience {i+1}</span>
                    <button className="del-btn" onClick={()=>delExp(e.id)}>×</button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div><label>Poste</label><input value={e.role} onChange={ev=>updExp(e.id,'role',ev.target.value)} placeholder="Développeur Full Stack" /></div>
                    <div><label>Entreprise</label><input value={e.co} onChange={ev=>updExp(e.id,'co',ev.target.value)} placeholder="IntelliSoft" /></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div><label>Période</label><input value={e.period} onChange={ev=>updExp(e.id,'period',ev.target.value)} placeholder="Jan 2022 – Présent" /></div>
                    <div><label>Lieu</label><input value={e.location} onChange={ev=>updExp(e.id,'location',ev.target.value)} placeholder="Paris, France" /></div>
                  </div>
                  <div>
                    <label>Réalisations (1 par ligne)</label>
                    <textarea value={e.bullets} onChange={ev=>updExp(e.id,'bullets',ev.target.value)} rows={3}
                      placeholder={"Développé une API REST réduisant la latence de 40%\nGéré une équipe de 4 développeurs juniors\nMigré l'infra vers AWS, -60% coûts serveur"} />
                    <button onClick={()=>{setChatOpen(true);setChatInput(`Améliore mes réalisations pour le poste de ${e.role} chez ${e.co}: ${e.bullets}`)}}
                      style={{marginTop:6,border:`1px solid #e8e4df`,borderRadius:6,padding:'4px 10px',background:'transparent',color:'#8a8480',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                      🤖 Améliorer avec l'IA
                    </button>
                  </div>
                </div>
              ))}
              <button className="add-btn" onClick={addExp}>+ Ajouter une expérience</button>
            </div>
          )}

          {/* ── FORMATION ── */}
          {section==='edu' && (
            <div>
              {edus.map((e,i)=>(
                <div className="card" key={e.id}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:600,color:'#4a4540'}}>Formation {i+1}</span>
                    <button className="del-btn" onClick={()=>delEdu(e.id)}>×</button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div><label>Diplôme</label><input value={e.degree} onChange={ev=>updEdu(e.id,'degree',ev.target.value)} placeholder="Master Informatique" /></div>
                    <div><label>École</label><input value={e.school} onChange={ev=>updEdu(e.id,'school',ev.target.value)} placeholder="INSA Lyon" /></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div><label>Période</label><input value={e.period} onChange={ev=>updEdu(e.id,'period',ev.target.value)} placeholder="2018 – 2020" /></div>
                    <div><label>Mention / Spécialité</label><input value={e.detail} onChange={ev=>updEdu(e.id,'detail',ev.target.value)} placeholder="Mention Très Bien" /></div>
                  </div>
                </div>
              ))}
              <button className="add-btn" onClick={addEdu}>+ Ajouter une formation</button>
            </div>
          )}

          {/* ── COMPÉTENCES ── */}
          {section==='skills' && (
            <div>
              <label>Compétences</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10,minHeight:36}}>
                {skills.map(s=>(
                  <div key={s} style={{background:'#fff',border:'1px solid #e8e4df',borderRadius:20,padding:'4px 10px',fontSize:12,display:'flex',alignItems:'center',gap:5}}>
                    {s}
                    <span onClick={()=>delSkill(s)} style={{cursor:'pointer',color:'#ccc',fontSize:14,lineHeight:1}}>×</span>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:8,marginBottom:8}}>
                <input value={skillIn} onChange={e=>setSkillIn(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'){addSkill();e.preventDefault()}}}
                  placeholder="ex: React, TypeScript, Docker... (virgule ou Entrée)" />
                <button onClick={addSkill} style={{border:'1px solid #e8e4df',borderRadius:7,padding:'8px 12px',background:'#fff',cursor:'pointer',fontSize:13,color:'#4a4540',whiteSpace:'nowrap',fontFamily:'inherit'}}>+</button>
              </div>
              <button onClick={()=>{setChatOpen(true);setChatInput(`Pour un poste de ${titre||'développeur'}, quelles compétences dois-je ajouter à mon CV ?`)}}
                style={{border:`1px solid ${ac}`,borderRadius:8,padding:'7px 14px',background:'transparent',color:ac,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
                🤖 Suggestions de compétences IA
              </button>
            </div>
          )}

          {/* ── LANGUES ── */}
          {section==='langs' && (
            <div>
              {langs.map((l,i)=>(
                <div className="card" key={l.id}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:600,color:'#4a4540'}}>Langue {i+1}</span>
                    <button className="del-btn" onClick={()=>delLang(l.id)}>×</button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div><label>Langue</label><input value={l.name} onChange={ev=>updLang(l.id,'name',ev.target.value)} placeholder="Anglais" /></div>
                    <div>
                      <label>Niveau</label>
                      <select value={l.level} onChange={ev=>updLang(l.id,'level',ev.target.value)}>
                        <option value="">— Choisir —</option>
                        {LEVELS.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button className="add-btn" onClick={addLang}>+ Ajouter une langue</button>
            </div>
          )}

        </div>

        {/* Generate footer */}
        <div style={{padding:'12px 24px 16px',borderTop:'1px solid #e8e4df',flexShrink:0}}>
          {error && <p style={{fontSize:12,color:'#c00',marginBottom:8}}>⚠ {error}</p>}
          <button onClick={handleGenerate} disabled={loading}
            style={{width:'100%',padding:12,border:'none',borderRadius:10,background:ac,color:'#fff',fontFamily:'inherit',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,opacity:loading?.8:1,transition:'opacity .2s'}}>
            {loading?<><span className="spinner"/>{generated?'Amélioration IA...':'Génération IA...'}</>:<>✨ {generated?'Régénérer':'Générer mon CV'}</>}
          </button>
        </div>
      </div>

      {/* ══════════ PREVIEW ══════════ */}
      <div style={{background:'#e8e4df',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{background:'#1a1714',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <span style={{fontSize:11,color:'rgba(255,255,255,.4)',fontFamily:'monospace',letterSpacing:'.06em'}}>APERÇU · TEMPS RÉEL</span>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <Link href="/interview" style={{border:'1px solid rgba(255,255,255,.2)',borderRadius:6,padding:'5px 12px',background:'transparent',color:'rgba(255,255,255,.7)',fontSize:11,textDecoration:'none'}}>
              🎤 Interview
            </Link>
            <button onClick={handlePdf} disabled={!generated||pdfLoad}
              style={{border:'1px solid rgba(255,255,255,.25)',borderRadius:6,padding:'5px 12px',background:generated?'rgba(255,255,255,.1)':'transparent',color:generated?'#fff':'rgba(255,255,255,.3)',fontSize:11,cursor:generated?'pointer':'not-allowed',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
              {pdfLoad?<><span className="spinner"/>PDF...</>:'↓ Télécharger PDF'}
            </button>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',display:'flex',justifyContent:'center',padding:'20px 14px'}}>
          <div id="cv-paper" style={{background:'#fff',width:595,minHeight:842,boxShadow:'0 4px 40px rgba(0,0,0,.25)',flexShrink:0}}>
            {cvHtml
              ? <div dangerouslySetInnerHTML={{__html:cvHtml}} />
              : <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:842,color:'#ccc',fontSize:14,textAlign:'center',padding:40}}>
                  <div style={{fontSize:48,marginBottom:14,opacity:.4}}>📄</div>
                  <div>Remplis les champs à gauche<br/>puis clique sur <strong style={{color:ac}}>Générer mon CV</strong></div>
                </div>}
          </div>
        </div>
      </div>

      {/* ══════════ CHAT BUBBLE ══════════ */}

      {/* Floating button */}
      <button onClick={()=>setChatOpen(p=>!p)}
        style={{position:'fixed',bottom:24,right:24,width:54,height:54,borderRadius:'50%',background:ac,border:'none',cursor:'pointer',boxShadow:`0 4px 20px ${ac}66`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,zIndex:1000,transition:'all .2s',transform:chatOpen?'rotate(0deg)':'rotate(0deg)'}}>
        {chatOpen ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {chatOpen && (
        <div style={{position:'fixed',bottom:88,right:24,width:340,height:460,background:'#fff',borderRadius:16,boxShadow:'0 8px 40px rgba(0,0,0,.2)',display:'flex',flexDirection:'column',overflow:'hidden',zIndex:999,animation:'slideUp .25s ease'}}>

          {/* Chat header */}
          <div style={{background:ac,padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'#fff'}}>Assistant CV IA</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>Aide à la rédaction · 24/7</div>
            </div>
          </div>

          {/* Quick suggestions */}
          <div style={{padding:'8px 12px',display:'flex',gap:5,flexWrap:'wrap',borderBottom:'1px solid #f0f0f0',paddingBottom:9}}>
            {[
              { label:'✍ Rédige mon résumé',   msg:'Rédige-moi un résumé professionnel percutant basé sur mon profil CV' },
              { label:'⚡ Améliore mes bullets', msg:'Améliore mes bullet points d\'expérience avec des métriques chiffrées' },
              { label:'🎯 Compétences clés',    msg:`Quelles compétences ajouter pour un poste de ${titre||'ce métier'} ?` },
              { label:'🌍 Conseils pays',       msg:`Donne-moi les règles CV spécifiques pour le style ${style==='fr'?'France':style==='ca'?'Canada':'UK/Anglais'}` },
              { label:'📊 Score ATS',           msg:'Analyse mon CV et donne-moi un score ATS avec les améliorations prioritaires' },
              { label:'🔄 Version anglaise',    msg:'Traduis et adapte mon résumé professionnel en anglais professionnel' },
            ].map(q=>(
              <button key={q.label} className="quick-btn" onClick={()=>{ setChatInput(q.msg); }}>
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:10}}>
            {chatMsgs.map((m,i)=>(
              <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                <div className={m.role==='ai'?'chat-bubble-ai':'chat-bubble-user'}>{m.text}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={{display:'flex',justifyContent:'flex-start'}}>
                <div className="chat-bubble-ai" style={{display:'flex',alignItems:'center',gap:6}}>
                  <span className="chat-spinner"/>
                  <span style={{fontSize:12,color:'#888'}}>L'IA rédige...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{padding:'10px 12px',borderTop:'1px solid #f0f0f0',display:'flex',gap:8}}>
            <input
              value={chatInput}
              onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){sendChat();e.preventDefault()}}}
              placeholder="Pose ta question au coach CV..."
              style={{flex:1,fontSize:13,padding:'9px 12px',borderRadius:20,border:'1px solid #e8e4df'}}
            />
            <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
              style={{width:36,height:36,borderRadius:'50%',background:chatInput.trim()&&!chatLoading?ac:'#e8e4df',border:'none',cursor:chatInput.trim()&&!chatLoading?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,transition:'background .15s',flexShrink:0}}>
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// // 'use client';

// // import { useState, useCallback } from 'react';
// // import Link from 'next/link';

// // // ─── TYPES ───────────────────────────────────────────────────────────────────

// // interface Exp  { id: number; role: string; co: string; period: string; location: string; bullets: string; }
// // interface Edu  { id: number; degree: string; school: string; period: string; detail: string; }
// // interface Lang { id: number; name: string; level: string; }

// // interface CVData {
// //   prenom: string; nom: string; titre: string;
// //   email: string; tel: string; ville: string;
// //   linkedin: string; github: string; summary: string;
// //   exps:  { role: string; co: string; period: string; location: string; bullets: string[] }[];
// //   edus:  { degree: string; school: string; period: string; detail: string }[];
// //   skills: string[];
// //   langs: { name: string; level: string }[];
// // }

// // type Style  = 'fr' | 'ca' | 'uk';
// // type Section = 'perso' | 'summary' | 'exp' | 'edu' | 'skills' | 'langs';

// // // ─── STYLE CONFIG ─────────────────────────────────────────────────────────────

// // const STYLES = {
// //   fr: { label: 'France',      flag: '🇫🇷', hint: 'Classique · Sobre',      color: '#2d4a8f', bg: '#e8ecf7' },
// //   ca: { label: 'Canada',      flag: '🇨🇦', hint: 'Moderne · Aéré',         color: '#c41e3a', bg: '#fce8ea' },
// //   uk: { label: 'UK / Anglais', flag: '🇬🇧', hint: 'Élégant · Structuré',   color: '#1a3a6b', bg: '#e6edf8' },
// // };

// // const LEVEL_OPTIONS = ['A1 — Débutant','A2 — Élémentaire','B1 — Intermédiaire','B2 — Indépendant','C1 — Avancé','C2 — Maîtrise','Natif'];

// // // ─── HELPERS ─────────────────────────────────────────────────────────────────

// // const esc = (s: string) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// // const bullets = (arr: string[]) => arr.length
// //   ? `<ul style="list-style:none;padding:0;margin:4px 0 0">${arr.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px;padding-left:10px;position:relative"><span style="position:absolute;left:0;color:var(--ac);font-size:9px;top:3px">▸</span>${esc(b)}</li>`).join('')}</ul>` : '';

// // // ─── CV RENDERERS ─────────────────────────────────────────────────────────────

// // function renderFR(cv: CVData): string {
// //   const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
// //   const ac = STYLES.fr.color;
// //   return `
// // <div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714;--ac:${ac}">
// //   <div style="background:${ac};padding:28px 32px 22px;position:relative;overflow:hidden">
// //     <div style="position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
// //     <div style="font-family:'Georgia',serif;font-size:26px;color:#fff;margin-bottom:3px;letter-spacing:.01em">${esc(cv.prenom)} ${esc(cv.nom)}</div>
// //     <div style="font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.07em;text-transform:uppercase;margin-bottom:13px">${esc(cv.titre)}</div>
// //     <div style="display:flex;flex-wrap:wrap;gap:12px">${contacts.map(c=>`<span style="font-size:10px;color:rgba(255,255,255,.65)">◦ ${esc(c)}</span>`).join('')}</div>
// //   </div>
// //   <div style="display:grid;grid-template-columns:1fr 170px;min-height:740px">
// //     <div style="padding:20px 22px;border-right:1px solid #eee">
// //       ${cv.summary ? `
// //         <div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:9px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Profil</div>
// //         <p style="font-size:11px;color:#4a4540;line-height:1.75;margin-bottom:16px">${esc(cv.summary)}</p>` : ''}
// //       ${cv.exps.length ? `
// //         <div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:9px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Expériences Professionnelles</div>
// //         ${cv.exps.map(e=>`
// //         <div style="margin-bottom:14px;padding-left:10px;border-left:2px solid #d0d8f0">
// //           <div style="display:flex;justify-content:space-between;align-items:baseline">
// //             <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.role)}</span>
// //             <span style="font-size:10px;color:#8a8480">${esc(e.period)}</span>
// //           </div>
// //           <div style="font-size:11px;color:${ac};font-weight:500;margin-bottom:3px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
// //           ${bullets(e.bullets)}
// //         </div>`).join('')}` : ''}
// //       ${cv.edus.length ? `
// //         <div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin:16px 0 9px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Formation</div>
// //         ${cv.edus.map(e=>`
// //         <div style="margin-bottom:10px">
// //           <div style="display:flex;justify-content:space-between">
// //             <div>
// //               <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.degree)}</span>
// //               <div style="font-size:11px;color:${ac};font-weight:500">${esc(e.school)}</div>
// //               ${e.detail?`<div style="font-size:9.5px;color:#8a8480">${esc(e.detail)}</div>`:''}
// //             </div>
// //             <span style="font-size:10px;color:#8a8480;flex-shrink:0;margin-left:8px">${esc(e.period)}</span>
// //           </div>
// //         </div>`).join('')}` : ''}
// //     </div>
// //     <div style="padding:16px;background:#f8faff">
// //       ${cv.skills.length ? `
// //         <div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin-bottom:8px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Compétences</div>
// //         <div style="margin-bottom:14px">${cv.skills.map(s=>`<span style="display:inline-block;background:#e8ecf7;color:${ac};border-radius:3px;padding:2px 7px;font-size:9px;font-weight:600;margin:2px 2px 2px 0">${esc(s)}</span>`).join('')}</div>` : ''}
// //       ${cv.langs.filter(l=>l.name).length ? `
// //         <div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin-bottom:8px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Langues</div>
// //         ${cv.langs.filter(l=>l.name).map(l=>`
// //         <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
// //           <span style="font-size:10px;color:#1a1714">${esc(l.name)}</span>
// //           <span style="font-size:8px;background:#e8ecf7;color:${ac};padding:1px 5px;border-radius:2px;font-weight:600">${esc(l.level?.split(' — ')[0]||l.level||'')}</span>
// //         </div>`).join('')}` : ''}
// //       ${cv.linkedin||cv.github ? `
// //         <div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin:14px 0 6px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Liens</div>
// //         ${cv.linkedin?`<div style="font-size:9px;color:#4a4540;word-break:break-all;margin-bottom:3px">${esc(cv.linkedin)}</div>`:''}
// //         ${cv.github?`<div style="font-size:9px;color:#4a4540;word-break:break-all">${esc(cv.github)}</div>`:''}` : ''}
// //     </div>
// //   </div>
// //   <div style="background:${ac};padding:8px 32px;display:flex;justify-content:space-between">
// //     <span style="font-size:8px;color:rgba(255,255,255,.4);letter-spacing:.06em">CV · ${esc(cv.prenom)} ${esc(cv.nom)}</span>
// //     <span style="font-size:8px;color:rgba(255,255,255,.4);letter-spacing:.06em">JOBSMART AI</span>
// //   </div>
// // </div>`;
// // }

// // function renderCA(cv: CVData): string {
// //   const ac = STYLES.ca.color;
// //   const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
// //   const secTitle = (t: string) => `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin:18px 0 8px;padding-bottom:3px;border-bottom:2px solid ${ac}">${t}</div>`;
// //   return `
// // <div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714">
// //   <div style="background:#fff;padding:24px 32px 16px;border-bottom:4px solid ${ac}">
// //     <div style="font-family:'Georgia',serif;font-size:28px;color:#1a1714;margin-bottom:2px">${esc(cv.prenom)} ${esc(cv.nom)}</div>
// //     <div style="font-size:13px;color:${ac};font-weight:600;margin-bottom:10px">${esc(cv.titre)}</div>
// //     <div style="display:flex;flex-wrap:wrap;gap:14px">${contacts.map(c=>`<span style="font-size:10px;color:#6a6460">• ${esc(c)}</span>`).join('')}</div>
// //   </div>
// //   <div style="padding:0 32px 24px">
// //     ${cv.summary ? secTitle('Sommaire Professionnel')+`<p style="font-size:11px;color:#4a4540;line-height:1.75">${esc(cv.summary)}</p>` : ''}
// //     ${cv.exps.length ? secTitle('Expérience Professionnelle')+cv.exps.map(e=>`
// //     <div style="margin-bottom:16px">
// //       <div style="display:flex;justify-content:space-between;align-items:baseline">
// //         <span style="font-size:12px;font-weight:700;color:#1a1714">${esc(e.role)}</span>
// //         <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
// //       </div>
// //       <div style="font-size:11px;color:#4a4540;font-style:italic;margin-bottom:4px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
// //       <ul style="list-style:disc;padding-left:14px;margin:0">${e.bullets.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px">${esc(b)}</li>`).join('')}</ul>
// //     </div>`).join('') : ''}
// //     ${cv.edus.length ? secTitle('Formation')+cv.edus.map(e=>`
// //     <div style="margin-bottom:12px">
// //       <div style="display:flex;justify-content:space-between">
// //         <span style="font-size:12px;font-weight:700;color:#1a1714">${esc(e.degree)}</span>
// //         <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
// //       </div>
// //       <div style="font-size:11px;color:#4a4540;font-style:italic">${esc(e.school)}${e.detail?' · '+esc(e.detail):''}</div>
// //     </div>`).join('') : ''}
// //     ${cv.skills.length ? secTitle('Compétences')+`<div style="display:flex;flex-wrap:wrap;gap:5px">${cv.skills.map(s=>`<span style="background:#fce8ea;color:${ac};border-radius:4px;padding:3px 8px;font-size:9px;font-weight:600">${esc(s)}</span>`).join('')}</div>` : ''}
// //     ${cv.langs.filter(l=>l.name).length ? secTitle('Langues')+`<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px">${cv.langs.filter(l=>l.name).map(l=>`<div style="display:flex;justify-content:space-between;font-size:10.5px"><span style="color:#1a1714">${esc(l.name)}</span><span style="color:#8a8480">${esc(l.level?.split(' — ')[1]||l.level||'')}</span></div>`).join('')}</div>` : ''}
// //   </div>
// // </div>`;
// // }

// // function renderUK(cv: CVData): string {
// //   const ac = STYLES.uk.color;
// //   const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
// //   const secTitle = (t: string) => `<div style="font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${ac};margin:16px 0 8px;background:#e6edf8;padding:4px 8px;border-left:3px solid ${ac}">${t}</div>`;
// //   return `
// // <div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714">
// //   <div style="background:#fff;padding:28px 32px 18px;border-left:5px solid ${ac}">
// //     <div style="font-family:'Georgia',serif;font-size:30px;color:#1a1714;font-style:italic;margin-bottom:2px">${esc(cv.prenom)} ${esc(cv.nom)}</div>
// //     <div style="font-size:12px;color:${ac};font-weight:500;margin-bottom:12px;letter-spacing:.04em">${esc(cv.titre)}</div>
// //     <div style="font-size:10px;color:#6a6460">${contacts.join(' &nbsp;·&nbsp; ')}</div>
// //   </div>
// //   <div style="padding:0 32px 24px">
// //     ${cv.summary ? secTitle('Personal Statement')+`<p style="font-size:11px;color:#4a4540;line-height:1.75;font-style:italic;border-left:3px solid #d0ddf0;padding-left:10px;margin-bottom:2px">${esc(cv.summary)}</p>` : ''}
// //     ${cv.exps.length ? secTitle('Work Experience')+cv.exps.map(e=>`
// //     <div style="margin-bottom:14px">
// //       <div style="display:flex;justify-content:space-between">
// //         <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.role)}</span>
// //         <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
// //       </div>
// //       <div style="font-size:11px;color:#4a4540;margin-bottom:4px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
// //       <ul style="list-style:none;padding:0;margin:0">${e.bullets.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px;padding-left:12px;position:relative"><span style="position:absolute;left:0;color:${ac}">—</span>${esc(b)}</li>`).join('')}</ul>
// //     </div>`).join('') : ''}
// //     ${cv.edus.length ? secTitle('Education')+cv.edus.map(e=>`
// //     <div style="margin-bottom:10px">
// //       <div style="display:flex;justify-content:space-between">
// //         <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.degree)}</span>
// //         <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
// //       </div>
// //       <div style="font-size:11px;color:#4a4540">${esc(e.school)}${e.detail?' · '+esc(e.detail):''}</div>
// //     </div>`).join('') : ''}
// //     ${cv.skills.length ? secTitle('Key Skills')+`<div style="display:flex;flex-wrap:wrap;gap:4px">${cv.skills.map(s=>`<span style="border:1px solid #c5d4e8;color:${ac};border-radius:2px;padding:2px 7px;font-size:9px;font-weight:500">${esc(s)}</span>`).join('')}</div>` : ''}
// //     ${cv.langs.filter(l=>l.name).length ? secTitle('Languages')+cv.langs.filter(l=>l.name).map(l=>`<div style="font-size:10.5px;color:#4a4540;margin-bottom:3px">${esc(l.name)} — ${esc(l.level?.split(' — ')[1]||l.level||'')}</div>`).join('') : ''}
// //   </div>
// // </div>`;
// // }

// // // ─── MAIN PAGE ────────────────────────────────────────────────────────────────

// // export default function CVBuilderPage() {
// //   const [style, setStyle]     = useState<Style>('fr');
// //   const [section, setSection] = useState<Section>('perso');
// //   const [loading, setLoading] = useState(false);
// //   const [generated, setGenerated] = useState(false);
// //   const [cvHtml, setCvHtml]   = useState('');
// //   const [pdfLoading, setPdfLoading] = useState(false);
// //   const [error, setError]     = useState('');

// //   // Form fields — identité
// //   const [prenom,   setPrenom]   = useState('');
// //   const [nom,      setNom]      = useState('');
// //   const [titre,    setTitre]    = useState('');
// //   const [email,    setEmail]    = useState('');
// //   const [tel,      setTel]      = useState('');
// //   const [ville,    setVille]    = useState('');
// //   const [linkedin, setLinkedin] = useState('');
// //   const [github,   setGithub]   = useState('');
// //   const [summary,  setSummary]  = useState('');

// //   // Exp / Edu / Skills / Langs
// //   const [exps,   setExps]   = useState<Exp[]>([{ id: 1, role: '', co: '', period: '', location: '', bullets: '' }]);
// //   const [edus,   setEdus]   = useState<Edu[]>([{ id: 1, degree: '', school: '', period: '', detail: '' }]);
// //   const [skills, setSkills] = useState<string[]>([]);
// //   const [langs,  setLangs]  = useState<Lang[]>([{ id: 1, name: '', level: '' }]);
// //   const [skillInput, setSkillInput] = useState('');

// //   const getData = (): CVData => ({
// //     prenom, nom, titre, email, tel, ville, linkedin, github, summary,
// //     exps:  exps.map(e => ({ ...e, bullets: e.bullets.split('\n').filter(Boolean) })),
// //     edus:  edus.map(e => ({ degree: e.degree, school: e.school, period: e.period, detail: e.detail })),
// //     skills,
// //     langs: langs.map(l => ({ name: l.name, level: l.level })),
// //   });

// //   const renderPreview = useCallback((cv: CVData, s: Style) => {
// //     if (s === 'fr') return renderFR(cv);
// //     if (s === 'ca') return renderCA(cv);
// //     return renderUK(cv);
// //   }, []);

// //   // ── GENERATE ──────────────────────────────────────────────────────────────
// //   const handleGenerate = async () => {
// //     const d = getData();
// //     setLoading(true);
// //     setError('');

// //     // Render immediately from form data
// //     const immediate = renderPreview(d, style);
// //     setCvHtml(immediate);
// //     setGenerated(true);

// //     // Try to enhance with AI
// //     try {
// //       const expText = d.exps.map(e =>
// //         `- ${e.role} chez ${e.co} (${e.period}, ${e.location})\n${e.bullets.map(b => '  • ' + b).join('\n')}`
// //       ).join('\n\n');

// //       const prompt = `Tu es expert CV. Améliore ce CV en JSON.
// // Style: ${style === 'fr' ? 'France classique' : style === 'ca' ? 'Canada moderne' : 'UK élégant'}
// // Nom: ${d.prenom} ${d.nom} | Titre: ${d.titre}
// // Email: ${d.email} | Tél: ${d.tel} | Ville: ${d.ville}
// // LinkedIn: ${d.linkedin} | GitHub: ${d.github}
// // Résumé: ${d.summary}
// // Expériences:\n${expText || 'Aucune'}
// // Formations: ${d.edus.map(e=>`${e.degree} — ${e.school} (${e.period}) ${e.detail}`).join('; ')||'Aucune'}
// // Compétences: ${d.skills.join(', ')||'Aucune'}
// // Langues: ${d.langs.map(l=>l.name+' '+l.level).join(', ')||'Aucune'}

// // RÈGLES: JSON uniquement, améliore le résumé s'il est vide, améliore les bullets avec métriques.
// // {"prenom":"","nom":"","titre":"","email":"","tel":"","ville":"","linkedin":"","github":"","summary":"","exps":[{"role":"","co":"","period":"","location":"","bullets":[""]}],"edus":[{"degree":"","school":"","period":"","detail":""}],"skills":[""],"langs":[{"name":"","level":""}]}`;

// //       const res = await fetch('/api/cv/generate', {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify({ prompt, template: style }),
// //       });

// //       if (res.ok) {
// //         const data = await res.json();
// //         const cv = data.cv;
// //         // The API returns our usual CVData structure but with prenom/nom split
// //         // Map it back if needed
// //         if (cv && cv.summary) {
// //           // Merge AI improvements into form state
// //           if (!summary && cv.summary) setSummary(cv.summary);
// //           const enhanced: CVData = {
// //             prenom: cv.prenom || d.prenom,
// //             nom:    cv.nom    || d.nom,
// //             titre:  cv.titre  || d.titre,
// //             email:  cv.email  || d.email,
// //             tel:    cv.tel    || d.tel,
// //             ville:  cv.ville  || d.ville,
// //             linkedin: cv.linkedin || d.linkedin,
// //             github:   cv.github   || d.github,
// //             summary:  cv.summary  || d.summary,
// //             exps:  (cv.exps  || d.exps).map((e: { role: string; co: string; period: string; location: string; bullets: string[] }) => ({ ...e, bullets: Array.isArray(e.bullets) ? e.bullets : [e.bullets] })),
// //             edus:  cv.edus   || d.edus,
// //             skills: cv.skills || d.skills,
// //             langs:  cv.langs  || d.langs,
// //           };
// //           setCvHtml(renderPreview(enhanced, style));
// //         }
// //       }
// //     } catch {
// //       // Keep the form-rendered version — no error shown
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // ── AUTO-PREVIEW when style changes ──────────────────────────────────────
// //   const changeStyle = (s: Style) => {
// //     setStyle(s);
// //     if (generated) {
// //       setCvHtml(renderPreview(getData(), s));
// //     }
// //   };

// //   // ── PDF DOWNLOAD ──────────────────────────────────────────────────────────
// //   const handleDownloadPdf = async () => {
// //     if (!generated) return;
// //     setPdfLoading(true);
// //     try {
// //       const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
// //         import('html2canvas'),
// //         import('jspdf'),
// //       ]);
// //       const el = document.getElementById('cv-preview-paper');
// //       if (!el) throw new Error('Élément introuvable');
// //       const canvas = await html2canvas(el, { scale: 2.5, useCORS: true, backgroundColor: '#fff', logging: false });
// //       const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
// //       const w = pdf.internal.pageSize.getWidth();
// //       const h = (canvas.height * w) / canvas.width;
// //       pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
// //       pdf.save(`cv-${(prenom+'-'+nom).toLowerCase().replace(/\s+/g,'-')}.pdf`);
// //     } catch (e) {
// //       setError('Erreur PDF. Vérifie que jspdf et html2canvas sont installés : npm install jspdf html2canvas');
// //     } finally {
// //       setPdfLoading(false);
// //     }
// //   };

// //   // ── EXP helpers ───────────────────────────────────────────────────────────
// //   const addExp   = () => setExps(p => [...p, { id: Date.now(), role: '', co: '', period: '', location: '', bullets: '' }]);
// //   const delExp   = (id: number) => setExps(p => p.filter(e => e.id !== id));
// //   const updateExp = (id: number, field: keyof Exp, val: string) =>
// //     setExps(p => p.map(e => e.id === id ? { ...e, [field]: val } : e));

// //   const addEdu   = () => setEdus(p => [...p, { id: Date.now(), degree: '', school: '', period: '', detail: '' }]);
// //   const delEdu   = (id: number) => setEdus(p => p.filter(e => e.id !== id));
// //   const updateEdu = (id: number, field: keyof Edu, val: string) =>
// //     setEdus(p => p.map(e => e.id === id ? { ...e, [field]: val } : e));

// //   const addSkill = () => {
// //     const vals = skillInput.split(',').map(s => s.trim()).filter(Boolean);
// //     setSkills(p => [...p, ...vals.filter(v => !p.includes(v))]);
// //     setSkillInput('');
// //   };
// //   const delSkill = (s: string) => setSkills(p => p.filter(k => k !== s));

// //   const addLang  = () => setLangs(p => [...p, { id: Date.now(), name: '', level: '' }]);
// //   const delLang  = (id: number) => setLangs(p => p.filter(l => l.id !== id));
// //   const updateLang = (id: number, field: keyof Lang, val: string) =>
// //     setLangs(p => p.map(l => l.id === id ? { ...l, [field]: val } : l));

// //   const acColor = STYLES[style].color;

// //   return (
// //     <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
// //       <style>{`
// //         *{box-sizing:border-box}
// //         :root{--ac:${acColor}}
// //         input,textarea,select{background:#faf8f4;border:1px solid #e8e4df;border-radius:7px;padding:8px 11px;font-family:inherit;font-size:13px;color:#1a1714;outline:none;transition:border-color .15s;width:100%}
// //         input:focus,textarea:focus,select:focus{border-color:var(--ac)}
// //         textarea{resize:vertical}
// //         label{font-size:11px;font-weight:600;color:#8a8480;letter-spacing:.04em;text-transform:uppercase;display:block;margin-bottom:4px}
// //         .add-btn{border:1px dashed #e8e4df;border-radius:8px;padding:8px;width:100%;background:none;cursor:pointer;font-size:12px;color:#8a8480;font-family:inherit;transition:all .15s;margin-bottom:14px}
// //         .add-btn:hover{border-color:#8a8480;color:#1a1714;background:#faf8f4}
// //         .del-btn{border:none;background:none;cursor:pointer;color:#ccc;font-size:18px;padding:2px 6px;border-radius:4px;line-height:1;transition:color .15s}
// //         .del-btn:hover{color:#c00;background:#fee}
// //         .card{background:#fff;border:1px solid #e8e4df;border-radius:10px;padding:14px;margin-bottom:10px}
// //         .s-tab{padding:8px 14px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;color:#8a8480;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s}
// //         .s-tab:hover{color:#1a1714}
// //         .s-tab.active{color:#1a1714;border-bottom-color:#1a1714}
// //         @keyframes spin{to{transform:rotate(360deg)}}
// //         .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
// //       `}</style>

// //       {/* ══════ EDITOR ══════ */}
// //       <div style={{ background: '#faf8f4', borderRight: '1px solid #e8e4df', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

// //         {/* Header */}
// //         <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
// //           <div style={{ fontFamily: 'Georgia, serif', fontSize: 20, color: '#1a1714', marginBottom: 3 }}>CV Builder</div>
// //           <div style={{ fontSize: 12, color: '#8a8480', marginBottom: 16 }}>Remplis les champs · Choisis ton style · Génère</div>

// //           {/* Style selector */}
// //           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
// //             {(Object.entries(STYLES) as [Style, typeof STYLES.fr][]).map(([k, s]) => (
// //               <div key={k} onClick={() => changeStyle(k)}
// //                 style={{ border: `${style === k ? '2px' : '1.5px'} solid ${style === k ? s.color : '#e8e4df'}`, borderRadius: 10, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', background: style === k ? s.bg : '#fff', transition: 'all .15s' }}>
// //                 <div style={{ fontSize: 18, marginBottom: 4 }}>{s.flag}</div>
// //                 <div style={{ fontSize: 11, fontWeight: 600, color: style === k ? s.color : '#4a4540' }}>{s.label}</div>
// //                 <div style={{ fontSize: 9, color: '#8a8480', marginTop: 2 }}>{s.hint}</div>
// //               </div>
// //             ))}
// //           </div>
// //         </div>

// //         {/* Section tabs */}
// //         <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid #e8e4df', overflowX: 'auto', flexShrink: 0 }}>
// //           {(['perso','summary','exp','edu','skills','langs'] as Section[]).map((s, i) => {
// //             const labels = ['👤 Identité','📝 Profil','💼 Expériences','🎓 Formation','⚡ Compétences','🌍 Langues'];
// //             return <button key={s} className={`s-tab${section===s?' active':''}`} onClick={() => setSection(s)}>{labels[i]}</button>;
// //           })}
// //         </div>

// //         {/* Form body */}
// //         <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px' }}>

// //           {/* IDENTITÉ */}
// //           {section === 'perso' && (
// //             <div>
// //               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
// //                 <div><label>Prénom</label><input value={prenom} onChange={e=>setPrenom(e.target.value)} placeholder="Marie" /></div>
// //                 <div><label>Nom</label><input value={nom} onChange={e=>setNom(e.target.value)} placeholder="Dupont" /></div>
// //               </div>
// //               <div style={{ marginBottom: 10 }}><label>Titre / Poste visé</label><input value={titre} onChange={e=>setTitre(e.target.value)} placeholder="Ingénieure Développement Logiciel" /></div>
// //               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
// //                 <div><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="marie@email.com" /></div>
// //                 <div><label>Téléphone</label><input value={tel} onChange={e=>setTel(e.target.value)} placeholder="+33 6 12 34 56 78" /></div>
// //               </div>
// //               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
// //                 <div><label>Ville</label><input value={ville} onChange={e=>setVille(e.target.value)} placeholder="Paris, France" /></div>
// //                 <div><label>LinkedIn</label><input value={linkedin} onChange={e=>setLinkedin(e.target.value)} placeholder="linkedin.com/in/marie" /></div>
// //               </div>
// //               <div><label>GitHub / Portfolio</label><input value={github} onChange={e=>setGithub(e.target.value)} placeholder="github.com/marie" /></div>
// //             </div>
// //           )}

// //           {/* PROFIL */}
// //           {section === 'summary' && (
// //             <div>
// //               <label>Résumé professionnel</label>
// //               <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={6}
// //                 placeholder="Ingénieure logiciel avec 5 ans d'expérience en développement web fullstack. Spécialisée en React et Node.js, j'ai livré des solutions SaaS à forte valeur ajoutée..." />
// //               <p style={{ fontSize: 11, color: '#8a8480', marginTop: 8 }}>💡 3-4 phrases · Commence par ton titre + années d'expérience · L'IA améliorera si vide</p>
// //             </div>
// //           )}

// //           {/* EXPÉRIENCES */}
// //           {section === 'exp' && (
// //             <div>
// //               {exps.map((e, i) => (
// //                 <div className="card" key={e.id}>
// //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
// //                     <span style={{ fontSize: 12, fontWeight: 600, color: '#4a4540' }}>Expérience {i+1}</span>
// //                     <button className="del-btn" onClick={() => delExp(e.id)}>×</button>
// //                   </div>
// //                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
// //                     <div><label>Poste</label><input value={e.role} onChange={ev=>updateExp(e.id,'role',ev.target.value)} placeholder="Développeur Full Stack" /></div>
// //                     <div><label>Entreprise</label><input value={e.co} onChange={ev=>updateExp(e.id,'co',ev.target.value)} placeholder="IntelliSoft" /></div>
// //                   </div>
// //                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
// //                     <div><label>Période</label><input value={e.period} onChange={ev=>updateExp(e.id,'period',ev.target.value)} placeholder="Jan 2022 – Présent" /></div>
// //                     <div><label>Lieu</label><input value={e.location} onChange={ev=>updateExp(e.id,'location',ev.target.value)} placeholder="Paris, France" /></div>
// //                   </div>
// //                   <div>
// //                     <label>Réalisations (1 par ligne)</label>
// //                     <textarea value={e.bullets} onChange={ev=>updateExp(e.id,'bullets',ev.target.value)} rows={3}
// //                       placeholder={"Développé une API REST réduisant la latence de 40%\nGéré une équipe de 4 développeurs juniors\nMigré l'infra vers AWS, -60% coûts serveur"} />
// //                   </div>
// //                 </div>
// //               ))}
// //               <button className="add-btn" onClick={addExp}>+ Ajouter une expérience</button>
// //             </div>
// //           )}

// //           {/* FORMATION */}
// //           {section === 'edu' && (
// //             <div>
// //               {edus.map((e, i) => (
// //                 <div className="card" key={e.id}>
// //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
// //                     <span style={{ fontSize: 12, fontWeight: 600, color: '#4a4540' }}>Formation {i+1}</span>
// //                     <button className="del-btn" onClick={() => delEdu(e.id)}>×</button>
// //                   </div>
// //                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
// //                     <div><label>Diplôme</label><input value={e.degree} onChange={ev=>updateEdu(e.id,'degree',ev.target.value)} placeholder="Master Informatique" /></div>
// //                     <div><label>École / Université</label><input value={e.school} onChange={ev=>updateEdu(e.id,'school',ev.target.value)} placeholder="INSA Lyon" /></div>
// //                   </div>
// //                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
// //                     <div><label>Période</label><input value={e.period} onChange={ev=>updateEdu(e.id,'period',ev.target.value)} placeholder="2018 – 2020" /></div>
// //                     <div><label>Mention / Spécialité</label><input value={e.detail} onChange={ev=>updateEdu(e.id,'detail',ev.target.value)} placeholder="Mention Très Bien · IA" /></div>
// //                   </div>
// //                 </div>
// //               ))}
// //               <button className="add-btn" onClick={addEdu}>+ Ajouter une formation</button>
// //             </div>
// //           )}

// //           {/* COMPÉTENCES */}
// //           {section === 'skills' && (
// //             <div>
// //               <label>Compétences</label>
// //               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 36 }}>
// //                 {skills.map(s => (
// //                   <div key={s} style={{ background: '#fff', border: '1px solid #e8e4df', borderRadius: 20, padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
// //                     {s}
// //                     <span onClick={() => delSkill(s)} style={{ cursor: 'pointer', color: '#ccc', fontSize: 14, lineHeight: 1 }}>×</span>
// //                   </div>
// //                 ))}
// //               </div>
// //               <div style={{ display: 'flex', gap: 8 }}>
// //                 <input value={skillInput} onChange={e=>setSkillInput(e.target.value)}
// //                   onKeyDown={e => { if(e.key==='Enter'){addSkill();e.preventDefault()} }}
// //                   placeholder="ex: React, TypeScript, Docker... (Entrée ou virgule)" />
// //                 <button onClick={addSkill} style={{ border: '1px solid #e8e4df', borderRadius: 7, padding: '8px 14px', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#4a4540', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
// //                   Ajouter
// //                 </button>
// //               </div>
// //               <p style={{ fontSize: 11, color: '#8a8480', marginTop: 8 }}>💡 Tu peux entrer plusieurs compétences séparées par des virgules</p>
// //             </div>
// //           )}

// //           {/* LANGUES */}
// //           {section === 'langs' && (
// //             <div>
// //               {langs.map((l, i) => (
// //                 <div className="card" key={l.id}>
// //                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
// //                     <span style={{ fontSize: 12, fontWeight: 600, color: '#4a4540' }}>Langue {i+1}</span>
// //                     <button className="del-btn" onClick={() => delLang(l.id)}>×</button>
// //                   </div>
// //                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
// //                     <div><label>Langue</label><input value={l.name} onChange={ev=>updateLang(l.id,'name',ev.target.value)} placeholder="Anglais" /></div>
// //                     <div>
// //                       <label>Niveau</label>
// //                       <select value={l.level} onChange={ev=>updateLang(l.id,'level',ev.target.value)}>
// //                         <option value="">— Choisir —</option>
// //                         {LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
// //                       </select>
// //                     </div>
// //                   </div>
// //                 </div>
// //               ))}
// //               <button className="add-btn" onClick={addLang}>+ Ajouter une langue</button>
// //             </div>
// //           )}

// //         </div>

// //         {/* Generate footer */}
// //         <div style={{ padding: '14px 24px 18px', borderTop: '1px solid #e8e4df', flexShrink: 0 }}>
// //           {error && <p style={{ fontSize: 12, color: '#c00', marginBottom: 10 }}>⚠ {error}</p>}
// //           <button onClick={handleGenerate} disabled={loading}
// //             style={{ width: '100%', padding: 13, border: 'none', borderRadius: 10, background: acColor, color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: loading ? .8 : 1, transition: 'opacity .2s' }}>
// //             {loading ? <><span className="spinner"/>{generated ? 'Amélioration IA...' : 'Génération IA...'}</> : <>✨ {generated ? 'Régénérer le CV' : 'Générer mon CV'}</>}
// //           </button>
// //         </div>
// //       </div>

// //       {/* ══════ PREVIEW ══════ */}
// //       <div style={{ background: '#e8e4df', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
// //         {/* Preview toolbar */}
// //         <div style={{ background: '#1a1714', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
// //           <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontFamily: 'monospace', letterSpacing: '.06em' }}>APERÇU · TEMPS RÉEL</span>
// //           <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
// //             <Link href="/interview" style={{ border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, padding: '5px 12px', background: 'transparent', color: 'rgba(255,255,255,.7)', fontSize: 11, textDecoration: 'none' }}>
// //               🎤 Interview Coach
// //             </Link>
// //             <button onClick={handleDownloadPdf} disabled={!generated || pdfLoading}
// //               style={{ border: '1px solid rgba(255,255,255,.25)', borderRadius: 6, padding: '5px 12px', background: generated?'rgba(255,255,255,.1)':'transparent', color: generated?'#fff':'rgba(255,255,255,.3)', fontSize: 11, cursor: generated?'pointer':'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
// //               {pdfLoading ? <><span className="spinner"/>PDF...</> : '↓ Télécharger PDF'}
// //             </button>
// //           </div>
// //         </div>

// //         {/* CV paper */}
// //         <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
// //           <div id="cv-preview-paper"
// //             style={{ background: '#fff', width: 595, minHeight: 842, boxShadow: '0 4px 40px rgba(0,0,0,.25)', flexShrink: 0 }}>
// //             {cvHtml
// //               ? <div dangerouslySetInnerHTML={{ __html: cvHtml }} />
// //               : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 842, color: '#ccc', fontSize: 14, textAlign: 'center', padding: 40 }}>
// //                   <div style={{ fontSize: 48, marginBottom: 14, opacity: .4 }}>📄</div>
// //                   <div>Remplis les champs à gauche<br/>puis clique sur <strong style={{ color: acColor }}>Générer mon CV</strong></div>
// //                 </div>
// //             }
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }
// 'use client';
// // app/cv/page.tsx — CV Builder avec photo de profil + assistant IA chat

// import { useState, useCallback, useRef, useEffect } from 'react';
// import Link from 'next/link';

// // ─── TYPES ───────────────────────────────────────────────────────────────────

// interface Exp  { id: number; role: string; co: string; period: string; location: string; bullets: string; }
// interface Edu  { id: number; degree: string; school: string; period: string; detail: string; }
// interface Lang { id: number; name: string; level: string; }
// interface ChatMsg { role: 'user' | 'ai'; text: string; }

// interface CVData {
//   prenom: string; nom: string; titre: string;
//   email: string; tel: string; ville: string;
//   linkedin: string; github: string; summary: string;
//   photo?: string; // base64
//   exps:  { role: string; co: string; period: string; location: string; bullets: string[] }[];
//   edus:  { degree: string; school: string; period: string; detail: string }[];
//   skills: string[];
//   langs: { name: string; level: string }[];
// }

// type Style   = 'fr' | 'ca' | 'uk';
// type Section = 'perso' | 'summary' | 'exp' | 'edu' | 'skills' | 'langs';

// // ─── CONFIG ───────────────────────────────────────────────────────────────────

// const STYLES = {
//   fr: { label: 'France',       flag: '🇫🇷', hint: 'Classique · Sobre',    color: '#2d4a8f', bg: '#e8ecf7', photoNote: 'Photo optionnelle mais souvent demandée' },
//   ca: { label: 'Canada',       flag: '🇨🇦', hint: 'Moderne · Aéré',       color: '#c41e3a', bg: '#fce8ea', photoNote: 'Photo non recommandée au Canada' },
//   uk: { label: 'UK / Anglais', flag: '🇬🇧', hint: 'Élégant · Structuré',  color: '#1a3a6b', bg: '#e6edf8', photoNote: 'Photo déconseillée au Royaume-Uni' },
// };
// const LEVELS = ['A1 — Débutant','A2 — Élémentaire','B1 — Intermédiaire','B2 — Indépendant','C1 — Avancé','C2 — Maîtrise','Natif'];

// // ─── HELPERS ─────────────────────────────────────────────────────────────────

// const esc  = (s: string) => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// const buls = (arr: string[], ac: string) => arr.length
//   ? `<ul style="list-style:none;padding:0;margin:4px 0 0">${arr.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px;padding-left:10px;position:relative"><span style="position:absolute;left:0;color:${ac};font-size:9px;top:3px">▸</span>${esc(b)}</li>`).join('')}</ul>`
//   : '';

// // ─── CV RENDERERS ─────────────────────────────────────────────────────────────

// function renderFR(cv: CVData): string {
//   const ac = STYLES.fr.color;
//   const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
//   const photoHtml = cv.photo
//     ? `<div style="position:absolute;right:28px;top:50%;transform:translateY(-50%);width:72px;height:72px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,.4);flex-shrink:0">
//         <img src="${cv.photo}" style="width:100%;height:100%;object-fit:cover" />
//        </div>`
//     : '';
//   return `
// <div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714">
//   <div style="background:${ac};padding:24px 32px 20px;position:relative;overflow:hidden">
//     <div style="position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.06)"></div>
//     ${photoHtml}
//     <div style="padding-right:${cv.photo?'90px':'0'}">
//       <div style="font-family:'Georgia',serif;font-size:24px;color:#fff;margin-bottom:2px">${esc(cv.prenom)} ${esc(cv.nom)}</div>
//       <div style="font-size:11px;color:rgba(255,255,255,.7);letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px">${esc(cv.titre)}</div>
//       <div style="display:flex;flex-wrap:wrap;gap:10px">${contacts.map(c=>`<span style="font-size:10px;color:rgba(255,255,255,.65)">◦ ${esc(c)}</span>`).join('')}</div>
//     </div>
//   </div>
//   <div style="display:grid;grid-template-columns:1fr 168px;min-height:720px">
//     <div style="padding:18px 20px;border-right:1px solid #eee">
//       ${cv.summary?`<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Profil</div><p style="font-size:11px;color:#4a4540;line-height:1.75;margin-bottom:14px">${esc(cv.summary)}</p>`:''}
//       ${cv.exps.length?`<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Expériences Professionnelles</div>${cv.exps.map(e=>`
//         <div style="margin-bottom:13px;padding-left:10px;border-left:2px solid #d0d8f0">
//           <div style="display:flex;justify-content:space-between;align-items:baseline">
//             <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.role)}</span>
//             <span style="font-size:10px;color:#8a8480">${esc(e.period)}</span>
//           </div>
//           <div style="font-size:11px;color:${ac};font-weight:500;margin-bottom:2px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
//           ${buls(e.bullets,ac)}
//         </div>`).join('')}`:''}
//       ${cv.edus.length?`<div style="font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin:14px 0 8px;padding-bottom:4px;border-bottom:1.5px solid ${ac}">Formation</div>${cv.edus.map(e=>`
//         <div style="margin-bottom:9px">
//           <div style="display:flex;justify-content:space-between">
//             <div>
//               <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.degree)}</span>
//               <div style="font-size:11px;color:${ac};font-weight:500">${esc(e.school)}</div>
//               ${e.detail?`<div style="font-size:9.5px;color:#8a8480">${esc(e.detail)}</div>`:''}
//             </div>
//             <span style="font-size:10px;color:#8a8480;flex-shrink:0;margin-left:8px">${esc(e.period)}</span>
//           </div>
//         </div>`).join('')}`:''}
//     </div>
//     <div style="padding:16px;background:#f8faff">
//       ${cv.skills.length?`<div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin-bottom:7px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Compétences</div><div style="margin-bottom:12px">${cv.skills.map(s=>`<span style="display:inline-block;background:#e8ecf7;color:${ac};border-radius:3px;padding:2px 6px;font-size:9px;font-weight:600;margin:2px 2px 2px 0">${esc(s)}</span>`).join('')}</div>`:''}
//       ${cv.langs.filter(l=>l.name).length?`<div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin-bottom:7px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Langues</div>${cv.langs.filter(l=>l.name).map(l=>`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><span style="font-size:10px;color:#1a1714">${esc(l.name)}</span><span style="font-size:8px;background:#e8ecf7;color:${ac};padding:1px 5px;border-radius:2px;font-weight:600">${esc(l.level?.split(' — ')[0]||l.level||'')}</span></div>`).join('')}`:''}
//       ${cv.linkedin||cv.github?`<div style="font-size:8px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin:12px 0 6px;padding-bottom:3px;border-bottom:1px solid #d0d8f0">Liens</div>${cv.linkedin?`<div style="font-size:9px;color:#4a4540;word-break:break-all;margin-bottom:3px">${esc(cv.linkedin)}</div>`:''}${cv.github?`<div style="font-size:9px;color:#4a4540;word-break:break-all">${esc(cv.github)}</div>`:''}`:''}
//     </div>
//   </div>
//   <div style="background:${ac};padding:7px 32px;display:flex;justify-content:space-between">
//     <span style="font-size:8px;color:rgba(255,255,255,.35);letter-spacing:.06em">CV · ${esc(cv.prenom)} ${esc(cv.nom)}</span>
//     <span style="font-size:8px;color:rgba(255,255,255,.35)">JOBSMART AI</span>
//   </div>
// </div>`;
// }

// function renderCA(cv: CVData): string {
//   const ac = STYLES.ca.color;
//   const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
//   const sec = (t: string) => `<div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${ac};margin:16px 0 8px;padding-bottom:3px;border-bottom:2px solid ${ac}">${t}</div>`;
//   const photoHtml = cv.photo
//     ? `<div style="width:80px;height:80px;border-radius:50%;overflow:hidden;border:3px solid ${ac};flex-shrink:0;margin-left:16px">
//         <img src="${cv.photo}" style="width:100%;height:100%;object-fit:cover" />
//        </div>`
//     : '';
//   return `
// <div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714">
//   <div style="background:#fff;padding:22px 32px 14px;border-bottom:4px solid ${ac};display:flex;align-items:center">
//     <div style="flex:1">
//       <div style="font-family:'Georgia',serif;font-size:26px;color:#1a1714;margin-bottom:2px">${esc(cv.prenom)} ${esc(cv.nom)}</div>
//       <div style="font-size:13px;color:${ac};font-weight:600;margin-bottom:9px">${esc(cv.titre)}</div>
//       <div style="display:flex;flex-wrap:wrap;gap:12px">${contacts.map(c=>`<span style="font-size:10px;color:#6a6460">• ${esc(c)}</span>`).join('')}</div>
//     </div>
//     ${photoHtml}
//   </div>
//   <div style="padding:0 32px 22px">
//     ${cv.summary?sec('Sommaire Professionnel')+`<p style="font-size:11px;color:#4a4540;line-height:1.75">${esc(cv.summary)}</p>`:''}
//     ${cv.exps.length?sec('Expérience Professionnelle')+cv.exps.map(e=>`
//     <div style="margin-bottom:14px">
//       <div style="display:flex;justify-content:space-between;align-items:baseline">
//         <span style="font-size:12px;font-weight:700;color:#1a1714">${esc(e.role)}</span>
//         <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
//       </div>
//       <div style="font-size:11px;color:#4a4540;font-style:italic;margin-bottom:3px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
//       <ul style="list-style:disc;padding-left:14px;margin:0">${e.bullets.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px">${esc(b)}</li>`).join('')}</ul>
//     </div>`).join(''):''}
//     ${cv.edus.length?sec('Formation')+cv.edus.map(e=>`
//     <div style="margin-bottom:10px">
//       <div style="display:flex;justify-content:space-between">
//         <span style="font-size:12px;font-weight:700;color:#1a1714">${esc(e.degree)}</span>
//         <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
//       </div>
//       <div style="font-size:11px;color:#4a4540;font-style:italic">${esc(e.school)}${e.detail?' · '+esc(e.detail):''}</div>
//     </div>`).join(''):''}
//     ${cv.skills.length?sec('Compétences')+`<div style="display:flex;flex-wrap:wrap;gap:5px">${cv.skills.map(s=>`<span style="background:#fce8ea;color:${ac};border-radius:4px;padding:3px 8px;font-size:9px;font-weight:600">${esc(s)}</span>`).join('')}</div>`:''}
//     ${cv.langs.filter(l=>l.name).length?sec('Langues')+`<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px">${cv.langs.filter(l=>l.name).map(l=>`<div style="display:flex;justify-content:space-between;font-size:10.5px"><span style="color:#1a1714">${esc(l.name)}</span><span style="color:#8a8480">${esc(l.level?.split(' — ')[1]||l.level||'')}</span></div>`).join('')}</div>`:''}
//   </div>
// </div>`;
// }

// function renderUK(cv: CVData): string {
//   const ac = STYLES.uk.color;
//   const contacts = [cv.email,cv.tel,cv.ville,cv.linkedin,cv.github].filter(Boolean);
//   const sec = (t: string) => `<div style="font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${ac};margin:14px 0 7px;background:#e6edf8;padding:4px 8px;border-left:3px solid ${ac}">${t}</div>`;
//   // UK: photo generally not recommended — show smaller if provided
//   const photoHtml = cv.photo
//     ? `<div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid ${ac};flex-shrink:0;margin-left:16px;opacity:.85">
//         <img src="${cv.photo}" style="width:100%;height:100%;object-fit:cover" />
//        </div>`
//     : '';
//   return `
// <div style="font-family:'Inter',Arial,sans-serif;background:#fff;color:#1a1714">
//   <div style="background:#fff;padding:24px 32px 16px;border-left:5px solid ${ac};display:flex;align-items:center">
//     <div style="flex:1">
//       <div style="font-family:'Georgia',serif;font-size:28px;color:#1a1714;font-style:italic;margin-bottom:2px">${esc(cv.prenom)} ${esc(cv.nom)}</div>
//       <div style="font-size:12px;color:${ac};font-weight:500;margin-bottom:10px;letter-spacing:.04em">${esc(cv.titre)}</div>
//       <div style="font-size:10px;color:#6a6460">${contacts.join(' &nbsp;·&nbsp; ')}</div>
//     </div>
//     ${photoHtml}
//   </div>
//   <div style="padding:0 32px 22px">
//     ${cv.summary?sec('Personal Statement')+`<p style="font-size:11px;color:#4a4540;line-height:1.75;font-style:italic;border-left:3px solid #d0ddf0;padding-left:10px;margin-bottom:2px">${esc(cv.summary)}</p>`:''}
//     ${cv.exps.length?sec('Work Experience')+cv.exps.map(e=>`
//     <div style="margin-bottom:13px">
//       <div style="display:flex;justify-content:space-between">
//         <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.role)}</span>
//         <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
//       </div>
//       <div style="font-size:11px;color:#4a4540;margin-bottom:3px">${esc(e.co)}${e.location?' · '+esc(e.location):''}</div>
//       <ul style="list-style:none;padding:0;margin:0">${e.bullets.map(b=>`<li style="font-size:10.5px;color:#4a4540;line-height:1.65;margin-bottom:2px;padding-left:12px;position:relative"><span style="position:absolute;left:0;color:${ac}">—</span>${esc(b)}</li>`).join('')}</ul>
//     </div>`).join(''):''}
//     ${cv.edus.length?sec('Education')+cv.edus.map(e=>`
//     <div style="margin-bottom:9px">
//       <div style="display:flex;justify-content:space-between">
//         <span style="font-size:12px;font-weight:600;color:#1a1714">${esc(e.degree)}</span>
//         <span style="font-size:10px;color:#8a8480;font-family:monospace">${esc(e.period)}</span>
//       </div>
//       <div style="font-size:11px;color:#4a4540">${esc(e.school)}${e.detail?' · '+esc(e.detail):''}</div>
//     </div>`).join(''):''}
//     ${cv.skills.length?sec('Key Skills')+`<div style="display:flex;flex-wrap:wrap;gap:4px">${cv.skills.map(s=>`<span style="border:1px solid #c5d4e8;color:${ac};border-radius:2px;padding:2px 7px;font-size:9px;font-weight:500">${esc(s)}</span>`).join('')}</div>`:''}
//     ${cv.langs.filter(l=>l.name).length?sec('Languages')+cv.langs.filter(l=>l.name).map(l=>`<div style="font-size:10.5px;color:#4a4540;margin-bottom:3px">${esc(l.name)} — ${esc(l.level?.split(' — ')[1]||l.level||'')}</div>`).join(''):''}
//   </div>
// </div>`;
// }

// // ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

// export default function CVBuilderPage() {
//   const [style,     setStyle]     = useState<Style>('fr');
//   const [section,   setSection]   = useState<Section>('perso');
//   const [loading,   setLoading]   = useState(false);
//   const [generated, setGenerated] = useState(false);
//   const [cvHtml,    setCvHtml]    = useState('');
//   const [pdfLoad,   setPdfLoad]   = useState(false);
//   const [error,     setError]     = useState('');

//   // Identité
//   const [prenom,   setPrenom]   = useState('');
//   const [nom,      setNom]      = useState('');
//   const [titre,    setTitre]    = useState('');
//   const [email,    setEmail]    = useState('');
//   const [tel,      setTel]      = useState('');
//   const [ville,    setVille]    = useState('');
//   const [linkedin, setLinkedin] = useState('');
//   const [github,   setGithub]   = useState('');
//   const [summary,  setSummary]  = useState('');

//   // Photo
//   const [photo,    setPhoto]    = useState<string>('');
//   const photoRef = useRef<HTMLInputElement>(null);

//   // Sections
//   const [exps,   setExps]   = useState<Exp[]>([{ id: 1, role:'', co:'', period:'', location:'', bullets:'' }]);
//   const [edus,   setEdus]   = useState<Edu[]>([{ id: 1, degree:'', school:'', period:'', detail:'' }]);
//   const [skills, setSkills] = useState<string[]>([]);
//   const [langs,  setLangs]  = useState<Lang[]>([{ id: 1, name:'', level:'' }]);
//   const [skillIn, setSkillIn] = useState('');

//   // Chat assistant
//   const [chatOpen,   setChatOpen]   = useState(false);
//   const [chatMsgs,   setChatMsgs]   = useState<ChatMsg[]>([
//     { role:'ai', text:'👋 Bonjour ! Je suis ton assistant CV. Je peux t\'aider à rédiger ton résumé, améliorer tes bullets d\'expérience, ou corriger ton contenu. Que veux-tu améliorer ?' }
//   ]);
//   const [chatInput,  setChatInput]  = useState('');
//   const [chatLoading,setChatLoading]= useState(false);
//   const chatEndRef = useRef<HTMLDivElement>(null);

//   useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

//   // ── Photo handler ──────────────────────────────────────────────────────────
//   const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = (ev) => {
//       setPhoto(ev.target?.result as string);
//       if (generated) setTimeout(() => handleGenerate(), 100);
//     };
//     reader.readAsDataURL(file);
//   };

//   // ── CV data builder ────────────────────────────────────────────────────────
//   const getData = (): CVData => ({
//     prenom, nom, titre, email, tel, ville, linkedin, github, summary, photo,
//     exps:  exps.map(e => ({ ...e, bullets: e.bullets.split('\n').filter(Boolean) })),
//     edus:  edus.map(e => ({ degree:e.degree, school:e.school, period:e.period, detail:e.detail })),
//     skills,
//     langs: langs.map(l => ({ name:l.name, level:l.level })),
//   });

//   const doRender = useCallback((cv: CVData, s: Style) => {
//     if (s === 'fr') return renderFR(cv);
//     if (s === 'ca') return renderCA(cv);
//     return renderUK(cv);
//   }, []);

//   // ── Generate ───────────────────────────────────────────────────────────────
//   const handleGenerate = async () => {
//     const d = getData();
//     setLoading(true); setError('');
//     setCvHtml(doRender(d, style));
//     setGenerated(true);

//     try {
//       const expText = d.exps.map(e =>
//         `- ${e.role} chez ${e.co} (${e.period}, ${e.location})\n${e.bullets.map(b=>'  • '+b).join('\n')}`
//       ).join('\n\n');

//       const res = await fetch('/api/cv/generate', {
//         method:'POST', headers:{'Content-Type':'application/json'},
//         body: JSON.stringify({
//           prompt: `Style: ${style}. Améliore ce CV. Nom: ${d.prenom} ${d.nom}. Titre: ${d.titre}. Résumé: ${d.summary}. Exps:\n${expText||'Aucune'}. Formations: ${d.edus.map(e=>`${e.degree} ${e.school} ${e.period}`).join('; ')||'Aucune'}. Skills: ${d.skills.join(', ')||'Aucune'}. Langues: ${d.langs.map(l=>l.name+' '+l.level).join(', ')||'Aucune'}. RÈGLES: JSON uniquement, améliore résumé si vide, améliore bullets. {"prenom":"","nom":"","titre":"","email":"","tel":"","ville":"","linkedin":"","github":"","summary":"","exps":[{"role":"","co":"","period":"","location":"","bullets":[""]}],"edus":[{"degree":"","school":"","period":"","detail":""}],"skills":[""],"langs":[{"name":"","level":""}]}`,
//           template: style,
//         }),
//       });
//       if (res.ok) {
//         const { cv } = await res.json();
//         if (cv?.summary) {
//           if (!summary && cv.summary) setSummary(cv.summary);
//           const enhanced: CVData = {
//             prenom: cv.prenom||d.prenom, nom: cv.nom||d.nom, titre: cv.titre||d.titre,
//             email: cv.email||d.email, tel: cv.tel||d.tel, ville: cv.ville||d.ville,
//             linkedin: cv.linkedin||d.linkedin, github: cv.github||d.github,
//             summary: cv.summary||d.summary, photo: d.photo,
//             exps:  (cv.exps||d.exps).map((e: { bullets: string | string[] } & Omit<CVData['exps'][0], 'bullets'>) => ({ ...e, bullets: Array.isArray(e.bullets)?e.bullets:[e.bullets] })),
//             edus:  cv.edus||d.edus, skills: cv.skills||d.skills, langs: cv.langs||d.langs,
//           };
//           setCvHtml(doRender(enhanced, style));
//         }
//       }
//     } catch { /* keep immediate render */ }
//     finally { setLoading(false); }
//   };

//   const changeStyle = (s: Style) => {
//     setStyle(s);
//     if (generated) setCvHtml(doRender(getData(), s));
//   };

//   // ── PDF ────────────────────────────────────────────────────────────────────
//   const handlePdf = async () => {
//     if (!generated) return;
//     setPdfLoad(true);
//     try {
//       const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
//         import('html2canvas'), import('jspdf'),
//       ]);
//       const el = document.getElementById('cv-paper')!;
//       const canvas = await html2canvas(el, { scale:2.5, useCORS:true, backgroundColor:'#fff', logging:false });
//       const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
//       const w = pdf.internal.pageSize.getWidth();
//       pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, (canvas.height*w)/canvas.width);
//       pdf.save(`cv-${(prenom+'-'+nom).toLowerCase().replace(/\s+/g,'-')}.pdf`);
//     } catch { setError('Erreur PDF. npm install jspdf html2canvas'); }
//     finally { setPdfLoad(false); }
//   };

//   // ── Chat AI ────────────────────────────────────────────────────────────────
//   const sendChat = async () => {
//     const msg = chatInput.trim();
//     if (!msg || chatLoading) return;
//     setChatInput('');
//     setChatMsgs(p => [...p, { role:'user', text:msg }]);
//     setChatLoading(true);

//     const d = getData();
//     const context = `Contexte CV actuel: Nom: ${d.prenom} ${d.nom}, Titre: ${d.titre}, Résumé: ${d.summary||'(vide)'}, Expériences: ${d.exps.map(e=>e.role+' chez '+e.co).join(', ')||'(vide)'}, Skills: ${d.skills.join(', ')||'(vide)'}`;

//     try {
//       const res = await fetch('/api/cv/chat', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ message: msg, context }),
//       });

//       if (res.ok) {
//         const data = await res.json();
//         setChatMsgs(p => [...p, { role:'ai', text: data.message || 'Je ne peux pas répondre pour le moment.' }]);
//       } else {
//         throw new Error('API error');
//       }
//     } catch {
//       setChatMsgs(p => [...p, { role:'ai', text:'Désolé, une erreur est survenue. Vérifie que GROQ_API_KEY est dans .env.local' }]);
//     } finally {
//       setChatLoading(false);
//     }
//   };

//   // ── Helpers helpers ────────────────────────────────────────────────────────
//   const addExp    = () => setExps(p=>[...p,{id:Date.now(),role:'',co:'',period:'',location:'',bullets:''}]);
//   const delExp    = (id:number) => setExps(p=>p.filter(e=>e.id!==id));
//   const updExp    = (id:number,f:keyof Exp,v:string) => setExps(p=>p.map(e=>e.id===id?{...e,[f]:v}:e));
//   const addEdu    = () => setEdus(p=>[...p,{id:Date.now(),degree:'',school:'',period:'',detail:''}]);
//   const delEdu    = (id:number) => setEdus(p=>p.filter(e=>e.id!==id));
//   const updEdu    = (id:number,f:keyof Edu,v:string) => setEdus(p=>p.map(e=>e.id===id?{...e,[f]:v}:e));
//   const addSkill  = () => { skillIn.split(',').map(s=>s.trim()).filter(Boolean).forEach(v=>setSkills(p=>p.includes(v)?p:[...p,v])); setSkillIn(''); };
//   const delSkill  = (s:string) => setSkills(p=>p.filter(k=>k!==s));
//   const addLang   = () => setLangs(p=>[...p,{id:Date.now(),name:'',level:''}]);
//   const delLang   = (id:number) => setLangs(p=>p.filter(l=>l.id!==id));
//   const updLang   = (id:number,f:keyof Lang,v:string) => setLangs(p=>p.map(l=>l.id===id?{...l,[f]:v}:l));

//   const ac = STYLES[style].color;
//   const SECS: Section[] = ['perso','summary','exp','edu','skills','langs'];
//   const LABS = ['👤 Identité','📝 Profil','💼 Expériences','🎓 Formation','⚡ Compétences','🌍 Langues'];

//   // ── RENDER ─────────────────────────────────────────────────────────────────
//   return (
//     <div style={{display:'grid',gridTemplateColumns:'480px 1fr',height:'100vh',overflow:'hidden',fontFamily:"'DM Sans','Inter',sans-serif",position:'relative'}}>
//       <style>{`
//         *{box-sizing:border-box}
//         input,textarea,select{background:#faf8f4;border:1px solid #e8e4df;border-radius:7px;padding:8px 11px;font-family:inherit;font-size:13px;color:#1a1714;outline:none;transition:border-color .15s;width:100%}
//         input:focus,textarea:focus,select:focus{border-color:${ac}}
//         textarea{resize:vertical}
//         label{font-size:11px;font-weight:600;color:#8a8480;letter-spacing:.04em;text-transform:uppercase;display:block;margin-bottom:4px}
//         .card{background:#fff;border:1px solid #e8e4df;border-radius:10px;padding:14px;margin-bottom:10px}
//         .add-btn{border:1px dashed #e8e4df;border-radius:8px;padding:8px;width:100%;background:none;cursor:pointer;font-size:12px;color:#8a8480;font-family:inherit;transition:all .15s;margin-bottom:12px}
//         .add-btn:hover{border-color:#8a8480;color:#1a1714;background:#faf8f4}
//         .del-btn{border:none;background:none;cursor:pointer;color:#ccc;font-size:18px;padding:2px 6px;border-radius:4px;line-height:1;transition:color .15s}
//         .del-btn:hover{color:#c00;background:#fee}
//         .s-tab{padding:8px 13px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;color:#8a8480;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s}
//         .s-tab:hover{color:#1a1714}
//         .s-tab.active{color:#1a1714;border-bottom-color:#1a1714}
//         @keyframes spin{to{transform:rotate(360deg)}}
//         @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
//         .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}
//         .chat-spinner{display:inline-block;width:10px;height:10px;border:1.5px solid #ccc;border-top-color:#666;border-radius:50%;animation:spin .7s linear infinite}
//         .chat-bubble-ai{background:#f0f0f0;color:#1a1714;border-radius:14px 14px 14px 4px;padding:10px 13px;font-size:13px;line-height:1.6;max-width:85%;white-space:pre-wrap}
//         .chat-bubble-user{background:${ac};color:#fff;border-radius:14px 14px 4px 14px;padding:10px 13px;font-size:13px;line-height:1.6;max-width:85%;white-space:pre-wrap;margin-left:auto}
//         .quick-btn{border:1px solid #e8e4df;border-radius:20px;padding:5px 11px;background:#fff;cursor:pointer;font-size:11px;color:#4a4540;font-family:inherit;transition:all .15s;white-space:nowrap}
//         .quick-btn:hover{border-color:${ac};color:${ac}}
//       `}</style>

//       {/* ══════════ EDITOR ══════════ */}
//       <div style={{background:'#faf8f4',borderRight:'1px solid #e8e4df',display:'flex',flexDirection:'column',overflow:'hidden'}}>

//         {/* Header */}
//         <div style={{padding:'16px 24px 0',flexShrink:0}}>
//           <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
//             <div style={{fontFamily:'Georgia,serif',fontSize:19,color:'#1a1714'}}>CV Builder</div>
//             <Link href="/welcome" style={{fontSize:11,color:'#8a8480',textDecoration:'none'}}>← Accueil</Link>
//           </div>
//           <div style={{fontSize:12,color:'#8a8480',marginBottom:14}}>Remplis les champs · Choisis ton style · Génère</div>

//           {/* Style selector */}
//           <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginBottom:16}}>
//             {(Object.entries(STYLES) as [Style, typeof STYLES.fr][]).map(([k,s])=>(
//               <div key={k} onClick={()=>changeStyle(k)}
//                 style={{border:`${style===k?'2px':'1.5px'} solid ${style===k?s.color:'#e8e4df'}`,borderRadius:9,padding:'9px 7px',cursor:'pointer',textAlign:'center',background:style===k?s.bg:'#fff',transition:'all .15s'}}>
//                 <div style={{fontSize:17,marginBottom:3}}>{s.flag}</div>
//                 <div style={{fontSize:11,fontWeight:600,color:style===k?s.color:'#4a4540'}}>{s.label}</div>
//                 <div style={{fontSize:9,color:'#8a8480',marginTop:1}}>{s.hint}</div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Tabs */}
//         <div style={{display:'flex',padding:'0 24px',borderBottom:'1px solid #e8e4df',overflowX:'auto',flexShrink:0}}>
//           {SECS.map((s,i)=>(
//             <button key={s} className={`s-tab${section===s?' active':''}`} onClick={()=>setSection(s)}>{LABS[i]}</button>
//           ))}
//         </div>

//         {/* Form body */}
//         <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>

//           {/* ── IDENTITÉ ── */}
//           {section==='perso' && (
//             <div>
//               {/* Photo upload */}
//               <div style={{marginBottom:16,padding:14,background:'#fff',border:'1px solid #e8e4df',borderRadius:10,display:'flex',alignItems:'center',gap:14}}>
//                 <div onClick={()=>photoRef.current?.click()} style={{width:60,height:60,borderRadius:'50%',overflow:'hidden',border:`2px dashed ${photo?ac:'#e8e4df'}`,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:photo?'transparent':'#faf8f4',transition:'border-color .15s'}}>
//                   {photo
//                     ? <img src={photo} style={{width:'100%',height:'100%',objectFit:'cover'}} />
//                     : <span style={{fontSize:22,opacity:.4}}>📷</span>}
//                 </div>
//                 <div style={{flex:1}}>
//                   <div style={{fontSize:12,fontWeight:600,color:'#1a1714',marginBottom:3}}>Photo de profil</div>
//                   <div style={{fontSize:11,color:'#8a8480',marginBottom:8,lineHeight:1.5}}>{STYLES[style].photoNote}</div>
//                   <div style={{display:'flex',gap:8}}>
//                     <button onClick={()=>photoRef.current?.click()} style={{border:`1px solid ${ac}`,borderRadius:6,padding:'4px 12px',background:'transparent',color:ac,fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
//                       {photo?'Changer':'Ajouter photo'}
//                     </button>
//                     {photo && <button onClick={()=>{setPhoto('');if(generated)setTimeout(handleGenerate,100)}} style={{border:'1px solid #e8e4df',borderRadius:6,padding:'4px 10px',background:'transparent',color:'#8a8480',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Supprimer</button>}
//                   </div>
//                 </div>
//                 <input ref={photoRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto} />
//               </div>

//               <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
//                 <div><label>Prénom</label><input value={prenom} onChange={e=>setPrenom(e.target.value)} placeholder="Marie" /></div>
//                 <div><label>Nom</label><input value={nom} onChange={e=>setNom(e.target.value)} placeholder="Dupont" /></div>
//               </div>
//               <div style={{marginBottom:10}}><label>Titre / Poste visé</label><input value={titre} onChange={e=>setTitre(e.target.value)} placeholder="Ingénieure Développement Logiciel" /></div>
//               <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
//                 <div><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} placeholder="marie@email.com" /></div>
//                 <div><label>Téléphone</label><input value={tel} onChange={e=>setTel(e.target.value)} placeholder="+33 6 12 34 56 78" /></div>
//               </div>
//               <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
//                 <div><label>Ville</label><input value={ville} onChange={e=>setVille(e.target.value)} placeholder="Paris, France" /></div>
//                 <div><label>LinkedIn</label><input value={linkedin} onChange={e=>setLinkedin(e.target.value)} placeholder="linkedin.com/in/marie" /></div>
//               </div>
//               <div><label>GitHub / Portfolio</label><input value={github} onChange={e=>setGithub(e.target.value)} placeholder="github.com/marie" /></div>
//             </div>
//           )}

//           {/* ── PROFIL ── */}
//           {section==='summary' && (
//             <div>
//               <label>Résumé professionnel</label>
//               <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={6}
//                 placeholder="Ingénieure logiciel avec 5 ans d'expérience en développement web fullstack. Spécialisée en React et Node.js, j'ai livré des solutions SaaS à forte valeur ajoutée pour des clients fintech..." />
//               <p style={{fontSize:11,color:'#8a8480',marginTop:8}}>💡 3-4 phrases · Titre + années d'expérience · L'IA améliorera si vide</p>
//               <button onClick={()=>{setChatOpen(true);setChatInput('Aide-moi à rédiger mon résumé professionnel')}}
//                 style={{marginTop:10,border:`1px solid ${ac}`,borderRadius:8,padding:'7px 14px',background:'transparent',color:ac,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
//                 🤖 Aide IA pour rédiger le résumé
//               </button>
//             </div>
//           )}

//           {/* ── EXPÉRIENCES ── */}
//           {section==='exp' && (
//             <div>
//               {exps.map((e,i)=>(
//                 <div className="card" key={e.id}>
//                   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
//                     <span style={{fontSize:12,fontWeight:600,color:'#4a4540'}}>Expérience {i+1}</span>
//                     <button className="del-btn" onClick={()=>delExp(e.id)}>×</button>
//                   </div>
//                   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
//                     <div><label>Poste</label><input value={e.role} onChange={ev=>updExp(e.id,'role',ev.target.value)} placeholder="Développeur Full Stack" /></div>
//                     <div><label>Entreprise</label><input value={e.co} onChange={ev=>updExp(e.id,'co',ev.target.value)} placeholder="IntelliSoft" /></div>
//                   </div>
//                   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
//                     <div><label>Période</label><input value={e.period} onChange={ev=>updExp(e.id,'period',ev.target.value)} placeholder="Jan 2022 – Présent" /></div>
//                     <div><label>Lieu</label><input value={e.location} onChange={ev=>updExp(e.id,'location',ev.target.value)} placeholder="Paris, France" /></div>
//                   </div>
//                   <div>
//                     <label>Réalisations (1 par ligne)</label>
//                     <textarea value={e.bullets} onChange={ev=>updExp(e.id,'bullets',ev.target.value)} rows={3}
//                       placeholder={"Développé une API REST réduisant la latence de 40%\nGéré une équipe de 4 développeurs juniors\nMigré l'infra vers AWS, -60% coûts serveur"} />
//                     <button onClick={()=>{setChatOpen(true);setChatInput(`Améliore mes réalisations pour le poste de ${e.role} chez ${e.co}: ${e.bullets}`)}}
//                       style={{marginTop:6,border:`1px solid #e8e4df`,borderRadius:6,padding:'4px 10px',background:'transparent',color:'#8a8480',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
//                       🤖 Améliorer avec l'IA
//                     </button>
//                   </div>
//                 </div>
//               ))}
//               <button className="add-btn" onClick={addExp}>+ Ajouter une expérience</button>
//             </div>
//           )}

//           {/* ── FORMATION ── */}
//           {section==='edu' && (
//             <div>
//               {edus.map((e,i)=>(
//                 <div className="card" key={e.id}>
//                   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
//                     <span style={{fontSize:12,fontWeight:600,color:'#4a4540'}}>Formation {i+1}</span>
//                     <button className="del-btn" onClick={()=>delEdu(e.id)}>×</button>
//                   </div>
//                   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
//                     <div><label>Diplôme</label><input value={e.degree} onChange={ev=>updEdu(e.id,'degree',ev.target.value)} placeholder="Master Informatique" /></div>
//                     <div><label>École</label><input value={e.school} onChange={ev=>updEdu(e.id,'school',ev.target.value)} placeholder="INSA Lyon" /></div>
//                   </div>
//                   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
//                     <div><label>Période</label><input value={e.period} onChange={ev=>updEdu(e.id,'period',ev.target.value)} placeholder="2018 – 2020" /></div>
//                     <div><label>Mention / Spécialité</label><input value={e.detail} onChange={ev=>updEdu(e.id,'detail',ev.target.value)} placeholder="Mention Très Bien" /></div>
//                   </div>
//                 </div>
//               ))}
//               <button className="add-btn" onClick={addEdu}>+ Ajouter une formation</button>
//             </div>
//           )}

//           {/* ── COMPÉTENCES ── */}
//           {section==='skills' && (
//             <div>
//               <label>Compétences</label>
//               <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10,minHeight:36}}>
//                 {skills.map(s=>(
//                   <div key={s} style={{background:'#fff',border:'1px solid #e8e4df',borderRadius:20,padding:'4px 10px',fontSize:12,display:'flex',alignItems:'center',gap:5}}>
//                     {s}
//                     <span onClick={()=>delSkill(s)} style={{cursor:'pointer',color:'#ccc',fontSize:14,lineHeight:1}}>×</span>
//                   </div>
//                 ))}
//               </div>
//               <div style={{display:'flex',gap:8,marginBottom:8}}>
//                 <input value={skillIn} onChange={e=>setSkillIn(e.target.value)}
//                   onKeyDown={e=>{if(e.key==='Enter'){addSkill();e.preventDefault()}}}
//                   placeholder="ex: React, TypeScript, Docker... (virgule ou Entrée)" />
//                 <button onClick={addSkill} style={{border:'1px solid #e8e4df',borderRadius:7,padding:'8px 12px',background:'#fff',cursor:'pointer',fontSize:13,color:'#4a4540',whiteSpace:'nowrap',fontFamily:'inherit'}}>+</button>
//               </div>
//               <button onClick={()=>{setChatOpen(true);setChatInput(`Pour un poste de ${titre||'développeur'}, quelles compétences dois-je ajouter à mon CV ?`)}}
//                 style={{border:`1px solid ${ac}`,borderRadius:8,padding:'7px 14px',background:'transparent',color:ac,fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
//                 🤖 Suggestions de compétences IA
//               </button>
//             </div>
//           )}

//           {/* ── LANGUES ── */}
//           {section==='langs' && (
//             <div>
//               {langs.map((l,i)=>(
//                 <div className="card" key={l.id}>
//                   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
//                     <span style={{fontSize:12,fontWeight:600,color:'#4a4540'}}>Langue {i+1}</span>
//                     <button className="del-btn" onClick={()=>delLang(l.id)}>×</button>
//                   </div>
//                   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
//                     <div><label>Langue</label><input value={l.name} onChange={ev=>updLang(l.id,'name',ev.target.value)} placeholder="Anglais" /></div>
//                     <div>
//                       <label>Niveau</label>
//                       <select value={l.level} onChange={ev=>updLang(l.id,'level',ev.target.value)}>
//                         <option value="">— Choisir —</option>
//                         {LEVELS.map(o=><option key={o} value={o}>{o}</option>)}
//                       </select>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//               <button className="add-btn" onClick={addLang}>+ Ajouter une langue</button>
//             </div>
//           )}

//         </div>

//         {/* Generate footer */}
//         <div style={{padding:'12px 24px 16px',borderTop:'1px solid #e8e4df',flexShrink:0}}>
//           {error && <p style={{fontSize:12,color:'#c00',marginBottom:8}}>⚠ {error}</p>}
//           <button onClick={handleGenerate} disabled={loading}
//             style={{width:'100%',padding:12,border:'none',borderRadius:10,background:ac,color:'#fff',fontFamily:'inherit',fontSize:14,fontWeight:600,cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10,opacity:loading?.8:1,transition:'opacity .2s'}}>
//             {loading?<><span className="spinner"/>{generated?'Amélioration IA...':'Génération IA...'}</>:<>✨ {generated?'Régénérer':'Générer mon CV'}</>}
//           </button>
//         </div>
//       </div>

//       {/* ══════════ PREVIEW ══════════ */}
//       <div style={{background:'#e8e4df',display:'flex',flexDirection:'column',overflow:'hidden'}}>
//         <div style={{background:'#1a1714',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
//           <span style={{fontSize:11,color:'rgba(255,255,255,.4)',fontFamily:'monospace',letterSpacing:'.06em'}}>APERÇU · TEMPS RÉEL</span>
//           <div style={{display:'flex',gap:10,alignItems:'center'}}>
//             <Link href="/interview" style={{border:'1px solid rgba(255,255,255,.2)',borderRadius:6,padding:'5px 12px',background:'transparent',color:'rgba(255,255,255,.7)',fontSize:11,textDecoration:'none'}}>
//               🎤 Interview
//             </Link>
//             <button onClick={handlePdf} disabled={!generated||pdfLoad}
//               style={{border:'1px solid rgba(255,255,255,.25)',borderRadius:6,padding:'5px 12px',background:generated?'rgba(255,255,255,.1)':'transparent',color:generated?'#fff':'rgba(255,255,255,.3)',fontSize:11,cursor:generated?'pointer':'not-allowed',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
//               {pdfLoad?<><span className="spinner"/>PDF...</>:'↓ Télécharger PDF'}
//             </button>
//           </div>
//         </div>

//         <div style={{flex:1,overflowY:'auto',display:'flex',justifyContent:'center',padding:'20px 14px'}}>
//           <div id="cv-paper" style={{background:'#fff',width:595,minHeight:842,boxShadow:'0 4px 40px rgba(0,0,0,.25)',flexShrink:0}}>
//             {cvHtml
//               ? <div dangerouslySetInnerHTML={{__html:cvHtml}} />
//               : <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:842,color:'#ccc',fontSize:14,textAlign:'center',padding:40}}>
//                   <div style={{fontSize:48,marginBottom:14,opacity:.4}}>📄</div>
//                   <div>Remplis les champs à gauche<br/>puis clique sur <strong style={{color:ac}}>Générer mon CV</strong></div>
//                 </div>}
//           </div>
//         </div>
//       </div>

//       {/* ══════════ CHAT BUBBLE ══════════ */}

//       {/* Floating button */}
//       <button onClick={()=>setChatOpen(p=>!p)}
//         style={{position:'fixed',bottom:24,right:24,width:54,height:54,borderRadius:'50%',background:ac,border:'none',cursor:'pointer',boxShadow:`0 4px 20px ${ac}66`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,zIndex:1000,transition:'all .2s',transform:chatOpen?'rotate(0deg)':'rotate(0deg)'}}>
//         {chatOpen ? '✕' : '🤖'}
//       </button>

//       {/* Chat panel */}
//       {chatOpen && (
//         <div style={{position:'fixed',bottom:88,right:24,width:340,height:460,background:'#fff',borderRadius:16,boxShadow:'0 8px 40px rgba(0,0,0,.2)',display:'flex',flexDirection:'column',overflow:'hidden',zIndex:999,animation:'slideUp .25s ease'}}>

//           {/* Chat header */}
//           <div style={{background:ac,padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
//             <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>🤖</div>
//             <div>
//               <div style={{fontSize:14,fontWeight:600,color:'#fff'}}>Assistant CV IA</div>
//               <div style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>Aide à la rédaction · 24/7</div>
//             </div>
//           </div>

//           {/* Quick suggestions */}
//           <div style={{padding:'10px 12px 0',display:'flex',gap:6,flexWrap:'wrap',borderBottom:'1px solid #f0f0f0',paddingBottom:10}}>
//             {[
//               'Améliore mon résumé',
//               'Suggère des compétences',
//               'Améliore mes bullets',
//               'Conseil pour ce pays',
//             ].map(q=>(
//               <button key={q} className="quick-btn" onClick={()=>{ setChatInput(q); }}>
//                 {q}
//               </button>
//             ))}
//           </div>

//           {/* Messages */}
//           <div style={{flex:1,overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:10}}>
//             {chatMsgs.map((m,i)=>(
//               <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
//                 <div className={m.role==='ai'?'chat-bubble-ai':'chat-bubble-user'}>{m.text}</div>
//               </div>
//             ))}
//             {chatLoading && (
//               <div style={{display:'flex',justifyContent:'flex-start'}}>
//                 <div className="chat-bubble-ai" style={{display:'flex',alignItems:'center',gap:6}}>
//                   <span className="chat-spinner"/>
//                   <span style={{fontSize:12,color:'#888'}}>L'IA rédige...</span>
//                 </div>
//               </div>
//             )}
//             <div ref={chatEndRef} />
//           </div>

//           {/* Input */}
//           <div style={{padding:'10px 12px',borderTop:'1px solid #f0f0f0',display:'flex',gap:8}}>
//             <input
//               value={chatInput}
//               onChange={e=>setChatInput(e.target.value)}
//               onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){sendChat();e.preventDefault()}}}
//               placeholder="Pose ta question au coach CV..."
//               style={{flex:1,fontSize:13,padding:'9px 12px',borderRadius:20,border:'1px solid #e8e4df'}}
//             />
//             <button onClick={sendChat} disabled={chatLoading||!chatInput.trim()}
//               style={{width:36,height:36,borderRadius:'50%',background:chatInput.trim()&&!chatLoading?ac:'#e8e4df',border:'none',cursor:chatInput.trim()&&!chatLoading?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,transition:'background .15s',flexShrink:0}}>
//               →
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
