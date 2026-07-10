import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import bcrypt from "bcrypt";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullname: { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.STRING(250) },
    photoProfile: { type: DataTypes.STRING },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    phone: { type: DataTypes.STRING(20) },
    password: { type: DataTypes.STRING, allowNull: true },
    role: {
      type: DataTypes.ENUM("super_admin", "company_admin", "agent"),
      allowNull: false,
    },
    companyId: { type: DataTypes.UUID, allowNull: true, field: "company_id" },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
    mustChangePassword: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastLoginAt: { type: DataTypes.DATE },
    resetPasswordCode: { type: DataTypes.STRING, allowNull: true },
    resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
    resetPasswordAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
    paranoid: true,
  },
);

// 🔐 HASH AUTOMATIQUE (Déclenché à chaque save/update si modifié)
User.beforeSave(async (user) => {
  if (user.password && user.changed("password")) {
    user.password = await bcrypt.hash(user.password, 10);
  }
  if (user.resetPasswordCode && user.changed("resetPasswordCode")) {
    user.resetPasswordCode = await bcrypt.hash(user.resetPasswordCode, 10);
  }
});

User.prototype.validatePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export default User;
