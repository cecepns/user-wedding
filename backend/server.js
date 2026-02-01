const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// Upload directory: only filename stored in DB; folder = uploads-weddingsapp
const UPLOAD_DIR = path.join(__dirname, 'uploads-weddingsapp');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || '.jpg';
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    cb(null, name);
  }
});
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /image\/(jpeg|png|gif|webp)/.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Hanya file gambar (JPEG, PNG, GIF, WebP) yang diizinkan.'), false);
  }
});

function isStoredFilename(value) {
  return value && typeof value === 'string' && !value.startsWith('http');
}

function unlinkUploadIfStored(value) {
  if (!isStoredFilename(value)) return;
  const filePath = path.join(UPLOAD_DIR, value);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.error('Unlink upload error:', e);
  }
}

// Serve uploaded files (only filename in DB; URL = /uploads-weddingsapp/filename)
app.use('/uploads-weddingsapp', express.static(UPLOAD_DIR));
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Change this to your MySQL password
  database: 'wedding_organizer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let db;

// Initialize database connection
async function initializeDatabase() {
  try {
    // Create connection without database first
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.end();

    // Create connection pool with database
    db = mysql.createPool(dbConfig);

    // Read and execute SQL schema
    const fs = require('fs');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    // Split SQL statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
        } catch (error) {
          // Ignore errors for existing tables/data
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate entry')) {
            console.error('SQL execution error:', error);
          }
        }
      }
    }

    // Create default admin user
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    await db.execute(
      `INSERT IGNORE INTO admins (email, password) VALUES (?, ?)`, 
      ['admin@weddingbliss.com', hashedPassword]
    );

    // Create surat_jalan table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS surat_jalan (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id INT,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(50),
        client_address TEXT,
        wedding_date DATE,
        package_name VARCHAR(255),
        plaminan_image TEXT,
        pintu_masuk_image TEXT,
        dekorasi_image TEXT,
        warna_kain TEXT,
        ukuran_tenda TEXT,
        vendor_name VARCHAR(255) DEFAULT 'User Wedding Organizer',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on startup
initializeDatabase();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    const admin = rows[0];

    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get admin stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};

    const [orderCount] = await db.execute('SELECT COUNT(*) as count FROM orders');
    stats.orders = orderCount[0].count;

    const [serviceCount] = await db.execute('SELECT COUNT(*) as count FROM services');
    stats.services = serviceCount[0].count;

    const [requestCount] = await db.execute('SELECT COUNT(*) as count FROM custom_requests');
    stats.customRequests = requestCount[0].count;

    const [revenueResult] = await db.execute('SELECT SUM(total_amount) as total FROM orders WHERE status = "completed"');
    stats.revenue = revenueResult[0].total || 0;

    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Upload file (multer); store only filename; folder = uploads-weddingsapp
app.post('/api/upload', authenticateToken, (req, res, next) => {
  uploadMiddleware.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File terlalu besar (maks 10MB)' });
      if (err.message) return res.status(400).json({ message: err.message });
      return res.status(400).json({ message: 'Upload gagal' });
    }
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ filename: req.file.filename });
  });
});

// Services routes
app.get('/api/services', async (req, res) => {
  try {
    const q = (req.query.q || req.query.search || '').trim();
    if (q) {
      const pattern = `%${q}%`;
      const [services] = await db.execute(
        'SELECT * FROM services WHERE name LIKE ? OR description LIKE ? ORDER BY created_at DESC',
        [pattern, pattern]
      );
      return res.json(services);
    }
    const [services] = await db.execute('SELECT * FROM services ORDER BY created_at DESC');
    res.json(services);
  } catch (error) {
    console.error('Services error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM services WHERE id = ?', [id]);
    const service = rows[0];
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    console.error('Service detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/services', authenticateToken, async (req, res) => {
  const { name, description, base_price, image } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO services (name, description, base_price, image) VALUES (?, ?, ?, ?)',
      [name, description, base_price, image]
    );
    res.json({ id: result.insertId, message: 'Service created successfully' });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/services/:id', authenticateToken, async (req, res) => {
  const { name, description, base_price, image } = req.body;
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image FROM services WHERE id = ?', [id]);
    const oldImage = rows[0] && rows[0].image;
    const [result] = await db.execute(
      'UPDATE services SET name = ?, description = ?, base_price = ?, image = ? WHERE id = ?',
      [name, description, base_price, image, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (oldImage && oldImage !== image && isStoredFilename(oldImage)) unlinkUploadIfStored(oldImage);
    res.json({ message: 'Service updated successfully' });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image FROM services WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM services WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (row && row.image) unlinkUploadIfStored(row.image);
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Helper: parse item images JSON to array
function parseItemImages(rows) {
  if (!rows || !Array.isArray(rows)) return rows;
  return rows.map((row) => {
    if (row.images != null && typeof row.images === 'string') {
      try {
        row.images = JSON.parse(row.images);
        if (!Array.isArray(row.images)) row.images = [];
      } catch (_) {
        row.images = [];
      }
    } else if (row.images == null) {
      row.images = [];
    }
    return row;
  });
}

// Items routes (master items management)
app.get('/api/items', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM items WHERE is_active = true';
    const params = [];
    
    // Add category filter if provided
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, name';
    
    const [items] = await db.execute(query, params);
    res.json(parseItemImages(items));
  } catch (error) {
    console.error('Items error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get item categories (must be before /:id route)
app.get('/api/items/categories', async (req, res) => {
  try {
    const [categories] = await db.execute('SELECT DISTINCT category FROM items WHERE is_active = true AND category IS NOT NULL ORDER BY category');
    res.json(categories.map(cat => cat.category));
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM items WHERE id = ?', [id]);
    const item = rows[0];
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    const [parsed] = parseItemImages([item]);
    res.json(parsed);
  } catch (error) {
    console.error('Item detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/items', authenticateToken, async (req, res) => {
  const { name, description, price, category, images } = req.body;
  const imagesJson = Array.isArray(images) ? JSON.stringify(images) : (images && typeof images === 'string' ? images : '[]');
  
  try {
    const [result] = await db.execute(
      'INSERT INTO items (name, description, price, category, images) VALUES (?, ?, ?, ?, ?)',
      [name, description, price, category, imagesJson]
    );
    res.json({ id: result.insertId, message: 'Item created successfully' });
  } catch (error) {
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      // Column images may not exist yet; insert without it
      const [result] = await db.execute(
        'INSERT INTO items (name, description, price, category) VALUES (?, ?, ?, ?)',
        [name, description, price, category]
      );
      return res.json({ id: result.insertId, message: 'Item created successfully' });
    }
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
  const { name, description, price, category, is_active, images } = req.body;
  const { id } = req.params;
  const imagesJson = Array.isArray(images) ? JSON.stringify(images) : (images && typeof images === 'string' ? images : null);
  
  try {
    let result;
    if (imagesJson !== null) {
      try {
        [result] = await db.execute(
          'UPDATE items SET name = ?, description = ?, price = ?, category = ?, is_active = ?, images = ? WHERE id = ?',
          [name, description, price, category, is_active, imagesJson, id]
        );
      } catch (err) {
        if (err.code === 'ER_BAD_FIELD_ERROR') {
          [result] = await db.execute(
            'UPDATE items SET name = ?, description = ?, price = ?, category = ?, is_active = ? WHERE id = ?',
            [name, description, price, category, is_active, id]
          );
        } else throw err;
      }
    } else {
      [result] = await db.execute(
        'UPDATE items SET name = ?, description = ?, price = ?, category = ?, is_active = ? WHERE id = ?',
        [name, description, price, category, is_active, id]
      );
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if item is used in any service
    const [usageCheck] = await db.execute('SELECT COUNT(*) as count FROM service_items WHERE item_id = ?', [id]);
    
    if (usageCheck[0].count > 0) {
      return res.status(400).json({ message: 'Cannot delete item that is used in services. Deactivate it instead.' });
    }
    
    const [result] = await db.execute('DELETE FROM items WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Service items routes (updated for new schema)
app.get('/api/services/:serviceId/items', async (req, res) => {
  const { serviceId } = req.params;
  
  try {
    const [items] = await db.execute(`
      SELECT si.*, i.name, i.description, i.price as item_price, i.category,
             COALESCE(si.custom_price, i.price) as final_price
      FROM service_items si
      JOIN items i ON si.item_id = i.id
      WHERE si.service_id = ? AND i.is_active = true
      ORDER BY si.sort_order, i.name
    `, [serviceId]);
    res.json(items);
  } catch (error) {
    console.error('Service items error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/services/:serviceId/items', authenticateToken, async (req, res) => {
  const { serviceId } = req.params;
  const { item_id, custom_price, is_required, sort_order } = req.body;
  
  try {
    // Check if item exists
    const [itemCheck] = await db.execute('SELECT id FROM items WHERE id = ? AND is_active = true', [item_id]);
    if (itemCheck.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if service exists
    const [serviceCheck] = await db.execute('SELECT id FROM services WHERE id = ?', [serviceId]);
    if (serviceCheck.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    const [result] = await db.execute(
      'INSERT INTO service_items (service_id, item_id, custom_price, is_required, sort_order) VALUES (?, ?, ?, ?, ?)',
      [serviceId, item_id, custom_price, is_required, sort_order]
    );
    res.json({ id: result.insertId, message: 'Service item added successfully' });
  } catch (error) {
    console.error('Add service item error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Item already exists in this service' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
});

app.put('/api/service-items/:id', authenticateToken, async (req, res) => {
  const { custom_price, is_required, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE service_items SET custom_price = ?, is_required = ?, sort_order = ? WHERE id = ?',
      [custom_price, is_required, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service item not found' });
    }
    
    res.json({ message: 'Service item updated successfully' });
  } catch (error) {
    console.error('Update service item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/service-items/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM service_items WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service item not found' });
    }
    
    res.json({ message: 'Service item removed successfully' });
  } catch (error) {
    console.error('Remove service item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Payment methods routes
app.get('/api/payment-methods', async (req, res) => {
  try {
    const [methods] = await db.execute('SELECT * FROM payment_methods ORDER BY created_at DESC');
    res.json(methods);
  } catch (error) {
    console.error('Payment methods error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/payment-methods', authenticateToken, async (req, res) => {
  const { type, name, account_number, details } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO payment_methods (type, name, account_number, details) VALUES (?, ?, ?, ?)',
      [type, name, account_number, details]
    );
    res.json({ id: result.insertId, message: 'Payment method created successfully' });
  } catch (error) {
    console.error('Create payment method error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  const { type, name, account_number, details } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE payment_methods SET type = ?, name = ?, account_number = ?, details = ? WHERE id = ?',
      [type, name, account_number, details, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    res.json({ message: 'Payment method updated successfully' });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/payment-methods/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM payment_methods WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Orders routes
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status } = req.query;

    // Optional status filter (mendukung satu atau beberapa status, dipisahkan koma)
    const whereClauses = [];
    const params = [];

    if (status) {
      const statuses = status.split(',').map(s => s.trim()).filter(Boolean);

      if (statuses.length === 1) {
        whereClauses.push('status = ?');
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        whereClauses.push(`status IN (${statuses.map(() => '?').join(',')})`);
        params.push(...statuses);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    // Get total count
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM orders ${whereSql}`,
      params
    );
    const total = countResult[0].total;
    
    // Get paginated orders with service base_price
    const [orders] = await db.execute(`
      SELECT o.*, s.base_price 
      FROM orders o 
      LEFT JOIN services s ON o.service_id = s.id 
      ${whereSql ? whereSql.replace(/status/g, 'o.status') : ''}
      ORDER BY o.created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Orders error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { name, email, phone, address, wedding_date, notes, service_id, service_name, selected_items, total_amount, booking_amount } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO orders (name, email, phone, address, wedding_date, notes, service_id, service_name, selected_items, total_amount, booking_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, address, wedding_date, notes, service_id, service_name, JSON.stringify(selected_items), total_amount, booking_amount || 2000000, 'pending']
    );
    res.json({ id: result.insertId, message: 'Order created successfully' });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/orders/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/orders/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/orders/:id/booking-amount', authenticateToken, async (req, res) => {
  const { booking_amount } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE orders SET booking_amount = ? WHERE id = ?',
      [booking_amount, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json({ message: 'Booking amount updated successfully' });
  } catch (error) {
    console.error('Update booking amount error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Custom requests routes
app.post('/api/custom-requests', async (req, res) => {
  const { name, email, phone, wedding_date, booking_amount, services, additional_requests } = req.body;
  
  // Debug: Log the received data
  console.log('Received custom request data:', {
    name, email, phone, wedding_date, booking_amount, services, additional_requests
  });
  
  // Debug: Check for undefined values
  const fields = { name, email, phone, wedding_date, booking_amount, services, additional_requests };
  Object.keys(fields).forEach(key => {
    if (fields[key] === undefined) {
      console.log(`WARNING: ${key} is undefined`);
    }
  });
  
  // Validate required fields
  if (!name || !email || !phone || !wedding_date || 
      name.trim() === '' || email.trim() === '' || phone.trim() === '' || wedding_date.trim() === '') {
    return res.status(400).json({ message: 'Missing required fields: name, email, phone, wedding_date' });
  }
  
  // Ensure no undefined values are passed to the database
  const params = [
    name || null,
    email || null,
    phone || null,
    wedding_date || null,
    booking_amount ? parseFloat(booking_amount) : null,
    services || null,
    additional_requests || null,
    'pending' // Set default status to pending
  ];
  
  // Debug: Log the parameters being sent to database
  console.log('Database parameters:', params);
  
  try {
    const [result] = await db.execute(
      'INSERT INTO custom_requests (name, email, phone, wedding_date, booking_amount, services, additional_requests, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      params
    );
    res.json({ id: result.insertId, message: 'Custom request submitted successfully' });
  } catch (error) {
    console.error('Create custom request error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Helper function to get items details from services string
async function getItemsDetailsFromServices(servicesString) {
  if (!servicesString || typeof servicesString !== 'string') {
    return { items: [], totalAmount: 0 };
  }

  try {
    // Split services by comma and clean up
    const serviceNames = servicesString
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (serviceNames.length === 0) {
      return { items: [], totalAmount: 0 };
    }

    const items = [];
    let totalAmount = 0;

    // For each service name, try to find matching items
    for (const serviceName of serviceNames) {
      let matchedItem = null;
      
      // Try exact match first
      let [exactItems] = await db.execute(
        'SELECT id, name, price FROM items WHERE name = ? AND is_active = true',
        [serviceName]
      );

      // If no exact match, try LIKE match (case insensitive)
      if (exactItems.length === 0) {
        [exactItems] = await db.execute(
          'SELECT id, name, price FROM items WHERE LOWER(name) LIKE LOWER(?) AND is_active = true LIMIT 1',
          [`%${serviceName}%`]
        );
      }

      // If still no match, try reverse LIKE (service name contains item name)
      if (exactItems.length === 0) {
        [exactItems] = await db.execute(
          'SELECT id, name, price FROM items WHERE LOWER(?) LIKE CONCAT("%", LOWER(name), "%") AND is_active = true LIMIT 1',
          [serviceName]
        );
      }

      // If found, add to items list
      if (exactItems.length > 0) {
        matchedItem = exactItems[0];
        const price = parseFloat(matchedItem.price) || 0;
        items.push({
          name: serviceName, // Use original service name from request
          item_name: matchedItem.name, // Actual item name from database
          price: price
        });
        totalAmount += price;
      } else {
        // If not found, still add with price 0
        items.push({
          name: serviceName,
          item_name: serviceName,
          price: 0
        });
      }
    }

    return { items, totalAmount };
  } catch (error) {
    console.error('Error getting items details from services:', error);
    return { items: [], totalAmount: 0 };
  }
}

// Helper function to calculate total amount from services string
async function calculateTotalAmountFromServices(servicesString) {
  const { totalAmount } = await getItemsDetailsFromServices(servicesString);
  return totalAmount;
}

app.get('/api/custom-requests', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM custom_requests');
    const total = countResult[0].total;
    
    // Get paginated custom requests
    const [requests] = await db.execute(
      'SELECT * FROM custom_requests ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    // Calculate total_amount and items details for each request based on services
    const requestsWithTotal = await Promise.all(
      requests.map(async (request) => {
        const { items, totalAmount } = await getItemsDetailsFromServices(request.services);
        return {
          ...request,
          total_amount: totalAmount,
          items_details: items // Include items breakdown for invoice
        };
      })
    );
    
    res.json({
      requests: requestsWithTotal,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Custom requests error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/custom-requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM custom_requests WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Custom request not found' });
    }
    
    res.json({ message: 'Custom request deleted successfully' });
  } catch (error) {
    console.error('Delete custom request error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/custom-requests/:id/booking-amount', authenticateToken, async (req, res) => {
  const { booking_amount } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE custom_requests SET booking_amount = ? WHERE id = ?',
      [booking_amount, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Custom request not found' });
    }
    
    res.json({ message: 'Booking amount updated successfully' });
  } catch (error) {
    console.error('Update booking amount error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/custom-requests/:id/status', authenticateToken, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  
  // Validate status
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  
  try {
    const [result] = await db.execute(
      'UPDATE custom_requests SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Custom request not found' });
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Articles routes
app.get('/api/articles', async (req, res) => {
  try {
    const [articles] = await db.execute('SELECT * FROM articles ORDER BY created_at DESC');
    res.json(articles);
  } catch (error) {
    console.error('Articles error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/articles/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM articles WHERE id = ?', [id]);
    const article = rows[0];
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    res.json(article);
  } catch (error) {
    console.error('Article error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/articles', authenticateToken, async (req, res) => {
  const { title, content, excerpt, image, category } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO articles (title, content, excerpt, image, category) VALUES (?, ?, ?, ?, ?)',
      [title, content, excerpt, image, category]
    );
    res.json({ id: result.insertId, message: 'Article created successfully' });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/articles/:id', authenticateToken, async (req, res) => {
  const { title, content, excerpt, image, category } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE articles SET title = ?, content = ?, excerpt = ?, image = ?, category = ? WHERE id = ?',
      [title, content, excerpt, image, category, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    res.json({ message: 'Article updated successfully' });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/articles/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM articles WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Gallery categories routes
app.get('/api/gallery/categories', async (req, res) => {
  try {
    const [categories] = await db.execute('SELECT * FROM gallery_categories WHERE is_active = true ORDER BY sort_order, name');
    res.json(categories);
  } catch (error) {
    console.error('Gallery categories error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/gallery/categories', authenticateToken, async (req, res) => {
  const { name, description, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO gallery_categories (name, description, sort_order) VALUES (?, ?, ?)',
      [name, description, sort_order]
    );
    res.json({ id: result.insertId, message: 'Gallery category created successfully' });
  } catch (error) {
    console.error('Create gallery category error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/gallery/categories/:id', authenticateToken, async (req, res) => {
  const { name, description, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE gallery_categories SET name = ?, description = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [name, description, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery category not found' });
    }
    
    res.json({ message: 'Gallery category updated successfully' });
  } catch (error) {
    console.error('Update gallery category error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/gallery/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Check if category has images
    const [imageCheck] = await db.execute('SELECT COUNT(*) as count FROM gallery_images WHERE category_id = ?', [id]);
    
    if (imageCheck[0].count > 0) {
      return res.status(400).json({ message: 'Cannot delete category that has images. Deactivate it instead.' });
    }
    
    const [result] = await db.execute('DELETE FROM gallery_categories WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery category not found' });
    }
    
    res.json({ message: 'Gallery category deleted successfully' });
  } catch (error) {
    console.error('Delete gallery category error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Gallery images routes
app.get('/api/gallery/images', async (req, res) => {
  const { category_id, featured } = req.query;
  
  try {
    let query = `
      SELECT gi.*, gc.name as category_name 
      FROM gallery_images gi 
      LEFT JOIN gallery_categories gc ON gi.category_id = gc.id 
      WHERE gi.is_active = true
    `;
    const params = [];
    
    if (category_id) {
      query += ' AND gi.category_id = ?';
      params.push(category_id);
    }
    
    if (featured === 'true') {
      query += ' AND gi.is_featured = true';
    }
    
    query += ' ORDER BY gi.sort_order, gi.created_at DESC';
    
    const [images] = await db.execute(query, params);
    res.json(images);
  } catch (error) {
    console.error('Gallery images error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/gallery/images/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute(`
      SELECT gi.*, gc.name as category_name 
      FROM gallery_images gi 
      LEFT JOIN gallery_categories gc ON gi.category_id = gc.id 
      WHERE gi.id = ?
    `, [id]);
    const image = rows[0];
    
    if (!image) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    
    res.json(image);
  } catch (error) {
    console.error('Gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/gallery/images', authenticateToken, async (req, res) => {
  const { title, description, image_url, category_id, is_featured, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO gallery_images (title, description, image_url, category_id, is_featured, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, image_url, category_id, is_featured, sort_order]
    );
    res.json({ id: result.insertId, message: 'Gallery image created successfully' });
  } catch (error) {
    console.error('Create gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/gallery/images/:id', authenticateToken, async (req, res) => {
  const { title, description, image_url, category_id, is_featured, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image_url FROM gallery_images WHERE id = ?', [id]);
    const oldUrl = rows[0] && rows[0].image_url;
    const [result] = await db.execute(
      'UPDATE gallery_images SET title = ?, description = ?, image_url = ?, category_id = ?, is_featured = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, description, image_url, category_id, is_featured, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    if (oldUrl && oldUrl !== image_url && isStoredFilename(oldUrl)) unlinkUploadIfStored(oldUrl);
    res.json({ message: 'Gallery image updated successfully' });
  } catch (error) {
    console.error('Update gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/gallery/images/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT image_url FROM gallery_images WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM gallery_images WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    if (row && row.image_url) unlinkUploadIfStored(row.image_url);
    res.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Delete gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Content sections routes
app.get('/api/content-sections', async (req, res) => {
  try {
    const [sections] = await db.execute('SELECT * FROM content_sections ORDER BY sort_order, created_at DESC');
    res.json(sections);
  } catch (error) {
    console.error('Content sections error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/content-sections/:sectionName', async (req, res) => {
  const { sectionName } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM content_sections WHERE section_name = ? AND is_active = true', [sectionName]);
    const section = rows[0];
    
    if (!section) {
      return res.status(404).json({ message: 'Content section not found' });
    }
    
    res.json(section);
  } catch (error) {
    console.error('Content section error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/content-sections', authenticateToken, async (req, res) => {
  const { section_name, title, subtitle, description, image_url, button_text, button_url, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO content_sections (section_name, title, subtitle, description, image_url, button_text, button_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [section_name, title, subtitle, description, image_url, button_text, button_url, sort_order]
    );
    res.json({ id: result.insertId, message: 'Content section created successfully' });
  } catch (error) {
    console.error('Create content section error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ message: 'Section name already exists' });
    } else {
      res.status(500).json({ message: 'Database error' });
    }
  }
});

app.put('/api/content-sections/:id', authenticateToken, async (req, res) => {
  const { title, subtitle, description, image_url, button_text, button_url, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE content_sections SET title = ?, subtitle = ?, description = ?, image_url = ?, button_text = ?, button_url = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, subtitle, description, image_url, button_text, button_url, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Content section not found' });
    }
    
    res.json({ message: 'Content section updated successfully' });
  } catch (error) {
    console.error('Update content section error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/content-sections/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM content_sections WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Content section not found' });
    }
    
    res.json({ message: 'Content section deleted successfully' });
  } catch (error) {
    console.error('Delete content section error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Service cards routes (unified endpoint for all cards)
app.get('/api/service-cards', async (req, res) => {
  try {
    const { card_type } = req.query;
    
    let query = 'SELECT * FROM service_cards WHERE is_active = true';
    const params = [];
    
    // Filter by card_type if provided
    if (card_type) {
      query += ' AND card_type = ?';
      params.push(card_type);
    }
    
    query += ' ORDER BY card_type, sort_order, created_at DESC';
    
    const [cards] = await db.execute(query, params);
    res.json(cards);
  } catch (error) {
    console.error('Service cards error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/service-cards/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM service_cards WHERE id = ?', [id]);
    const card = rows[0];
    
    if (!card) {
      return res.status(404).json({ message: 'Service card not found' });
    }
    
    res.json(card);
  } catch (error) {
    console.error('Service card error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/service-cards', authenticateToken, async (req, res) => {
  const { title, description, icon, image_url, button_text, button_url, card_type, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO service_cards (title, description, icon, image_url, button_text, button_url, card_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, icon, image_url, button_text, button_url, card_type || 'service', sort_order]
    );
    res.json({ id: result.insertId, message: 'Card created successfully' });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/service-cards/:id', authenticateToken, async (req, res) => {
  const { title, description, icon, image_url, button_text, button_url, card_type, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE service_cards SET title = ?, description = ?, icon = ?, image_url = ?, button_text = ?, button_url = ?, card_type = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, description, icon, image_url, button_text, button_url, card_type, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Card not found' });
    }
    
    res.json({ message: 'Card updated successfully' });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/service-cards/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM service_cards WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service card not found' });
    }
    
    res.json({ message: 'Service card deleted successfully' });
  } catch (error) {
    console.error('Delete service card error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Service features routes
app.get('/api/service-features', async (req, res) => {
  try {
    const [features] = await db.execute('SELECT * FROM service_features WHERE is_active = true ORDER BY sort_order, created_at DESC');
    res.json(features);
  } catch (error) {
    console.error('Service features error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/service-features/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM service_features WHERE id = ?', [id]);
    const feature = rows[0];
    
    if (!feature) {
      return res.status(404).json({ message: 'Service feature not found' });
    }
    
    res.json(feature);
  } catch (error) {
    console.error('Service feature error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/service-features', authenticateToken, async (req, res) => {
  const { title, description, icon, sort_order } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO service_features (title, description, icon, sort_order) VALUES (?, ?, ?, ?)',
      [title, description, icon, sort_order]
    );
    res.json({ id: result.insertId, message: 'Service feature created successfully' });
  } catch (error) {
    console.error('Create service feature error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/service-features/:id', authenticateToken, async (req, res) => {
  const { title, description, icon, is_active, sort_order } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE service_features SET title = ?, description = ?, icon = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, description, icon, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service feature not found' });
    }
    
    res.json({ message: 'Service feature updated successfully' });
  } catch (error) {
    console.error('Update service feature error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/service-features/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM service_features WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service feature not found' });
    }
    
    res.json({ message: 'Service feature deleted successfully' });
  } catch (error) {
    console.error('Delete service feature error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// About cards routes - REMOVED (now handled by unified service-cards endpoint)

// Orders search route (for surat jalan dropdown)
app.get('/api/orders/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    let query = `
      SELECT id, name, email, phone, address, wedding_date, service_name, total_amount, booking_amount, status
      FROM orders
    `;
    let params = [];
    
    if (q && q.trim()) {
      query += ` WHERE 
        name LIKE ? OR 
        email LIKE ? OR 
        phone LIKE ? OR 
        service_name LIKE ? OR
        id LIKE ?
      `;
      const searchTerm = `%${q.trim()}%`;
      params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
    }
    
    query += ' ORDER BY created_at DESC LIMIT 10';
    
    const [orders] = await db.execute(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Orders search error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Surat Jalan routes
app.get('/api/surat-jalan', authenticateToken, async (req, res) => {
  try {
    // Auto-delete surat jalan whose event date has passed (e.g. event Feb 7, on Feb 8 it is deleted)
    await db.execute('DELETE FROM surat_jalan WHERE wedding_date < CURDATE()');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = (req.query.search || req.query.q || '').trim();
    
    let countSql = 'SELECT COUNT(*) as total FROM surat_jalan';
    let listSql = 'SELECT * FROM surat_jalan';
    const countParams = [];
    const listParams = [];
    
    if (search) {
      const pattern = `%${search}%`;
      countSql += ' WHERE client_name LIKE ?';
      listSql += ' WHERE client_name LIKE ?';
      countParams.push(pattern);
      listParams.push(pattern);
    }
    
    listSql += ' ORDER BY wedding_date ASC, created_at DESC LIMIT ? OFFSET ?';
    listParams.push(limit, offset);
    
    const [countResult] = await db.execute(countSql, countParams);
    const total = countResult[0].total;
    
    const [suratJalan] = await db.execute(listSql, listParams);
    
    res.json({
      suratJalan,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Surat jalan error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/surat-jalan/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT * FROM surat_jalan WHERE id = ?', [id]);
    const suratJalan = rows[0];
    
    if (!suratJalan) {
      return res.status(404).json({ message: 'Surat jalan not found' });
    }
    
    res.json(suratJalan);
  } catch (error) {
    console.error('Surat jalan detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/surat-jalan', authenticateToken, async (req, res) => {
  const { 
    order_id, 
    client_name, 
    client_phone, 
    client_address, 
    wedding_date,
    package_name,
    plaminan_image,
    pintu_masuk_image,
    dekorasi_image,
    warna_kain,
    ukuran_tenda,
    vendor_name,
    notes
  } = req.body;
  
  try {
    const [result] = await db.execute(
      `INSERT INTO surat_jalan (
        order_id, client_name, client_phone, client_address, wedding_date,
        package_name, plaminan_image, pintu_masuk_image, dekorasi_image,
        warna_kain, ukuran_tenda, vendor_name, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order_id, client_name, client_phone, client_address, wedding_date,
        package_name, plaminan_image, pintu_masuk_image, dekorasi_image,
        warna_kain, ukuran_tenda, vendor_name, notes
      ]
    );
    res.json({ id: result.insertId, message: 'Surat jalan created successfully' });
  } catch (error) {
    console.error('Create surat jalan error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/surat-jalan/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { 
    client_name, 
    client_phone, 
    client_address, 
    wedding_date,
    package_name,
    plaminan_image,
    pintu_masuk_image,
    dekorasi_image,
    warna_kain,
    ukuran_tenda,
    vendor_name,
    notes
  } = req.body;
  
  try {
    const [result] = await db.execute(
      `UPDATE surat_jalan SET 
        client_name = ?, client_phone = ?, client_address = ?, wedding_date = ?,
        package_name = ?, plaminan_image = ?, pintu_masuk_image = ?, dekorasi_image = ?,
        warna_kain = ?, ukuran_tenda = ?, vendor_name = ?, notes = ?
      WHERE id = ?`,
      [
        client_name, client_phone, client_address, wedding_date,
        package_name, plaminan_image, pintu_masuk_image, dekorasi_image,
        warna_kain, ukuran_tenda, vendor_name, notes, id
      ]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Surat jalan not found' });
    }
    
    res.json({ message: 'Surat jalan updated successfully' });
  } catch (error) {
    console.error('Update surat jalan error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/surat-jalan/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await db.execute('SELECT plaminan_image, pintu_masuk_image, dekorasi_image FROM surat_jalan WHERE id = ?', [id]);
    const row = rows[0];
    const [result] = await db.execute('DELETE FROM surat_jalan WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Surat jalan not found' });
    }
    if (row) {
      unlinkUploadIfStored(row.plaminan_image);
      unlinkUploadIfStored(row.pintu_masuk_image);
      unlinkUploadIfStored(row.dekorasi_image);
    }
    res.json({ message: 'Surat jalan deleted successfully' });
  } catch (error) {
    console.error('Delete surat jalan error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, address, instagram, consultation_date, message } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO contact_messages (name, email, phone, address, instagram, consultation_date, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, address, instagram, consultation_date, message]
    );
    res.json({ id: result.insertId, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact message error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get contact messages with pagination
app.get('/api/contact-messages', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM contact_messages');
    const total = countResult[0].total;
    
    // Get paginated contact messages
    const [messages] = await db.execute(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Contact messages error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Delete contact message
app.delete('/api/contact-messages/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM contact_messages WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Contact message not found' });
    }
    
    res.json({ message: 'Contact message deleted successfully' });
  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});