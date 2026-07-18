const jwt  = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Non authentifié' });
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(userId).select('-password');
    if (!req.user) return res.status(401).json({ error: 'Utilisateur introuvable' });
    next();
  } catch { res.status(401).json({ error: 'Token invalide' }); }
};
