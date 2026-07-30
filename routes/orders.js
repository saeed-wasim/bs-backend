const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Order, OrderItem, Customer } = require('../models');
const { authRequired } = require('../middleware/auth');
const { customerAuthRequired } = require('../middleware/customerAuth');
const { wantsPagination, paginate } = require('../utils/paginate');
const { buildOrder, HttpError } = require('../utils/orderBuilder');

const router = express.Router();

router.post('/', customerAuthRequired, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const address = req.body?.address || {};
  const paymentMethod = req.body?.paymentMethod?.toString().trim() || null;

  const customer = await Customer.findByPk(req.customer.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  let created;
  try {
    created = await buildOrder({ customer, items, address, paymentMethod, paymentStatus: 'Paid' });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }

  const full = await Order.findByPk(created.id, {
    include: [{ model: OrderItem, as: 'items' }],
  });

  res.status(201).json(full);
});

router.get('/mine', customerAuthRequired, async (req, res) => {
  const orders = await Order.findAll({
    where: { customerId: req.customer.id },
    order: [['id', 'DESC']],
    include: [{ model: OrderItem, as: 'items' }],
  });
  res.json(orders);
});

// Must come before /:id so Express doesn't treat "new-count" as an order id.
router.get('/new-count', authRequired, async (req, res) => {
  const count = await Order.count({ where: { fulfillmentStatus: 'Processing' } });
  res.json({ count });
});

router.get('/:id', async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone', 'picture'] },
    ],
  });
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (process.env.REQUIRE_AUTH === 'false') {
    return res.json(order);
  }

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const isAdmin = decoded.role === 'admin';
  const isOwner = decoded.role === 'customer' && decoded.id === order.customerId;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json(order);
});

const FULFILLMENT_STATUSES = ['Processing', 'Shipped', 'Delivered'];

router.patch('/:id/status', authRequired, async (req, res) => {
  const status = req.body?.status?.toString();
  if (!FULFILLMENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${FULFILLMENT_STATUSES.join(', ')}` });
  }

  const order = await Order.findByPk(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.paymentStatus !== 'Paid' && status !== 'Processing') {
    return res.status(400).json({ error: 'Cannot ship or deliver an order until payment is confirmed' });
  }

  const now = new Date();
  const updates = { fulfillmentStatus: status };
  if (status === 'Processing') {
    updates.shippedAt = null;
    updates.deliveredAt = null;
  } else if (status === 'Shipped') {
    // Backfill so a stage skipped on the way here still gets a real timestamp
    // instead of inheriting whatever time the current stage was set.
    updates.shippedAt = order.shippedAt || now;
    updates.deliveredAt = null;
  } else if (status === 'Delivered') {
    updates.shippedAt = order.shippedAt || now;
    updates.deliveredAt = now;
  }

  await order.update(updates);

  const full = await Order.findByPk(order.id, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone', 'picture'] },
    ],
  });

  res.json(full);
});

router.get('/', authRequired, async (req, res) => {
  const search = req.query.search?.toString().trim();
  const where = {};
  if (search) {
    const numericId = parseInt(search.replace(/\D/g, ''), 10);
    where[Op.or] = [
      { '$customer.name$': { [Op.like]: `%${search}%` } },
      { '$customer.email$': { [Op.like]: `%${search}%` } },
      ...(Number.isNaN(numericId) ? [] : [{ id: numericId }]),
    ];
  }

  const orders = await Order.findAll({
    where,
    order: [['id', 'DESC']],
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone', 'picture'] },
    ],
  });

  if (wantsPagination(req)) {
    const result = paginate(orders, req);
    // Revenue must reflect every paid order, not just the current page's
    // slice, so it's totaled from the full set before paginate() slices it.
    result.totalRevenue = orders
      .filter((o) => o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + Number(o.total), 0);
    return res.json(result);
  }
  res.json(orders);
});

module.exports = router;
