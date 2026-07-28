module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      gst: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      shipping: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      total: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      payment_method: { type: Sequelize.STRING, allowNull: true },
      payment_status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Paid' },
      fulfillment_status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'Processing' },
      address_name: { type: Sequelize.STRING, allowNull: true },
      address_phone: { type: Sequelize.STRING, allowNull: true },
      address_email: { type: Sequelize.STRING, allowNull: true },
      address_city: { type: Sequelize.STRING, allowNull: true },
      address_street: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('orders');
  },
};
