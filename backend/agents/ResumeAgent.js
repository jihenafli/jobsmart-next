const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

function clean(text) {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

class ResumeAgent {
  // Analyser le CV et extraire le profil complet
  async analyze(cvText) {
    console.log('🤖 Resume Agent: analyse CV...');
    const res = await groq.chat.completions.create({
      model: MODEL, temperature: 0.1, max_tokens: 1200,
      messages: [{ role: 'user', content: `Tu es un expert RH. Analyse ce CV et réponds UNIQUEMENT en JSON valide sans backticks.

CV:
${cvText.slice(0, 3500)}

JSON attendu:
{
  "skills": ["compétence1", "compétence2"],
  "experience": "junior",
  "education": "Master en Informatique",
  "languages": ["Français", "Anglais"],
  "jobTitles": ["Développeur IA", "Data Scientist"],
  "summary": "Résumé professionnel en 2 phrases.",
  "atsScore": 78,
  "missingKeywords": ["Docker", "Kubernetes"],
  "strengths": ["Fort en Python", "Expérience IoT"],
  "improvements": ["Ajouter des métriques chiffrées", "Préciser les projets"]
}` }],
    });
    try {
      return JSON.parse(clean(res.choices[0].message.content));
    } catch {
      return { skills: [], experience: 'junior', education: '', languages: [], jobTitles: [], summary: '', atsScore: 60, missingKeywords: [], strengths: [], improvements: [] };
    }
  }

  // Calculer score ATS
  async calculateATS(cvText, jobDescription) {
    const res = await groq.chat.completions.create({
      model: MODEL, temperature: 0.1, max_tokens: 400,
      messages: [{ role: 'user', content: `Compare ce CV avec cette offre. JSON uniquement.

CV (extrait): ${cvText.slice(0, 800)}
Offre: ${jobDescription.slice(0, 600)}

JSON:
{"atsScore": 85, "matchedKeywords": ["Python", "ML"], "missingKeywords": ["Docker"], "recommendation": "Conseil court"}` }],
    });
    try { return JSON.parse(clean(res.choices[0].message.content)); }
    catch { return { atsScore: 65, matchedKeywords: [], missingKeywords: [], recommendation: '' }; }
  }
}

module.exports = new ResumeAgent();
