const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { AdminUser } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

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
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
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
