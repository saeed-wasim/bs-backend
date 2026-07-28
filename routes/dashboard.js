const express = require('express');
const { Order, OrderItem, Customer, Product, sequelize } = require('../models');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

router.get('/summary', async (req, res) => {
  const [totalOrders, totalCustomers, totalProducts, revenueTotal, products, recentOrders] = await Promise.all([
    Order.count(),
    Customer.count(),
    Product.count(),
    Order.sum('total'),
    Product.findAll({ attributes: ['stock', 'lowStockThreshold'] }),
    Order.findAll({
      order: [['id', 'DESC']],
      limit: 5,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: OrderItem, as: 'items', attributes: ['id'] },
      ],
    }),
  ]);

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  const revenueRows = await sequelize.query(
    `SELECT DATE_FORMAT(createdAt, '%Y-%m') AS month, SUM(total) AS revenue, COUNT(*) AS orders
     FROM orders
     WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY month
     ORDER BY month ASC`,
    { type: sequelize.QueryTypes.SELECT }
  );

  res.json({
    totalOrders,
    totalCustomers,
    totalProducts,
    totalRevenue: revenueTotal || 0,
    lowStockCount,
    outOfStockCount,
    revenueByMonth: revenueRows.map((r) => ({
      month: r.month,
      revenue: parseFloat(r.revenue) || 0,
      orders: parseInt(r.orders, 10) || 0,
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      customerName: o.customer?.name || 'Unknown',
      total: parseFloat(o.total),
      itemCount: o.items?.length || 0,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      createdAt: o.createdAt,
    })),
  });
});

module.exports = router;
