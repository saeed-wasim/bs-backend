const Stripe = require('stripe');
const { Order } = require('../models');
const { getCardDetails } = require('../utils/stripeCard');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Mounted with express.raw() in server.js, before the global express.json()
// middleware — Stripe's signature check needs the exact raw request body.
async function stripeWebhookHandler(req, res) {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const order = await Order.findByPk(orderId);
      if (order && order.paymentStatus !== 'Paid') {
        const card = await getCardDetails(session.payment_intent);
        await order.update({
          paymentStatus: 'Paid',
          cardBrand: card?.brand || null,
          cardLast4: card?.last4 || null,
        });
      }
    }
  }

  res.json({ received: true });
}

module.exports = stripeWebhookHandler;
