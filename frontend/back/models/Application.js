const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job:         { title: String, company: String, location: String, salary: String, url: String, platform: String, description: String, companyEmail: String },
  matchScore:  Number,
  coverLetter: String,
  status:      { type: String, enum: ['pending','sent','opened','replied','rejected'], default: 'pending' },
  emailSentAt: Date,
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Application', schema);
