const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Card fields only ever come from Stripe's own API, never from the client —
// this returns brand/last4 for display, never anything that could rebuild
// the full card number.
async function getCardDetails(paymentIntentId) {
  if (!paymentIntentId) return null;

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['payment_method'],
  });
  const card = paymentIntent.payment_method?.card;
  if (!card) return null;

  return { brand: card.brand, last4: card.last4 };
}

module.exports = { getCardDetails };
