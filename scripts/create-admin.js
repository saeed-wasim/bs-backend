// Creates (or updates the password of) an admin_users row.
// Usage: node scripts/create-admin.js "<name>" <email> <password>
require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, AdminUser } = require('../models');

async function main() {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    throw new Error('Usage: node scripts/create-admin.js "<name>" <email> <password>');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.toLowerCase();

  const [admin, created] = await AdminUser.findOrCreate({
    where: { email: normalizedEmail },
    defaults: { name, email: normalizedEmail, passwordHash },
  });

  if (!created) {
    await admin.update({ name, passwordHash });
  }

  console.log(`${created ? 'Created' : 'Updated'} admin user: ${admin.email}`);
}

main()
  .then(() => sequelize.close())
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exit(1);
  });
