<?php
/**
 * ============================================
 * Product Import Script
 * Import products from JSON or add manually
 * ============================================
 */

require_once 'config.php';

// This is a utility script - should be protected in production
// Add authentication check here if needed

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['status' => 'error', 'message' => 'Invalid request method'], 405);
}

try {
    $conn = getDB();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['products']) || !is_array($data['products'])) {
        sendJSON(['status' => 'error', 'message' => 'Invalid data format'], 400);
    }

    $imported = 0;
    $errors = [];

    foreach ($data['products'] as $product) {
        try {
            // Get category ID
            $category_slug = $product['category_slug'] ?? '';
            $category_id = null;
            if ($category_slug) {
                $catStmt = $conn->prepare("SELECT category_id FROM categories WHERE category_slug = ?");
                $catStmt->bind_param("s", $category_slug);
                $catStmt->execute();
                $catResult = $catStmt->get_result();
                if ($catRow = $catResult->fetch_assoc()) {
                    $category_id = $catRow['category_id'];
                }
                $catStmt->close();
            }

            // Get brand ID
            $brand_slug = $product['brand_slug'] ?? '';
            $brand_id = null;
            if ($brand_slug) {
                $brandStmt = $conn->prepare("SELECT brand_id FROM brands WHERE brand_slug = ?");
                $brandStmt->bind_param("s", $brand_slug);
                $brandStmt->execute();
                $brandResult = $brandStmt->get_result();
                if ($brandRow = $brandResult->fetch_assoc()) {
                    $brand_id = $brandRow['brand_id'];
                }
                $brandStmt->close();
            }

            // Prepare product data
            $product_slug = $product['product_slug'] ?? strtolower(str_replace(' ', '-', $product['name']));
            $name = $product['name'];
            $price = floatval($product['price']);
            $launch_year = intval($product['launch_year'] ?? date('Y'));
            $status = $product['status'] ?? 'Available';
            $display = $product['display'] ?? '';
            $performance = $product['performance'] ?? '';
            $battery = $product['battery'] ?? '';
            $camera = $product['camera'] ?? '';
            $connectivity = $product['connectivity'] ?? '';
            $vfm_rating = floatval($product['vfmRating'] ?? 0);
            $justification = $product['justification'] ?? '';
            $image_url = $product['image'] ?? '';
            $stock_quantity = intval($product['stock_quantity'] ?? 10);

            // Extract display details
            $display_size = '';
            $display_type = '';
            $display_resolution = '';
            $refresh_rate = '';
            $brightness = '';

            if (preg_match('/(\d+\.?\d*)-inch/', $display, $matches)) {
                $display_size = $matches[1] . '-inch';
            }
            if (preg_match('/(AMOLED|LCD|IPS|OLED)/i', $display, $matches)) {
                $display_type = $matches[1];
            }
            if (preg_match('/(FHD\+|HD\+|QHD\+|1\.5K|2K)/i', $display, $matches)) {
                $display_resolution = $matches[1];
            }
            if (preg_match('/(\d+)Hz/', $display, $matches)) {
                $refresh_rate = $matches[1] . 'Hz';
            }
            if (preg_match('/(\d+)\s*nits/', $display, $matches)) {
                $brightness = $matches[1] . ' nits';
            }

            // Extract battery details
            $battery_capacity = '';
            $charging_speed = '';
            if (preg_match('/(\d+)mAh/', $battery, $matches)) {
                $battery_capacity = $matches[1] . 'mAh';
            }
            if (preg_match('/(\d+)W/', $battery, $matches)) {
                $charging_speed = $matches[1] . 'W';
            }

            // Insert product
            $stmt = $conn->prepare("INSERT INTO products 
                (product_slug, name, category_id, brand_id, launch_year, status,
                 display_size, display_type, display_resolution, refresh_rate, brightness,
                 processor, battery_capacity, charging_speed,
                 rear_camera, front_camera, connectivity,
                 price, vfm_rating, justification, image_url, stock_quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                price = VALUES(price),
                stock_quantity = VALUES(stock_quantity)");

            $stmt->bind_param("ssiiisssssssssssssddsdsi",
                $product_slug, $name, $category_id, $brand_id, $launch_year, $status,
                $display_size, $display_type, $display_resolution, $refresh_rate, $brightness,
                $performance, $battery_capacity, $charging_speed,
                $camera, $camera, $connectivity,
                $price, $vfm_rating, $justification, $image_url, $stock_quantity);

            if ($stmt->execute()) {
                $imported++;
            }
            else {
                $errors[] = "Failed to import: {$name}";
            }
            $stmt->close();

        }
        catch (Exception $e) {
            $errors[] = "Error importing {$product['name']}: " . $e->getMessage();
        }
    }

    sendJSON([
        'status' => 'success',
        'message' => "Imported {$imported} products",
        'imported' => $imported,
        'errors' => $errors
    ]);


}
catch (Exception $e) {
    error_log("Import products error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Import failed'], 500);
}
