const { Order, OrderItem, Product, sequelize } = require('../models');

const GST_RATE = 0.03;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Validates cart items/address, checks stock, and persists the Order +
// OrderItems in one transaction. Shared by the direct order route and the
// Stripe checkout-session route so stock/pricing rules only live in one place.
async function buildOrder({ customer, items, address, paymentMethod, paymentStatus }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'At least one item is required');
  }

  const name = address?.name?.toString().trim();
  const phone = address?.phone?.toString().trim();
  const city = address?.city?.toString().trim();
  const street = address?.street?.toString().trim();

  if (!name || !phone || !city || !street) {
    throw new HttpError(400, 'Delivery address (name, phone, city, street) is required');
  }

  const productIds = items.map((item) => parseInt(item.productId, 10));
  const products = await Product.findAll({ where: { id: productIds } });
  const productsById = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const orderItemsData = [];
  for (const item of items) {
    const product = productsById.get(parseInt(item.productId, 10));
    if (!product) {
      throw new HttpError(400, `Product ${item.productId} not found`);
    }
    const qty = Math.max(1, parseInt(item.qty, 10) || 1);
    if (product.stock < qty) {
      throw new HttpError(400, `Insufficient stock for ${product.name}`);
    }
    subtotal += parseFloat(product.price) * qty;
    orderItemsData.push({
      productId: product.id,
      name: product.name,
      image: product.image,
      color: product.color,
      size: item.size ? item.size.toString() : null,
      price: product.price,
      qty,
    });
  }

  const gst = Math.round(subtotal * GST_RATE * 100) / 100;
  const shipping = 0;
  const total = subtotal + gst + shipping;

  const order = await sequelize.transaction(async (t) => {
    const created = await Order.create(
      {
        customerId: customer.id,
        subtotal,
        gst,
        shipping,
        total,
        paymentMethod,
        paymentStatus,
        addressName: name,
        addressPhone: phone,
        addressEmail: customer.email,
        addressCity: city,
        addressStreet: street,
      },
      { transaction: t }
    );

    await OrderItem.bulkCreate(
      orderItemsData.map((data) => ({ ...data, orderId: created.id })),
      { transaction: t }
    );

    for (const item of orderItemsData) {
      await Product.decrement('stock', { by: item.qty, where: { id: item.productId }, transaction: t });
    }

    // Only sync contact/address prefill fields — `name` here is who the order
    // ships to (could be a gift recipient), not necessarily the account holder,
    // so the customer's own account name must never be overwritten by it.
    await customer.update({ phone, city, street }, { transaction: t });

    return created;
  });

  return order;
}

module.exports = { buildOrder, HttpError, GST_RATE };
