require('dotenv').config();
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface) => {
    const name = process.env.ADMIN_SEED_NAME || 'Admin';
    const email = (process.env.ADMIN_SEED_EMAIL || 'admin@example.com').toLowerCase();
    const password = process.env.ADMIN_SEED_PASSWORD || 'change-me';
    const passwordHash = await bcrypt.hash(password, 10);

    await queryInterface.bulkInsert('admin_users', [
      {
        name,
        email,
        password_hash: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    const email = (process.env.ADMIN_SEED_EMAIL || 'admin@example.com').toLowerCase();
    await queryInterface.bulkDelete('admin_users', { email });
  },
};
