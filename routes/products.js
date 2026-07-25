const express = require('express');
const { Product, Category } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const products = await Product.findAll({
    order: [['id', 'DESC']],
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });
  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

router.post('/', authRequired, async (req, res) => {
  const name = req.body?.name?.toString().trim();
  const description = req.body?.description?.toString().trim();
  const price = req.body?.price;
  const categoryId = req.body?.categoryId;
  const image = req.body?.image ?? null;

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
