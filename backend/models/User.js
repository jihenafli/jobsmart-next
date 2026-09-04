
// models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  country:   { type: String, default: 'TN' },
  level:     { type: String, default: 'junior' },
  domain:    { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function(pwd) {
  return require('bcryptjs').compare(pwd, this.password);
};

module.exports = mongoose.model('User', UserSchema);


// // models/User.js
// const mongoose = require('mongoose');
// const bcrypt   = require('bcryptjs');

// const UserSchema = new mongoose.Schema({
//   name:      { type: String, required: true },
//   email:     { type: String, required: true, unique: true, lowercase: true },
//   password:  { type: String, required: true },
//   country:   { type: String, default: 'TN' },
//   level:     { type: String, default: 'junior' },
//   domain:    { type: String, default: '' },
//   createdAt: { type: Date, default: Date.now },
// });

// UserSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });

// UserSchema.methods.comparePassword = function(pwd) {
//   return require('bcryptjs').compare(pwd, this.password);
// };

// module.exports = mongoose.model('User', UserSchema);







// // models/User.js
// const mongoose = require('mongoose');
// const bcrypt   = require('bcryptjs');

// const UserSchema = new mongoose.Schema({
//   name:      { type: String, required: true },
//   email:     { type: String, required: true, unique: true, lowercase: true },
//   password:  { type: String, required: true },
//   country:   { type: String, default: 'TN' },
//   level:     { type: String, default: 'junior' },
//   domain:    { type: String, default: '' },
//   createdAt: { type: Date, default: Date.now },
// });

// UserSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 12);
//   next();
// });

// UserSchema.methods.comparePassword = function(pwd) {
//   return require('bcryptjs').compare(pwd, this.password);
// };

// module.exports = mongoose.model('User', UserSchema);