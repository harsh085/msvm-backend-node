const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const PORT = process.env.PORT || 5000;
require("dotenv").config();

const app = express();
// app.use(cors());
app.use(cors({
  origin: "https://msvm-frontend-angular.vercel.app"
}));
app.use(express.json());

// // DB Connection
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "msvm_school"
// });

// DB Connection
// const db = mysql.createConnection({
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "msvm_school",
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect(err => {
  if (err) {
    console.log("DB Error:", err);
    return;
  }
  console.log("MySQL Connected!");

  // Create users table if not exists
  const createTable = `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;
  db.query(createTable, (err) => {
    if (err) console.log("Table creation error:", err);
  });
});

// Routes
app.get("/", (req, res) => {
  res.send("MSVM Backend Running...");
});

// Register
app.post("/api/register", (req, res) => {
  console.log("Body received:", req.body);
  const { username, password, role } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
    if (hashErr) {
      console.log("Hash Error:", hashErr);
      return res.status(500).json({ message: "Server error" });
    }

    const sql = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
    db.query(sql, [username, hashedPassword, role || 'student'], (err, result) => {
      if (err) {
        console.log("Register DB Error:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ message: "Username already exists" });
        }
        return res.status(500).json({ message: "Server error", error: err.message });
      }
      res.status(201).json({ message: "Registration successful!", id: result.insertId });
    });
  });
});

// Login
app.post("/api/login", (req, res) => {
  const { username, password, role } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = "SELECT * FROM users WHERE username = ? AND role = ?";
  db.query(sql, [username, role || 'student'], (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid credentials or role mismatch" });
    }

    const user = results[0];
    bcrypt.compare(password, user.password, (compareErr, isMatch) => {
      if (compareErr) return res.status(500).json({ message: "Server error" });

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      res.json({ message: "Login successful!", user: { id: user.id, username: user.username, role: user.role } });
    });
  });
});

// Get all students
app.get("/students", (req, res) => {
  db.query("SELECT * FROM students", (err, data) => {
    if (err) return res.json(err);
    return res.json(data);
  });
});

// Add student
app.post("/students", (req, res) => {
  const student = req.body;
  const sql = "INSERT INTO students SET ?";
  db.query(sql, student, (err, result) => {
    if (err) return res.json(err);
    res.json({ message: "Student Added", id: result.insertId });
  });
});

// app.listen(5000, () => {
//   console.log("Server running on port 5000");
// });

app.listen(PORT, () => {
  console.log("Server running");
});
