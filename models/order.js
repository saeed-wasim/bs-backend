module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'customer_id',
        references: {
          model: 'customers',
          key: 'id',
        },
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      gst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      shipping: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'payment_method',
      },
      paymentStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Paid',
        field: 'payment_status',
      },
      fulfillmentStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Processing',
        field: 'fulfillment_status',
      },
      addressName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'address_name',
      },
      addressPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'address_phone',
      },
      addressEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'address_email',
      },
      addressCity: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'address_city',
      },
      addressStreet: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'address_street',
      },
    },
    {
      tableName: 'orders',
    }
  );

  Order.associate = (models) => {
    Order.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
    Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
  };

  return Order;
};
