const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(cors()); // Allows the frontend to talk to this backend
app.use(bodyParser.json());

// Initialize SQLite Database (Creates a file in your folder)
const db = new sqlite3.Database('./brewtique_db.sqlite', (err) => {
    if (err) console.error("Database Error:", err.message);
    else console.log("Connected to local SQLite database.");
});

// Create Orders Table
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_number TEXT,
        items TEXT, -- JSON string of ordered items
        total REAL,
        status TEXT DEFAULT 'pending', -- 'pending', 'preparing', 'completed'
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// --- API ENDPOINTS ---

// 1. Receive New Order from Customer Phone
app.post('/api/orders', (req, res) => {
    const { tableNumber, items, total } = req.body;
    const itemsJson = JSON.stringify(items);

    const sql = `INSERT INTO orders (table_number, items, total) VALUES (?, ?, ?)`;
    db.run(sql, [tableNumber, itemsJson, total], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, orderId: this.lastID });
    });
});

// 2. Fetch Active Orders for the Kitchen Display
app.get('/api/orders/kitchen', (req, res) => {
    // Only get orders that are not completed
    const sql = `SELECT * FROM orders WHERE status != 'completed' ORDER BY timestamp ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. Mark Order as Complete (Owner/Kitchen triggers this)
app.post('/api/orders/complete/:id', (req, res) => {
    const sql = `UPDATE orders SET status = 'completed' WHERE id = ?`;
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// 4. Owner Analytics: Get total revenue
app.get('/api/analytics', (req, res) => {
    const sql = `SELECT SUM(total) as revenue, COUNT(id) as total_orders FROM orders`;
    db.get(sql, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.listen(port, () => {
    console.log(`Brewtique Backend running locally on http://localhost:${port}`);
});