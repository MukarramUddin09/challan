const express = require('express');
const User = require('../models/User');
const Challan = require('../models/Challan');
const { getIndiaDateRange, getIndiaTodayRange } = require('../utils/dateTime');
const EmailRecipient = require('../models/EmailRecipient');
const Violation = require('../models/Violation');
const Division = require('../models/Division');
const { authenticate, authorize } = require('../middleware/auth');
const { generateReportPdf } = require('../utils/pdfGenerator');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

/**
 * GET /api/admin/users
 * List all registered users
 */
router.get('/users', async (req, res) => {
  try {
    const { status, division } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (division) filter.division = division;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { users }
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching users.' });
  }
});

/**
 * PATCH /api/admin/users/:id/approve
 * Approve a pending worker
 */
router.patch('/users/:id/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot modify admin status.' });
    }

    user.status = 'approved';
    await user.save();

    res.json({
      success: true,
      message: `${user.name} has been approved.`,
      data: { user: user.toJSON() }
    });
  } catch (err) {
    console.error('Approve user error:', err);
    res.status(500).json({ success: false, message: 'Server error approving user.' });
  }
});

/**
 * PATCH /api/admin/users/:id/revoke
 * Revoke a worker's access
 */
router.patch('/users/:id/revoke', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot revoke admin access.' });
    }

    user.status = 'revoked';
    await user.save();

    res.json({
      success: true,
      message: `${user.name}'s access has been revoked.`,
      data: { user: user.toJSON() }
    });
  } catch (err) {
    console.error('Revoke user error:', err);
    res.status(500).json({ success: false, message: 'Server error revoking user.' });
  }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalChallans = await Challan.countDocuments();

    // Challans by division
    const byDivision = await Challan.aggregate([
      {
        $group: {
          _id: '$division',
          count: { $sum: 1 },
          totalFines: { $sum: '$fineAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Total fines
    const totalFinesResult = await Challan.aggregate([
      { $group: { _id: null, total: { $sum: '$fineAmount' } } }
    ]);
    const totalFines = totalFinesResult.length > 0 ? totalFinesResult[0].total : 0;

    // Recent challans (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentChallans = await Challan.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // User stats
    const totalUsers = await User.countDocuments();
    const pendingUsers = await User.countDocuments({ status: 'pending' });
    const approvedWorkers = await User.countDocuments({ role: 'worker', status: 'approved' });

    // Emails sent
    const emailsSent = await Challan.countDocuments({ emailSentAt: { $ne: null } });

    // Violations sent today (emails sent today)
    const { start: startOfToday, end: endOfToday } = getIndiaTodayRange();
    const violationsSentToday = await Challan.countDocuments({
      emailSentAt: { $gte: startOfToday, $lte: endOfToday }
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalChallans,
          totalFines,
          recentChallans,
          byDivision,
          totalUsers,
          pendingUsers,
          approvedWorkers,
          emailsSent,
          violationsSentToday
        }
      }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching stats.' });
  }
});

/**
 * GET /api/admin/emails
 * List all email recipients
 */
router.get('/emails', async (req, res) => {
  try {
    const recipients = await EmailRecipient.find().sort({ createdAt: -1 });
    res.json({ success: true, data: { recipients } });
  } catch (err) {
    console.error('List emails error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching email recipients.' });
  }
});

/**
 * POST /api/admin/emails
 * Add a new email recipient
 */
router.post('/emails', async (req, res) => {
  try {
    const { name, email, division } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required.'
      });
    }

    // Check duplicate
    const existing = await EmailRecipient.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This email recipient already exists.'
      });
    }

    const recipient = new EmailRecipient({ name, email, division: division || null });
    await recipient.save();

    res.status(201).json({
      success: true,
      message: 'Email recipient added successfully.',
      data: { recipient }
    });
  } catch (err) {
    console.error('Add email error:', err);
    res.status(500).json({ success: false, message: 'Server error adding email recipient.' });
  }
});

/**
 * PATCH /api/admin/emails/:id
 * Toggle email recipient active status
 */
router.patch('/emails/:id', async (req, res) => {
  try {
    const recipient = await EmailRecipient.findById(req.params.id);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    recipient.isActive = !recipient.isActive;
    await recipient.save();

    res.json({
      success: true,
      message: `Recipient ${recipient.isActive ? 'activated' : 'deactivated'}.`,
      data: { recipient }
    });
  } catch (err) {
    console.error('Toggle email error:', err);
    res.status(500).json({ success: false, message: 'Server error updating recipient.' });
  }
});

/**
 * DELETE /api/admin/emails/:id
 * Remove email recipient
 */
router.delete('/emails/:id', async (req, res) => {
  try {
    const recipient = await EmailRecipient.findByIdAndDelete(req.params.id);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    res.json({
      success: true,
      message: 'Email recipient removed.',
      data: { recipient }
    });
  } catch (err) {
    console.error('Delete email error:', err);
    res.status(500).json({ success: false, message: 'Server error removing recipient.' });
  }
});

/**
 * GET /api/admin/worker-stats
 * Stats filtered for a specific division (also available for workers)
 */
router.get('/division-stats/:division', async (req, res) => {
  try {
    const { division } = req.params;

    const totalChallans = await Challan.countDocuments({ division });

    const totalFinesResult = await Challan.aggregate([
      { $match: { division } },
      { $group: { _id: null, total: { $sum: '$fineAmount' } } }
    ]);
    const totalFines = totalFinesResult.length > 0 ? totalFinesResult[0].total : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentChallans = await Challan.countDocuments({
      division,
      createdAt: { $gte: sevenDaysAgo }
    });

    const emailsSent = await Challan.countDocuments({
      division,
      emailSentAt: { $ne: null }
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalChallans,
          totalFines,
          recentChallans,
          emailsSent,
          division
        }
      }
    });
  } catch (err) {
    console.error('Division stats error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching division stats.' });
  }
});

/**
 * GET /api/admin/violations
 * List all violations
 */
router.get('/violations', async (req, res) => {
  try {
    const violations = await Violation.find().sort({ name: 1 });
    res.json({ success: true, data: { violations } });
  } catch (err) {
    console.error('List violations error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching violations.' });
  }
});

/**
 * POST /api/admin/violations
 * Add a new violation type
 */
router.post('/violations', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Violation name is required.'
      });
    }

    // Check duplicate
    const existing = await Violation.findOne({ name: name.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This violation type already exists.'
      });
    }

    const violation = new Violation({ name, description });
    await violation.save();

    res.status(201).json({
      success: true,
      message: 'Violation type added successfully.',
      data: { violation }
    });
  } catch (err) {
    console.error('Add violation error:', err);
    res.status(500).json({ success: false, message: 'Server error adding violation.' });
  }
});

/**
 * PATCH /api/admin/violations/:id
 * Update or toggle violation status
 */
router.patch('/violations/:id', async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const violation = await Violation.findById(req.params.id);
    
    if (!violation) {
      return res.status(404).json({ success: false, message: 'Violation not found.' });
    }

    if (name) violation.name = name;
    if (description !== undefined) violation.description = description;
    if (isActive !== undefined) violation.isActive = isActive;
    
    await violation.save();

    res.json({
      success: true,
      message: 'Violation updated successfully.',
      data: { violation }
    });
  } catch (err) {
    console.error('Update violation error:', err);
    res.status(500).json({ success: false, message: 'Server error updating violation.' });
  }
});

/**
 * DELETE /api/admin/violations/:id
 * Delete a violation type
 */
router.delete('/violations/:id', async (req, res) => {
  try {
    const violation = await Violation.findByIdAndDelete(req.params.id);
    if (!violation) {
      return res.status(404).json({ success: false, message: 'Violation not found.' });
    }

    res.json({
      success: true,
      message: 'Violation deleted successfully.',
      data: { violation }
    });
  } catch (err) {
    console.error('Delete violation error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting violation.' });
  }
});

/**
 * POST /api/admin/reports
 * Generate violations report PDF for a date range
 */
router.post('/reports', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
    }

    const { start, end } = getIndiaDateRange(startDate, endDate);

    const challans = await Challan.find({ dateTime: { $gte: start, $lte: end } }).sort({ dateTime: -1 }).lean();

    const filename = `GHMC-Violations-Report-${startDate}-${endDate}.pdf`;

    const pdfBuffer = await generateReportPdf(challans, start, end);

    res.type('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate report.' });
  }
});

/**
 * GET /api/admin/divisions
 * List all divisions
 */
router.get('/divisions', async (req, res) => {
  try {
    const divisions = await Division.find().sort({ name: 1 });
    res.json({ success: true, data: { divisions } });
  } catch (err) {
    console.error('List divisions error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching divisions.' });
  }
});

/**
 * POST /api/admin/divisions
 * Add a new division
 */
router.post('/divisions', async (req, res) => {
  try {
    const { name, code, description, wards } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Division name is required.'
      });
    }

    // Check duplicate
    const existing = await Division.findOne({ name: name.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This division already exists.'
      });
    }

    const normalizedWards = Array.isArray(wards)
      ? wards.map((ward) => ({
          number: String(ward.number || ward.wardNumber || '').trim(),
          name: String(ward.name || '').trim(),
          isActive: ward.isActive !== false
        })).filter((ward) => ward.number && ward.name)
      : [];

    const division = new Division({ name, code, description, wards: normalizedWards });
    await division.save();

    res.status(201).json({
      success: true,
      message: 'Division added successfully.',
      data: { division }
    });
  } catch (err) {
    console.error('Add division error:', err);
    res.status(500).json({ success: false, message: 'Server error adding division.' });
  }
});

/**
 * PATCH /api/admin/divisions/:id
 * Update or toggle division status
 */
router.patch('/divisions/:id', async (req, res) => {
  try {
    const { name, code, description, isActive, wards } = req.body;
    const division = await Division.findById(req.params.id);
    
    if (!division) {
      return res.status(404).json({ success: false, message: 'Division not found.' });
    }

    if (name) division.name = name;
    if (code !== undefined) division.code = code;
    if (description !== undefined) division.description = description;
    if (isActive !== undefined) division.isActive = isActive;

    if (Array.isArray(wards)) {
      division.wards = wards.map((ward) => ({
        number: String(ward.number || ward.wardNumber || '').trim(),
        name: String(ward.name || '').trim(),
        isActive: ward.isActive !== false
      })).filter((ward) => ward.number && ward.name);
    }
    
    await division.save();

    res.json({
      success: true,
      message: 'Division updated successfully.',
      data: { division }
    });
  } catch (err) {
    console.error('Update division error:', err);
    res.status(500).json({ success: false, message: 'Server error updating division.' });
  }
});

/**
 * DELETE /api/admin/divisions/:id
 * Delete a division
 */
router.delete('/divisions/:id', async (req, res) => {
  try {
    const division = await Division.findByIdAndDelete(req.params.id);
    if (!division) {
      return res.status(404).json({ success: false, message: 'Division not found.' });
    }

    res.json({
      success: true,
      message: 'Division deleted successfully.',
      data: { division }
    });
  } catch (err) {
    console.error('Delete division error:', err);
    res.status(500).json({ success: false, message: 'Server error deleting division.' });
  }
});

module.exports = router;
