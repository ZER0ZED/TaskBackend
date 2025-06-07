const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Import models
const Document = require('../db/models/Document');
const Revision = require('../db/models/Revision');
const Remark = require('../db/models/Remark');

// Configure storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create directory if it doesn't exist
    const uploadPath = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create unique filename using documentNo, revision and original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// File filter to check for allowed file types
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    // Archives
    '.zip', '.rar', '.7z',
    // CAD files
    '.dwg', '.dxf',
    // Images
    '.jpg', '.jpeg', '.png'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Configure upload with file size limit (100MB)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

/**
 * @route   POST /api/documents
 * @desc    Create a new document with its first revision
 * @access  Private
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const {
      projectCode,
      type,
      documentNo,
      title,
      subject,
      contractDate,
      revisionNo,
      status,
      approvalStatus,
      description
    } = req.body;

    // Validate required fields
    if (!projectCode || !type || !documentNo || !title || !subject || !contractDate || !req.file) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create new document
    const newDocument = new Document({
      projectCode,
      type,
      documentNo,
      title,
      subject,
      contractDate,
      currentRevision: revisionNo || 0,
      status: status || 'Data Entered',
      approvalStatus: approvalStatus || 'Pending',
      description,
      createdBy: req.user ? req.user._id : null
    });

    // Save document
    const savedDocument = await newDocument.save();

    // Create first revision with file path
    const newRevision = new Revision({
      documentId: savedDocument._id,
      revisionNo: revisionNo || 0,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toLowerCase().substring(1), // Remove dot from extension
      fileSize: req.file.size,
      description: description || 'Initial revision',
      uploadedBy: req.user ? req.user._id : null
    });

    // Save revision
    await newRevision.save();

    res.status(201).json({
      success: true,
      document: savedDocument,
      revision: newRevision
    });
  } catch (error) {
    console.error('Error creating document:', error);
    
    // Handle duplicate document number
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Document number already exists' });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/documents
 * @desc    Get all documents with filters
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const {
      projectCode,
      type,
      status,
      approvalStatus,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter = {};

    if (projectCode) filter.projectCode = projectCode;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (approvalStatus) filter.approvalStatus = approvalStatus;

    // Date range filter
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    // Text search
    if (search) {
      filter.$or = [
        { documentNo: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    // Get documents with pagination without user population
    const documents = await Document.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalDocuments = await Document.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        total: totalDocuments,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalDocuments / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/documents/:id
 * @desc    Get a specific document with its revisions and remarks
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const documentId = req.params.id;

    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }

    // Get document
    const document = await Document.findById(documentId)
      .populate('createdBy', 'name');

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Get all revisions for this document
    const revisions = await Revision.find({ documentId })
      .sort({ revisionNo: -1 })
      .populate('uploadedBy', 'name');

    // Get all remarks for the most recent revision
    let remarks = [];
    if (revisions.length > 0) {
      remarks = await Remark.find({ revisionId: revisions[0]._id })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name');
    }

    res.json({
      document,
      revisions,
      remarks
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document metadata
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    const {
      projectCode,
      type,
      title,
      subject,
      contractDate,
      status,
      approvalStatus,
      description
    } = req.body;

    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }

    // Create update object
    const updateData = {};
    if (projectCode) updateData.projectCode = projectCode;
    if (type) updateData.type = type;
    if (title) updateData.title = title;
    if (subject) updateData.subject = subject;
    if (contractDate) updateData.contractDate = contractDate;
    if (status) updateData.status = status;
    if (approvalStatus) updateData.approvalStatus = approvalStatus;
    if (description) updateData.description = description;
    
    // Update timestamp
    updateData.updatedAt = Date.now();

    // Update document
    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedDocument) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({
      success: true,
      document: updatedDocument
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/documents/:id/revision
 * @desc    Add a new revision to a document
 * @access  Private
 */
router.post('/:id/revision', upload.single('file'), async (req, res) => {
  try {
    const documentId = req.params.id;
    const { revisionNo, description } = req.body;

    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }

    // Check if document exists
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Ensure we have a file
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if this revision number already exists
    const existingRevision = await Revision.findOne({
      documentId,
      revisionNo
    });

    if (existingRevision) {
      return res.status(400).json({ message: 'Revision number already exists for this document' });
    }

    // Create new revision
    const newRevision = new Revision({
      documentId,
      revisionNo,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).toLowerCase().substring(1),
      fileSize: req.file.size,
      description: description || `Revision ${revisionNo}`,
      uploadedBy: req.user ? req.user._id : null
    });

    // Save revision
    await newRevision.save();

    // Update document's current revision if this is higher
    if (parseInt(revisionNo) > document.currentRevision) {
      await Document.findByIdAndUpdate(documentId, {
        $set: {
          currentRevision: parseInt(revisionNo),
          updatedAt: Date.now()
        }
      });
    }

    res.status(201).json({
      success: true,
      revision: newRevision
    });
  } catch (error) {
    console.error('Error adding revision:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/documents/:id/revisions
 * @desc    Get all revisions for a specific document
 * @access  Private
 */
router.get('/:id/revisions', async (req, res) => {
  try {
    const documentId = req.params.id;

    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ message: 'Invalid document ID' });
    }

    // Get all revisions for this document
    const revisions = await Revision.find({ documentId })
      .sort({ revisionNo: -1 })
      .populate('uploadedBy', 'name');

    res.json(revisions);
  } catch (error) {
    console.error('Error fetching revisions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/documents/:id/remark
 * @desc    Add a remark to a specific revision
 * @access  Private
 */
router.post('/:id/remark', async (req, res) => {
  try {
    const revisionId = req.params.id;
    const { role, text } = req.body;

    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(revisionId)) {
      return res.status(400).json({ message: 'Invalid revision ID' });
    }

    // Validate role
    const validRoles = ['Owner', 'Design', 'Class', 'Flag'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if revision exists
    const revision = await Revision.findById(revisionId);
    if (!revision) {
      return res.status(404).json({ message: 'Revision not found' });
    }

    // Create new remark
    const newRemark = new Remark({
      revisionId,
      role,
      text,
      createdBy: req.user ? req.user._id : null
    });

    // Save remark
    await newRemark.save();

    res.status(201).json({
      success: true,
      remark: newRemark
    });
  } catch (error) {
    console.error('Error adding remark:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/documents/:id/remarks
 * @desc    Get remarks for a specific revision
 * @access  Private
 */
router.get('/:id/remarks', async (req, res) => {
  try {
    const revisionId = req.params.id;
    const { role } = req.query;

    // Validate object ID
    if (!mongoose.Types.ObjectId.isValid(revisionId)) {
      return res.status(400).json({ message: 'Invalid revision ID' });
    }

    // Build filter
    const filter = { revisionId };
    if (role) {
      filter.role = role;
    }

    // Get remarks
    const remarks = await Remark.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');

    res.json(remarks);
  } catch (error) {
    console.error('Error fetching remarks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/documents/summary
 * @desc    Get document summary statistics by project
 * @access  Private
 */
router.get('/summary/projects', async (req, res) => {
  try {
    // Aggregate documents by project
    const projectSummary = await Document.aggregate([
      {
        $group: {
          _id: '$projectCode',
          dataEntered: {
            $sum: { $cond: [{ $eq: ['$status', 'Data Entered'] }, 1, 0] }
          },
          published: {
            $sum: { $cond: [{ $eq: ['$status', 'Published'] }, 1, 0] }
          },
          classApproved: {
            $sum: { $cond: [{ $eq: ['$approvalStatus', 'Class Approved'] }, 1, 0] }
          },
          flagApproved: {
            $sum: { $cond: [{ $eq: ['$approvalStatus', 'Flag Approved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$approvalStatus', 'Pending'] }, 1, 0] }
          },
          notApproved: {
            $sum: { $cond: [{ $eq: ['$approvalStatus', 'Not Approved'] }, 1, 0] }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(projectSummary);
  } catch (error) {
    console.error('Error generating project summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/documents/file/:filePath
 * @desc    Download a file from filesystem by its path
 * @access  Private
 */
router.get('/file/:filePath', async (req, res) => {
  try {
    const filePath = req.params.filePath;
    
    // Set appropriate headers
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${filePath.split('/').pop()}"`);
    
    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    // Handle errors
    fileStream.on('error', () => {
      res.status(404).json({ message: 'File not found' });
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
