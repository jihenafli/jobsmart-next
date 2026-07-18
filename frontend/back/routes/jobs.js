const router = require('express').Router();
const auth   = require('../controllers/authMiddleware');
const CV     = require('../models/CV');
const { searchJobs }                               = require('../services/jobSearch');
const { calculateMatchScore, findCompanyEmail }    = require('../services/ai');

router.post('/search', auth, async (req, res) => {
  try {
    const { country = 'TN' } = req.body;

    // Récupérer le CV
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!cv) return res.status(404).json({ error: 'Upload ton CV d\'abord' });

    // Extraire les titres depuis le CV (IA l'a déjà analysé)
    const jobTitles = cv.analysis?.jobTitles?.slice(0, 3) || ['Développeur'];
    console.log(`🎯 Profil détecté: ${jobTitles.join(', ')} | Pays: ${country}`);

    // Chercher les vraies offres via JSearch API
    const rawJobs = await searchJobs(jobTitles, country);

    if (rawJobs.length === 0) {
      return res.json({ total: 0, jobs: [], message: 'Aucune offre trouvée. Vérifie ta clé JSEARCH_API_KEY.' });
    }

    // Calculer score IA + trouver email pour chaque offre
    const scoredJobs = await Promise.all(
      rawJobs.map(async (job) => {
        // Score matching
        let matchScore = 60, matchReasons = [], missingSkills = [];
        try {
          const m = await calculateMatchScore(cv.analysis, job.title, job.description);
          matchScore   = m.score || 60;
          matchReasons = m.reasons || [];
          missingSkills = m.missing || [];
        } catch { /* garder défaut */ }

        // Email entreprise
        let companyEmail = job.companyEmail;
        if (!companyEmail && job.company) {
          try {
            const e = await findCompanyEmail(job.company);
            companyEmail = e.email;
          } catch { /* pas d'email */ }
        }

        return { ...job, matchScore, matchReasons, missingSkills, companyEmail };
      })
    );

    // Trier par score et filtrer >= 50
    const result = scoredJobs
      .filter(j => j.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 15);

    res.json({ total: result.length, jobs: result });
  } catch (e) {
    console.error('Erreur recherche:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
