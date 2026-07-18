const router      = require('express').Router();
const auth        = require('../controllers/authMiddleware');
const Application = require('../models/Application');
const CV          = require('../models/CV');
const User        = require('../models/User');
const { generateCoverLetter } = require('../services/ai');
const { sendApplication }     = require('../services/email');

router.post('/generate', auth, async (req, res) => {
  try {
    const { job } = req.body;
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!cv) return res.status(404).json({ error: 'CV introuvable' });
    const coverLetter = await generateCoverLetter(cv.analysis, job);
    res.json({ coverLetter });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/send', auth, async (req, res) => {
  try {
    const { job, coverLetter, recipientEmail } = req.body;
    const user = req.user;

    // Vérifier limite
    if (user.applicationsUsed >= user.applicationsLimit) {
      return res.status(403).json({ error: 'Limite atteinte', upgradeRequired: true });
    }

    const cv  = await CV.findOne({ userId: user._id }).sort({ createdAt: -1 });
    const to  = recipientEmail || job.companyEmail;
    console.log("📧 EMAIL CHECK START");
console.log("to =", to);
console.log("companyEmail =", job.companyEmail);
console.log("recipientEmail =", recipientEmail);

    if (to) {
      await sendApplication({
        to, candidateName: user.name, candidateEmail: user.email,
        jobTitle: job.title, company: job.company, coverLetter,
        cvBuffer:   cv?.rawText ? Buffer.from(cv.rawText, 'utf-8') : null,
        cvFileName: `CV_${user.name.replace(/\s+/g,'_')}.txt`,
      });
    }

    await Application.create({ userId: user._id, job, matchScore: job.matchScore, coverLetter, status: 'sent', emailSentAt: new Date() });
    await User.findByIdAndUpdate(user._id, { $inc: { applicationsUsed: 1 } });

    res.json({
      message: to ? `Candidature envoyée à ${to}` : 'Candidature enregistrée',
      emailSent: !!to,
      remaining: user.applicationsLimit - user.applicationsUsed - 1,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    res.json(await Application.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
