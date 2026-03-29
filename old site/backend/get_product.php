<?php
/**
 * ============================================
 * Get Single Product Details
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

try {
    $conn = getDB();
    
    $product_slug = $_GET['slug'] ?? null;
    $product_id = $_GET['id'] ?? null;
    
    if (!$product_slug && !$product_id) {
        sendJSON(['status' => 'error', 'message' => 'Product slug or ID required'], 400);
    }
    
    if ($product_slug) {
        $stmt = $conn->prepare("SELECT p.*, c.category_name, c.category_slug, b.brand_name, b.brand_slug 
                                FROM products p 
                                LEFT JOIN categories c ON p.category_id = c.category_id 
                                LEFT JOIN brands b ON p.brand_id = b.brand_id 
                                WHERE p.product_slug = ? AND p.is_available = 1");
        $stmt->bind_param("s", $product_slug);
    } else {
        $stmt = $conn->prepare("SELECT p.*, c.category_name, c.category_slug, b.brand_name, b.brand_slug 
                                FROM products p 
                                LEFT JOIN categories c ON p.category_id = c.category_id 
                                LEFT JOIN brands b ON p.brand_id = b.brand_id 
                                WHERE p.product_id = ? AND p.is_available = 1");
        $stmt->bind_param("i", $product_id);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        sendJSON(['status' => 'error', 'message' => 'Product not found'], 404);
    }
    
    $product = $result->fetch_assoc();
    $stmt->close();
    
    // Parse image URLs
    if (!empty($product['image_urls'])) {
        $product['images'] = json_decode($product['image_urls'], true);
    } else {
        $product['images'] = $product['image_url'] ? [$product['image_url']] : [];
    }
    
    // Get reviews
    $reviewStmt = $conn->prepare("SELECT r.*, u.username, u.full_name 
                                  FROM reviews r 
                                  JOIN users u ON r.user_id = u.user_id 
                                  WHERE r.product_id = ? AND r.is_approved = 1 
                                  ORDER BY r.created_at DESC 
                                  LIMIT 10");
    $product_id = $product['product_id'];
    $reviewStmt->bind_param("i", $product_id);
    $reviewStmt->execute();
    $reviewResult = $reviewStmt->get_result();
    
    $reviews = [];
    while ($review = $reviewResult->fetch_assoc()) {
        $reviews[] = $review;
    }
    $reviewStmt->close();
    
    $product['reviews'] = $reviews;
    
    sendJSON([
        'status' => 'success',
        'product' => $product
    ]);
    
} catch (Exception $e) {
    error_log("Get product error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Failed to fetch product'], 500);
}

