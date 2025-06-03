const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Document model for the document tracking system
 * Each document has multiple revisions and is associated with a project
 */
const DocumentSchema = new Schema({
  projectCode: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  documentNo: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  contractDate: {
    type: Date,
    required: true
  },
  currentRevision: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Data Entered', 'Published'],
    default: 'Data Entered'
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Class Approved', 'Flag Approved', 'Not Approved'],
    default: 'Pending'
  },
  description: {
    type: String,
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);
