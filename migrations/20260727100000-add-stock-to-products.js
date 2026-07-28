module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'stock', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('products', 'low_stock_threshold', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 5,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'low_stock_threshold');
    await queryInterface.removeColumn('products', 'stock');
  },
};
