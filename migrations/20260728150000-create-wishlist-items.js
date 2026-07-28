module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('wishlist_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('wishlist_items', ['customer_id', 'product_id'], {
      unique: true,
      name: 'wishlist_items_customer_product_unique',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('wishlist_items');
  },
};
