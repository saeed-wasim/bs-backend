const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { AdminUser, Customer } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/login', async (req, res) => {
  const email = req.body?.email?.toString().trim().toLowerCase();
  const password = req.body?.password?.toString();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await AdminUser.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

router.post('/register', async (req, res) => {
  const name = req.body?.name?.toString().trim();
  const email = req.body?.email?.toString().trim().toLowerCase();
  const password = req.body?.password?.toString();

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  let customer = await Customer.findOne({ where: { email } });
  if (customer?.passwordHash) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (customer) {
    // Account was created via Google sign-in previously — attach a password
    // so the same customer can also log in with email/password.
    await customer.update({ passwordHash, name: customer.name || name });
  } else {
    customer = await Customer.create({ name, email, passwordHash });
  }

  const token = jwt.sign(
    { id: customer.id, email: customer.email, name: customer.name, role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({
    token,
    user: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      picture: customer.picture,
    },
  });
});

router.post('/customer-login', async (req, res) => {
  const email = req.body?.email?.toString().trim().toLowerCase();
  const password = req.body?.password?.toString();

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const customer = await Customer.findOne({ where: { email } });
  if (!customer) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!customer.passwordHash) {
    // This account was created via Google sign-in and has no password set —
    // "Invalid email or password" would be misleading since the email is valid.
    return res.status(401).json({
      error: 'This account signs in with Google. Use the Google button below, or register with this email to set a password.',
    });
  }

  const valid = await bcrypt.compare(password, customer.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: customer.id, email: customer.email, name: customer.name, role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({
    token,
    user: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      picture: customer.picture,
    },
  });
});

router.post('/google', async (req, res) => {
  const idToken = req.body?.idToken;

  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google sign-in is not configured' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Google token' });
  }

  if (!payload?.sub || !payload?.email) {
    return res.status(401).json({ error: 'Invalid Google token payload' });
  }

  let customer = await Customer.findOne({ where: { googleId: payload.sub } });

  if (!customer) {
    customer = await Customer.findOne({ where: { email: payload.email } });
  }

  if (customer) {
    await customer.update({
      googleId: payload.sub,
      name: customer.name || payload.name || payload.email,
      picture: payload.picture || customer.picture,
    });
  } else {
    customer = await Customer.create({
      googleId: payload.sub,
      name: payload.name || payload.email,
      email: payload.email,
      picture: payload.picture,
    });
  }

  const token = jwt.sign(
    { id: customer.id, email: customer.email, name: customer.name, role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({
    token,
    user: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      picture: customer.picture,
    },
  });
});

router.put('/password', authRequired, async (req, res) => {
  const oldPassword = req.body?.oldPassword?.toString();
  const newPassword = req.body?.newPassword?.toString();

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const user = await AdminUser.findByPk(req.adminUser.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await user.update({ passwordHash });

  res.json({ success: true });
});

router.get('/me', authRequired, async (req, res) => {
  const user = await AdminUser.findByPk(req.adminUser.id, {
    attributes: ['id', 'name', 'email'],
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

module.exports = router;
