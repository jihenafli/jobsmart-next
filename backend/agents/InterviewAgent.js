const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';
function clean(t) { return t.replace(/```json/g,'').replace(/```/g,'').trim(); }

class InterviewAgent {
  // Générer questions d'entretien
  async generateQuestions(cvAnalysis, job, type = 'mixed') {
    console.log(`🤖 Interview Agent: génère questions ${type}...`);
    const res = await groq.chat.completions.create({
      model: MODEL, temperature: 0.6, max_tokens: 800,
      messages: [{ role: 'user', content: `Génère des questions d'entretien. JSON uniquement.

Profil: ${cvAnalysis.skills?.slice(0,6).join(', ')} | ${cvAnalysis.experience}
Poste: ${job?.title || 'Développeur'} chez ${job?.company || 'Entreprise'}
Type: ${type} (mixed = RH + technique, technical = technique uniquement, hr = RH uniquement)

JSON:
{
  "questions": [
    {"id": 1, "type": "hr", "question": "Parlez-moi de vous", "hint": "Conseil pour répondre", "difficulty": "easy"},
    {"id": 2, "type": "technical", "question": "Question technique", "hint": "Éléments clés à mentionner", "difficulty": "medium"}
  ]
}
Génère exactement 5 questions pertinentes.` }],
    });
    try { return JSON.parse(clean(res.choices[0].message.content)); }
    catch { return { questions: [{ id: 1, type: 'hr', question: 'Parlez-moi de votre parcours', hint: 'Soyez concis et pertinent', difficulty: 'easy' }] }; }
  }

  // Évaluer une réponse
  async evaluateAnswer(question, answer, cvAnalysis) {
    const res = await groq.chat.completions.create({
      model: MODEL, temperature: 0.3, max_tokens: 500,
      messages: [{ role: 'user', content: `Évalue cette réponse d'entretien. JSON uniquement.

Question: ${question}
Réponse du candidat: ${answer}
Profil candidat: ${cvAnalysis.experience} | ${cvAnalysis.skills?.slice(0,5).join(', ')}

JSON:
{
  "score": 80,
  "feedback": "Feedback constructif en 2-3 phrases",
  "strengths": ["Point fort 1"],
  "improvements": ["À améliorer 1"],
  "betterAnswer": "Exemple de meilleure réponse courte"
}` }],
    });
    try { return JSON.parse(clean(res.choices[0].message.content)); }
    catch { return { score: 70, feedback: 'Bonne réponse dans l\'ensemble', strengths: [], improvements: [], betterAnswer: '' }; }
  }

  // Score final de l'entretien
  async finalScore(answers) {
    const avg = answers.reduce((s, a) => s + (a.score || 70), 0) / (answers.length || 1);
    return {
      globalScore: Math.round(avg),
      level: avg >= 80 ? 'Excellent' : avg >= 65 ? 'Bien' : 'À améliorer',
      recommendation: avg >= 75 ? 'Prêt pour les entretiens réels !' : 'Continue à t\'entraîner',
    };
  }
}

module.exports = new InterviewAgent();
