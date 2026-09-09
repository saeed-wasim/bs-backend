const express = require('express');
const { Op } = require('sequelize');
const { Category } = require('../models');
const { authRequired } = require('../middleware/auth');
const { wantsPagination, paginate } = require('../utils/paginate');

const router = express.Router();

function normalizeSubcategories(value) {
  if (Array.isArray(value)) {
    return value.map((item) => item.toString().trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

router.get('/', async (req, res) => {
  const search = req.query.search?.toString().trim();
  const where = search
    ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};

  const categories = await Category.findAll({ where, order: [['sortOrder', 'ASC'], ['id', 'DESC']] });
  if (wantsPagination(req)) {
    return res.json(paginate(categories, req));
  }
  res.json(categories);
});

router.patch('/reorder', authRequired, async (req, res) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  if (!order.length) {
    return res.status(400).json({ error: 'order array is required' });
  }

  const categories = await Category.findAll({ where: { id: order } });
  const map = new Map(categories.map((category) => [category.id, category]));

  await Promise.all(
    order.map((id, index) => {
      const category = map.get(Number(id));
      if (!category) return null;
      category.sortOrder = index;
      return category.save();
    })
  );

  res.json({ success: true });
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
  const subcategories = normalizeSubcategories(req.body?.subcategories);

  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  const category = await Category.create({ name, description, image, subcategories });
  res.status(201).json(category);
});

router.put('/:id', authRequired, async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const name = req.body?.name?.toString().trim();
  const description = req.body?.description?.toString().trim();
  const subcategories = normalizeSubcategories(req.body?.subcategories);

  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  category.name = name;
  category.description = description;
  category.subcategories = subcategories;
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
