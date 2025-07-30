require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// --- Directory & Static Files Setup ---
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(express.static(path.join(__dirname, 'public')));

// --- File Storage Configuration (Multer) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// --- API Endpoints ---

// NEW: Endpoint for the dashboard statistics
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const [[totalResult]] = await db.query('SELECT COUNT(*) as count FROM products WHERE is_deleted = FALSE');
        const [[trashResult]] = await db.query('SELECT COUNT(*) as count FROM products WHERE is_deleted = TRUE');
        const [[expiringResult]] = await db.query(
            `SELECT COUNT(*) as count FROM products WHERE is_deleted = FALSE AND warranty_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
        );

        res.json({
            totalItems: totalResult.count,
            trashItems: trashResult.count,
            expiringSoon: expiringResult.count
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ error: "Failed to fetch stats." });
    }
});

// NEW: Endpoint for the "Warranty Watch" page
app.get('/api/products/expiring-soon', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT id, product_code, name, category, status, DATE_FORMAT(warranty_date, "%Y-%m-%d") as warranty_date
            FROM products 
            WHERE is_deleted = FALSE AND warranty_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY warranty_date ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error("Fetch expiring products error:", error);
        res.status(500).json({ error: "Server error." });
    }
});

// Endpoint for bulk actions (delete, mark damaged) from the Audit page
app.post('/api/products/batch-update', async (req, res) => {
    const { action, ids } = req.body;
    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid request body.' });
    }

    try {
        let sql = '';
        switch (action) {
            case 'delete':
                sql = 'UPDATE products SET is_deleted = TRUE WHERE id IN (?)';
                break;
            case 'mark_damaged':
                sql = 'UPDATE products SET status = "Damaged" WHERE id IN (?)';
                break;
            default:
                return res.status(400).json({ error: 'Invalid action.' });
        }
        
        const [products] = await db.query('SELECT product_code FROM products WHERE id IN (?)', [ids]);
        const productCodes = products.map(p => p.product_code);

        await db.query(sql, [ids]);
        res.json(productCodes);

    } catch (error) {
        console.error('Batch update error:', error);
        res.status(500).json({ error: 'Database error during batch update.' });
    }
});

// GET /api/products - Fetches all non-deleted products
app.get('/api/products', async (req, res) => {
    const [rows] = await db.query('SELECT id, product_code, name, category FROM products WHERE is_deleted = FALSE ORDER BY id DESC');
    res.json(rows);
});

// GET /api/product/:code - Includes the 'status' field needed by the Audit page
app.get('/api/product/:code', async (req, res) => {
    const { code } = req.params;
    const [rows] = await db.query('SELECT *, status, DATE_FORMAT(purchase_date, "%Y-%m-%d") as purchase_date, DATE_FORMAT(warranty_date, "%Y-%m-%d") as warranty_date FROM products WHERE product_code = ? AND is_deleted = FALSE', [code]);
    if (rows.length > 0) {
        res.json(rows[0]);
    } else {
        res.status(404).json({ error: "Product not found" });
    }
});

// POST /api/add-product - Adds a new product
app.post('/api/add-product', upload.single('invoice'), async (req, res) => {
    const { name, category, purchaseDate, warrantyDate, notes } = req.body;
    const invoicePath = req.file ? `uploads/${req.file.filename}` : '';
    const [result] = await db.query('INSERT INTO products (name, category, purchase_date, warranty_date, invoice_path, notes) VALUES (?, ?, ?, ?, ?, ?)', [name, category, purchaseDate || null, warrantyDate || null, invoicePath, notes]);
    const code = `ITEM${String(result.insertId).padStart(4, '0')}`;
    await db.query('UPDATE products SET product_code = ? WHERE id = ?', [code, result.insertId]);
    res.json({ success: true, code });
});

// PUT /api/product/:id - Updates an existing product
app.put('/api/product/:id', upload.single('invoice'), async (req, res) => {
    const { id } = req.params;
    const { name, category, purchaseDate, warrantyDate, notes, existingInvoice } = req.body;
    let invoicePath = existingInvoice;
    if (req.file) {
        invoicePath = `uploads/${req.file.filename}`;
    }
    await db.query('UPDATE products SET name = ?, category = ?, purchase_date = ?, warranty_date = ?, notes = ?, invoice_path = ? WHERE id = ?', [name, category, purchaseDate || null, warrantyDate || null, notes, invoicePath, id]);
    res.json({ success: true });
});

// GET /api/trash - Fetches all soft-deleted items
app.get('/api/trash', async (req, res) => {
    const [rows] = await db.query('SELECT id, product_code, name, category FROM products WHERE is_deleted = TRUE ORDER BY id DESC');
    res.json(rows);
});

// PUT /api/product/:id/delete - Soft deletes an item
app.put('/api/product/:id/delete', async (req, res) => {
    await db.query('UPDATE products SET is_deleted = TRUE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// PUT /api/product/:id/restore - Restores a soft-deleted item
app.put('/api/product/:id/restore', async (req, res) => {
    await db.query('UPDATE products SET is_deleted = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// DELETE /api/product/:id - Permanently deletes an item
app.delete('/api/product/:id', async (req, res) => {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});


// --- Page Routing ---
const publicPages = ['/', '/add', '/find', '/all', '/details', '/edit', '/trash', '/scan', '/print-stickers', '/audit', '/print-audit', '/warranty'];
publicPages.forEach(page => {
    app.get(page, (req, res) => {
        const fileName = page === '/' ? 'index.html' : `${page.substring(1)}.html`;
        res.sendFile(path.join(__dirname, 'public', fileName));
    });
});

// --- Server Start ---
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));