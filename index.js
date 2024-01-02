// index.js

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const postRoutes = require("./routes/routes");
const path = require("path");
const app = express();
const AWS = require("aws-sdk");

require("dotenv").config(); // Load environment variables from .env file

app.use(cors());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});
console.log(process.env.MONGODB_URI);
app.use("/api", postRoutes);
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
