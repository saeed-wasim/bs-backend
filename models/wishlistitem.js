module.exports = (sequelize, DataTypes) => {
  const WishlistItem = sequelize.define(
    'WishlistItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'customer_id',
        references: {
          model: 'customers',
          key: 'id',
        },
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id',
        references: {
          model: 'products',
          key: 'id',
        },
      },
    },
    {
      tableName: 'wishlist_items',
    }
  );

  WishlistItem.associate = (models) => {
    WishlistItem.belongsTo(models.Customer, { foreignKey: 'customerId', as: 'customer' });
    WishlistItem.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return WishlistItem;
};
