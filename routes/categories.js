const express = require('express');
const { Category } = require('../models');
const { authRequired } = require('../middleware/auth');
const { wantsPagination, paginate } = require('../utils/paginate');

const router = express.Router();

router.get('/', async (req, res) => {
  const categories = await Category.findAll({ order: [['id', 'DESC']] });
  if (wantsPagination(req)) {
    return res.json(paginate(categories, req));
  }
  res.json(categories);
});

router.get('/:id', async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json(category);
});

router.post('/', authRequired, async (req, res) => {
  const name = req.body?.name?.toString().trim();
  const description = req.body?.description?.toString().trim();
  const image = req.body?.image ?? null;

  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  const category = await Category.create({ name, description, image });
  res.status(201).json(category);
});

router.put('/:id', authRequired, async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const name = req.body?.name?.toString().trim();
  const description = req.body?.description?.toString().trim();

  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  category.name = name;
  category.description = description;
  if ('image' in (req.body || {})) {
    category.image = req.body.image || null;
  }
  await category.save();

  res.json(category);
});

router.delete('/:id', authRequired, async (req, res) => {
  const deleted = await Category.destroy({ where: { id: req.params.id } });
  if (!deleted) {
    return res.status(404).json({ error: 'Category not found' });
  }
  res.json({ success: true });
});

module.exports = router;
