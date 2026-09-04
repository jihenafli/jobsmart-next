// ============================================
// ROUTES — JobSmart AI OS v4 (NO PAYWALL)
// ============================================

const express  = require('express');
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const jwt      = require('jsonwebtoken');

const User = require('../models/User');
const { CV, Application } = require('../models/models');

const ResumeAgent    = require('../agents/ResumeAgent');
const HunterAgent    = require('../agents/HunterAgent');
const ApplyAgent     = require('../agents/ApplyAgent');
const EmailAgent     = require('../agents/EmailAgent');
const CoachAgent     = require('../agents/CoachAgent');
const InterviewAgent = require('../agents/InterviewAgent');


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
  id:      u._id,
  name:    u.name,
  email:   u.email,
  country: u.country,
  level:   u.level,
  domain:  u.domain,
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
const cvRouter   = express.Router();
const jobsRouter = express.Router();
const appRouter  = express.Router();
const payRouter  = express.Router();


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
      name, email, password,
      country: country || 'TN',
      level:   level   || 'junior',
      domain:  domain  || ''
    });
    EmailAgent.sendWelcome({ to: email, name }).catch(console.error);
    res.status(201).json({ token: sign(user._id), user: fmt(user) });
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
    res.json({ token: sign(user._id), user: fmt(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

authRouter.get('/me', auth, (req, res) => {
  res.json({ user: fmt(req.user) });
});

authRouter.get('/test', (req, res) => {
  res.json({ message: 'Auth route OK' });
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
      pdfBuffer:    req.file.buffer,
      analysis
    });
    const io = req.app.get('io');
    if (io) io.to(req.user._id.toString()).emit('agent:done', {
      agent: 'Resume Agent', message: 'CV analysé'
    });
    res.json({ cvId: cv._id, analysis });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

cvRouter.get('/my', auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!cv) return res.status(404).json({ error: 'Aucun CV' });
    res.json(cv);
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
    if (!cv) return res.status(404).json({ error: "Upload ton CV d'abord" });

    const jobTitles = cv.analysis?.jobTitles?.slice(0, 3) || ['Développeur'];

    const io = req.app.get('io');
    if (io) io.to(req.user._id.toString()).emit('agent:start', {
      agent: 'Hunter Agent', message: `Recherche: ${jobTitles.join(', ')}`
    });

    const rawJobs = await HunterAgent.search(jobTitles, req.body.country || 'TN');

    const scored = await Promise.all(
      rawJobs.map(async job => {
        const match = await HunterAgent.scoreMatch(cv.analysis, job);
        return { ...job, matchScore: match.score || 60 };
      })
    );

    if (io) io.to(req.user._id.toString()).emit('agent:done', {
      agent: 'Hunter Agent', message: `${scored.length} offres trouvées`
    });

    res.json({ total: scored.length, jobs: scored });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// APPLICATIONS — accès illimité, sans paywall
// ============================================

appRouter.post('/generate', auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!cv) return res.status(404).json({ error: 'CV introuvable' });
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

    const rawEmail = recipientEmail || job?.companyEmail;

    // ✅ Validation email — évite les timeouts SMTP sur emails invalides
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const to = rawEmail && emailRegex.test(rawEmail.trim()) ? rawEmail.trim() : null;

    console.log('📧 rawEmail =', rawEmail);
    console.log('📧 to (validé) =', to);

    if (recipientEmail && !to) {
      return res.status(400).json({ error: `Email invalide : "${recipientEmail}" — vérifiez l'adresse saisie` });
    }

    const cv = await CV.findOne({ userId: user._id }).sort({ createdAt: -1 });

    if (to) {
      await EmailAgent.sendApplication({
        to,
        candidateName:  user.name,
        candidateEmail: user.email,
        jobTitle:       job.title,
        company:        job.company,
        coverLetter,
        cvBuffer:   cv?.pdfBuffer || null,
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

    const io = req.app.get('io');
    if (io) io.to(user._id.toString()).emit('agent:done', {
      agent:   'Email Agent',
      message: to ? `Candidature envoyée à ${job.company}` : 'Candidature enregistrée'
    });

    res.json({
      message:   to ? `Candidature envoyée à ${to}` : "Candidature enregistrée (pas d'email disponible)",
      emailSent: !!to,
    });
  } catch (e) {
    console.error('❌ Erreur /send:', e.message);
    res.status(500).json({ error: e.message });
  }
});

appRouter.get('/', auth, async (req, res) => {
  try {
    const apps = await Application.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// COACH
// ============================================

appRouter.post('/coach', auth, async (req, res) => {
  try {
    const cv   = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const apps = await Application.find({ userId: req.user._id });
    const plan     = await CoachAgent.generateCareerPlan(cv?.analysis || {}, req.body.targetRole);
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
      cv?.analysis || {}, req.body.job, req.body.type
    );
    res.json(questions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

appRouter.post('/interview/evaluate', auth, async (req, res) => {
  try {
    const { question, answer } = req.body;
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    const evaluation = await InterviewAgent.evaluateAnswer(
      question, answer, cv?.analysis || {}
    );
    res.json(evaluation);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ============================================
// PAYMENTS — désactivé
// ============================================

payRouter.post('/create-checkout', (req, res) => {
  res.status(410).json({ error: 'Paiements désactivés' });
});


// ============================================
// EXPORT
// ============================================

module.exports = { authRouter, cvRouter, jobsRouter, appRouter, payRouter };





// // ============================================
// // ROUTES — JobSmart AI OS v4 (NO PAYWALL)
// // ============================================

// const express  = require('express');
// const multer   = require('multer');
// const pdfParse = require('pdf-parse');
// const jwt      = require('jsonwebtoken');

// const User = require('../models/User');
// const { CV, Application } = require('../models/models');

// const ResumeAgent    = require('../agents/ResumeAgent');
// const HunterAgent    = require('../agents/HunterAgent');
// const ApplyAgent     = require('../agents/ApplyAgent');
// const EmailAgent     = require('../agents/EmailAgent');
// const CoachAgent     = require('../agents/CoachAgent');
// const InterviewAgent = require('../agents/InterviewAgent');


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
//   id:      u._id,
//   name:    u.name,
//   email:   u.email,
//   country: u.country,
//   level:   u.level,
//   domain:  u.domain,
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
// const cvRouter   = express.Router();
// const jobsRouter = express.Router();
// const appRouter  = express.Router();
// const payRouter  = express.Router();


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
//       name, email, password,
//       country: country || 'TN',
//       level:   level   || 'junior',
//       domain:  domain  || ''
//     });
//     EmailAgent.sendWelcome({ to: email, name }).catch(console.error);
//     res.status(201).json({ token: sign(user._id), user: fmt(user) });
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
//     res.json({ token: sign(user._id), user: fmt(user) });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// authRouter.get('/me', auth, (req, res) => {
//   res.json({ user: fmt(req.user) });
// });

// authRouter.get('/test', (req, res) => {
//   res.json({ message: 'Auth route OK' });
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
//       userId:       req.user._id,
//       originalName: req.file.originalname,
//       rawText:      text,
//       pdfBuffer:    req.file.buffer,
//       analysis
//     });
//     const io = req.app.get('io');
//     if (io) io.to(req.user._id.toString()).emit('agent:done', {
//       agent: 'Resume Agent', message: 'CV analysé'
//     });
//     res.json({ cvId: cv._id, analysis });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// cvRouter.get('/my', auth, async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     if (!cv) return res.status(404).json({ error: 'Aucun CV' });
//     res.json(cv);
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
//     if (!cv) return res.status(404).json({ error: "Upload ton CV d'abord" });

//     const jobTitles = cv.analysis?.jobTitles?.slice(0, 3) || ['Développeur'];

//     const io = req.app.get('io');
//     if (io) io.to(req.user._id.toString()).emit('agent:start', {
//       agent: 'Hunter Agent', message: `Recherche: ${jobTitles.join(', ')}`
//     });

//     const rawJobs = await HunterAgent.search(jobTitles, req.body.country || 'TN');

//     const scored = await Promise.all(
//       rawJobs.map(async job => {
//         const match = await HunterAgent.scoreMatch(cv.analysis, job);
//         return { ...job, matchScore: match.score || 60 };
//       })
//     );

//     if (io) io.to(req.user._id.toString()).emit('agent:done', {
//       agent: 'Hunter Agent', message: `${scored.length} offres trouvées`
//     });

//     res.json({ total: scored.length, jobs: scored });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // APPLICATIONS — accès illimité, sans paywall
// // ============================================

// appRouter.post('/generate', auth, async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     if (!cv) return res.status(404).json({ error: 'CV introuvable' });
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

//     const to = recipientEmail || job?.companyEmail;

//     console.log('📧 to =', to);

//     const cv = await CV.findOne({ userId: user._id }).sort({ createdAt: -1 });

//     if (to) {
//       await EmailAgent.sendApplication({
//         to,
//         candidateName:  user.name,
//         candidateEmail: user.email,
//         jobTitle:       job.title,
//         company:        job.company,
//         coverLetter,
//         cvBuffer:   cv?.pdfBuffer || null,
//         cvFileName: cv?.originalName || `CV_${user.name.replace(/\s+/g, '_')}.pdf`,
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

//     const io = req.app.get('io');
//     if (io) io.to(user._id.toString()).emit('agent:done', {
//       agent:   'Email Agent',
//       message: to ? `Candidature envoyée à ${job.company}` : 'Candidature enregistrée'
//     });

//     res.json({
//       message:   to ? `Candidature envoyée à ${to}` : "Candidature enregistrée (pas d'email disponible)",
//       emailSent: !!to,
//     });
//   } catch (e) {
//     console.error('❌ Erreur /send:', e.message);
//     res.status(500).json({ error: e.message });
//   }
// });

// appRouter.get('/', auth, async (req, res) => {
//   try {
//     const apps = await Application.find({ userId: req.user._id })
//       .sort({ createdAt: -1 }).limit(50);
//     res.json(apps);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // COACH
// // ============================================

// appRouter.post('/coach', auth, async (req, res) => {
//   try {
//     const cv   = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     const apps = await Application.find({ userId: req.user._id });
//     const plan     = await CoachAgent.generateCareerPlan(cv?.analysis || {}, req.body.targetRole);
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
//       cv?.analysis || {}, req.body.job, req.body.type
//     );
//     res.json(questions);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// appRouter.post('/interview/evaluate', auth, async (req, res) => {
//   try {
//     const { question, answer } = req.body;
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     const evaluation = await InterviewAgent.evaluateAnswer(
//       question, answer, cv?.analysis || {}
//     );
//     res.json(evaluation);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // PAYMENTS — désactivé
// // ============================================

// payRouter.post('/create-checkout', (req, res) => {
//   res.status(410).json({ error: 'Paiements désactivés' });
// });


// // ============================================
// // EXPORT
// // ============================================

// module.exports = { authRouter, cvRouter, jobsRouter, appRouter, payRouter };


// // ============================================
// // ROUTES — JobSmart AI OS v4 (NO PAYWALL)
// // ============================================

// const express  = require('express');
// const multer   = require('multer');
// const pdfParse = require('pdf-parse');
// const jwt      = require('jsonwebtoken');

// const User = require('../models/User');
// const { CV, Application } = require('../models/models');

// const ResumeAgent    = require('../agents/ResumeAgent');
// const HunterAgent    = require('../agents/HunterAgent');
// const ApplyAgent     = require('../agents/ApplyAgent');
// const EmailAgent     = require('../agents/EmailAgent');
// const CoachAgent     = require('../agents/CoachAgent');
// const InterviewAgent = require('../agents/InterviewAgent');


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
//   id:      u._id,
//   name:    u.name,
//   email:   u.email,
//   country: u.country,
//   level:   u.level,
//   domain:  u.domain,
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
// const cvRouter   = express.Router();
// const jobsRouter = express.Router();
// const appRouter  = express.Router();
// const payRouter  = express.Router();


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
//       name, email, password,
//       country: country || 'TN',
//       level:   level   || 'junior',
//       domain:  domain  || ''
//     });
//     EmailAgent.sendWelcome({ to: email, name }).catch(console.error);
//     res.status(201).json({ token: sign(user._id), user: fmt(user) });
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
//     res.json({ token: sign(user._id), user: fmt(user) });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// authRouter.get('/me', auth, (req, res) => {
//   res.json({ user: fmt(req.user) });
// });

// authRouter.get('/test', (req, res) => {
//   res.json({ message: 'Auth route OK' });
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
//       userId:       req.user._id,
//       originalName: req.file.originalname,
//       rawText:      text,
//       pdfBuffer:    req.file.buffer,
//       analysis
//     });
//     const io = req.app.get('io');
//     if (io) io.to(req.user._id.toString()).emit('agent:done', {
//       agent: 'Resume Agent', message: 'CV analysé'
//     });
//     res.json({ cvId: cv._id, analysis });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// cvRouter.get('/my', auth, async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     if (!cv) return res.status(404).json({ error: 'Aucun CV' });
//     res.json(cv);
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
//     if (!cv) return res.status(404).json({ error: "Upload ton CV d'abord" });

//     const jobTitles = cv.analysis?.jobTitles?.slice(0, 3) || ['Développeur'];

//     const io = req.app.get('io');
//     if (io) io.to(req.user._id.toString()).emit('agent:start', {
//       agent: 'Hunter Agent', message: `Recherche: ${jobTitles.join(', ')}`
//     });

//     const rawJobs = await HunterAgent.search(jobTitles, req.body.country || 'TN');

//     const scored = await Promise.all(
//       rawJobs.map(async job => {
//         const match = await HunterAgent.scoreMatch(cv.analysis, job);
//         return { ...job, matchScore: match.score || 60 };
//       })
//     );

//     if (io) io.to(req.user._id.toString()).emit('agent:done', {
//       agent: 'Hunter Agent', message: `${scored.length} offres trouvées`
//     });

//     res.json({ total: scored.length, jobs: scored });
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // APPLICATIONS — accès illimité, sans paywall
// // ============================================

// appRouter.post('/generate', auth, async (req, res) => {
//   try {
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     if (!cv) return res.status(404).json({ error: 'CV introuvable' });
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

//     const to = recipientEmail || job?.companyEmail;

//     console.log('📧 to =', to);

//     const cv = await CV.findOne({ userId: user._id }).sort({ createdAt: -1 });

//     if (to) {
//       await EmailAgent.sendApplication({
//         to,
//         candidateName:  user.name,
//         candidateEmail: user.email,
//         jobTitle:       job.title,
//         company:        job.company,
//         coverLetter,
//         cvBuffer:   cv?.pdfBuffer || null,
//         cvFileName: cv?.originalName || `CV_${user.name.replace(/\s+/g, '_')}.pdf`,
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

//     const io = req.app.get('io');
//     if (io) io.to(user._id.toString()).emit('agent:done', {
//       agent:   'Email Agent',
//       message: to ? `Candidature envoyée à ${job.company}` : 'Candidature enregistrée'
//     });

//     res.json({
//       message:   to ? `Candidature envoyée à ${to}` : "Candidature enregistrée (pas d'email disponible)",
//       emailSent: !!to,
//     });
//   } catch (e) {
//     console.error('❌ Erreur /send:', e.message);
//     res.status(500).json({ error: e.message });
//   }
// });

// appRouter.get('/', auth, async (req, res) => {
//   try {
//     const apps = await Application.find({ userId: req.user._id })
//       .sort({ createdAt: -1 }).limit(50);
//     res.json(apps);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // COACH
// // ============================================

// appRouter.post('/coach', auth, async (req, res) => {
//   try {
//     const cv   = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     const apps = await Application.find({ userId: req.user._id });
//     const plan     = await CoachAgent.generateCareerPlan(cv?.analysis || {}, req.body.targetRole);
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
//       cv?.analysis || {}, req.body.job, req.body.type
//     );
//     res.json(questions);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });

// appRouter.post('/interview/evaluate', auth, async (req, res) => {
//   try {
//     const { question, answer } = req.body;
//     const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
//     const evaluation = await InterviewAgent.evaluateAnswer(
//       question, answer, cv?.analysis || {}
//     );
//     res.json(evaluation);
//   } catch (e) {
//     res.status(500).json({ error: e.message });
//   }
// });


// // ============================================
// // PAYMENTS — désactivé
// // ============================================

// payRouter.post('/create-checkout', (req, res) => {
//   res.status(410).json({ error: 'Paiements désactivés' });
// });


// // ============================================
// // EXPORT
// // ============================================

// module.exports = { authRouter, cvRouter, jobsRouter, appRouter, payRouter };