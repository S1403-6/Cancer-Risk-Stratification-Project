const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  normalizedScore: Number,
  llmGeneratedReport: String,
  status: { type: String, default: 'Pending' },
  doctorVerification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorComments: String,
    doctorScore: Number,
    verificationDate: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
