const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';
function clean(t) { return t.replace(/```json/g,'').replace(/```/g,'').trim(); }

class CoachAgent {
  // Générer plan de carrière personnalisé
  async generateCareerPlan(cvAnalysis, targetRole) {
    console.log(`🤖 Coach Agent: génère plan de carrière...`);
    const res = await groq.chat.completions.create({
      model: MODEL, temperature: 0.6, max_tokens: 1000,
      messages: [{ role: 'user', content: `Tu es un coach de carrière expert. Génère un plan personnalisé. JSON uniquement.

Profil:
- Compétences: ${cvAnalysis.skills?.join(', ')}
- Niveau: ${cvAnalysis.experience}
- Formation: ${cvAnalysis.education}
- Compétences manquantes: ${cvAnalysis.missingKeywords?.join(', ') || 'Non identifiées'}
- Objectif: ${targetRole || 'Évoluer dans son domaine'}

JSON:
{
  "currentLevel": "Description du niveau actuel",
  "targetRole": "Rôle cible recommandé",
  "timeline": "6-12 mois",
  "steps": [
    {"order": 1, "action": "Action concrète", "duration": "1 mois", "resources": ["Ressource 1"]}
  ],
  "certifications": ["Certification 1", "Certification 2"],
  "technologiesToLearn": ["Tech 1", "Tech 2"],
  "salaryExpectation": "Fourchette salariale réaliste",
  "tips": ["Conseil pratique 1", "Conseil pratique 2"]
}` }],
    });
    try { return JSON.parse(clean(res.choices[0].message.content)); }
    catch { return { currentLevel: 'Profil analysé', targetRole: 'Senior Developer', timeline: '12 mois', steps: [], certifications: [], technologiesToLearn: [], salaryExpectation: 'À définir', tips: [] }; }
  }

  // Analyser les candidatures et donner des conseils
  async analyzeApplications(applications) {
    if (!applications?.length) return { insights: ['Commence par envoyer des candidatures'], suggestions: [] };
    const summary = applications.slice(0, 10).map(a => `${a.job?.title} chez ${a.job?.company}: ${a.status}`).join('\n');
    const res = await groq.chat.completions.create({
      model: MODEL, temperature: 0.5, max_tokens: 500,
      messages: [{ role: 'user', content: `Analyse ces candidatures et donne des conseils. JSON uniquement.

Candidatures:
${summary}

JSON: {"insights": ["Insight 1"], "suggestions": ["Suggestion 1"], "successRate": 25}` }],
    });
    try { return JSON.parse(clean(res.choices[0].message.content)); }
    catch { return { insights: ['Continue à postuler régulièrement'], suggestions: ['Personnalise chaque lettre'], successRate: 0 }; }
  }
}

module.exports = new CoachAgent();
