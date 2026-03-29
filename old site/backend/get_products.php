<?php
/**
 * ============================================
 * Get Products API
 * Supports filtering, sorting, and pagination
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

try {
    $conn = getDB();
    
    // Get query parameters
    $category = $_GET['category'] ?? null;
    $brand = $_GET['brand'] ?? null;
    $min_price = $_GET['min_price'] ?? null;
    $max_price = $_GET['max_price'] ?? null;
    $search = $_GET['search'] ?? null;
    $sort = $_GET['sort'] ?? 'price_asc'; // price_asc, price_desc, rating_desc, name_asc, newest
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    // Build query
    $where = ["p.is_available = 1"];
    $params = [];
    $types = "";
    
    if ($category) {
        $where[] = "c.category_slug = ?";
        $params[] = $category;
        $types .= "s";
    }
    
    if ($brand) {
        $where[] = "b.brand_slug = ?";
        $params[] = $brand;
        $types .= "s";
    }
    
    if ($min_price !== null && is_numeric($min_price)) {
        $where[] = "p.price >= ?";
        $params[] = floatval($min_price);
        $types .= "d";
    }
    
    if ($max_price !== null && is_numeric($max_price)) {
        $where[] = "p.price <= ?";
        $params[] = floatval($max_price);
        $types .= "d";
    }
    
    if ($search) {
        $where[] = "(p.name LIKE ? OR p.description LIKE ? OR p.processor LIKE ?)";
        $searchTerm = "%{$search}%";
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= "sss";
    }
    
    $whereClause = implode(" AND ", $where);
    
    // Sorting
    $orderBy = "p.price ASC";
    switch ($sort) {
        case 'price_desc':
            $orderBy = "p.price DESC";
            break;
        case 'rating_desc':
            $orderBy = "p.average_rating DESC, p.total_reviews DESC";
            break;
        case 'name_asc':
            $orderBy = "p.name ASC";
            break;
        case 'newest':
            $orderBy = "p.created_at DESC";
            break;
        case 'oldest':
            $orderBy = "p.created_at ASC";
            break;
    }
    
    // Count total products
    $countQuery = "SELECT COUNT(*) as total FROM products p 
                   LEFT JOIN categories c ON p.category_id = c.category_id 
                   LEFT JOIN brands b ON p.brand_id = b.brand_id 
                   WHERE {$whereClause}";
    
    $countStmt = $conn->prepare($countQuery);
    if (!empty($params)) {
        $countStmt->bind_param($types, ...$params);
    }
    $countStmt->execute();
    $totalResult = $countStmt->get_result();
    $total = $totalResult->fetch_assoc()['total'];
    $countStmt->close();
    
    // Get products
    $query = "SELECT p.*, c.category_name, c.category_slug, b.brand_name, b.brand_slug 
              FROM products p 
              LEFT JOIN categories c ON p.category_id = c.category_id 
              LEFT JOIN brands b ON p.brand_id = b.brand_id 
              WHERE {$whereClause} 
              ORDER BY {$orderBy} 
              LIMIT ? OFFSET ?";
    
    $stmt = $conn->prepare($query);
    $limitParam = $limit;
    $offsetParam = $offset;
    $types .= "ii";
    $params[] = $limitParam;
    $params[] = $offsetParam;
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $products = [];
    while ($row = $result->fetch_assoc()) {
        // Parse image URLs if JSON
        if (!empty($row['image_urls'])) {
            $row['images'] = json_decode($row['image_urls'], true);
        } else {
            $row['images'] = $row['image_url'] ? [$row['image_url']] : [];
        }
        
        $products[] = $row;
    }
    $stmt->close();
    
    sendJSON([
        'status' => 'success',
        'products' => $products,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => intval($total),
            'total_pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Get products error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Failed to fetch products'], 500);
}

