module.exports = (sequelize, DataTypes) => {
  const AdminUser = sequelize.define(
    'AdminUser',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash',
      },
    },
    {
      tableName: 'admin_users',
    }
  );

  return AdminUser;
};
