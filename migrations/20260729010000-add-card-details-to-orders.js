module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'payment_card_brand', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('orders', 'payment_card_last4', {
      type: Sequelize.STRING(4),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('orders', 'payment_card_brand');
    await queryInterface.removeColumn('orders', 'payment_card_last4');
  },
};
