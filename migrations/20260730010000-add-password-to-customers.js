module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('customers', 'password_hash', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('customers', 'password_hash');
  },
};
