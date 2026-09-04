const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'openai/gpt-oss-20b';

// ✅ Extrait le premier bloc JSON valide dans n'importe quelle réponse
function extractJSON(text) {
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Pas de JSON trouvé');
  return JSON.parse(text.slice(start, end + 1));
}

// ✅ Nettoie le texte PDF mal extrait (colonnes, caractères spéciaux)
function cleanCVText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

class ResumeAgent {

  async analyze(cvText) {
    console.log('🤖 Resume Agent: analyse CV...');
    console.log('📄 CV text length:', cvText.length);

    // ✅ Nettoyer et tronquer intelligemment (augmenté à 5000 chars)
    const cleaned = cleanCVText(cvText);
    const truncated = cleaned.slice(0, 5000);

    console.log('📄 Cleaned CV length:', truncated.length);
    console.log('📄 CV preview:', truncated.slice(0, 200));

    const res = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Tu es un expert RH. Analyse ce CV et extrait les informations.
Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre avant ou après.
Si une information n'est pas trouvée, mets une valeur vide ou un tableau vide.

CV:
${truncated}

Format JSON attendu (pur, sans texte autour):
{
  "skills": ["compétence1", "compétence2", "compétence3"],
  "experience": "junior ou mid-level ou senior",
  "education": "diplôme le plus élevé détecté",
  "languages": ["Français", "Anglais"],
  "jobTitles": ["Titre de poste 1", "Titre de poste 2", "Titre de poste 3"],
  "summary": "Résumé professionnel en 2 phrases basé sur le CV.",
  "atsScore": 75,
  "missingKeywords": ["mot-clé manquant 1", "mot-clé manquant 2"],
  "strengths": ["point fort 1", "point fort 2"],
  "improvements": ["amélioration 1", "amélioration 2"]
}`
      }],
    });

    const raw = res.choices[0].message.content;
    console.log('📄 Resume Agent raw response (200 chars):', raw.slice(0, 200));

    try {
      const parsed = extractJSON(raw);
      console.log('✅ Resume Agent parsed skills:', parsed.skills?.length, '| jobTitles:', parsed.jobTitles?.length);
      return parsed;
    } catch (e) {
      console.error('❌ Resume Agent parse error:', e.message);
      console.error('Raw response:', raw.slice(0, 500));

      // ✅ Fallback: essayer de déduire manuellement depuis le texte
      return {
        skills: [],
        experience: truncated.toLowerCase().includes('master') || truncated.toLowerCase().includes('senior') ? 'mid-level' : 'junior',
        education: '',
        languages: [],
        jobTitles: [],
        summary: '',
        atsScore: 60,
        missingKeywords: [],
        strengths: [],
        improvements: []
      };
    }
  }

  async calculateATS(cvText, jobDescription) {
    const cleaned = cleanCVText(cvText);
    const res = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Compare ce CV avec cette offre. Réponds UNIQUEMENT en JSON pur, sans texte avant ou après.

CV: ${cleaned.slice(0, 1000)}
Offre: ${jobDescription.slice(0, 600)}

JSON:
{"atsScore": 85, "matchedKeywords": ["Python"], "missingKeywords": ["Docker"], "recommendation": "conseil court"}`
      }],
    });

    try {
      return extractJSON(res.choices[0].message.content);
    } catch {
      return { atsScore: 65, matchedKeywords: [], missingKeywords: [], recommendation: '' };
    }
  }
}

module.exports = new ResumeAgent();


// const Groq = require('groq-sdk');
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// const MODEL = 'openai/gpt-oss-20b';

// // ✅ Extrait le premier bloc JSON valide dans n'importe quelle réponse
// function extractJSON(text) {
//   // Enlève les backticks
//   text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
//   // Cherche le premier { ... } valide
//   const start = text.indexOf('{');
//   const end   = text.lastIndexOf('}');
  
//   if (start === -1 || end === -1) throw new Error('Pas de JSON trouvé');
  
//   return JSON.parse(text.slice(start, end + 1));
// }

// class ResumeAgent {

//   async analyze(cvText) {
//     console.log('🤖 Resume Agent: analyse CV...');
    
//     const res = await groq.chat.completions.create({
//       model: MODEL,
//       temperature: 0.1,
//       max_tokens: 1200,
//       messages: [{
//         role: 'user',
//         content: `Tu es un expert RH. Analyse ce CV.
// Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre avant ou après.

// CV:
// ${cvText.slice(0, 3500)}

// Format de réponse (JSON pur, pas de texte autour):
// {
//   "skills": ["compétence1", "compétence2"],
//   "experience": "junior ou senior ou mid-level",
//   "education": "diplôme détecté",
//   "languages": ["Français", "Anglais"],
//   "jobTitles": ["Titre 1", "Titre 2", "Titre 3"],
//   "summary": "Résumé en 2 phrases.",
//   "atsScore": 78,
//   "missingKeywords": ["mot-clé manquant"],
//   "strengths": ["point fort 1"],
//   "improvements": ["amélioration 1"]
// }`
//       }],
//     });

//     const raw = res.choices[0].message.content;
//     console.log('📄 Resume Agent raw response:', raw.slice(0, 200));

//     try {
//       const parsed = extractJSON(raw);
//       console.log('✅ Resume Agent parsed:', JSON.stringify(parsed).slice(0, 150));
//       return parsed;
//     } catch (e) {
//       console.error('❌ Resume Agent parse error:', e.message);
//       console.error('Raw was:', raw);
//       // Fallback: retourner des données basiques plutôt que vide
//       return {
//         skills: [],
//         experience: 'junior',
//         education: '',
//         languages: [],
//         jobTitles: [],
//         summary: '',
//         atsScore: 60,
//         missingKeywords: [],
//         strengths: [],
//         improvements: []
//       };
//     }
//   }

//   async calculateATS(cvText, jobDescription) {
//     const res = await groq.chat.completions.create({
//       model: MODEL,
//       temperature: 0.1,
//       max_tokens: 400,
//       messages: [{
//         role: 'user',
//         content: `Compare ce CV avec cette offre. Réponds UNIQUEMENT en JSON pur.

// CV: ${cvText.slice(0, 800)}
// Offre: ${jobDescription.slice(0, 600)}

// JSON:
// {"atsScore": 85, "matchedKeywords": ["Python"], "missingKeywords": ["Docker"], "recommendation": "conseil"}`
//       }],
//     });

//     try {
//       return extractJSON(res.choices[0].message.content);
//     } catch {
//       return { atsScore: 65, matchedKeywords: [], missingKeywords: [], recommendation: '' };
//     }
//   }
// }

// module.exports = new ResumeAgent();






// const Groq = require('groq-sdk');
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// const MODEL = 'openai/gpt-oss-20b';

// function clean(text) {
//   return text.replace(/```json/g, '').replace(/```/g, '').trim();
// }

// class ResumeAgent {
//   // Analyser le CV et extraire le profil complet
//   async analyze(cvText) {
//     console.log('🤖 Resume Agent: analyse CV...');
//     const res = await groq.chat.completions.create({
//       model: MODEL, temperature: 0.1, max_tokens: 1200,
//       messages: [{ role: 'user', content: `Tu es un expert RH. Analyse ce CV et réponds UNIQUEMENT en JSON valide sans backticks.

// CV:
// ${cvText.slice(0, 3500)}

// JSON attendu:
// {
//   "skills": ["compétence1", "compétence2"],
//   "experience": "junior",
//   "education": "Master en Informatique",
//   "languages": ["Français", "Anglais"],
//   "jobTitles": ["Développeur IA", "Data Scientist"],
//   "summary": "Résumé professionnel en 2 phrases.",
//   "atsScore": 78,
//   "missingKeywords": ["Docker", "Kubernetes"],
//   "strengths": ["Fort en Python", "Expérience IoT"],
//   "improvements": ["Ajouter des métriques chiffrées", "Préciser les projets"]
// }` }],
//     });
//     try {
//       return JSON.parse(clean(res.choices[0].message.content));
//     } catch {
//       return { skills: [], experience: 'junior', education: '', languages: [], jobTitles: [], summary: '', atsScore: 60, missingKeywords: [], strengths: [], improvements: [] };
//     }
//   }

//   // Calculer score ATS
//   async calculateATS(cvText, jobDescription) {
//     const res = await groq.chat.completions.create({
//       model: MODEL, temperature: 0.1, max_tokens: 400,
//       messages: [{ role: 'user', content: `Compare ce CV avec cette offre. JSON uniquement.

// CV (extrait): ${cvText.slice(0, 800)}
// Offre: ${jobDescription.slice(0, 600)}

// JSON:
// {"atsScore": 85, "matchedKeywords": ["Python", "ML"], "missingKeywords": ["Docker"], "recommendation": "Conseil court"}` }],
//     });
//     try { return JSON.parse(clean(res.choices[0].message.content)); }
//     catch { return { atsScore: 65, matchedKeywords: [], missingKeywords: [], recommendation: '' }; }
//   }
// }

// module.exports = new ResumeAgent();
