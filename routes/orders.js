const express = require('express');
const jwt = require('jsonwebtoken');
const { Order, OrderItem, Product, Customer, sequelize } = require('../models');
const { authRequired } = require('../middleware/auth');
const { customerAuthRequired } = require('../middleware/customerAuth');
const { wantsPagination, paginate } = require('../utils/paginate');

const router = express.Router();

const GST_RATE = 0.03;

router.post('/', customerAuthRequired, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const address = req.body?.address || {};
  const paymentMethod = req.body?.paymentMethod?.toString().trim() || null;

  if (items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }

  const name = address.name?.toString().trim();
  const phone = address.phone?.toString().trim();
  const city = address.city?.toString().trim();
  const street = address.street?.toString().trim();

  if (!name || !phone || !city || !street) {
    return res.status(400).json({ error: 'Delivery address (name, phone, city, street) is required' });
  }

  const customer = await Customer.findByPk(req.customer.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const productIds = items.map((item) => parseInt(item.productId, 10));
  const products = await Product.findAll({ where: { id: productIds } });
  const productsById = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = productsById.get(parseInt(item.productId, 10));
    if (!product) {
      return res.status(400).json({ error: `Product ${item.productId} not found` });
    }
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    subtotal += parseFloat(product.price) * qty;
    orderItemsData.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      color: product.color,
      size: item.size ? item.size.toString() : null,
      price: product.price,
      qty,
    });
  }

  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const shipping = 0;
  const total = subtotal + gst + shipping;

  const created = await sequelize.transaction(async (t) => {
    const order = await Order.create(
      {
        customerId: customer.id,
        subtotal,
        gst,
        shipping,
        total,
        paymentMethod,
        addressName: name,
        addressPhone: phone,
        addressEmail: customer.email,
        addressCity: city,
        addressStreet: street,
      },
      { transaction: t }
    );

    await OrderItem.bulkCreate(
      orderItemsData.map((data) => ({ ...data, orderId: order.id })),
      { transaction: t }
    );

    await customer.update({ name, phone, city, street }, { transaction: t });

    return order;
  });

  const full = await Order.findByPk(created.id, {
    include: [{ model: OrderItem, as: 'items' }],
  });

  res.status(201).json(full);
});

router.get('/:id', async (req, res) => {
  const order = await Order.findByPk(req.params.id, {
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
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

router.get('/', authRequired, async (req, res) => {
  const orders = await Order.findAll({
    order: [['id', 'DESC']],
    include: [
      { model: OrderItem, as: 'items' },
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
    ],
  });

  if (wantsPagination(req)) {
    return res.json(paginate(orders, req));
  }
  res.json(orders);
});

module.exports = router;
