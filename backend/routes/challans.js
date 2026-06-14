const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Division = require('../models/Division');
const Challan = require('../models/Challan');
const { authenticate, authorize } = require('../middleware/auth');
const { sendChallanEmail, buildChallanEmailHTML } = require('../utils/email');
const { generateChallanPdf, generateChallansPdf } = require('../utils/pdfGenerator');
const { formatDate, getIndiaDateRange } = require('../utils/dateTime');

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

const parseViolations = (violationType) => {
  try {
    return typeof violationType === 'string'
      ? JSON.parse(violationType)
      : violationType;
  } catch {
    return Array.isArray(violationType) ? violationType : [violationType];
  }
};

const canAccessChallan = (user, challan) => (
  user.role === 'admin' || challan.division === user.division
);

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};
const phoneSearchPattern = (value) => normalizePhone(value)
  .split('')
  .map(escapeRegExp)
  .join('\\D*');

const readPhotoAsDataUri = (challan) => {
  const filename = findPhotoForChallan(challan);
  if (!filename) return null;

  const photoPath = path.join(uploadsDir, filename);
  if (!fs.existsSync(photoPath)) return null;

  const ext = path.extname(filename).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(photoPath).toString('base64')}`;
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

    // Search by violator name, phone, notice number, or location
    if (search) {
      const phonePattern = phoneSearchPattern(search);
      filter.$or = [
        { violatorName: { $regex: escapeRegExp(search), $options: 'i' } },
        ...(phonePattern.length >= 7
          ? [{ violatorPhone: { $regex: phonePattern, $options: 'i' } }]
          : []),
        { noticeNumber: { $regex: escapeRegExp(search), $options: 'i' } },
        { location: { $regex: escapeRegExp(search), $options: 'i' } }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.dateTime = {};
      const range = getIndiaDateRange(startDate || endDate, endDate || startDate);
      if (startDate) filter.dateTime.$gte = range.start;
      if (endDate) filter.dateTime.$lte = range.end;
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
      type,
      officerNote
    } = req.body;

    // Parse violationType (sent as JSON string from FormData)
    const parsedViolations = parseViolations(violationType);

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
      officerNote: officerNote || '',
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
 * PUT /api/challans/:id
 * Update challan details and optionally replace or remove photo evidence.
 */
router.put('/:id', authenticate, authorize('worker', 'admin'), upload.single('photo'), async (req, res) => {
  let newPhotoPath = null;

  try {
    const challan = await Challan.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }

    if (!canAccessChallan(req.user, challan)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit challans from your division.'
      });
    }

    const parsedViolations = parseViolations(req.body.violationType);
    if (!Array.isArray(parsedViolations) || parsedViolations.filter(Boolean).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one violation type must be selected.'
      });
    }

    const parsedFineAmount = parseFineAmount(req.body.fineAmount);
    if (parsedFineAmount === null) {
      return res.status(400).json({
        success: false,
        message: 'Fine amount must be a valid non-negative number with up to 2 decimal places.'
      });
    }

    const targetDivision = req.user.role === 'admin'
      ? req.body.division
      : req.user.division;

    if (!targetDivision || !req.body.wardNumber || !req.body.wardName || !req.body.violatorPhone) {
      return res.status(400).json({
        success: false,
        message: 'Division, ward details, and violator phone number are required.'
      });
    }

    const divisionDoc = await Division.findOne({ name: targetDivision });
    const oldPhotoFilename = findPhotoForChallan(challan);
    let nextPhotoFilename = challan.photoFilename;

    if (req.file) {
      const ext = req.file.mimetype === 'image/png' ? '.png' : '.jpg';
      nextPhotoFilename = `${challan._id}-${Date.now()}${ext}`;
      newPhotoPath = path.join(uploadsDir, nextPhotoFilename);
      fs.writeFileSync(newPhotoPath, req.file.buffer, { flag: 'wx' });
    } else if (String(req.body.removePhoto).toLowerCase() === 'true') {
      nextPhotoFilename = null;
    }

    Object.assign(challan, {
      division: targetDivision,
      divisionCode: divisionDoc?.code || '',
      wardNumber: req.body.wardNumber,
      wardName: req.body.wardName,
      location: req.body.location,
      violatorName: req.body.violatorName,
      violatorPhone: req.body.violatorPhone,
      violationType: parsedViolations.filter(Boolean),
      fineAmount: parsedFineAmount,
      officerName: req.body.officerName,
      officerDesignation: req.body.officerDesignation,
      dateTime: req.body.dateTime ? new Date(req.body.dateTime) : challan.dateTime,
      type: req.body.type || challan.type,
      legalText: req.body.legalText,
      officerNote: req.body.officerNote || '',
      photoFilename: nextPhotoFilename
    });

    await challan.save();
    newPhotoPath = null;

    if ((req.file || nextPhotoFilename === null) && oldPhotoFilename) {
      const oldPhotoPath = path.join(uploadsDir, path.basename(oldPhotoFilename));
      if (fs.existsSync(oldPhotoPath) && oldPhotoPath !== newPhotoPath) {
        try {
          fs.unlinkSync(oldPhotoPath);
        } catch (cleanupError) {
          console.warn('Unable to remove previous challan photo:', cleanupError.message);
        }
      }
    }

    const populated = await Challan.findById(challan._id)
      .populate('createdBy', 'name email division');
    const updated = populated.toObject();
    const foundPhoto = findPhotoForChallan(updated);
    updated.photoUrl = foundPhoto ? `/uploads/${foundPhoto}` : null;

    res.json({
      success: true,
      message: 'Challan updated successfully!',
      data: { challan: updated }
    });
  } catch (err) {
    if (newPhotoPath && fs.existsSync(newPhotoPath)) {
      fs.unlinkSync(newPhotoPath);
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid challan ID.' });
    }
    console.error('Update challan error:', err);
    res.status(500).json({ success: false, message: 'Server error updating challan.' });
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
    if (!canAccessChallan(req.user, challanDoc)) {
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
    if (!canAccessChallan(req.user, challan)) {
      return res.status(403).json({
        success: false,
        message: 'You can only send challans from your division.'
      });
    }

    // Build email content
    const subject = `GHMC ${challan.type === 'Fine' ? 'Notice' : 'Challan'} - ${challan.violatorName} - ${formatDate(challan.dateTime)}`;
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
 * POST /api/challans/print-by-phone
 * Generate one PDF containing all challans for an exact violator phone number.
 */
router.post('/print-by-phone', authenticate, async (req, res) => {
  try {
    const phone = normalizePhone(req.body.violatorPhone);
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Violator phone number is required.' });
    }

    const accessFilter = req.user.role === 'worker' ? { division: req.user.division } : {};
    const candidates = await Challan.find(accessFilter).sort({ dateTime: -1 });
    const challans = candidates.filter(item => normalizePhone(item.violatorPhone) === phone);

    if (challans.length <= 3) {
      return res.status(400).json({
        success: false,
        message: 'More than 3 challans are required for combined printing.'
      });
    }

    const entries = challans.map(challan => ({
      challan,
      photoBase64: readPhotoAsDataUri(challan)
    }));
    const pdfBuffer = await generateChallansPdf(entries);

    res.type('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="GHMC-Challans-${phone}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Bulk challan PDF error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate combined challan PDF.' });
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
    if (!canAccessChallan(req.user, challan)) {
      return res.status(403).json({
        success: false,
        message: 'You can only generate challans from your division.'
      });
    }

    // Read photo as base64 if a matching file exists on disk
    const photoBase64 = readPhotoAsDataUri(challan);

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
