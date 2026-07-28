const express = require('express');
const { Op } = require('sequelize');
const { Product, Category } = require('../models');
const { authRequired } = require('../middleware/auth');
const { wantsPagination, paginate } = require('../utils/paginate');

const router = express.Router();

router.use(authRequired);

function statusOf(product) {
  if (product.stock <= 0) return 'out';
  if (product.stock <= product.lowStockThreshold) return 'low';
  return 'in';
}

router.get('/summary', async (req, res) => {
  const products = await Product.findAll({ attributes: ['stock', 'lowStockThreshold', 'price'] });

  const summary = products.reduce(
    (acc, p) => {
      acc.totalProducts += 1;
      acc.totalUnits += p.stock;
      acc.stockValue += p.stock * parseFloat(p.price);
      const status = statusOf(p);
      if (status === 'out') acc.outOfStockCount += 1;
      else if (status === 'low') acc.lowStockCount += 1;
      return acc;
    },
    { totalProducts: 0, totalUnits: 0, stockValue: 0, lowStockCount: 0, outOfStockCount: 0 }
  );

  res.json(summary);
});

router.get('/', async (req, res) => {
  const search = req.query.search?.toString().trim();
  const statusFilter = req.query.status?.toString();

  const where = {};
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

  const products = await Product.findAll({
    where,
    order: [['name', 'ASC']],
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });

  const withStatus = products.map((p) => ({ ...p.toJSON(), status: statusOf(p) }));
  const filtered = statusFilter && statusFilter !== 'all' ? withStatus.filter((p) => p.status === statusFilter) : withStatus;

  if (wantsPagination(req)) {
    return res.json(paginate(filtered, req));
  }
  res.json(filtered);
});

router.patch('/:id', async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  let nextStock;
  if (req.body?.delta !== undefined) {
    const delta = parseInt(req.body.delta, 10);
    if (Number.isNaN(delta)) {
      return res.status(400).json({ error: 'delta must be a number' });
    }
    nextStock = product.stock + delta;
  } else if (req.body?.stock !== undefined) {
    const stock = parseInt(req.body.stock, 10);
    if (Number.isNaN(stock)) {
      return res.status(400).json({ error: 'stock must be a number' });
    }
    nextStock = stock;
  } else {
    return res.status(400).json({ error: 'Provide either stock or delta' });
  }

  if (nextStock < 0) {
    return res.status(400).json({ error: 'Stock cannot go below zero' });
  }

  if (req.body?.lowStockThreshold !== undefined) {
    product.lowStockThreshold = Math.max(0, parseInt(req.body.lowStockThreshold, 10) || 0);
  }

  product.stock = nextStock;
  await product.save();

  res.json({ ...product.toJSON(), status: statusOf(product) });
});

module.exports = router;
