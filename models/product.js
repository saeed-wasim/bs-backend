module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
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
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'category_id',
        references: {
          model: 'categories',
          key: 'id',
        },
      },
      subcategories: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
        get() {
          const value = this.getDataValue('subcategories');
          if (!value) {
            return [];
          }
          if (Array.isArray(value)) {
            return value;
          }
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        },
        set(value) {
          if (Array.isArray(value)) {
            this.setDataValue('subcategories', JSON.stringify(value));
            return;
          }
          if (typeof value === 'string') {
            const parsed = value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
            this.setDataValue('subcategories', JSON.stringify(parsed));
            return;
          }
          this.setDataValue('subcategories', JSON.stringify([]));
        },
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
      },
      image: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      color: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      variantGroupId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'variant_group_id',
      },
      length: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      width: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lowStockThreshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        field: 'low_stock_threshold',
      },
      isGiftGuide: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_gift_guide',
      },
    },
    {
      tableName: 'products',
    }
  );

  Product.associate = (models) => {
    Product.belongsTo(models.Category, {
      foreignKey: 'categoryId',
      as: 'category',
    });
  };

  return Product;
};
