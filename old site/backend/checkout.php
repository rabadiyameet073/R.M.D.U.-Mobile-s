<?php
/**
 * ============================================
 * Checkout API
 * Processes order creation
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    sendJSON(['status' => 'error', 'message' => 'Authentication required'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['status' => 'error', 'message' => 'Invalid request method'], 405);
}

try {
    $conn = getDB();
    $user_id = getCurrentUserId();
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Get shipping information
    $shipping_name = sanitizeInput($data['shipping_name'] ?? '');
    $shipping_email = sanitizeInput($data['shipping_email'] ?? '');
    $shipping_phone = sanitizeInput($data['shipping_phone'] ?? '');
    $shipping_address = sanitizeInput($data['shipping_address'] ?? '');
    $shipping_city = sanitizeInput($data['shipping_city'] ?? '');
    $shipping_state = sanitizeInput($data['shipping_state'] ?? '');
    $shipping_pincode = sanitizeInput($data['shipping_pincode'] ?? '');
    $payment_method = sanitizeInput($data['payment_method'] ?? 'cod');
    
    // Validation
    if (empty($shipping_name) || empty($shipping_email) || empty($shipping_phone) || 
        empty($shipping_address) || empty($shipping_city) || empty($shipping_state) || empty($shipping_pincode)) {
        sendJSON(['status' => 'error', 'message' => 'All shipping fields are required'], 400);
    }
    
    if (!validateEmail($shipping_email)) {
        sendJSON(['status' => 'error', 'message' => 'Invalid email format'], 400);
    }
    
    // Get cart items
    $cartStmt = $conn->prepare("SELECT c.*, p.name, p.price, p.stock_quantity, p.is_available
                                FROM cart c
                                JOIN products p ON c.product_id = p.product_id
                                WHERE c.user_id = ?");
    $cartStmt->bind_param("i", $user_id);
    $cartStmt->execute();
    $cartResult = $cartStmt->get_result();
    
    if ($cartResult->num_rows === 0) {
        $cartStmt->close();
        sendJSON(['status' => 'error', 'message' => 'Cart is empty'], 400);
    }
    
    $cart_items = [];
    $subtotal = 0;
    
    while ($item = $cartResult->fetch_assoc()) {
        // Check stock availability
        if (!$item['is_available']) {
            $cartStmt->close();
            sendJSON(['status' => 'error', 'message' => "Product '{$item['name']}' is no longer available"], 400);
        }
        
        if ($item['stock_quantity'] < $item['quantity']) {
            $cartStmt->close();
            sendJSON(['status' => 'error', 'message' => "Insufficient stock for '{$item['name']}'"], 400);
        }
        
        $item_total = $item['price'] * $item['quantity'];
        $subtotal += $item_total;
        $cart_items[] = $item;
    }
    $cartStmt->close();
    
    // Calculate totals
    $tax = $subtotal * 0.18; // 18% GST
    $shipping_charges = $subtotal > 5000 ? 0 : 99;
    $discount = 0; // Can be calculated based on coupons/promotions
    $total = $subtotal + $tax + $shipping_charges - $discount;
    
    // Start transaction
    $conn->begin_transaction();
    
    try {
        // Generate order number
        $order_number = generateOrderNumber();
        
        // Create order
        $orderStmt = $conn->prepare("INSERT INTO orders 
                                    (user_id, order_number, shipping_name, shipping_email, shipping_phone,
                                     shipping_address, shipping_city, shipping_state, shipping_pincode,
                                     subtotal, tax_amount, shipping_charges, discount_amount, total_amount,
                                     payment_method, payment_status, order_status)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')");
        
        $orderStmt->bind_param("issssssssdddddss", 
            $user_id, $order_number, $shipping_name, $shipping_email, $shipping_phone,
            $shipping_address, $shipping_city, $shipping_state, $shipping_pincode,
            $subtotal, $tax, $shipping_charges, $discount, $total,
            $payment_method);
        
        $orderStmt->execute();
        $order_id = $conn->insert_id;
        $orderStmt->close();
        
        // Create order items and update stock
        foreach ($cart_items as $item) {
            $item_total = $item['price'] * $item['quantity'];
            
            // Insert order item
            $itemStmt = $conn->prepare("INSERT INTO order_items 
                                       (order_id, product_id, product_name, product_price, quantity, subtotal)
                                       VALUES (?, ?, ?, ?, ?, ?)");
            $itemStmt->bind_param("iisidi", 
                $order_id, $item['product_id'], $item['name'], $item['price'], 
                $item['quantity'], $item_total);
            $itemStmt->execute();
            $itemStmt->close();
            
            // Update product stock
            $new_stock = $item['stock_quantity'] - $item['quantity'];
            $updateStockStmt = $conn->prepare("UPDATE products SET stock_quantity = ? WHERE product_id = ?");
            $updateStockStmt->bind_param("ii", $new_stock, $item['product_id']);
            $updateStockStmt->execute();
            $updateStockStmt->close();
        }
        
        // Clear cart
        $clearCartStmt = $conn->prepare("DELETE FROM cart WHERE user_id = ?");
        $clearCartStmt->bind_param("i", $user_id);
        $clearCartStmt->execute();
        $clearCartStmt->close();
        
        // Commit transaction
        $conn->commit();
        
        sendJSON([
            'status' => 'success',
            'message' => 'Order placed successfully',
            'order' => [
                'order_id' => $order_id,
                'order_number' => $order_number,
                'total_amount' => round($total, 2)
            ]
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Checkout error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Checkout failed. Please try again.'], 500);
}

