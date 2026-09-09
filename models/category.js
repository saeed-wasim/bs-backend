module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    'Category',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
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
    },
    {
      tableName: 'categories',
    }
  );

  Category.associate = (models) => {
    Category.hasMany(models.Product, {
      foreignKey: 'categoryId',
      as: 'products',
      onDelete: 'CASCADE',
    });
  };

  return Category;
};
