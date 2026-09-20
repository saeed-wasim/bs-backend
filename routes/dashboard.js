const express = require('express');
const { Order, OrderItem, Customer, Product, sequelize } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

const VALID_RANGES = ['today', 'week', 'month', 'year', 'last6months'];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toRowMap(rows, keyField) {
  return new Map(rows.map((r) => [String(r[keyField]), r]));
}

// Each range groups orders at a different granularity (hour/day/month), and
// every bucket in the range is emitted even when it has no orders so the
// chart always shows a full, evenly-spaced axis instead of skipping gaps.
async function buildRevenueSeries(range) {
  if (range === 'today') {
    const rows = await sequelize.query(
      `SELECT HOUR(createdAt) AS bucket, SUM(total) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE createdAt >= CURDATE() AND createdAt < CURDATE() + INTERVAL 1 DAY
         AND payment_status = 'Paid'
       GROUP BY bucket`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const byHour = toRowMap(rows, 'bucket');
    return Array.from({ length: 24 }, (_, hour) => {
      const row = byHour.get(String(hour));
      const label = new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      return { key: String(hour), label, revenue: parseFloat(row?.revenue) || 0, orders: parseInt(row?.orders, 10) || 0 };
    });
  }

  if (range === 'week') {
    const rows = await sequelize.query(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS bucket, SUM(total) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
         AND createdAt < DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) + INTERVAL 7 DAY
         AND payment_status = 'Paid'
       GROUP BY bucket`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const byDay = toRowMap(rows, 'bucket');
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = toDateKey(date);
      const row = byDay.get(key);
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      return { key, label, revenue: parseFloat(row?.revenue) || 0, orders: parseInt(row?.orders, 10) || 0 };
    });
  }

  if (range === 'month') {
    const rows = await sequelize.query(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS bucket, SUM(total) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01')
         AND createdAt < DATE_FORMAT(NOW(), '%Y-%m-01') + INTERVAL 1 MONTH
         AND payment_status = 'Paid'
       GROUP BY bucket`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const byDay = toRowMap(rows, 'bucket');
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
      const key = toDateKey(date);
      const row = byDay.get(key);
      return { key, label: String(i + 1), revenue: parseFloat(row?.revenue) || 0, orders: parseInt(row?.orders, 10) || 0 };
    });
  }

  if (range === 'year') {
    const rows = await sequelize.query(
      `SELECT DATE_FORMAT(createdAt, '%Y-%m') AS bucket, SUM(total) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE createdAt >= DATE_FORMAT(NOW(), '%Y-01-01')
         AND createdAt < DATE_FORMAT(NOW(), '%Y-01-01') + INTERVAL 1 YEAR
         AND payment_status = 'Paid'
       GROUP BY bucket`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const byMonth = toRowMap(rows, 'bucket');
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, '0')}`;
      const row = byMonth.get(key);
      const label = new Date(year, i, 1).toLocaleDateString('en-US', { month: 'short' });
      return { key, label, revenue: parseFloat(row?.revenue) || 0, orders: parseInt(row?.orders, 10) || 0 };
    });
  }

  // last6months
  const rows = await sequelize.query(
    `SELECT DATE_FORMAT(createdAt, '%Y-%m') AS bucket, SUM(total) AS revenue, COUNT(*) AS orders
     FROM orders
     WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       AND payment_status = 'Paid'
     GROUP BY bucket
     ORDER BY bucket ASC`,
    { type: sequelize.QueryTypes.SELECT }
  );
  return rows.map((r) => ({
    key: r.bucket,
    label: new Date(`${r.bucket}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    revenue: parseFloat(r.revenue) || 0,
    orders: parseInt(r.orders, 10) || 0,
  }));
}

router.get('/summary', async (req, res) => {
  const range = VALID_RANGES.includes(req.query.range) ? req.query.range : 'last6months';

  const [totalOrders, totalCustomers, totalProducts, revenueTotal, products, recentOrders, revenueByPeriod] = await Promise.all([
    Order.count(),
    Customer.count(),
    Product.count(),
    Order.sum('total', { where: { paymentStatus: 'Paid' } }),
    Product.findAll({ attributes: ['stock', 'lowStockThreshold'] }),
    Order.findAll({
      order: [['id', 'DESC']],
      limit: 5,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: OrderItem, as: 'items', attributes: ['id'] },
      ],
    }),
    buildRevenueSeries(range),
  ]);

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  res.json({
    totalOrders,
    totalCustomers,
    totalProducts,
    totalRevenue: revenueTotal || 0,
    lowStockCount,
    outOfStockCount,
    revenueRange: range,
    revenueByPeriod,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      customerName: o.customer?.name || 'Unknown',
      customerEmail: o.customer?.email || '',
      total: parseFloat(o.total),
      itemCount: o.items?.length || 0,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      createdAt: o.createdAt,
    })),
  });
});

module.exports = router;
