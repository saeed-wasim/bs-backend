// One-time import of the legacy SQLite export (see bin-saleem-jewellery/scripts/export-legacy-data.js)
// into MySQL via Sequelize. Run once, after migrations have created the schema.
// Safe to delete once the migration is complete.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, Category, Product, Customer } = require('../models');

const dataPath = path.join(__dirname, '..', 'data', 'legacy-export.json');

async function main() {
  if (!fs.existsSync(dataPath)) {
    throw new Error(
      `No export found at ${dataPath}. Run "node scripts/export-legacy-data.js" in bin-saleem-jewellery first.`
    );
  }

  const { categories, items, customers } = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  await sequelize.transaction(async (t) => {
    if (categories.length) {
      await Category.bulkCreate(categories, { transaction: t });
    }

    if (items.length) {
      const products = items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        categoryId: item.category_id,
        image: item.image,
      }));
      await Product.bulkCreate(products, { transaction: t });
    }

    if (customers.length) {
      await Customer.bulkCreate(customers, { transaction: t });
    }
  });

  const [categoryCount, productCount, customerCount] = await Promise.all([
    Category.count(),
    Product.count(),
    Customer.count(),
  ]);

  console.log('Import complete.');
  console.log(`  categories: ${categoryCount}`);
  console.log(`  products:   ${productCount}`);
  console.log(`  customers:  ${customerCount}`);
}

main()
  .then(() => sequelize.close())
  .catch((err) => {
    console.error('Import failed:', err.message);
    process.exit(1);
  });
