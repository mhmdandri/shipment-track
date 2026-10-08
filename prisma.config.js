try {
  require("dotenv/config");
} catch {
  // Environment variables are already loaded in production / Docker
}

module.exports = {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
