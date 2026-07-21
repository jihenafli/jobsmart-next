const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const schema = new mongoose.Schema({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true, lowercase: true },
  password:          { type: String, required: true },
  country:           { type: String, default: 'TN' },
  level:             { type: String, default: 'junior' },
  domain:            { type: String, default: '' },
  plan:              { type: String, enum: ['free','basic','pro','premium'], default: 'free' },
  applicationsUsed:  { type: Number, default: 0 },
  applicationsLimit: { type: Number, default: 1 },
  planExpiresAt:     { type: Date, default: null },
  stripeCustomerId:  String,
  createdAt:         { type: Date, default: Date.now },
});

schema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

schema.methods.comparePassword = function(pwd) {
  return require('bcryptjs').compare(pwd, this.password);
};

module.exports = mongoose.model('User', schema);
