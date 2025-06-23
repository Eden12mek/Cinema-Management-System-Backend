const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  
  amount: { type: Number, required: true },
  tx_ref: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', paymentSchema);