<?php
/**
 * ============================================
 * Wishlist Management API
 * Handles: GET, POST (add), DELETE (remove)
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    sendJSON(['status' => 'error', 'message' => 'Authentication required'], 401);
}

$method = $_SERVER['REQUEST_METHOD'];
$user_id = getCurrentUserId();

try {
    $conn = getDB();
    
    switch ($method) {
        case 'GET':
            // Get user's wishlist
            $stmt = $conn->prepare("SELECT w.*, p.name, p.price, p.image_url, p.product_slug, 
                                    p.stock_quantity, p.is_available, c.category_name, b.brand_name
                                    FROM wishlist w
                                    JOIN products p ON w.product_id = p.product_id
                                    LEFT JOIN categories c ON p.category_id = c.category_id
                                    LEFT JOIN brands b ON p.brand_id = b.brand_id
                                    WHERE w.user_id = ?
                                    ORDER BY w.added_at DESC");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $wishlist_items = [];
            while ($row = $result->fetch_assoc()) {
                $wishlist_items[] = $row;
            }
            $stmt->close();
            
            sendJSON([
                'status' => 'success',
                'wishlist_items' => $wishlist_items,
                'count' => count($wishlist_items)
            ]);
            break;
            
        case 'POST':
            // Add item to wishlist
            $data = json_decode(file_get_contents('php://input'), true);
            $product_id = intval($data['product_id'] ?? 0);
            
            if ($product_id <= 0) {
                sendJSON(['status' => 'error', 'message' => 'Invalid product ID'], 400);
            }
            
            // Check if product exists
            $checkStmt = $conn->prepare("SELECT product_id FROM products WHERE product_id = ?");
            $checkStmt->bind_param("i", $product_id);
            $checkStmt->execute();
            $product = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();
            
            if (!$product) {
                sendJSON(['status' => 'error', 'message' => 'Product not found'], 404);
            }
            
            // Check if already in wishlist
            $checkWishStmt = $conn->prepare("SELECT wishlist_id FROM wishlist WHERE user_id = ? AND product_id = ?");
            $checkWishStmt->bind_param("ii", $user_id, $product_id);
            $checkWishStmt->execute();
            $existing = $checkWishStmt->get_result()->fetch_assoc();
            $checkWishStmt->close();
            
            if ($existing) {
                sendJSON(['status' => 'error', 'message' => 'Product already in wishlist'], 409);
            }
            
            // Add to wishlist
            $insertStmt = $conn->prepare("INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)");
            $insertStmt->bind_param("ii", $user_id, $product_id);
            $insertStmt->execute();
            $insertStmt->close();
            
            sendJSON([
                'status' => 'success',
                'message' => 'Product added to wishlist'
            ]);
            break;
            
        case 'DELETE':
            // Remove item from wishlist
            $product_id = intval($_GET['product_id'] ?? 0);
            
            if ($product_id <= 0) {
                sendJSON(['status' => 'error', 'message' => 'Invalid product ID'], 400);
            }
            
            $deleteStmt = $conn->prepare("DELETE FROM wishlist WHERE product_id = ? AND user_id = ?");
            $deleteStmt->bind_param("ii", $product_id, $user_id);
            $deleteStmt->execute();
            
            if ($deleteStmt->affected_rows > 0) {
                sendJSON(['status' => 'success', 'message' => 'Product removed from wishlist']);
            } else {
                sendJSON(['status' => 'error', 'message' => 'Product not found in wishlist'], 404);
            }
            $deleteStmt->close();
            break;
            
        default:
            sendJSON(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    
} catch (Exception $e) {
    error_log("Wishlist API error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'An error occurred'], 500);
}

