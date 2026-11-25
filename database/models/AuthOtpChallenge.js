const mongoose = require('mongoose');

const authOtpChallengeSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ['signup', 'login', 'password-reset'], required: true },
  name: { type: String, trim: true, maxlength: 80 },
  passwordHash: { type: String, select: false },
  otpHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0, min: 0, max: 5 },
  expiresAt: { type: Date, required: true },
  resendAfter: { type: Date, required: true }
}, { timestamps: true });

authOtpChallengeSchema.index({ email: 1, purpose: 1 }, { unique: true });
authOtpChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuthOtpChallenge', authOtpChallengeSchema);
