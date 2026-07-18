// ============================================
// ROUTES — JobSmart AI OS v4 (CLEAN VERSION)
// ============================================

const express = require('express');
const multer  = require('multer');
const pdfParse = require('pdf-parse');
const jwt     = require('jsonwebtoken');

const User = require('../models/User');
const { CV, Application } = require('../models/models');

const ResumeAgent    = require('../agents/ResumeAgent');
const HunterAgent    = require('../agents/HunterAgent');
const ApplyAgent     = require('../agents/ApplyAgent');
const EmailAgent     = require('../agents/EmailAgent');
const CoachAgent     = require('../agents/CoachAgent');
const InterviewAgent = require('../agents/InterviewAgent');


// ============================================
// PLAN SYSTEM (SaaS LEVELS)
// ============================================

const PLAN_LEVEL = {
  free: 0,
  basic: 1,
  pro: 2,
  premium: 3
};


// ============================================
// STRIPE PLANS (pricing only)
// ============================================

const STRIPE_PLANS = {
  basic_month:   { price: 1000, level: 'basic', months: 1 },
  basic_year:    { price: 9600, level: 'basic', months: 12 },
  pro_month:     { price: 2500, level: 'pro', months: 1 },
  pro_year:      { price: 24000, level: 'pro', months: 12 },
  premium_month: { price: 5000, level: 'premium', months: 1 },
  premium_year:  { price: 48000, level: 'premium', months: 12 },
};


// ============================================
// AUTH MIDDLEWARE
// ============================================

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Non authentifié' });

    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(userId).select('-password');

    if (!req.user) return res.status(401).json({ error: 'Introuvable' });

    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
};


// ============================================
// HELPERS
// ============================================

const sign = id =>
  jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const fmt = u => ({
  id: u._id,
  name: u.name,
  email: u.email,
  plan: u.plan,
  country: u.country,
  level: u.level,
  domain: u.domain,
  applicationsUsed: u.applicationsUsed,
  applicationsLimit: u.applicationsLimit
});


// ============================================
// MULTER CONFIG
// ============================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('PDF uniquement'))
});


// ============================================
// ROUTERS
// ============================================

const authRouter = express.Router();

const cvRouter = express.Router();
const jobsRouter = express.Router();
const appRouter = express.Router();
const payRouter = express.Router();


// ============================================
// AUTH
// ============================================

authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, password, country, level, domain } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Champs manquants' });

    if (await User.findOne({ email }))
      return res.status(400).json({ error: 'Email déjà utilisé' });

    const user = await User.create({
      name,
      email,
      password,
      country: country || 'TN',
      level: level || 'junior',
      domain: domain || ''
    });

    EmailAgent.sendWelcome({ to: email, name }).catch(console.error);

    res.status(201).json({
      token: sign(user._id),
      user: fmt(user)
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    res.json({
      token: sign(user._id),
      user: fmt(user)
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


authRouter.get('/me', auth, (req, res) => {
  res.json({ user: fmt(req.user) });
});
// ============================================
// UPDATE ACCOUNT (PLAN + LIMIT)
// ============================================

authRouter.put('/update-account', auth, async (req, res) => {
  try {

    const { plan, applicationsLimit } = req.body;

    const allowedPlans = ["free", "basic", "pro", "premium"];

    if (plan && !allowedPlans.includes(plan)) {
      return res.status(400).json({
        error: "Plan invalide"
      });
    }

    const updateData = {};

    if (plan) {
      updateData.plan = plan;
    }

    if (applicationsLimit !== undefined) {
      updateData.applicationsLimit = applicationsLimit;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    );

    res.json({
      message: "Compte mis à jour",
      user: fmt(user)
    });

  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});


// ============================================
// CV
// ============================================

cvRouter.post('/upload', auth, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: 'Aucun fichier' });

    const { text } = await pdfParse(req.file.buffer);

    if (!text || text.trim().length < 30)
      return res.status(400).json({ error: 'CV illisible' });

    const analysis = await ResumeAgent.analyze(text);

    const cv = await CV.create({
      userId:       req.user._id,
      originalName: req.file.originalname,
      rawText:      text,
      pdfBuffer:    req.file.buffer,   // ✅ stocker le PDF original
      analysis
    });

    const io = req.app.get('io');
    if (io)
      io.to(req.user._id.toString()).emit('agent:done', {
        agent: 'Resume Agent',
        message: `CV analysé`
      });

    res.json({ cvId: cv._id, analysis });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// JOB SEARCH
// ============================================

jobsRouter.post('/search', auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

    if (!cv)
      return res.status(404).json({ error: 'Upload ton CV d\'abord' });

    const jobTitles = cv.analysis?.jobTitles?.slice(0, 3) || ['Développeur'];

    const rawJobs = await HunterAgent.search(jobTitles, req.body.country || 'TN');

    const scored = await Promise.all(
      rawJobs.map(async job => {
        const match = await HunterAgent.scoreMatch(cv.analysis, job);
        return {
          ...job,
          matchScore: match.score || 60
        };
      })
    );

    res.json({
      total: scored.length,
      jobs: scored
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// APPLICATIONS
// ============================================

appRouter.post('/generate', auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

    const coverLetter = await ApplyAgent.generateLetter(cv.analysis, req.body.job);

    res.json({ coverLetter });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


appRouter.post('/send', auth, async (req, res) => {
  try {
    const { job, coverLetter, recipientEmail } = req.body;
    const user = req.user;

    if (user.applicationsUsed >= user.applicationsLimit)
      return res.status(403).json({ error: 'Limite atteinte' });

    // ✅ Destinataire : email saisi par l'utilisateur OU email de la société
    const to = recipientEmail || job?.companyEmail;

    console.log('📧 EMAIL CHECK START');
    console.log('to =', to);
    console.log('recipientEmail =', recipientEmail);
    console.log('companyEmail =', job?.companyEmail);

    // ✅ CV pour pièce jointe
    const cv = await CV.findOne({ userId: user._id }).sort({ createdAt: -1 });

    // ✅ Envoi email si destinataire présent
    if (to) {
      await EmailAgent.sendApplication({
        to,
        candidateName:  user.name,
        candidateEmail: user.email,
        jobTitle:       job.title,
        company:        job.company,
        coverLetter,
        cvBuffer:   cv?.pdfBuffer || null,   // ✅ PDF original, pas du texte
        cvFileName: cv?.originalName || `CV_${user.name.replace(/\s+/g, '_')}.pdf`,
      });
    }

    await Application.create({
      userId:      user._id,
      job,
      matchScore:  job?.matchScore,
      coverLetter,
      status:      'sent',
      emailSentAt: to ? new Date() : null,
    });

    await User.findByIdAndUpdate(user._id, { $inc: { applicationsUsed: 1 } });

    const io = req.app.get('io');
    if (io) io.to(user._id.toString()).emit('agent:done', {
      agent: 'Email Agent',
      message: to ? `Candidature envoyée à ${job.company}` : 'Candidature enregistrée'
    });

    res.json({
      message:   to ? `Candidature envoyée à ${to}` : "Candidature enregistrée (pas d'email disponible)",
      emailSent: !!to,
      remaining: user.applicationsLimit - user.applicationsUsed - 1,
    });

  } catch (e) {
    console.error('❌ Erreur /send:', e.message);
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// PLAN CHECK (FIXED)
// ============================================

const requirePlan = (minPlan) => (req, res, next) => {
  const userPlan = req.user.plan || "free";

  if (PLAN_LEVEL[userPlan] < PLAN_LEVEL[minPlan]) {
    return res.status(403).json({
      error: "Plan insuffisant",
      upgrade: true
    });
  }

  next();
};


// ============================================
// COACH (PRO ONLY)
// ============================================

appRouter.post('/coach', auth, requirePlan("pro"), async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const apps = await Application.find({ userId: req.user._id });

    const plan = await CoachAgent.generateCareerPlan(cv.analysis, req.body.targetRole);
    const insights = await CoachAgent.analyzeApplications(apps);

    res.json({ plan, insights });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// INTERVIEW
// ============================================

appRouter.post('/interview/questions', auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

    const questions = await InterviewAgent.generateQuestions(
      cv.analysis,
      req.body.job,
      req.body.type
    );

    res.json(questions);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// PAYMENTS (STRIPE)
// ============================================

payRouter.post('/create-checkout', auth, async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    const plan = STRIPE_PLANS[req.body.planKey];
    if (!plan) return res.status(400).json({ error: 'Plan invalide' });

    const session = await stripe.checkout.sessions.create({
      mode: plan.months === 1 ? 'subscription' : 'payment',
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `JobSmart AI - ${plan.level}`
          },
          unit_amount: plan.price,
          ...(plan.months === 1
            ? { recurring: { interval: 'month' } }
            : {})
        },
        quantity: 1
      }],
      success_url: `${process.env.FRONTEND_URL}/dashboard`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId: req.user._id.toString(),
        planKey: req.body.planKey
      }
    });

    res.json({ url: session.url });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// EXPORT
// ============================================

module.exports = {
  authRouter,
  cvRouter,
  jobsRouter,
  appRouter,
  payRouter
};



// // ============================================
// // ROUTES — JobSmart AI OS v4
// // ============================================
// const express = require('express');
// const multer  = require('multer');
// const pdfParse = require('pdf-parse');
// const jwt     = require('jsonwebtoken');
// // const User    = require('./models/User');
// // const { CV, Application } = require('./models/models');
// const User = require('../models/User');
// const { CV, Application } = require('../models/models');
// const ResumeAgent   = require('../agents/ResumeAgent');
// const HunterAgent   = require('../agents/HunterAgent');
// const ApplyAgent    = require('../agents/ApplyAgent');
// const EmailAgent    = require('../agents/EmailAgent');
// const CoachAgent    = require('../agents/CoachAgent');
// const InterviewAgent = require('../agents/InterviewAgent');
// const { PLANS } = require('./PLANS');

// // ── Auth middleware ──
// const auth = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) return res.status(401).json({ error: 'Non authentifié' });
//     const { userId } = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(userId).select('-password');
//     if (!req.user) return res.status(401).json({ error: 'Introuvable' });
//     next();
//   } catch { res.status(401).json({ error: 'Token invalide' }); }
// };

// const sign  = id => jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });
// const fmt   = u  => ({ id: u._id, name: u.name, email: u.email, plan: u.plan, country: u.country, level: u.level, domain: u.domain, applicationsUsed: u.applicationsUsed, applicationsLimit: u.applicationsLimit });
// // const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('PDF uniquement')) });
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
//   fileFilter: (req, file, cb) =>
//     file.mimetype === 'application/pdf'
//       ? cb(null, true)
//       : cb(new Error('PDF uniquement'))
// });
// // ══════════════════════════════
// // AUTH ROUTES
// // ══════════════════════════════
// const authRouter = express.Router();

// authRouter.post('/register', async (req, res) => {
//   try {
//     const { name, email, password, country, level, domain } = req.body;
//     if (!name || !email || !password) return res.status(400).json({ error: 'Champs manquants' });
//     if (await User.findOne({ email })) return res.status(400).json({ error: 'Email déjà utilisé' });
//     const user = await User.create({ name, email, password, country: country||'TN', level: level||'junior', domain: domain||'' });
//     EmailAgent.sendWelcome({ to: email, name }).catch(console.error);
//     res.status(201).json({ token: sign(user._id), user: fmt(user) });
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// authRouter.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
//     res.json({ token: sign(user._id), user: fmt(user) });
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// authRouter.get('/me', auth, (req, res) => res.json({ user: fmt(req.user) }));

// // ══════════════════════════════
// // CV ROUTES
// // ══════════════════════════════
// const cvRouter = express.Router();

// cvRouter.post('/upload', auth, upload.single('cv'), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
//     const { text } = await pdfParse(req.file.buffer);
//     if (!text || text.trim().length < 30) return res.status(400).json({ error: 'CV illisible' });

//     // Resume Agent analyse
//     const analysis = await ResumeAgent.analyze(text);
//     const cv = await CV.create({ userId: req.user._id, originalName: req.file.originalname, rawText: text, analysis });

//     // Notifier via WebSocket
//     const io = req.app.get('io');
//     if (io) io.to(req.user._id.toString()).emit('agent:done', { agent: 'Resume Agent', message: `CV analysé · Score ATS: ${analysis.atsScore || '—'}` });

//     res.json({ cvId: cv._id, analysis, originalName: req.file.originalname });
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// cvRouter.get('/my', auth, async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     if (!cv) return res.status(404).json({ error: 'Aucun CV' });
//     res.json(cv);
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// // ══════════════════════════════
// // JOBS ROUTES
// // ══════════════════════════════
// const jobsRouter = express.Router();

// jobsRouter.post('/search', auth, async (req, res) => {
//   try {
//     const { country = 'TN', platforms } = req.body;
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     if (!cv) return res.status(404).json({ error: 'Upload ton CV d\'abord' });

//     const jobTitles = cv.analysis?.jobTitles?.slice(0, 3) || ['Développeur'];

//     // Notifier début
//     const io = req.app.get('io');
//     if (io) io.to(req.user._id.toString()).emit('agent:start', { agent: 'Hunter Agent', message: `Recherche: ${jobTitles.join(', ')}` });

//     // Hunter Agent cherche
//     const rawJobs = await HunterAgent.search(jobTitles, country);

//     if (!rawJobs.length) {
//       return res.json({ total: 0, jobs: [], message: 'Aucune offre. Vérifie JSEARCH_API_KEY.' });
//     }

//     // Scorer chaque offre
//     const scored = await Promise.all(
//       rawJobs.map(async job => {
//         const match = await HunterAgent.scoreMatch(cv.analysis, job);
//         const email = job.companyEmail || await HunterAgent.findEmail(job.company).catch(() => null);
//         return { ...job, matchScore: match.score||65, matchReasons: match.reasons||[], missingSkills: match.missing||[], companyEmail: email };
//       })
//     );

//     const result = scored.filter(j => j.matchScore >= 50).sort((a,b) => b.matchScore - a.matchScore).slice(0, 15);

//     if (io) io.to(req.user._id.toString()).emit('agent:done', { agent: 'Hunter Agent', message: `${result.length} offres trouvées` });

//     res.json({ total: result.length, jobs: result });
//   } catch (e) {
//     console.error('Erreur recherche:', e.message);
//     res.status(500).json({ error: e.message });
//   }
// });

// // ══════════════════════════════
// // APPLICATIONS ROUTES
// // ══════════════════════════════
// const appRouter = express.Router();

// appRouter.post('/generate', auth, async (req, res) => {
//   try {
//     const { job } = req.body;
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     if (!cv) return res.status(404).json({ error: 'CV introuvable' });
//     const coverLetter = await ApplyAgent.generateLetter(cv.analysis, job);
//     res.json({ coverLetter });
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// appRouter.post('/send', auth, async (req, res) => {
//   try {
//     const { job, coverLetter, recipientEmail } = req.body;
//     const user = req.user;

//     if (user.applicationsUsed >= user.applicationsLimit) {
//       return res.status(403).json({ error: 'Limite atteinte', upgradeRequired: true });
//     }

//     const cv  = await CV.findOne({ userId: user._id }).sort({ createdAt: -1 });
//     const to  = recipientEmail || job.companyEmail;

//     if (to) {
//       await EmailAgent.sendApplication({
//         to, candidateName: user.name, candidateEmail: user.email,
//         jobTitle: job.title, company: job.company, coverLetter,
//         cvBuffer: cv?.rawText ? Buffer.from(cv.rawText, 'utf-8') : null,
//         cvFileName: `CV_${user.name.replace(/\s+/g,'_')}.txt`,
//       });
//     }

//     await Application.create({ userId: user._id, job, matchScore: job.matchScore, coverLetter, status: 'sent', emailSentAt: new Date() });
//     await User.findByIdAndUpdate(user._id, { $inc: { applicationsUsed: 1 } });

//     const io = req.app.get('io');
//     if (io) io.to(user._id.toString()).emit('agent:done', { agent: 'Email Agent', message: `Candidature envoyée à ${job.company}` });

//     res.json({
//       message: to ? `Candidature envoyée à ${to}` : 'Candidature enregistrée',
//       emailSent: !!to,
//       remaining: user.applicationsLimit - user.applicationsUsed - 1,
//     });
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// appRouter.get('/', auth, async (req, res) => {
//   try { res.json(await Application.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50)); }
//   catch (e) { res.status(500).json({ error: e.message }); }
// });
// const requirePlan = (minPlan) => (req, res, next) => {
//   const userPlan = req.user.plan || "free";

//   if (PLANS[userPlan] < PLANS[minPlan]) {
//     return res.status(403).json({
//       error: "Plan insuffisant (Pro/Premium requis)",
//       upgrade: true
//     });
//   }

//   next();
// };
// // ── Coach ──
// appRouter.post('/coach', auth, requirePlan("pro"), async (req, res) => {
// // appRouter.post('/coach', auth, async (req, res) => {
//   try {
//     const { targetRole } = req.body;
//     const cv   = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     const apps = await Application.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20);
//     const plan = await CoachAgent.generateCareerPlan(cv?.analysis || {}, targetRole);
//     const insights = await CoachAgent.analyzeApplications(apps);
//     res.json({ plan, insights });
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// // ── Interview ──
// appRouter.post('/interview/questions', auth, async (req, res) => {
//   try {
//     const { job, type } = req.body;
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     const questions = await InterviewAgent.generateQuestions(cv?.analysis || {}, job, type);
//     res.json(questions);
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// appRouter.post('/interview/evaluate', auth, async (req, res) => {
//   try {
//     const { question, answer } = req.body;
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     const evaluation = await InterviewAgent.evaluateAnswer(question, answer, cv?.analysis || {});
//     res.json(evaluation);
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// // ══════════════════════════════
// // PAYMENTS ROUTES
// // ══════════════════════════════
// const payRouter = express.Router();

// const PLANS = {
//   basic_month:   { price: 1000, limit: 10,     name: 'Basic Mensuel',   months: 1  },
//   basic_year:    { price: 9600, limit: 10,     name: 'Basic Annuel',    months: 12 },
//   pro_month:     { price: 2500, limit: 50,     name: 'Pro Mensuel',     months: 1  },
//   pro_year:      { price: 24000,limit: 50,     name: 'Pro Annuel',      months: 12 },
//   premium_month: { price: 5000, limit: 999999, name: 'Premium Mensuel', months: 1  },
//   premium_year:  { price: 48000,limit: 999999, name: 'Premium Annuel',  months: 12 },
// };

// payRouter.post('/create-checkout', auth, async (req, res) => {
//   try {
//     if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Stripe non configuré' });
//     const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
//     const { planKey } = req.body;
//     const plan = PLANS[planKey];
//     if (!plan) return res.status(400).json({ error: 'Plan invalide' });
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       mode: plan.months === 1 ? 'subscription' : 'payment',
//       customer_email: req.user.email,
//       line_items: [{ price_data: { currency: 'eur', product_data: { name: `JobSmart AI — ${plan.name}` }, unit_amount: plan.price, ...(plan.months === 1 ? { recurring: { interval: 'month' } } : {}) }, quantity: 1 }],
//       success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success&plan=${planKey}`,
//       cancel_url:  `${process.env.FRONTEND_URL}/pricing`,
//       metadata: { userId: req.user._id.toString(), planKey },
//     });
//     res.json({ url: session.url });
//   } catch (e) { res.status(500).json({ error: e.message }); }
// });

// module.exports = { authRouter, cvRouter, jobsRouter, appRouter, payRouter };











// // ============================================
// // ROUTES — JobSmart AI OS v4 (CLEAN VERSION)
// // ============================================

// const express = require('express');
// const multer  = require('multer');
// const pdfParse = require('pdf-parse');
// const jwt     = require('jsonwebtoken');

// const User = require('../models/User');
// const { CV, Application } = require('../models/models');

// const ResumeAgent    = require('../agents/ResumeAgent');
// const HunterAgent    = require('../agents/HunterAgent');
// const ApplyAgent     = require('../agents/ApplyAgent');
// const EmailAgent     = require('../agents/EmailAgent');
// const CoachAgent     = require('../agents/CoachAgent');
// const InterviewAgent = require('../agents/InterviewAgent');


// // ============================================
// // PLAN SYSTEM (SaaS LEVELS)
// // ============================================

// const PLAN_LEVEL = {
//   free: 0,
//   basic: 1,
//   pro: 2,
//   premium: 3
// };


// // ============================================
// // STRIPE PLANS (pricing only)
// // ============================================

// const STRIPE_PLANS = {
//   basic_month:   { price: 1000, level: 'basic', months: 1 },
//   basic_year:    { price: 9600, level: 'basic', months: 12 },
//   pro_month:     { price: 2500, level: 'pro', months: 1 },
//   pro_year:      { price: 24000, level: 'pro', months: 12 },
//   premium_month: { price: 5000, level: 'premium', months: 1 },
//   premium_year:  { price: 48000, level: 'premium', months: 12 },
// };


// // ============================================
// // AUTH MIDDLEWARE
// // ============================================

// const auth = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) return res.status(401).json({ error: 'Non authentifié' });

//     const { userId } = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(userId).select('-password');

//     if (!req.user) return res.status(401).json({ error: 'Introuvable' });

//     next();
//   } catch {
//     res.status(401).json({ error: 'Token invalide' });
//   }
// };


// // ============================================
// // HELPERS
// // ============================================

// const sign = id =>
//   jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// const fmt = u => ({
//   id: u._id,
//   name: u.name,
//   email: u.email,
//   plan: u.plan,
//   country: u.country,
//   level: u.level,
//   domain: u.domain,
//   applicationsUsed: u.applicationsUsed,
//   applicationsLimit: u.applicationsLimit
// });


// // ============================================
// // MULTER CONFIG
// // ============================================

// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 20 * 1024 * 1024 },
//   fileFilter: (req, file, cb) =>
//     file.mimetype === 'application/pdf'
//       ? cb(null, true)
//       : cb(new Error('PDF uniquement'))
// });


// // ============================================
// // ROUTERS
// // ============================================

// const authRouter = express.Router();

// const cvRouter = express.Router();
// const jobsRouter = express.Router();
// const appRouter = express.Router();
// const payRouter = express.Router();


// // ============================================
// // AUTH
// // ============================================

// authRouter.post('/register', async (req, res) => {
//   try {
//     const { name, email, password, country, level, domain } = req.body;

//     if (!name || !email || !password)
//       return res.status(400).json({ error: 'Champs manquants' });

//     if (await User.findOne({ email }))
//       return res.status(400).json({ error: 'Email déjà utilisé' });

//     const user = await User.create({
//       name,
//       email,
//       password,
//       country: country || 'TN',
//       level: level || 'junior',
//       domain: domain || ''
//     });

//     EmailAgent.sendWelcome({ to: email, name }).catch(console.error);

//     res.status(201).json({
//       token: sign(user._id),
//       user: fmt(user)
//     });

//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// authRouter.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     const user = await User.findOne({ email });
//     if (!user || !(await user.comparePassword(password)))
//       return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

//     res.json({
//       token: sign(user._id),
//       user: fmt(user)
//     });

//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// authRouter.get('/me', auth, (req, res) => {
//   res.json({ user: fmt(req.user) });
// });
// // ============================================
// // UPDATE ACCOUNT (PLAN + LIMIT)
// // ============================================

// authRouter.put('/update-account', auth, async (req, res) => {
//   try {

//     const { plan, applicationsLimit } = req.body;

//     const allowedPlans = ["free", "basic", "pro", "premium"];

//     if (plan && !allowedPlans.includes(plan)) {
//       return res.status(400).json({
//         error: "Plan invalide"
//       });
//     }

//     const updateData = {};

//     if (plan) {
//       updateData.plan = plan;
//     }

//     if (applicationsLimit !== undefined) {
//       updateData.applicationsLimit = applicationsLimit;
//     }

//     const user = await User.findByIdAndUpdate(
//       req.user._id,
//       updateData,
//       { new: true }
//     );

//     res.json({
//       message: "Compte mis à jour",
//       user: fmt(user)
//     });

//   } catch (e) {
//     res.status(500).json({
//       error: e.message
//     });
//   }
// });


// // ============================================
// // CV
// // ============================================

// cvRouter.post('/upload', auth, upload.single('cv'), async (req, res) => {
//   try {
//     if (!req.file)
//       return res.status(400).json({ error: 'Aucun fichier' });

//     const { text } = await pdfParse(req.file.buffer);

//     if (!text || text.trim().length < 30)
//       return res.status(400).json({ error: 'CV illisible' });

//     const analysis = await ResumeAgent.analyze(text);

//     const cv = await CV.create({
//       userId: req.user._id,
//       originalName: req.file.originalname,
//       rawText: text,
//       analysis
//     });

//     const io = req.app.get('io');
//     if (io)
//       io.to(req.user._id.toString()).emit('agent:done', {
//         agent: 'Resume Agent',
//         message: `CV analysé`
//       });

//     res.json({ cvId: cv._id, analysis });

//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // JOB SEARCH
// // ============================================

// jobsRouter.post('/search', auth, async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

//     if (!cv)
//       return res.status(404).json({ error: 'Upload ton CV d\'abord' });

//     const jobTitles = cv.analysis?.jobTitles?.slice(0, 3) || ['Développeur'];

//     const rawJobs = await HunterAgent.search(jobTitles, req.body.country || 'TN');

//     const scored = await Promise.all(
//       rawJobs.map(async job => {
//         const match = await HunterAgent.scoreMatch(cv.analysis, job);
//         return {
//           ...job,
//           matchScore: match.score || 60
//         };
//       })
//     );

//     res.json({
//       total: scored.length,
//       jobs: scored
//     });

//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // APPLICATIONS
// // ============================================

// appRouter.post('/generate', auth, async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

//     const coverLetter = await ApplyAgent.generateLetter(cv.analysis, req.body.job);

//     res.json({ coverLetter });

//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// appRouter.post('/send', auth, async (req, res) => {
//   try {
//     const { job, coverLetter, recipientEmail } = req.body;
//     const user = req.user;

//     if (user.applicationsUsed >= user.applicationsLimit)
//       return res.status(403).json({ error: 'Limite atteinte' });

//     // ✅ Destinataire : email saisi par l'utilisateur OU email de la société
//     const to = recipientEmail || job?.companyEmail;

//     console.log('📧 EMAIL CHECK START');
//     console.log('to =', to);
//     console.log('recipientEmail =', recipientEmail);
//     console.log('companyEmail =', job?.companyEmail);

//     // ✅ CV pour pièce jointe
//     const cv = await CV.findOne({ userId: user._id }).sort({ createdAt: -1 });

//     // ✅ Envoi email si destinataire présent
//     if (to) {
//       await EmailAgent.sendApplication({
//         to,
//         candidateName:  user.name,
//         candidateEmail: user.email,
//         jobTitle:       job.title,
//         company:        job.company,
//         coverLetter,
//         cvBuffer:   cv?.rawText ? Buffer.from(cv.rawText, 'utf-8') : null,
//         cvFileName: `CV_${user.name.replace(/\s+/g, '_')}.txt`,
//       });
//     }

//     await Application.create({
//       userId:      user._id,
//       job,
//       matchScore:  job?.matchScore,
//       coverLetter,
//       status:      'sent',
//       emailSentAt: to ? new Date() : null,
//     });

//     await User.findByIdAndUpdate(user._id, { $inc: { applicationsUsed: 1 } });

//     const io = req.app.get('io');
//     if (io) io.to(user._id.toString()).emit('agent:done', {
//       agent: 'Email Agent',
//       message: to ? `Candidature envoyée à ${job.company}` : 'Candidature enregistrée'
//     });

//     res.json({
//       message:   to ? `Candidature envoyée à ${to}` : "Candidature enregistrée (pas d'email disponible)",
//       emailSent: !!to,
//       remaining: user.applicationsLimit - user.applicationsUsed - 1,
//     });

//   } catch (e) {
//     console.error('❌ Erreur /send:', e.message);
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // PLAN CHECK (FIXED)
// // ============================================

// const requirePlan = (minPlan) => (req, res, next) => {
//   const userPlan = req.user.plan || "free";

//   if (PLAN_LEVEL[userPlan] < PLAN_LEVEL[minPlan]) {
//     return res.status(403).json({
//       error: "Plan insuffisant",
//       upgrade: true
//     });
//   }

//   next();
// };


// // ============================================
// // COACH (PRO ONLY)
// // ============================================

// appRouter.post('/coach', auth, requirePlan("pro"), async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     const apps = await Application.find({ userId: req.user._id });

//     const plan = await CoachAgent.generateCareerPlan(cv.analysis, req.body.targetRole);
//     const insights = await CoachAgent.analyzeApplications(apps);

//     res.json({ plan, insights });

//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // INTERVIEW
// // ============================================

// appRouter.post('/interview/questions', auth, async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });

//     const questions = await InterviewAgent.generateQuestions(
//       cv.analysis,
//       req.body.job,
//       req.body.type
//     );

//     res.json(questions);

//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // PAYMENTS (STRIPE)
// // ============================================

// payRouter.post('/create-checkout', auth, async (req, res) => {
//   try {
//     const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//     const plan = STRIPE_PLANS[req.body.planKey];
//     if (!plan) return res.status(400).json({ error: 'Plan invalide' });

//     const session = await stripe.checkout.sessions.create({
//       mode: plan.months === 1 ? 'subscription' : 'payment',
//       customer_email: req.user.email,
//       line_items: [{
//         price_data: {
//           currency: 'eur',
//           product_data: {
//             name: `JobSmart AI - ${plan.level}`
//           },
//           unit_amount: plan.price,
//           ...(plan.months === 1
//             ? { recurring: { interval: 'month' } }
//             : {})
//         },
//         quantity: 1
//       }],
//       success_url: `${process.env.FRONTEND_URL}/dashboard`,
//       cancel_url: `${process.env.FRONTEND_URL}/pricing`,
//       metadata: {
//         userId: req.user._id.toString(),
//         planKey: req.body.planKey
//       }
//     });

//     res.json({ url: session.url });

//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // EXPORT
// // ============================================

// module.exports = {
//   authRouter,
//   cvRouter,
//   jobsRouter,
//   appRouter,
//   payRouter
// };


