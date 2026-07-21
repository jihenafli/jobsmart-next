const router   = require('express').Router();
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const auth     = require('../controllers/authMiddleware');
const CV       = require('../models/CV');
const { analyzeCV } = require('../services/ai');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5*1024*1024 }, fileFilter: (req,file,cb) => file.mimetype==='application/pdf' ? cb(null,true) : cb(new Error('PDF uniquement')) });

router.post('/upload', auth, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
    const { text } = await pdfParse(req.file.buffer);
    if (!text || text.trim().length < 30) return res.status(400).json({ error: 'CV illisible ou vide' });
    const analysis = await analyzeCV(text);
    const cv = await CV.create({ userId: req.user._id, originalName: req.file.originalname, rawText: text, analysis });
    res.json({ cvId: cv._id, analysis, originalName: req.file.originalname });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/my', auth, async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (!cv) return res.status(404).json({ error: 'Aucun CV' });
    res.json(cv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
