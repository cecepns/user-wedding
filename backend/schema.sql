-- Wedding Organizer Database Schema

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Items table (master items that can be used across services)
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service items relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS service_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  item_id INT NOT NULL,
  custom_price DECIMAL(10,2),
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_service_item (service_id, item_id)
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  account_number VARCHAR(255),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  wedding_date DATE,
  notes TEXT,
  service_id INT,
  service_name VARCHAR(255),
  selected_items JSON,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
);

-- Custom requests table
CREATE TABLE IF NOT EXISTS custom_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  wedding_date DATE,
  guest_count INT,
  budget VARCHAR(50),
  services TEXT,
  additional_requests TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  image VARCHAR(500),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gallery categories table
CREATE TABLE IF NOT EXISTS gallery_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Gallery images table
CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  category_id INT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES gallery_categories(id) ON DELETE SET NULL
);

-- Insert sample data

-- Sample items
INSERT IGNORE INTO items (id, name, description, price, category) VALUES 
(1, 'Venue Decoration', 'Complete venue setup with floral arrangements and lighting', 5000, 'Decoration'),
(2, 'Wedding Coordination', 'Professional wedding coordinator for the entire day', 3000, 'Coordination'),
(3, 'Photography Package', 'Professional photographer for ceremony and reception', 4000, 'Photography'),
(4, 'Catering Service', 'Complete dining experience for all guests', 8000, 'Catering'),
(5, 'Entertainment', 'Live music and DJ services', 2500, 'Entertainment'),
(6, 'Intimate Venue Setup', 'Cozy decoration perfect for small gatherings', 2500, 'Decoration'),
(7, 'Mini Photography', 'Professional photos for intimate ceremonies', 2000, 'Photography'),
(8, 'Small Catering', 'Gourmet catering for small groups', 4000, 'Catering'),
(9, 'Luxury Decoration', 'Premium floral arrangements and exclusive setup', 15000, 'Decoration'),
(10, 'Premium Photography', 'Award-winning photographers and videographers', 10000, 'Photography'),
(11, 'Gourmet Catering', 'Multi-course dining with premium ingredients', 20000, 'Catering'),
(12, 'Luxury Transportation', 'Premium vehicle arrangements for the couple', 3000, 'Transportation');

-- Sample services
INSERT IGNORE INTO services (id, name, description, base_price, image) VALUES 
(1, 'Complete Wedding Package', 'Full wedding planning service including venue, decoration, catering, and coordination', 25000, 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800'),
(2, 'Intimate Wedding Package', 'Perfect for small gatherings with personalized touches and elegant decoration', 12000, 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800'),
(3, 'Luxury Wedding Package', 'Premium service with exclusive venues, high-end decoration, and professional coordination', 50000, 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800');

-- Sample service-item relationships
INSERT IGNORE INTO service_items (service_id, item_id, custom_price, is_required, sort_order) VALUES 
(1, 1, NULL, true, 1),
(1, 2, NULL, true, 2),
(1, 3, NULL, false, 3),
(1, 4, NULL, true, 4),
(1, 5, NULL, false, 5),
(2, 6, NULL, true, 1),
(2, 7, NULL, false, 2),
(2, 8, NULL, true, 3),
(3, 9, NULL, true, 1),
(3, 10, NULL, true, 2),
(3, 11, NULL, true, 3),
(3, 12, NULL, false, 4);

-- Sample gallery categories
INSERT IGNORE INTO gallery_categories (id, name, description, sort_order) VALUES 
(1, 'Upacara', 'Foto-foto upacara pernikahan yang indah', 1),
(2, 'Resepsi', 'Dokumentasi resepsi pernikahan', 2),
(3, 'Dekorasi', 'Koleksi dekorasi pernikahan', 3),
(4, 'Pasangan', 'Foto-foto pasangan pengantin', 4),
(5, 'Detail', 'Detail-detail pernikahan yang menarik', 5);

-- Sample gallery images
INSERT IGNORE INTO gallery_images (id, title, description, image_url, category_id, is_featured, sort_order) VALUES 
(1, 'Upacara Luar Ruangan yang Indah', 'Upacara pernikahan di taman yang indah', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800', 1, true, 1),
(2, 'Setup Resepsi yang Elegan', 'Dekorasi resepsi yang mewah dan elegan', 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800', 2, true, 1),
(3, 'Rangkaian Bunga', 'Rangkaian bunga yang cantik untuk dekorasi', 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=800', 3, false, 1),
(4, 'Pasangan Bahagia', 'Foto pasangan pengantin yang bahagia', 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?auto=compress&cs=tinysrgb&w=800', 4, true, 1),
(5, 'Kue Pernikahan', 'Kue pernikahan yang indah dan lezat', 'https://images.pexels.com/photos/1128797/pexels-photo-1128797.jpeg?auto=compress&cs=tinysrgb&w=800', 3, false, 2),
(6, 'Pernikahan Pantai', 'Upacara pernikahan di pantai yang romantis', 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800', 1, false, 2); 