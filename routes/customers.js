const express = require('express');
const { Op } = require('sequelize');
const { Customer, Order, OrderItem, Product, Category, sequelize } = require('../models');
const { authRequired } = require('../middleware/auth');
const { customerAuthRequired } = require('../middleware/customerAuth');
const { wantsPagination, paginate } = require('../utils/paginate');

const router = express.Router();

// Self-service routes for the logged-in customer's own profile. These sit
// before the admin gate below so a customer token can reach them.
router.get('/me', customerAuthRequired, async (req, res) => {
  const customer = await Customer.findByPk(req.customer.id, {
    attributes: ['id', 'name', 'email', 'phone', 'city', 'street', 'picture'],
  });
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

router.put('/me', customerAuthRequired, async (req, res) => {
  const customer = await Customer.findByPk(req.customer.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const name = req.body?.name?.toString().trim();
  const phone = req.body?.phone?.toString().trim();
  const city = req.body?.city?.toString().trim();
  const street = req.body?.street?.toString().trim();

  if (!name || !phone || !city || !street) {
    return res.status(400).json({ error: 'Name, phone, city, and street are required' });
  }

  Object.assign(customer, { name, phone, city, street });
  await customer.save();

  res.json(customer);
});

// Customer data is admin-only (PII) — every route below here requires a valid admin session.
router.use(authRequired);

router.get('/', async (req, res) => {
  const search = req.query.search?.toString().trim();
  const where = search
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};

  const customers = await Customer.findAll({ where, order: [['id', 'ASC']] });

  const orderStats = await Order.findAll({
    attributes: [
      'customerId',
      [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
      [sequelize.fn('SUM', sequelize.col('total')), 'totalSpent'],
    ],
    group: ['customerId'],
    raw: true,
  });
  const statsByCustomer = new Map(
    orderStats.map((s) => [s.customerId, { orderCount: parseInt(s.orderCount, 10), totalSpent: parseFloat(s.totalSpent) || 0 }])
  );

  const enriched = customers.map((c) => ({
    ...c.toJSON(),
    orderCount: statsByCustomer.get(c.id)?.orderCount || 0,
    totalSpent: statsByCustomer.get(c.id)?.totalSpent || 0,
  }));

  if (wantsPagination(req)) {
    return res.json(paginate(enriched, req));
  }
  res.json(enriched);
});

router.get('/:id', async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const orders = await Order.findAll({
    where: { customerId: customer.id },
    order: [['id', 'DESC']],
    include: [
      {
        model: OrderItem,
        as: 'items',
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name'],
            include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
          },
        ],
      },
    ],
  });

  const totalLifetimeSpent = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
  const orderCount = orders.length;
  const lastPurchaseDate = orders[0]?.createdAt || null;

  const categoryQty = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      const categoryName = item.product?.category?.name;
      if (!categoryName) continue;
      categoryQty.set(categoryName, (categoryQty.get(categoryName) || 0) + item.qty);
    }
  }
  let preferredCategory = null;
  let topQty = 0;
  for (const [name, qty] of categoryQty) {
    if (qty > topQty) {
      topQty = qty;
      preferredCategory = name;
    }
  }

  res.json({
    ...customer.toJSON(),
    stats: {
      totalLifetimeSpent,
      orderCount,
      lastPurchaseDate,
      preferredCategory,
    },
    orders: orders.map((o) => ({
      id: o.id,
      total: parseFloat(o.total),
      subtotal: parseFloat(o.subtotal),
      gst: parseFloat(o.gst),
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      createdAt: o.createdAt,
      items: (o.items || []).map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.name,
        image: i.image,
        color: i.color,
        size: i.size,
        price: parseFloat(i.price),
        qty: i.qty,
        categoryName: i.product?.category?.name || null,
      })),
    })),
  });
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
