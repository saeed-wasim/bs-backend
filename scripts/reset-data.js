require('dotenv').config();
const { sequelize } = require('../models');

async function main() {
  await sequelize.authenticate();

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = ['order_items', 'orders', 'products', 'categories', 'customers'];
  for (const table of tables) {
    await sequelize.query(`TRUNCATE TABLE \`${table}\``);
    console.log(`Truncated ${table}`);
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Done. admin_users left untouched.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
