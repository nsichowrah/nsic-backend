const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const connectMongo = require("../config/mongo");
const db = require("../config/firebase");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");

const app = express();

connectMongo();

app.use(cors());
app.use(express.json());

/* ---------- ADMIN REGISTER ---------- */
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const admin = new Admin({ username, password: hashed });
  await admin.save();

  res.json({ message: "Admin created" });
});

/* ---------- ADMIN LOGIN ---------- */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(400).json({ message: "Not found" });

  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  res.json({ token });
});

/* ---------- SENSOR DATA POST ---------- */
app.post("/api/sensor", async (req, res) => {
  const { temperature, humidity, deviceId } = req.body;

  await db.collection("sensor_data").add({
    temperature,
    humidity,
    deviceId,
    timestamp: new Date()
  });

  res.json({ success: true });
});

/* ---------- GET LATEST DATA ---------- */
app.get("/api/sensor/latest", async (req, res) => {
  const snapshot = await db
    .collection("sensor_data")
    .orderBy("timestamp", "desc")
    .limit(10)
    .get();

  const data = snapshot.docs.map(doc => doc.data());
  res.json(data);
});

module.exports = app;

// Start server only when run locally (not on Vercel)
if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
