const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const shopOwnerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  pinHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['owner', 'staff'], default: 'owner' },
}, { timestamps: true });

// Method to compare entered PIN with stored hashed PIN
shopOwnerSchema.methods.matchPin = async function (enteredPin) {
  return await bcrypt.compare(enteredPin, this.pinHash);
};

// Middleware to hash PIN before saving (for initial setup or PIN changes)
shopOwnerSchema.pre('save', async function (next) {
  if (!this.isModified('pinHash')) { // Only hash if pinHash is being set/modified
    return next();
  }
  if (this.pinHash && this.pinHash.length < 30) { //簡易的なチェック、すでにハッシュ化されている場合は再ハッシュ化しない
     const salt = await bcrypt.genSalt(10);
     this.pinHash = await bcrypt.hash(this.pinHash, salt);
  }
  next();
});


module.exports = mongoose.model('ShopOwner', shopOwnerSchema);