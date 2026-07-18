const mongoose = require('mongoose');

// CV Model
const CVSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalName: String,
  rawText:      String,
  pdfBuffer:    Buffer,   // ✅ PDF original stocké en binaire
  analysis: {
    skills: [String], experience: String, education: String,
    languages: [String], jobTitles: [String], summary: String,
    atsScore: Number, missingKeywords: [String],
    strengths: [String], improvements: [String],
  },
  createdAt: { type: Date, default: Date.now },
});

// Application Model
const AppSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: {
    title: String, company: String, location: String,
    salary: String, url: String, platform: String,
    description: String, companyEmail: String,
  },
  matchScore:  Number,
  coverLetter: String,
  status:      { type: String, enum: ['pending','sent','opened','replied','rejected'], default: 'pending' },
  emailSentAt: Date,
  createdAt:   { type: Date, default: Date.now },
});

module.exports = {
  CV:          mongoose.model('CV', CVSchema),
  Application: mongoose.model('Application', AppSchema),
};


// const mongoose = require('mongoose');

// // CV Model
// const CVSchema = new mongoose.Schema({
//   userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   originalName: String,
//   rawText:      String,
//   analysis: {
//     skills: [String], experience: String, education: String,
//     languages: [String], jobTitles: [String], summary: String,
//     atsScore: Number, missingKeywords: [String],
//     strengths: [String], improvements: [String],
//   },
//   createdAt: { type: Date, default: Date.now },
// });

// // Application Model
// const AppSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   job: {
//     title: String, company: String, location: String,
//     salary: String, url: String, platform: String,
//     description: String, companyEmail: String,
//   },
//   matchScore:  Number,
//   coverLetter: String,
//   status:      { type: String, enum: ['pending','sent','opened','replied','rejected'], default: 'pending' },
//   emailSentAt: Date,
//   createdAt:   { type: Date, default: Date.now },
// });

// module.exports = {
//   CV:          mongoose.model('CV', CVSchema),
//   Application: mongoose.model('Application', AppSchema),
// };
