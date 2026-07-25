module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('customers', 'google_id', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('customers', 'picture', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn('customers', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn('customers', 'city', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('customers', 'picture');
    await queryInterface.removeColumn('customers', 'google_id');
    await queryInterface.changeColumn('customers', 'phone', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('customers', 'city', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
