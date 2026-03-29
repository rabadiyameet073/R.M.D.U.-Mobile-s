<?php
/**
 * ============================================
 * Cart Management API
 * Handles: GET, POST (add), PUT (update), DELETE (remove)
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
            // Get user's cart
            $stmt = $conn->prepare("SELECT c.*, p.name, p.price, p.image_url, p.stock_quantity, p.is_available,
                                    (c.quantity * p.price) as item_total
                                    FROM cart c
                                    JOIN products p ON c.product_id = p.product_id
                                    WHERE c.user_id = ?
                                    ORDER BY c.added_at DESC");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $cart_items = [];
            $subtotal = 0;
            
            while ($row = $result->fetch_assoc()) {
                $row['item_total'] = floatval($row['item_total']);
                $subtotal += $row['item_total'];
                $cart_items[] = $row;
            }
            $stmt->close();
            
            // Calculate totals
            $tax = $subtotal * 0.18; // 18% GST
            $shipping = $subtotal > 5000 ? 0 : 99; // Free shipping above ₹5000
            $total = $subtotal + $tax + $shipping;
            
            sendJSON([
                'status' => 'success',
                'cart_items' => $cart_items,
                'summary' => [
                    'subtotal' => round($subtotal, 2),
                    'tax' => round($tax, 2),
                    'shipping' => round($shipping, 2),
                    'total' => round($total, 2),
                    'item_count' => count($cart_items)
                ]
            ]);
            break;
            
        case 'POST':
            // Add item to cart
            $data = json_decode(file_get_contents('php://input'), true);
            $product_id = intval($data['product_id'] ?? 0);
            $quantity = intval($data['quantity'] ?? 1);
            
            if ($product_id <= 0) {
                sendJSON(['status' => 'error', 'message' => 'Invalid product ID'], 400);
            }
            
            // Check if product exists and is available
            $checkStmt = $conn->prepare("SELECT product_id, price, stock_quantity, is_available FROM products WHERE product_id = ?");
            $checkStmt->bind_param("i", $product_id);
            $checkStmt->execute();
            $product = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();
            
            if (!$product) {
                sendJSON(['status' => 'error', 'message' => 'Product not found'], 404);
            }
            
            if (!$product['is_available']) {
                sendJSON(['status' => 'error', 'message' => 'Product is not available'], 400);
            }
            
            if ($product['stock_quantity'] < $quantity) {
                sendJSON(['status' => 'error', 'message' => 'Insufficient stock'], 400);
            }
            
            // Check if item already in cart
            $checkCartStmt = $conn->prepare("SELECT cart_id, quantity FROM cart WHERE user_id = ? AND product_id = ?");
            $checkCartStmt->bind_param("ii", $user_id, $product_id);
            $checkCartStmt->execute();
            $existing = $checkCartStmt->get_result()->fetch_assoc();
            $checkCartStmt->close();
            
            if ($existing) {
                // Update quantity
                $new_quantity = $existing['quantity'] + $quantity;
                if ($new_quantity > $product['stock_quantity']) {
                    sendJSON(['status' => 'error', 'message' => 'Insufficient stock'], 400);
                }
                
                $updateStmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE cart_id = ?");
                $updateStmt->bind_param("ii", $new_quantity, $existing['cart_id']);
                $updateStmt->execute();
                $updateStmt->close();
                
                sendJSON([
                    'status' => 'success',
                    'message' => 'Cart updated',
                    'quantity' => $new_quantity
                ]);
            } else {
                // Insert new item
                $insertStmt = $conn->prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)");
                $insertStmt->bind_param("iii", $user_id, $product_id, $quantity);
                $insertStmt->execute();
                $insertStmt->close();
                
                sendJSON([
                    'status' => 'success',
                    'message' => 'Item added to cart'
                ]);
            }
            break;
            
        case 'PUT':
            // Update cart item quantity
            $data = json_decode(file_get_contents('php://input'), true);
            $cart_id = intval($data['cart_id'] ?? 0);
            $quantity = intval($data['quantity'] ?? 1);
            
            if ($cart_id <= 0 || $quantity <= 0) {
                sendJSON(['status' => 'error', 'message' => 'Invalid cart ID or quantity'], 400);
            }
            
            // Verify cart item belongs to user
            $verifyStmt = $conn->prepare("SELECT c.cart_id, p.stock_quantity FROM cart c 
                                         JOIN products p ON c.product_id = p.product_id 
                                         WHERE c.cart_id = ? AND c.user_id = ?");
            $verifyStmt->bind_param("ii", $cart_id, $user_id);
            $verifyStmt->execute();
            $verify = $verifyStmt->get_result()->fetch_assoc();
            $verifyStmt->close();
            
            if (!$verify) {
                sendJSON(['status' => 'error', 'message' => 'Cart item not found'], 404);
            }
            
            if ($quantity > $verify['stock_quantity']) {
                sendJSON(['status' => 'error', 'message' => 'Insufficient stock'], 400);
            }
            
            $updateStmt = $conn->prepare("UPDATE cart SET quantity = ? WHERE cart_id = ? AND user_id = ?");
            $updateStmt->bind_param("iii", $quantity, $cart_id, $user_id);
            $updateStmt->execute();
            $updateStmt->close();
            
            sendJSON([
                'status' => 'success',
                'message' => 'Cart updated',
                'quantity' => $quantity
            ]);
            break;
            
        case 'DELETE':
            // Remove item from cart
            $cart_id = intval($_GET['cart_id'] ?? 0);
            
            if ($cart_id <= 0) {
                sendJSON(['status' => 'error', 'message' => 'Invalid cart ID'], 400);
            }
            
            $deleteStmt = $conn->prepare("DELETE FROM cart WHERE cart_id = ? AND user_id = ?");
            $deleteStmt->bind_param("ii", $cart_id, $user_id);
            $deleteStmt->execute();
            
            if ($deleteStmt->affected_rows > 0) {
                sendJSON(['status' => 'success', 'message' => 'Item removed from cart']);
            } else {
                sendJSON(['status' => 'error', 'message' => 'Cart item not found'], 404);
            }
            $deleteStmt->close();
            break;
            
        default:
            sendJSON(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    
} catch (Exception $e) {
    error_log("Cart API error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'An error occurred'], 500);
}

