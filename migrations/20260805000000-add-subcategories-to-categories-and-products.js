module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('categories');
    if (!tableInfo.subcategories) {
      await queryInterface.addColumn('categories', 'subcategories', {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '[]',
      });
    }

    const productInfo = await queryInterface.describeTable('products');
    if (!productInfo.subcategories) {
      await queryInterface.addColumn('products', 'subcategories', {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '[]',
      });
    }
  },

  down: async (queryInterface) => {
    const tableInfo = await queryInterface.describeTable('products');
    if (tableInfo.subcategories) {
      await queryInterface.removeColumn('products', 'subcategories');
    }

    const categoryInfo = await queryInterface.describeTable('categories');
    if (categoryInfo.subcategories) {
      await queryInterface.removeColumn('categories', 'subcategories');
    }
  },
};
