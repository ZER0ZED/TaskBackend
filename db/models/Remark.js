const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Remark model for document tracking system
 * Stores comments from different roles (Owner, Design, Class, Flag)
 */
const RemarkSchema = new Schema({
  revisionId: {
    type: Schema.Types.ObjectId,
    ref: 'Revision',
    required: true
  },
  role: {
    type: String,
    enum: ['Owner', 'Design', 'Class', 'Flag'],
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: String,
    trim: true,
    default: 'System'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('DocumentRemark', RemarkSchema);
