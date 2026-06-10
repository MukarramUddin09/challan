const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Division = require('../models/Division');
const Challan = require('../models/Challan');
const { authenticate, authorize } = require('../middleware/auth');
const { sendChallanEmail, buildChallanEmailHTML } = require('../utils/email');
const { generateChallanPdf } = require('../utils/pdfGenerator');

const router = express.Router();

// Configure multer for photo upload
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// New challans persist the exact filename. The strict notice-number fallback
// only exists for records created before photoFilename was introduced.
function findPhotoForChallan(challan) {
  if (challan.photoFilename) {
    const exactPath = path.join(uploadsDir, path.basename(challan.photoFilename));
    return fs.existsSync(exactPath) ? path.basename(challan.photoFilename) : null;
  }

  const safeNotice = String(challan.noticeNumber).replace(/\//g, '-');
  const legacyPattern = new RegExp(`^${escapeRegExp(safeNotice)}\\.(?:jpe?g|png)$`, 'i');

  try {
    const files = fs.readdirSync(uploadsDir);
    const found = files.find((filename) => legacyPattern.test(filename));
    return found || null;
  } catch (e) {
    return null;
  }
}

const parseFineAmount = (input) => {
  const normalized = String(input ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isSafeInteger(Math.round(amount * 100)) || amount < 0) {
    return null;
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

/**
 * Generate unique notice number: GHMC/{division}/{sequence}
 */
async function generateNoticeNumber(division) {
  const count = await Challan.countDocuments({ division });
  const sequence = String(count + 1).padStart(5, '0');
  return `GHMC/${division}/${sequence}`;
}

/**
 * GET /api/challans
 * List challans. Admin sees all, worker sees own division only.
 * Query params: page, limit, division, search, startDate, endDate, violationType
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      division,
      search,
      startDate,
      endDate,
      violationType
    } = req.query;

    const filter = {};

    // Workers can only see their own division
    if (req.user.role === 'worker') {
      filter.division = req.user.division;
    } else if (division) {
      filter.division = division;
    }

    // Search by violator name or notice number
    if (search) {
      filter.$or = [
        { violatorName: { $regex: search, $options: 'i' } },
        { noticeNumber: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.dateTime = {};
      if (startDate) filter.dateTime.$gte = new Date(startDate);
      if (endDate) filter.dateTime.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Violation type filter
    if (violationType) {
      filter.violationType = { $in: [violationType] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Challan.countDocuments(filter);
    const challans = await Challan.find(filter)
      .populate('createdBy', 'name email division')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        challans,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (err) {
    console.error('List challans error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching challans.' });
  }
});

/**
 * POST /api/challans
 * Create a new challan with optional photo upload.
 */
router.post('/', authenticate, authorize('worker', 'admin'), upload.single('photo'), async (req, res) => {
  try {
    console.log('--- Create Challan Request Received ---');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body keys:', Object.keys(req.body));
    if (req.file) console.log('Uploaded file:', req.file.originalname, req.file.mimetype, req.file.size);
    else console.log('No file uploaded');

    const {
      division,
      location,
      violatorName,
      violatorPhone,
      wardNumber,
      wardName,
      violationType,
      fineAmount,
      officerName,
      officerDesignation,
      dateTime,
      type
    } = req.body;

    // Parse violationType (sent as JSON string from FormData)
    let parsedViolations;
    try {
      parsedViolations = typeof violationType === 'string'
        ? JSON.parse(violationType)
        : violationType;
    } catch {
      parsedViolations = Array.isArray(violationType) ? violationType : [violationType];
    }

    if (!parsedViolations || parsedViolations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one violation type must be selected.'
      });
    }

    if (!violatorPhone) {
      return res.status(400).json({
        success: false,
        message: 'Violator phone number is required.'
      });
    }

    if (!wardNumber || !wardName) {
      return res.status(400).json({
        success: false,
        message: 'Ward number and ward name are required.'
      });
    }

    const parsedFineAmount = parseFineAmount(fineAmount);
    if (parsedFineAmount === null) {
      return res.status(400).json({
        success: false,
        message: 'Fine amount must be a valid non-negative number with up to 2 decimal places.'
      });
    }

    // Generate notice number
    const useDivision = req.user.role === 'worker'
      ? req.user.division
      : division || req.user.division;
    const noticeNumber = await generateNoticeNumber(useDivision);

    const divisionDoc = await Division.findOne({ name: useDivision });
    const divisionCode = divisionDoc?.code || '';

    const challanData = {
      noticeNumber,
      division: useDivision,
      divisionCode,
      wardNumber,
      wardName,
      location,
      violatorName,
      violatorPhone,
      violationType: parsedViolations,
      fineAmount: parsedFineAmount,
      officerName,
      officerDesignation,
      dateTime: dateTime ? new Date(dateTime) : new Date(),
      type: type || 'Challan',
      createdBy: req.user._id
    };

    const challan = new Challan(challanData);
    await challan.save();

    if (req.file) {
      const ext = req.file.mimetype === 'image/png' ? '.png' : '.jpg';
      const photoFilename = `${challan._id}${ext}`;
      const photoPath = path.join(uploadsDir, photoFilename);

      try {
        fs.writeFileSync(photoPath, req.file.buffer, { flag: 'wx' });
        challan.photoFilename = photoFilename;
        await challan.save();
      } catch (photoError) {
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
        await Challan.findByIdAndDelete(challan._id);
        throw new Error(`Failed to store photo evidence: ${photoError.message}`);
      }
    }

    const populated = await Challan.findById(challan._id)
      .populate('createdBy', 'name email division');

    // Include the exact photo associated with this challan.
    const populatedObj = populated.toObject();
    const foundPhoto = findPhotoForChallan(populatedObj);
    populatedObj.photoUrl = foundPhoto ? `/uploads/${foundPhoto}` : null;

    res.status(201).json({
      success: true,
      message: 'Challan created successfully!',
      data: { challan: populatedObj }
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (err.message && err.message.includes('Only JPEG')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('Create challan error:', err);
    res.status(500).json({ success: false, message: 'Server error creating challan.' });
  }
});

/**
 * GET /api/challans/:id
 * Get single challan detail
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const challanDoc = await Challan.findById(req.params.id)
      .populate('createdBy', 'name email division');

    if (!challanDoc) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    // Workers can only see challans from their division
    if (req.user.role === 'worker' && challanDoc.division !== req.user.division) {
      return res.status(403).json({
        success: false,
        message: 'You can only view challans from your division.'
      });
    }

    // Attach photoUrl for the filename persisted on this challan.
    const challan = challanDoc.toObject();
    const found = findPhotoForChallan(challan);
    challan.photoUrl = found ? `/uploads/${found}` : null;

    res.json({ success: true, data: { challan } });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid challan ID.' });
    }
    console.error('Get challan error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching challan.' });
  }
});

/**
 * POST /api/challans/:id/send-email
 * Send challan email with photo attachment to selected recipients
 */
router.post('/:id/send-email', authenticate, async (req, res) => {
  try {
    const { recipientEmails } = req.body;

    if (!recipientEmails || recipientEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one recipient email is required.'
      });
    }

    const challan = await Challan.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    // Build email content
    const subject = `GHMC Challan Notice - ${challan.violatorName} - ${new Date(challan.dateTime).toLocaleDateString('en-IN')}`;
    const html = buildChallanEmailHTML(challan);

    // Prepare the photo attached to this exact challan.
    let attachment = null;
    const foundPhoto = findPhotoForChallan(challan);
    if (foundPhoto) {
      const photoPath = path.join(uploadsDir, foundPhoto);
      if (fs.existsSync(photoPath)) {
        attachment = {
          filename: foundPhoto,
          path: photoPath
        };
      }
    }

    // Send email
    await sendChallanEmail({
      to: recipientEmails,
      subject,
      html,
      attachment
    });

    // Update challan record
    challan.sentToEmails = recipientEmails;
    challan.emailSentAt = new Date();
    await challan.save();

    res.json({
      success: true,
      message: 'Challan email sent successfully!',
      data: { emailSentAt: challan.emailSentAt }
    });
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({
      success: false,
      message: `Failed to send email: ${err.message}`
    });
  }
});

/**
 * POST /api/challans/:id/generate-pdf
 * Generate and return PDF buffer
 */
router.post('/:id/generate-pdf', authenticate, async (req, res) => {
  try {
    const challan = await Challan.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    // Read photo as base64 if a matching file exists on disk
    let photoBase64 = null;
    const foundPhotoForPdf = findPhotoForChallan(challan);
    if (foundPhotoForPdf) {
      const photoPath = path.join(uploadsDir, foundPhotoForPdf);
      if (fs.existsSync(photoPath)) {
        const photoBuffer = fs.readFileSync(photoPath);
        const ext = path.extname(foundPhotoForPdf).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.png') mime = 'image/png';
        photoBase64 = `data:${mime};base64,${photoBuffer.toString('base64')}`;
      }
    }

    const filename = `GHMC-${challan.type || 'Challan'}-${challan.noticeNumber.replace(/\//g, '-')}.pdf`;

    try {
      const pdfBuffer = await generateChallanPdf(challan, photoBase64);

      res.type('application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(Buffer.from(pdfBuffer));

    } catch (pdfErr) {
      console.error('PDF generation failed:', pdfErr);
      return res.status(500).json({
        success: false,
        message: 'Unable to generate PDF at this time. Please try again later or use the challan preview.'
      });
    }

  } catch (err) {
    console.error('Generate PDF error:', err);
    res.status(500).json({
      success: false,
      message: `Failed to generate document: ${err.message}`
    });
  }
});

// Multer error handling middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the maximum limit of 5MB.'
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.message && err.message.includes('Only JPEG')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;
