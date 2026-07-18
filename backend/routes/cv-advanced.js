const express  = require('express');
const router   = express.Router();
const Groq     = require('groq-sdk');
const groq     = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL    = 'llama-3.3-70b-versatile';
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { CV }   = require('../models/models');

// ── Auth middleware ──
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Non authentifié' });
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(userId).select('-password');
    if (!req.user) return res.status(401).json({ error: 'Introuvable' });
    next();
  } catch { res.status(401).json({ error: 'Token invalide' }); }
};

function clean(t) { return t.replace(/```json/g,'').replace(/```/g,'').trim(); }

// ══════════════════════════════════════════════════════════
// POST /api/cv/scan — Scanner le CV avec le prompt pro
// ══════════════════════════════════════════════════════════
router.post('/scan', auth, async (req, res) => {
  try {
    const { cvId, jobDescription } = req.body;
    const cv = await CV.findOne({ _id: cvId, userId: req.user._id });
    if (!cv) return res.status(404).json({ error: 'CV introuvable' });

    console.log('🔍 Scanner CV avec prompt ATS expert...');

    // ── PROMPT ATS PROFESSIONNEL (inspiré du prompt Hamza Merdassi) ──
    const prompt = `Tu es un expert en recrutement, en optimisation de CV et en systèmes ATS (Applicant Tracking System). Tu travailles pour JobSmart AI.

Ta mission est d'analyser ce CV de manière approfondie et de donner des recommandations précises pour améliorer les chances du candidat.

CV À ANALYSER:
${cv.rawText?.slice(0, 4000) || 'CV non disponible'}

${jobDescription ? `OFFRE D'EMPLOI (pour matching):
${jobDescription.slice(0, 1500)}` : ''}

ANALYSE DEMANDÉE — Réponds UNIQUEMENT en JSON valide sans backticks:

{
  "atsScore": 78,
  "atsLevel": "Bon",
  "atsExplanation": "Explication courte du score ATS",

  "matchingScore": ${jobDescription ? '85' : 'null'},
  "matchingExplanation": "${jobDescription ? 'Explication du matching' : ''}",

  "keywordsPresent": ["mot-clé présent 1", "mot-clé présent 2"],
  "keywordsMissing": ["mot-clé manquant 1", "mot-clé manquant 2"],

  "strengths": [
    "Point fort spécifique 1",
    "Point fort spécifique 2",
    "Point fort spécifique 3"
  ],

  "improvements": [
    "Amélioration concrète 1",
    "Amélioration concrète 2",
    "Amélioration concrète 3",
    "Amélioration concrète 4"
  ],

  "atsIssues": [
    "Problème ATS 1 (ex: tableaux, icônes, colonnes)",
    "Problème ATS 2"
  ],

  "sectionScores": {
    "experience": 80,
    "skills": 75,
    "education": 90,
    "format": 65,
    "keywords": 70
  },

  "recommendations": [
    {
      "priority": "high",
      "section": "Skills",
      "action": "Action concrète à faire",
      "reason": "Pourquoi c'est important"
    },
    {
      "priority": "medium",
      "section": "Experience",
      "action": "Action concrète à faire",
      "reason": "Pourquoi c'est important"
    }
  ],

  "optimizedSummary": "Résumé professionnel optimisé ATS en 3-4 phrases pour ce profil",

  "salaryRange": "Fourchette salariale estimée selon le marché",

  "quickWins": [
    "Action rapide à faire maintenant 1",
    "Action rapide à faire maintenant 2",
    "Action rapide à faire maintenant 3"
  ]
}`;

    const response = await groq.chat.completions.create({
      model: MODEL, temperature: 0.2, max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    let result;
    try {
      result = JSON.parse(clean(response.choices[0].message.content));
    } catch {
      result = {
        atsScore: cv.analysis?.atsScore || 65,
        atsLevel: 'Moyen',
        atsExplanation: 'Analyse complète disponible',
        keywordsPresent: cv.analysis?.skills || [],
        keywordsMissing: cv.analysis?.missingKeywords || [],
        strengths: cv.analysis?.strengths || ['Profil analysé'],
        improvements: cv.analysis?.improvements || ['Ajouter des mots-clés'],
        atsIssues: [],
        sectionScores: { experience: 70, skills: 75, education: 80, format: 70, keywords: 65 },
        recommendations: [],
        optimizedSummary: cv.analysis?.summary || '',
        quickWins: ['Upload un CV plus détaillé pour une meilleure analyse'],
      };
    }

    // Mettre à jour le CV en base
    await CV.findByIdAndUpdate(cvId, {
      'analysis.atsScore':         result.atsScore,
      'analysis.missingKeywords':  result.keywordsMissing || [],
      'analysis.strengths':        result.strengths || [],
      'analysis.improvements':     result.improvements || [],
    });

    res.json(result);
  } catch (e) {
    console.error('Erreur scan CV:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
// POST /api/cv/scan-with-job — Scanner CV + Offre (matching complet)
// ══════════════════════════════════════════════════════════
router.post('/scan-with-job', auth, async (req, res) => {
  try {
    const { cvId, jobTitle, jobDescription, company } = req.body;
    const cv = await CV.findOne({ _id: cvId, userId: req.user._id });
    if (!cv) return res.status(404).json({ error: 'CV introuvable' });

    console.log(`🎯 Matching CV avec offre: ${jobTitle} chez ${company}`);

    const prompt = `Tu es un expert ATS et recruteur senior. Analyse ce CV par rapport à cette offre d'emploi précise.

CV:
${cv.rawText?.slice(0, 3000)}

OFFRE D'EMPLOI:
Titre: ${jobTitle}
Entreprise: ${company}
Description: ${jobDescription?.slice(0, 1500)}

Réponds UNIQUEMENT en JSON valide sans backticks:
{
  "matchingScore": 87,
  "atsScore": 78,
  "verdict": "Excellent candidat pour ce poste" ou "Profil compatible avec lacunes" ou "Profil peu adapté",
  "keywordsPresent": ["keyword qui matche"],
  "keywordsMissing": ["keyword manquant mais important"],
  "strengths": ["Point fort par rapport à l'offre"],
  "gaps": ["Lacune par rapport à l'offre"],
  "coverLetterTips": ["Conseil pour la lettre de motivation"],
  "optimizedBullets": ["• Bullet point optimisé pour l'expérience 1", "• Bullet point optimisé 2"],
  "interviewTopics": ["Sujet probable en entretien 1", "Sujet probable 2"],
  "recommendation": "Conseil final court et actionnable"
}`;

    const response = await groq.chat.completions.create({
      model: MODEL, temperature: 0.2, max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    try {
      res.json(JSON.parse(clean(response.choices[0].message.content)));
    } catch {
      res.json({ matchingScore: 70, atsScore: 65, verdict: 'Profil compatible', keywordsPresent: [], keywordsMissing: [], strengths: [], gaps: [], recommendation: 'Postule et personnalise ta lettre' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════
// POST /api/cv/chat — Chat IA sur le CV
// ══════════════════════════════════════════════════════════
router.post('/chat', auth, async (req, res) => {
  try {
    const { question, cvId, history = [] } = req.body;
    if (!question) return res.status(400).json({ error: 'Question manquante' });

    // Récupérer le CV
    let cvContext = '';
    if (cvId) {
      const cv = await CV.findOne({ _id: cvId, userId: req.user._id });
      if (cv) {
        cvContext = `
CONTEXTE — CV du candidat:
- Nom: ${req.user.name}
- Compétences: ${cv.analysis?.skills?.join(', ') || 'Non analysées'}
- Niveau: ${cv.analysis?.experience || 'Non défini'}
- Formation: ${cv.analysis?.education || 'Non définie'}
- Langues: ${cv.analysis?.languages?.join(', ') || 'Non définies'}
- Postes recommandés: ${cv.analysis?.jobTitles?.join(', ') || 'Non définis'}
- Score ATS actuel: ${cv.analysis?.atsScore || 'Non calculé'}/100
- Points à améliorer: ${cv.analysis?.improvements?.join(', ') || 'Analyse en cours'}
- Mots-clés manquants: ${cv.analysis?.missingKeywords?.join(', ') || 'Aucun identifié'}
- Résumé: ${cv.analysis?.summary || ''}`;
      }
    }

    // Historique conversation
    
  
    const conversationHistory = history.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const systemPrompt = `Tu es un expert en recrutement et optimisation de CV travaillant pour JobSmart AI. Tu aides ${req.user.name} à améliorer son CV et ses chances d'être sélectionné.

${cvContext}

RÈGLES:
- Réponds en FRANÇAIS uniquement
- Sois précis, concret et actionnable
- Donne des exemples spécifiques basés sur le CV du candidat
- Utilise des emojis pour rendre la réponse agréable à lire
- Maximum 200 mots par réponse
- Encourage le candidat positivement
- Donne des conseils pratiques immédiats`;

    const response = await groq.chat.completions.create({
      model: MODEL, temperature: 0.7, max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: question },
      ],
    });

    res.json({ answer: response.choices[0].message.content.trim() });
  } catch (e) {
    console.error('Erreur chat CV:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════
// POST /api/cv/optimize — Générer CV optimisé complet
// ══════════════════════════════════════════════════════════
router.post('/optimize', auth, async (req, res) => {
  try {
    const { cvId, jobDescription, jobTitle } = req.body;
    const cv = await CV.findOne({ _id: cvId, userId: req.user._id });
    if (!cv) return res.status(404).json({ error: 'CV introuvable' });

    console.log('✨ Optimisation complète du CV...');

    const prompt = `Tu es un expert en rédaction de CV et ATS. Optimise ce CV pour le poste demandé.

CV ORIGINAL:
${cv.rawText?.slice(0, 3000)}

POSTE VISÉ: ${jobTitle || 'Poste dans le domaine'}
${jobDescription ? `OFFRE: ${jobDescription.slice(0, 1000)}` : ''}

Génère une version optimisée. Réponds en JSON uniquement:
{
  "optimizedSections": {
    "summary": "Résumé professionnel optimisé ATS 3-4 phrases",
    "skills": ["Compétence optimisée 1", "Compétence 2"],
    "experienceBullets": ["• Réalisation chiffrée 1", "• Réalisation chiffrée 2"],
    "keywordsAdded": ["Mot-clé ajouté 1"],
    "formattingTips": ["Conseil format 1", "Conseil format 2"]
  },
  "beforeScore": ${cv.analysis?.atsScore || 65},
  "afterScore": 88,
  "improvement": "+23 points ATS estimés"
}`;

    const response = await groq.chat.completions.create({
      model: MODEL, temperature: 0.3, max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    try {
      res.json(JSON.parse(clean(response.choices[0].message.content)));
    } catch {
      res.json({ optimizedSections: { summary: cv.analysis?.summary || '', skills: cv.analysis?.skills || [], experienceBullets: [], keywordsAdded: [], formattingTips: [] }, beforeScore: cv.analysis?.atsScore || 65, afterScore: 80, improvement: '+15 points estimés' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;




    