const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';
function clean(t) { return t.replace(/```json/g,'').replace(/```/g,'').trim(); }

class ApplyAgent {
  // Générer lettre de motivation personnalisée
  async generateLetter(cvAnalysis, job) {
    console.log(`🤖 Apply Agent: génère lettre pour ${job.company}...`);
    const res = await groq.chat.completions.create({
      model: MODEL, temperature: 0.75, max_tokens: 900,
      messages: [{ role: 'user', content: `Tu es un expert en recrutement. Génère une lettre de motivation professionnelle en français.

PROFIL CANDIDAT:
- Résumé: ${cvAnalysis.summary}
- Compétences clés: ${cvAnalysis.skills?.slice(0,10).join(', ')}
- Niveau: ${cvAnalysis.experience}
- Formation: ${cvAnalysis.education}
- Langues: ${cvAnalysis.languages?.join(', ')}
- Points forts: ${cvAnalysis.strengths?.join(', ') || ''}

POSTE VISÉ:
- Titre: ${job.title}
- Entreprise: ${job.company}
- Lieu: ${job.location}
- Description: ${job.description?.slice(0, 400)}

RÈGLES STRICTES:
1. Commence DIRECTEMENT par "Madame, Monsieur,"
2. 3 paragraphes maximum
3. Cite SPÉCIFIQUEMENT des compétences du candidat liées au poste
4. Mentionne ${job.company} dans le 2ème paragraphe
5. Termine par une formule de politesse professionnelle
6. AUCUNE balise HTML ou markdown
7. Naturelle et convaincante, pas générique` }],
    });
    return res.choices[0].message.content.trim();
  }

  // Générer email de candidature
  async generateEmail(cvAnalysis, job, coverLetter) {
    const res = await groq.chat.completions.create({
      model: MODEL, temperature: 0.5, max_tokens: 400,
      messages: [{ role: 'user', content: `Génère un email court d'accompagnement pour cette candidature. JSON uniquement.

Candidat: ${cvAnalysis.summary}
Poste: ${job.title} chez ${job.company}

JSON: {"subject": "Candidature — [Titre] chez [Entreprise]", "body": "Corps court de l'email 3-4 lignes"}` }],
    });
    try {
      return JSON.parse(clean(res.choices[0].message.content));
    } catch {
      return {
        subject: `Candidature — ${job.title} chez ${job.company}`,
        body: `Madame, Monsieur,\n\nVeuillez trouver ci-joint ma candidature pour le poste de ${job.title}.\n\nCordialement`,
      };
    }
  }
}

module.exports = new ApplyAgent();
