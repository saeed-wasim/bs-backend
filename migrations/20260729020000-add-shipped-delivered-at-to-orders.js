module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'shipped_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('orders', 'delivered_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('orders', 'shipped_at');
    await queryInterface.removeColumn('orders', 'delivered_at');
  },
};
