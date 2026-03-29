-- ============================================
-- RMDU Mobile E-commerce Database Schema
-- Complete SQL Database Structure
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS rmdu_mobile_db;
USE rmdu_mobile_db;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) UNIQUE NOT NULL,
    category_slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slug (category_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BRANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(50) UNIQUE NOT NULL,
    brand_slug VARCHAR(50) UNIQUE NOT NULL,
    logo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slug (brand_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id INT,
    brand_id INT,
    launch_year INT,
    status VARCHAR(50),
    
    -- Display Specifications
    display_size VARCHAR(50),
    display_type VARCHAR(50),
    display_resolution VARCHAR(50),
    refresh_rate VARCHAR(50),
    brightness VARCHAR(50),
    
    -- Performance Specifications
    processor VARCHAR(100),
    ram_options VARCHAR(100),
    storage_options VARCHAR(100),
    os VARCHAR(50),
    
    -- Battery Specifications
    battery_capacity VARCHAR(50),
    charging_speed VARCHAR(50),
    
    -- Camera Specifications
    rear_camera VARCHAR(200),
    front_camera VARCHAR(100),
    
    -- Connectivity & Features
    connectivity VARCHAR(200),
    features TEXT,
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    discount_percentage INT DEFAULT 0,
    
    -- Ratings & Reviews
    vfm_rating DECIMAL(3, 1),
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    
    -- Product Details
    justification TEXT,
    description TEXT,
    image_url VARCHAR(500),
    image_urls TEXT, -- JSON array for multiple images
    
    -- Stock Management
    stock_quantity INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE SET NULL,
    INDEX idx_category (category_id),
    INDEX idx_brand (brand_id),
    INDEX idx_price (price),
    INDEX idx_rating (average_rating),
    INDEX idx_available (is_available),
    INDEX idx_featured (is_featured),
    FULLTEXT INDEX idx_search (name, description, processor, features)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CART TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cart (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WISHLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS wishlist (
    wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product_wishlist (user_id, product_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Shipping Information
    shipping_name VARCHAR(100) NOT NULL,
    shipping_email VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city VARCHAR(50) NOT NULL,
    shipping_state VARCHAR(50) NOT NULL,
    shipping_pincode VARCHAR(10) NOT NULL,
    
    -- Order Details
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    shipping_charges DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Payment Information
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(100),
    
    -- Order Status
    order_status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
    tracking_number VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (order_status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(200) NOT NULL, -- Store snapshot of product name
    product_price DECIMAL(10, 2) NOT NULL, -- Store snapshot of price at time of order
    quantity INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- REVIEWS/FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    order_id INT, -- Optional: Link to order if review is from purchase
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_user (user_id),
    INDEX idx_rating (rating),
    INDEX idx_approved (is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- FEEDBACK TABLE (General Website Feedback)
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    feedback_type VARCHAR(50), -- general, bug, suggestion, complaint
    status VARCHAR(50) DEFAULT 'new', -- new, read, responded, resolved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INSERT DEFAULT CATEGORIES
-- ============================================
INSERT INTO categories (category_name, category_slug, description, icon) VALUES
('Budget Killer', 'budget-killer', 'Best value phones under ₹20,000', '💰'),
('Gaming Guru', 'gaming-guru', 'High-performance phones for gaming', '🎮'),
('Camera Champion', 'camera-champion', 'Best camera phones', '📷'),
('Battery Beast', 'battery-beast', 'Long-lasting battery phones', '🔋'),
('G.O.A.T Legends', 'goat-legends', 'Flagship premium phones', '🏆')
ON DUPLICATE KEY UPDATE category_name=category_name;

-- ============================================
-- INSERT DEFAULT BRANDS
-- ============================================
INSERT INTO brands (brand_name, brand_slug) VALUES
('Apple', 'apple'),
('Samsung', 'samsung'),
('OnePlus', 'oneplus'),
('iQOO', 'iqoo'),
('Nothing', 'nothing'),
('Redmi', 'redmi'),
('Realme', 'realme'),
('POCO', 'poco'),
('Tecno', 'tecno'),
('Motorola', 'motorola'),
('Vivo', 'vivo'),
('Oppo', 'oppo')
ON DUPLICATE KEY UPDATE brand_name=brand_name;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update product average rating when review is added/updated
DELIMITER //
CREATE TRIGGER update_product_rating AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE products
    SET average_rating = (
        SELECT AVG(rating)
        FROM reviews
        WHERE product_id = NEW.product_id AND is_approved = TRUE
    ),
    total_reviews = (
        SELECT COUNT(*)
        FROM reviews
        WHERE product_id = NEW.product_id AND is_approved = TRUE
    )
    WHERE product_id = NEW.product_id;
END//

CREATE TRIGGER update_product_rating_on_update AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
    UPDATE products
    SET average_rating = (
        SELECT AVG(rating)
        FROM reviews
        WHERE product_id = NEW.product_id AND is_approved = TRUE
    ),
    total_reviews = (
        SELECT COUNT(*)
        FROM reviews
        WHERE product_id = NEW.product_id AND is_approved = TRUE
    )
    WHERE product_id = NEW.product_id;
END//
DELIMITER ;

-- ============================================
-- VIEWS
-- ============================================

-- View for product details with category and brand
CREATE OR REPLACE VIEW product_details_view AS
SELECT 
    p.*,
    c.category_name,
    c.category_slug,
    b.brand_name,
    b.brand_slug
FROM products p
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN brands b ON p.brand_id = b.brand_id;

-- View for cart with product details
CREATE OR REPLACE VIEW cart_details_view AS
SELECT 
    c.*,
    p.name as product_name,
    p.price,
    p.image_url,
    p.stock_quantity,
    p.is_available,
    (c.quantity * p.price) as item_total
FROM cart c
JOIN products p ON c.product_id = p.product_id;

-- View for wishlist with product details
CREATE OR REPLACE VIEW wishlist_details_view AS
SELECT 
    w.*,
    p.name as product_name,
    p.price,
    p.image_url,
    p.stock_quantity,
    p.is_available
FROM wishlist w
JOIN products p ON w.product_id = p.product_id;

