const mongoose = require('mongoose');

const cvSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: String,
  rawText:      String,
  analysis:     {
    skills: [String], experience: String, education: String,
    languages: [String], jobTitles: [String], summary: String,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CV', cvSchema);
