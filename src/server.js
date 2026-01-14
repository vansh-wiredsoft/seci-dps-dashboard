const express = require("express");
const path = require("path");
const { performance } = require("perf_hooks");
const {
  insertTestData,
  testAllApis,
  insertOMSolarBESSDummyData,
} = require("./util");

require("dotenv").config(); // Load .env variables

// MySQL config
const DB_PORT = 3306;
const SERVER_PORT = 3000;
const DB_USER = "root";
// const DB_PASS = "Seci@1234";
const DB_PASS = "Vansh@SQL";
const DB_HOST = "127.0.0.1";

// Global Sequelize instance
// const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
//   host: DB_HOST,
//   port: DB_PORT,
//   dialect: "mysql",
//   logging: false,
// });

const { sequelize, models } = require("./models");

const mysql = require("mysql2/promise");

// Ensure database exists
async function ensureDatabaseExists() {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    port: DB_PORT,
  });

  let DB_NAME = process.env.DB_NAME_TESTING;
  if (process.env.NODE_ENV === "PRODUCTION") {
    DB_NAME = process.env.DB_NAME_PRODUCTION;
  }

  console.log(`Ensuring database: ${DB_NAME}`);

  await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
  await connection.end();
  console.log(`✅ Database '${DB_NAME}' ensured.`);
}

// Utility: Timer
function startTimer(label) {
  const start = performance.now();
  const interval = setInterval(() => {
    const elapsed = ((performance.now() - start) / 1000).toFixed(1);
    process.stdout.write(`⏱️  ${label}: ${elapsed}s\r`);
  }, 200);
  return () => {
    clearInterval(interval);
    const total = ((performance.now() - start) / 1000).toFixed(1);
    console.log(`✅ ${label} completed in ${total}s`);
  };
}

// Wait for MySQL to become available
async function waitForMysql() {
  const end = startTimer("Waiting for MySQL");
  const maxRetries = 100;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log("✅ MySQL is ready.");
      end();
      return;
    } catch (e) {
      attempts++;
      console.log(
        `⏳ Attempt ${attempts}/${maxRetries} - Waiting for MySQL: ${e.message}`
      );
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  console.error("❌ MySQL did not start in time.");
  process.exit(1);
}

// Setup DB schema
async function setupDatabase() {
  const end = startTimer("Creating tables");
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
  if (process.env.NODE_ENV === "PRODUCTION") {
    await sequelize.sync();
  } else {
    await sequelize.sync({ force: true });
  }
  await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  end();
}

// Start Express server
function startExpressServer() {
  const end = startTimer("Starting Express");
  const app = express();

  app.use("/api/data/audit", require("./routes/audit_routes"));
  app.use("/api/data/documents", require("./routes/document_upload"));
  app.use("/api/data/correspondences", require("./routes/document_upload"));
  app.use("/api/data/issues", require("./routes/document_upload"));
  app.use("/api/data/reia/documents", require("./routes/document_upload"));
  app.use("/api/data/om/excel/upload", require("./routes/document_upload"));
  app.use("/api/data/om/solar/bess", require("./routes/document_upload"));
  app.use("/api/data/om/solar", require("./routes/document_upload"));

  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ extended: true, limit: "100mb" }));
  app.use(express.static(path.join(__dirname, "public")));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
  });

  const api_routes = require("./routes");
  app.use("/api", api_routes);

  app.listen(SERVER_PORT, () => {
    console.log(`🚀 Express server running at http://localhost:${SERVER_PORT}`);
    end();
  });
}

// Graceful shutdown
function handleShutdown() {
  process.on("SIGINT", async () => {
    console.log("\n🧹 Dropping all tables...");
    try {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
      await sequelize.drop();
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
      console.log("✅ All tables dropped.");
    } catch (err) {
      console.error("❌ Failed to drop tables:", err.message);
    }

    process.exit();
  });
}

// 🟢 Main startup sequence
(async () => {
  await ensureDatabaseExists();
  await waitForMysql();
  await setupDatabase();

  if (process.env.NODE_ENV === "TESTING") {
    await insertTestData();
    // await insertOMSolarBESSDummyData();
  }

  startExpressServer();

  if (process.env.NODE_ENV === "TESTING") {
    await testAllApis();
  }
  console.log(`ENVIRONMENT - ${process.env.NODE_ENV}`);
})();
