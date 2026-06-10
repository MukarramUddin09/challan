const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailRecipient = require('../models/EmailRecipient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Default email recipients to seed on first admin creation
const DEFAULT_RECIPIENTS = [
  { name: 'Commissioner GHMC', email: 'commissioner@ghmc.gov.in' },
  { name: 'Zonal Commissioner', email: 'zonal@ghmc.gov.in' },
  { name: 'Deputy Commissioner', email: 'dy.commissioner@ghmc.gov.in' },
  { name: 'Circle Inspector', email: 'inspector@ghmc.gov.in' }
];

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Set token cookie
const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

/**
 * POST /api/auth/register
 * Register a new user. First user becomes admin (auto-approved).
 * All subsequent users are workers (pending approval).
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, division } = req.body;

    // Validate required fields
    if (!name || !email || !password || !division) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, password, division'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Determine role: first user = admin, rest = worker
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    const user = new User({
      name,
      email,
      password,
      division,
      role: isFirstUser ? 'admin' : 'worker',
      status: isFirstUser ? 'approved' : 'pending'
    });

    await user.save();

    // Seed default email recipients on first user (admin) creation
    if (isFirstUser) {
      const existingRecipients = await EmailRecipient.countDocuments();
      if (existingRecipients === 0) {
        await EmailRecipient.insertMany(DEFAULT_RECIPIENTS);
      }
    }

    // Generate JWT and set cookie
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: isFirstUser
        ? 'Admin account created successfully!'
        : 'Registration successful! Your account is pending admin approval.',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }
    console.error('Register error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during registration.'
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password. Returns JWT.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check account status
    if (user.status === 'revoked') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been revoked. Contact the administrator.'
      });
    }

    if (user.status === 'pending' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending admin approval.'
      });
    }

    // Generate JWT and set cookie
    const token = generateToken(user._id);
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        user: user.toJSON(),
        token
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login.'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: { user: req.user.toJSON() }
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user info.'
    });
  }
});

/**
 * POST /api/auth/logout
 * Clear auth cookie
 */
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;
