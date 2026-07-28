const express = require('express');
const Stripe = require('stripe');
const { Order, OrderItem, Customer } = require('../models');
const { customerAuthRequired } = require('../middleware/customerAuth');
const { buildOrder, HttpError } = require('../utils/orderBuilder');
const { getCardDetails } = require('../utils/stripeCard');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const currency = process.env.STRIPE_CURRENCY || 'usd';

router.post('/create-checkout-session', customerAuthRequired, async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const address = req.body?.address || {};
  const paymentMethod = req.body?.paymentMethod?.toString().trim() || 'Card (Stripe)';

  const customer = await Customer.findByPk(req.customer.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  let order;
  try {
    order = await buildOrder({ customer, items, address, paymentMethod, paymentStatus: 'Pending' });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    throw err;
  }

  const full = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] });

  const lineItems = full.items.map((item) => ({
    price_data: {
      currency,
      product_data: { name: item.name },
      unit_amount: Math.round(Number(item.price) * 100),
    },
    quantity: item.qty,
  }));

  if (Number(full.gst) > 0) {
    lineItems.push({
      price_data: {
        currency,
        product_data: { name: 'GST (3%)' },
        unit_amount: Math.round(Number(full.gst) * 100),
      },
      quantity: 1,
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: customer.email,
    line_items: lineItems,
    metadata: { orderId: String(order.id) },
    success_url: `${frontendUrl}/order-confirmation/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl}/bag`,
  });

  await order.update({ stripeSessionId: session.id });

  res.json({ url: session.url, orderId: order.id });
});

// Fallback for local dev when the Stripe CLI webhook forwarder isn't
// running — the confirmation page calls this once so a still-"Pending"
// order gets reconciled directly against Stripe instead of staying stuck.
router.get('/session/:orderId/sync', customerAuthRequired, async (req, res) => {
  const order = await Order.findByPk(req.params.orderId, { include: [{ model: OrderItem, as: 'items' }] });
  if (!order || order.customerId !== req.customer.id) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.paymentStatus === 'Paid' || !order.stripeSessionId) {
    return res.json(order);
  }

  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  if (session.payment_status === 'paid') {
    const card = await getCardDetails(session.payment_intent);
    await order.update({
      paymentStatus: 'Paid',
      cardBrand: card?.brand || null,
      cardLast4: card?.last4 || null,
    });
  }

  res.json(order);
});

module.exports = router;
