require('dotenv').config();
const { sequelize, Category, Product } = require('../models');

const CATEGORIES = [
  { name: 'Necklaces', singular: 'Necklace', description: 'Statement necklaces for every occasion, from everyday wear to bridal.' },
  { name: 'Earrings', singular: 'Earring', description: 'Studs, hoops, and drops crafted for comfort and sparkle.' },
  { name: 'Bracelets', singular: 'Bracelet', description: 'Chain and cuff bracelets in precious metals and stones.' },
  { name: 'Bangles', singular: 'Bangle', description: 'Traditional and contemporary bangles, sold as singles or sets.' },
  { name: 'Pendants', singular: 'Pendant', description: 'Standalone pendants to pair with your favourite chain.' },
  { name: 'Anklets', singular: 'Anklet', description: 'Lightweight anklets with delicate charms and chains.' },
  { name: 'Chains', singular: 'Chain', description: 'Classic gold and silver chains in a range of lengths.' },
  { name: 'Nose Pins', singular: 'Nose Pin', description: 'Fine nose pins and studs in traditional and modern designs.' },
  { name: 'Brooches', singular: 'Brooch', description: 'Statement brooches for shawls, lapels, and bridal wear.' },
  { name: 'Cufflinks', singular: 'Cufflink', description: 'Formal cufflinks in classic and contemporary finishes.' },
];

const ADJECTIVES = ['Elegant', 'Classic', 'Vintage', 'Modern', 'Royal', 'Delicate', 'Bold', 'Traditional', 'Chic', 'Minimalist'];
const MATERIALS = ['Gold', 'Silver', 'Rose Gold', 'Platinum', 'Diamond', 'Pearl', 'Ruby', 'Emerald'];
const COLORS = ['Gold', 'Silver', 'Rose Gold', 'White', 'Clear', 'Red', 'Green'];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  await sequelize.authenticate();

  for (const cat of CATEGORIES) {
    const [category] = await Category.findOrCreate({
      where: { name: cat.name },
      defaults: { description: cat.description, image: null },
    });

    const products = [];
    for (let i = 1; i <= 20; i++) {
      const adjective = ADJECTIVES[i % ADJECTIVES.length];
      const material = MATERIALS[i % MATERIALS.length];
      products.push({
        name: `${adjective} ${material} ${cat.singular} ${i}`,
        description: `${adjective} ${cat.singular.toLowerCase()} crafted in ${material.toLowerCase()}, part of our ${cat.name.toLowerCase()} collection.`,
        price: randomBetween(20, 500) * 10, // 200 - 5000
        categoryId: category.id,
        image: null,
        color: COLORS[i % COLORS.length],
        stock: randomBetween(0, 40),
        lowStockThreshold: 5,
      });
    }

    await Product.bulkCreate(products);
    console.log(`Seeded ${cat.name}: 20 products (category id ${category.id})`);
  }

  console.log('Done.');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
