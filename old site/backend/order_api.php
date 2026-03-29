<?php
/**
 * ============================================
 * Order Management API
 * Get user orders and order details
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
            $order_id = $_GET['order_id'] ?? null;
            $order_number = $_GET['order_number'] ?? null;
            
            if ($order_id || $order_number) {
                // Get single order details
                if ($order_id) {
                    $stmt = $conn->prepare("SELECT * FROM orders WHERE order_id = ? AND user_id = ?");
                    $stmt->bind_param("ii", $order_id, $user_id);
                } else {
                    $stmt = $conn->prepare("SELECT * FROM orders WHERE order_number = ? AND user_id = ?");
                    $stmt->bind_param("si", $order_number, $user_id);
                }
                
                $stmt->execute();
                $order = $stmt->get_result()->fetch_assoc();
                $stmt->close();
                
                if (!$order) {
                    sendJSON(['status' => 'error', 'message' => 'Order not found'], 404);
                }
                
                // Get order items
                $itemsStmt = $conn->prepare("SELECT oi.*, p.image_url, p.product_slug 
                                            FROM order_items oi
                                            LEFT JOIN products p ON oi.product_id = p.product_id
                                            WHERE oi.order_id = ?");
                $itemsStmt->bind_param("i", $order['order_id']);
                $itemsStmt->execute();
                $itemsResult = $itemsStmt->get_result();
                
                $items = [];
                while ($item = $itemsResult->fetch_assoc()) {
                    $items[] = $item;
                }
                $itemsStmt->close();
                
                $order['items'] = $items;
                
                sendJSON([
                    'status' => 'success',
                    'order' => $order
                ]);
            } else {
                // Get all user orders
                $stmt = $conn->prepare("SELECT order_id, order_number, total_amount, order_status, 
                                       payment_status, created_at
                                       FROM orders 
                                       WHERE user_id = ? 
                                       ORDER BY created_at DESC");
                $stmt->bind_param("i", $user_id);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $orders = [];
                while ($row = $result->fetch_assoc()) {
                    $orders[] = $row;
                }
                $stmt->close();
                
                sendJSON([
                    'status' => 'success',
                    'orders' => $orders,
                    'count' => count($orders)
                ]);
            }
            break;
            
        default:
            sendJSON(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    
} catch (Exception $e) {
    error_log("Order API error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Failed to fetch orders'], 500);
}

