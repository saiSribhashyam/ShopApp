const mongoose = require('mongoose');

const serviceRepairSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  itemDescription: { type: String, required: [true, "Item description is required"], trim: true },
  issueDescription: { type: String, required: [true, "Issue description is required"], trim: true },
  estimatedCost: { type: Number, min: 0 },
  actualCost: { type: Number, min: 0 },
  serviceStatus: {
    type: String,
    enum: ['Received', 'UnderRepair', 'AwaitingParts', 'RepairComplete', 'ReadyForCollection', 'Collected', 'CannotRepair', 'Cancelled'],
    default: 'Received',
  },
  dateReceived: { type: Date, default: Date.now },
  expectedCompletionDate: { type: Date },
  actualCompletionDate: { type: Date },
  notes: { type: String, trim: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopOwner', required: false }
}, { timestamps: true });

module.exports = mongoose.model('ServiceRepair', serviceRepairSchema);