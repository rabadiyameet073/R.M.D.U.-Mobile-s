<?php
/**
 * ============================================
 * Search Products API
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

try {
    $conn = getDB();
    
    $query = $_GET['q'] ?? '';
    $limit = intval($_GET['limit'] ?? 10);
    
    if (empty($query)) {
        sendJSON(['status' => 'error', 'message' => 'Search query required'], 400);
    }
    
    $searchTerm = "%{$query}%";
    
    $stmt = $conn->prepare("SELECT p.product_id, p.product_slug, p.name, p.price, p.image_url, 
                            p.average_rating, p.total_reviews, c.category_name, b.brand_name
                            FROM products p 
                            LEFT JOIN categories c ON p.category_id = c.category_id 
                            LEFT JOIN brands b ON p.brand_id = b.brand_id 
                            WHERE p.is_available = 1 
                            AND (p.name LIKE ? OR p.description LIKE ? OR p.processor LIKE ? OR b.brand_name LIKE ?)
                            ORDER BY p.average_rating DESC, p.total_reviews DESC
                            LIMIT ?");
    
    $stmt->bind_param("ssssi", $searchTerm, $searchTerm, $searchTerm, $searchTerm, $limit);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        $products[] = $row;
    }
    $stmt->close();
    
    sendJSON([
        'status' => 'success',
        'query' => $query,
        'products' => $products,
        'count' => count($products)
    ]);
    
} catch (Exception $e) {
    error_log("Search products error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Search failed'], 500);
}

