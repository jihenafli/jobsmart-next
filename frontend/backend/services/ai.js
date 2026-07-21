const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

function clean(text) {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

// ── Analyser le CV ──
async function analyzeCV(cvText) {
  const res = await groq.chat.completions.create({
    model: MODEL, temperature: 0.1, max_tokens: 1000,
    messages: [{ role: 'user', content: `Analyse ce CV. JSON uniquement, sans backticks ni texte avant/après.

CV:
${cvText.slice(0, 3000)}

Format:
{
  "skills": ["compétence1","compétence2"],
  "experience": "junior",
  "education": "Master",
  "languages": ["Français","Anglais"],
  "jobTitles": ["Titre1","Titre2","Titre3"],
  "summary": "Résumé 2 phrases."
}` }],
  });
  return JSON.parse(clean(res.choices[0].message.content));
}

// ── Score matching ──
async function calculateMatchScore(cvAnalysis, jobTitle, jobDescription) {
  const res = await groq.chat.completions.create({
    model: MODEL, temperature: 0.1, max_tokens: 300,
    messages: [{ role: 'user', content: `Calcule le score de compatibilité. JSON uniquement.

Profil: ${cvAnalysis.skills?.slice(0,8).join(',')} | ${cvAnalysis.experience} | ${cvAnalysis.education}
Poste: ${jobTitle} - ${jobDescription?.slice(0, 300)}

JSON:
{"score":85,"reasons":["raison courte"],"missing":["manque"]}` }],
  });
  try { return JSON.parse(clean(res.choices[0].message.content)); }
  catch { return { score: 65, reasons: ['Profil compatible'], missing: [] }; }
}

// ── Lettre de motivation ──
async function generateCoverLetter(cvAnalysis, job) {
  const res = await groq.chat.completions.create({
    model: MODEL, temperature: 0.7, max_tokens: 900,
    messages: [{ role: 'user', content: `Lettre de motivation professionnelle en français.

CANDIDAT: ${cvAnalysis.summary} | Compétences: ${cvAnalysis.skills?.slice(0,8).join(', ')} | Niveau: ${cvAnalysis.experience} | Formation: ${cvAnalysis.education}

POSTE: ${job.title} chez ${job.company} (${job.location})

Règles: commence par "Madame, Monsieur,", 3 paragraphes, personnalisée pour ${job.company}, cite des compétences spécifiques, naturelle et professionnelle, pas de balises HTML.` }],
  });
  return res.choices[0].message.content.trim();
}

// ── Trouver email entreprise ──
async function findCompanyEmail(companyName) {
  const res = await groq.chat.completions.create({
    model: MODEL, temperature: 0.1, max_tokens: 150,
    messages: [{ role: 'user', content: `Email RH/recrutement pour: ${companyName}
JSON uniquement: {"email":"rh@example.com","confidence":"high"}
Si tu ne connais pas exactement, génère un email plausible basé sur le domaine de la société.` }],
  });
  try { return JSON.parse(clean(res.choices[0].message.content)); }
  catch {
    const domain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    return { email: `recrutement@${domain}.com`, confidence: 'low' };
  }
}

module.exports = { analyzeCV, calculateMatchScore, generateCoverLetter, findCompanyEmail };
