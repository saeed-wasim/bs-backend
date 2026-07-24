const express = require('express');
const { Customer } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Customer data is admin-only (PII) — every route here requires a valid admin session.
router.use(authRequired);

router.get('/', async (req, res) => {
  const customers = await Customer.findAll({ order: [['id', 'ASC']] });
  res.json(customers);
});

router.post('/', async (req, res) => {
  const name = req.body?.name?.toString().trim();
  const email = req.body?.email?.toString().trim();
  const phone = req.body?.phone?.toString().trim();
  const city = req.body?.city?.toString().trim();

  if (!name || !email || !phone || !city) {
    return res.status(400).json({ error: 'All customer fields are required' });
  }

  const customer = await Customer.create({ name, email, phone, city });
  res.status(201).json(customer);
});

router.put('/:id', async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const name = req.body?.name?.toString().trim();
  const email = req.body?.email?.toString().trim();
  const phone = req.body?.phone?.toString().trim();
  const city = req.body?.city?.toString().trim();

  if (!name || !email || !phone || !city) {
    return res.status(400).json({ error: 'All customer fields are required' });
  }

  Object.assign(customer, { name, email, phone, city });
  await customer.save();

  res.json(customer);
});

router.delete('/:id', async (req, res) => {
  const deleted = await Customer.destroy({ where: { id: req.params.id } });
  if (!deleted) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json({ success: true });
});

module.exports = router;
