const express = require('express');
const { WishlistItem, Product } = require('../models');
const { customerAuthRequired } = require('../middleware/customerAuth');

const router = express.Router();

router.use(customerAuthRequired);

router.get('/', async (req, res) => {
  const items = await WishlistItem.findAll({
    where: { customerId: req.customer.id },
    order: [['id', 'DESC']],
    include: [{ model: Product, as: 'product' }],
  });
  res.json(items);
});

router.post('/', async (req, res) => {
  const productId = parseInt(req.body?.productId, 10);
  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const product = await Product.findByPk(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const [item] = await WishlistItem.findOrCreate({
    where: { customerId: req.customer.id, productId },
  });

  const full = await WishlistItem.findByPk(item.id, { include: [{ model: Product, as: 'product' }] });
  res.status(201).json(full);
});

router.delete('/:productId', async (req, res) => {
  const deleted = await WishlistItem.destroy({
    where: { customerId: req.customer.id, productId: req.params.productId },
  });
  if (!deleted) {
    return res.status(404).json({ error: 'Wishlist item not found' });
  }
  res.json({ success: true });
});

module.exports = router;
