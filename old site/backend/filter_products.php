<?php
/**
 * ============================================
 * Advanced Product Filtering API
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

try {
    $conn = getDB();
    
    // Get filter parameters
    $category = $_GET['category'] ?? null;
    $brand = $_GET['brand'] ?? null;
    $min_price = $_GET['min_price'] ?? null;
    $max_price = $_GET['max_price'] ?? null;
    $min_rating = $_GET['min_rating'] ?? null;
    $ram = $_GET['ram'] ?? null; // e.g., "6GB", "8GB", "12GB"
    $storage = $_GET['storage'] ?? null; // e.g., "128GB", "256GB"
    $battery_min = $_GET['battery_min'] ?? null; // mAh
    $display_size_min = $_GET['display_size_min'] ?? null;
    $display_type = $_GET['display_type'] ?? null; // AMOLED, LCD, etc.
    $sort = $_GET['sort'] ?? 'price_asc';
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = ($page - 1) * $limit;
    
    // Build WHERE clause
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
    
    if ($min_rating !== null && is_numeric($min_rating)) {
        $where[] = "p.average_rating >= ?";
        $params[] = floatval($min_rating);
        $types .= "d";
    }
    
    if ($ram) {
        $where[] = "p.ram_options LIKE ?";
        $params[] = "%{$ram}%";
        $types .= "s";
    }
    
    if ($storage) {
        $where[] = "p.storage_options LIKE ?";
        $params[] = "%{$storage}%";
        $types .= "s";
    }
    
    if ($battery_min !== null && is_numeric($battery_min)) {
        // Extract battery capacity from string (e.g., "5000mAh" -> 5000)
        $where[] = "CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(p.battery_capacity, 'mAh', 1), ' ', -1) AS UNSIGNED) >= ?";
        $params[] = intval($battery_min);
        $types .= "i";
    }
    
    if ($display_size_min !== null && is_numeric($display_size_min)) {
        // Extract display size from string (e.g., "6.7-inch" -> 6.7)
        $where[] = "CAST(SUBSTRING_INDEX(p.display_size, '-', 1) AS DECIMAL(3,1)) >= ?";
        $params[] = floatval($display_size_min);
        $types .= "d";
    }
    
    if ($display_type) {
        $where[] = "p.display_type LIKE ?";
        $params[] = "%{$display_type}%";
        $types .= "s";
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
        case 'battery_desc':
            $orderBy = "CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(p.battery_capacity, 'mAh', 1), ' ', -1) AS UNSIGNED) DESC";
            break;
    }
    
    // Count total
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
        ],
        'filters_applied' => [
            'category' => $category,
            'brand' => $brand,
            'price_range' => [$min_price, $max_price],
            'min_rating' => $min_rating
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Filter products error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Failed to filter products'], 500);
}

