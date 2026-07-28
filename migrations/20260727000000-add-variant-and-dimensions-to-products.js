module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'color', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('products', 'variant_group_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('products', 'length', {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: true,
    });
    await queryInterface.addColumn('products', 'width', {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'width');
    await queryInterface.removeColumn('products', 'length');
    await queryInterface.removeColumn('products', 'variant_group_id');
    await queryInterface.removeColumn('products', 'color');
  },
};
