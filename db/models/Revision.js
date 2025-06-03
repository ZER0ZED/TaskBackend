const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Revision model for document tracking system
 * Each document can have multiple revisions
 */
const RevisionSchema = new Schema({
  documentId: {
    type: Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  revisionNo: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  uploadedBy: {
    type: String,
    trim: true,
    default: 'System'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to ensure document + revisionNo uniqueness
RevisionSchema.index({ documentId: 1, revisionNo: 1 }, { unique: true });

module.exports = mongoose.model('Revision', RevisionSchema);
