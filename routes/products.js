const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { Product, Category, OrderItem, sequelize } = require('../models');
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

// Must come before /:id so Express doesn't treat "best-sellers" as a product id.
router.get('/best-sellers', async (req, res) => {
  const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10) || 20) : 20;

  const sold = await OrderItem.findAll({
    attributes: ['productId', [fn('SUM', col('qty')), 'totalSold']],
    where: { productId: { [Op.ne]: null } },
    group: ['productId'],
    order: [[literal('totalSold'), 'DESC']],
    limit,
    raw: true,
  });

  const productIds = sold.map((row) => row.productId);
  const products = await Product.findAll({
    where: { id: productIds },
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });
  const productsById = new Map(products.map((p) => [p.id, p]));

  // Re-apply the sales-ranked order — findAll's `where: { id: [...] }` doesn't
  // preserve it.
  const ranked = productIds.map((id) => productsById.get(id)).filter(Boolean);
  res.json(ranked);
});

router.get('/', async (req, res) => {
  const where = {};
  if (req.query.categoryId) {
    where.categoryId = parseInt(req.query.categoryId, 10);
  }
  const subcategory = req.query.subcategory?.toString().trim();
  const search = req.query.search?.toString().trim();
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }
  if (req.query.giftGuide === 'true') {
    where.isGiftGuide = true;
  }
  if (req.query.newArrivals === 'true') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    where.createdAt = { [Op.gte]: sevenDaysAgo };
  }

  const products = await Product.findAll({
    where,
    order: [['sortOrder', 'ASC'], ['id', 'DESC']],
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  });

  const filteredProducts = subcategory
    ? products.filter((product) => (product.subcategories || []).includes(subcategory))
    : products;

  if (wantsPagination(req)) {
    return res.json(paginate(filteredProducts, req));
  }
  res.json(filteredProducts);
});

router.patch('/reorder', authRequired, async (req, res) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  if (!order.length) {
    return res.status(400).json({ error: 'order array is required' });
  }

  const products = await Product.findAll({ where: { id: order } });
  const map = new Map(products.map((product) => [product.id, product]));

  await Promise.all(
    order.map((id, index) => {
      const product = map.get(Number(id));
      if (!product) return null;
      product.sortOrder = index;
      return product.save();
    })
  );

  res.json({ success: true });
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
  const subcategories = normalizeSubcategories(req.body?.subcategories);
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
  const isGiftGuide = req.body?.isGiftGuide === true || req.body?.isGiftGuide === 'true';

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
    subcategories,
    image,
    color,
    variantGroupId,
    length,
    width,
    stock,
    lowStockThreshold,
    isGiftGuide,
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
  const subcategories = normalizeSubcategories(req.body?.subcategories);

  if (!name || !description || price === undefined || !categoryId) {
    return res.status(400).json({ error: 'Name, description, price, and category are required' });
  }

  product.name = name;
  product.description = description;
  product.price = parseFloat(price);
  product.categoryId = parseInt(categoryId, 10);
  product.subcategories = subcategories;
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
  if ('isGiftGuide' in (req.body || {})) {
    product.isGiftGuide = req.body.isGiftGuide === true || req.body.isGiftGuide === 'true';
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
