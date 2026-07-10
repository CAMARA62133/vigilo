import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config({ path: "./config/.env" });

export const sequelize = new Sequelize(
  process.env.DB_NAME,

  process.env.DB_USER,

  process.env.DB_PASSWORD,

  {
    host: process.env.DB_HOST,

    port: Number(process.env.DB_PORT),

    dialect: "postgres",

    logging: false,

    pool: {
      max: 10,

      min: 0,

      acquire: 30000,

      idle: 10000,
    },

    define: {
      schema: process.env.DB_SCHEMA || "public",

      underscored: true,

      freezeTableName: true,
    },
  },
);
