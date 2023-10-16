const dotenv = require("dotenv");
const mongoose = require("mongoose");

process.on("uncaughtException", (err) => {
  console.log("UnCaught Exception! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" });

const DB = process.env.MONGO_URI; // Use the MONGO_URI variable from your config file

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB connection successful!");
  })
  .catch((err) => {
    console.log(err);
  });

// Rest of your code...

process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("Unhandled rejection! Shutting down...");
  server.close(() => {
    process.exit(1);
  });
});
