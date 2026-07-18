const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const auth   = require('../controllers/authMiddleware');
const { sendWelcomeEmail } = require('../services/email');

const sign = id => jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: '30d' });
const fmt  = u => ({ id: u._id, name: u.name, email: u.email, plan: u.plan, country: u.country, level: u.level, domain: u.domain, applicationsUsed: u.applicationsUsed, applicationsLimit: u.applicationsLimit, planExpiresAt: u.planExpiresAt });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, country, level, domain } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Champs manquants' });
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email déjà utilisé' });
    const user = await User.create({ name, email, password, country: country||'TN', level: level||'junior', domain: domain||'' });
    sendWelcomeEmail({ to: email, name }).catch(console.error);
    res.status(201).json({ token: sign(user._id), user: fmt(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    res.json({ token: sign(user._id), user: fmt(user) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/me', auth, (req, res) => res.json({ user: fmt(req.user) }));

module.exports = router;
