const express = require('express');
const { Op } = require('sequelize');
const { Product, Category } = require('../models');
const { authRequired } = require('../middleware/auth');
const { wantsPagination, paginate } = require('../utils/paginate');

const router = express.Router();

router.get('/', async (req, res) => {
  const where = {};
  if (req.query.categoryId) {
    where.categoryId = parseInt(req.query.categoryId, 10);
  }

  const products = await Product.findAll({
    where,
    order: [['id', 'DESC']],
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });

  if (wantsPagination(req)) {
    return res.json(paginate(products, req));
  }
  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  let colorVariants = [];
  if (product.variantGroupId) {
    colorVariants = await Product.findAll({
      where: { variantGroupId: product.variantGroupId, id: { [Op.ne]: product.id } },
      attributes: ['id', 'name', 'color', 'image'],
    });
  }

  res.json({ ...product.toJSON(), colorVariants });
});

router.post('/', authRequired, async (req, res) => {
  const name = req.body?.name?.toString().trim();
  const description = req.body?.description?.toString().trim();
  const price = req.body?.price;
  const categoryId = req.body?.categoryId;
  const image = req.body?.image ?? null;
  const color = req.body?.color?.toString().trim() || null;
  const variantGroupId = req.body?.variantGroupId ? parseInt(req.body.variantGroupId, 10) : null;
  const length = req.body?.length !== undefined && req.body.length !== '' ? parseFloat(req.body.length) : null;
  const width = req.body?.width !== undefined && req.body.width !== '' ? parseFloat(req.body.width) : null;
  const stock = req.body?.stock !== undefined && req.body.stock !== '' ? Math.max(0, parseInt(req.body.stock, 10) || 0) : 0;
  const lowStockThreshold =
    req.body?.lowStockThreshold !== undefined && req.body.lowStockThreshold !== ''
      ? Math.max(0, parseInt(req.body.lowStockThreshold, 10) || 0)
      : 5;

  if (!name || !description || price === undefined || !categoryId) {
    return res.status(400).json({ error: 'Name, description, price, and category are required' });
  }

  const category = await Category.findByPk(categoryId);
  if (!category) {
    return res.status(400).json({ error: 'Category not found' });
  }

  const product = await Product.create({
    name,
    description,
    price: parseFloat(price),
    categoryId: parseInt(categoryId, 10),
    image,
    color,
    variantGroupId,
    length,
    width,
    stock,
    lowStockThreshold,
  });
  res.status(201).json(product);
});

router.put('/:id', authRequired, async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const name = req.body?.name?.toString().trim();
  const description = req.body?.description?.toString().trim();
  const price = req.body?.price;
  const categoryId = req.body?.categoryId;

  if (!name || !description || price === undefined || !categoryId) {
    return res.status(400).json({ error: 'Name, description, price, and category are required' });
  }

  product.name = name;
  product.description = description;
  product.price = parseFloat(price);
  product.categoryId = parseInt(categoryId, 10);
  if ('image' in (req.body || {})) {
    product.image = req.body.image || null;
  }
  if ('color' in (req.body || {})) {
    product.color = req.body.color?.toString().trim() || null;
  }
  if ('variantGroupId' in (req.body || {})) {
    product.variantGroupId = req.body.variantGroupId ? parseInt(req.body.variantGroupId, 10) : null;
  }
  if ('length' in (req.body || {})) {
    product.length = req.body.length !== '' && req.body.length !== null ? parseFloat(req.body.length) : null;
  }
  if ('width' in (req.body || {})) {
    product.width = req.body.width !== '' && req.body.width !== null ? parseFloat(req.body.width) : null;
  }
  if ('stock' in (req.body || {})) {
    product.stock = Math.max(0, parseInt(req.body.stock, 10) || 0);
  }
  if ('lowStockThreshold' in (req.body || {})) {
    product.lowStockThreshold = Math.max(0, parseInt(req.body.lowStockThreshold, 10) || 0);
  }
  await product.save();

  res.json(product);
});

router.delete('/:id', authRequired, async (req, res) => {
  const deleted = await Product.destroy({ where: { id: req.params.id } });
  if (!deleted) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ success: true });
});

module.exports = router;
