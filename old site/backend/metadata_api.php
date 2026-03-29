<?php
/**
 * ============================================
 * Metadata API - Categories & Brands
 * Combined API for categories and brands
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

try {
    $conn = getDB();
    $type = $_GET['type'] ?? 'all'; // 'categories', 'brands', or 'all'
    
    $result = [];
    
    if ($type === 'categories' || $type === 'all') {
        $stmt = $conn->prepare("SELECT * FROM categories ORDER BY category_name ASC");
        $stmt->execute();
        $catResult = $stmt->get_result();
        $categories = [];
        while ($row = $catResult->fetch_assoc()) {
            $categories[] = $row;
        }
        $stmt->close();
        $result['categories'] = $categories;
    }
    
    if ($type === 'brands' || $type === 'all') {
        $stmt = $conn->prepare("SELECT * FROM brands ORDER BY brand_name ASC");
        $stmt->execute();
        $brandResult = $stmt->get_result();
        $brands = [];
        while ($row = $brandResult->fetch_assoc()) {
            $brands[] = $row;
        }
        $stmt->close();
        $result['brands'] = $brands;
    }
    
    sendJSON([
        'status' => 'success',
        'data' => $result
    ]);
    
} catch (Exception $e) {
    error_log("Metadata API error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Failed to fetch metadata'], 500);
}

