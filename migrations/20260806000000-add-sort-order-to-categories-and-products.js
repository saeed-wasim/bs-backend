module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('categories', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('products', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('products', 'sort_order');
    await queryInterface.removeColumn('categories', 'sort_order');
  },
};
