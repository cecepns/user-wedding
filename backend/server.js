const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
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

// Services routes
app.get('/api/services', async (req, res) => {
  try {
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
    const [result] = await db.execute(
      'UPDATE services SET name = ?, description = ?, base_price = ?, image = ? WHERE id = ?',
      [name, description, base_price, image, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json({ message: 'Service updated successfully' });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/services/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM services WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Items routes (master items management)
app.get('/api/items', async (req, res) => {
  try {
    const [items] = await db.execute('SELECT * FROM items WHERE is_active = true ORDER BY category, name');
    res.json(items);
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
    
    res.json(item);
  } catch (error) {
    console.error('Item detail error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/items', authenticateToken, async (req, res) => {
  const { name, description, price, category } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO items (name, description, price, category) VALUES (?, ?, ?, ?)',
      [name, description, price, category]
    );
    res.json({ id: result.insertId, message: 'Item created successfully' });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
  const { name, description, price, category, is_active } = req.body;
  const { id } = req.params;
  
  try {
    const [result] = await db.execute(
      'UPDATE items SET name = ?, description = ?, price = ?, category = ?, is_active = ? WHERE id = ?',
      [name, description, price, category, is_active, id]
    );
    
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
    
    // Get total count
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM orders');
    const total = countResult[0].total;
    
    // Get paginated orders
    const [orders] = await db.execute(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    
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
  const { name, email, phone, address, wedding_date, notes, service_id, service_name, selected_items, total_amount } = req.body;
  
  try {
    const [result] = await db.execute(
      'INSERT INTO orders (name, email, phone, address, wedding_date, notes, service_id, service_name, selected_items, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, address, wedding_date, notes, service_id, service_name, JSON.stringify(selected_items), total_amount, 'pending']
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
    additional_requests || null
  ];
  
  // Debug: Log the parameters being sent to database
  console.log('Database parameters:', params);
  
  try {
    const [result] = await db.execute(
      'INSERT INTO custom_requests (name, email, phone, wedding_date, booking_amount, services, additional_requests) VALUES (?, ?, ?, ?, ?, ?, ?)',
      params
    );
    res.json({ id: result.insertId, message: 'Custom request submitted successfully' });
  } catch (error) {
    console.error('Create custom request error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

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
    
    res.json({
      requests,
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
    const [result] = await db.execute(
      'UPDATE gallery_images SET title = ?, description = ?, image_url = ?, category_id = ?, is_featured = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [title, description, image_url, category_id, is_featured, is_active, sort_order, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    
    res.json({ message: 'Gallery image updated successfully' });
  } catch (error) {
    console.error('Update gallery image error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/gallery/images/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await db.execute('DELETE FROM gallery_images WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }
    
    res.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Delete gallery image error:', error);
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