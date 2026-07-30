const express = require('express');
const { Op } = require('sequelize');
const { Review, Product, Customer } = require('../models');
const { authRequired } = require('../middleware/auth');
const { customerAuthRequired } = require('../middleware/customerAuth');
const { wantsPagination, paginate } = require('../utils/paginate');

const router = express.Router();

router.get('/product/:productId', async (req, res) => {
  const reviews = await Review.findAll({
    where: { productId: req.params.productId },
    order: [['id', 'DESC']],
    include: [{ model: Customer, as: 'customer', attributes: ['id', 'name'] }],
  });

  const count = reviews.length;
  const average = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  res.json({ reviews, average, count });
});

router.get('/product/:productId/mine', customerAuthRequired, async (req, res) => {
  const review = await Review.findOne({
    where: { customerId: req.customer.id, productId: req.params.productId },
  });
  res.json({ review });
});

// Customers can revisit this endpoint to update their existing review rather
// than being blocked after the first submission, so this upserts instead of
// rejecting a second POST for the same product.
router.post('/', customerAuthRequired, async (req, res) => {
  const productId = parseInt(req.body?.productId, 10);
  const rating = parseInt(req.body?.rating, 10);
  const comment = req.body?.comment?.toString().trim() || null;

  if (!productId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'productId and a rating between 1 and 5 are required' });
  }

  const product = await Product.findByPk(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const existing = await Review.findOne({ where: { customerId: req.customer.id, productId } });
  let review;
  let status;
  if (existing) {
    await existing.update({ rating, comment });
    review = existing;
    status = 200;
  } else {
    review = await Review.create({ customerId: req.customer.id, productId, rating, comment });
    status = 201;
  }

  const full = await Review.findByPk(review.id, {
    include: [{ model: Customer, as: 'customer', attributes: ['id', 'name'] }],
  });

  res.status(status).json(full);
});

router.get('/', authRequired, async (req, res) => {
  const search = req.query.search?.toString().trim();
  const where = search
    ? {
        [Op.or]: [
          { '$customer.name$': { [Op.like]: `%${search}%` } },
          { '$product.name$': { [Op.like]: `%${search}%` } },
          { comment: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};

  const reviews = await Review.findAll({
    where,
    order: [['id', 'DESC']],
    include: [
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'picture'] },
      { model: Product, as: 'product', attributes: ['id', 'name', 'image'] },
    ],
  });

  if (wantsPagination(req)) {
    return res.json(paginate(reviews, req));
  }
  res.json(reviews);
});

module.exports = router;
