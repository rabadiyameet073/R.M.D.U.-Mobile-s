<?php
/**
 * ============================================
 * Feedback & Reviews API
 * Handles product reviews and general feedback
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $conn = getDB();
    
    switch ($method) {
        case 'GET':
            // Get reviews for a product
            $product_id = intval($_GET['product_id'] ?? 0);
            $limit = intval($_GET['limit'] ?? 10);
            $offset = intval($_GET['offset'] ?? 0);
            
            if ($product_id <= 0) {
                sendJSON(['status' => 'error', 'message' => 'Product ID required'], 400);
            }
            
            $stmt = $conn->prepare("SELECT r.*, u.username, u.full_name 
                                    FROM reviews r
                                    JOIN users u ON r.user_id = u.user_id
                                    WHERE r.product_id = ? AND r.is_approved = 1
                                    ORDER BY r.created_at DESC
                                    LIMIT ? OFFSET ?");
            $stmt->bind_param("iii", $product_id, $limit, $offset);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $reviews = [];
            while ($row = $result->fetch_assoc()) {
                $reviews[] = $row;
            }
            $stmt->close();
            
            sendJSON([
                'status' => 'success',
                'reviews' => $reviews,
                'count' => count($reviews)
            ]);
            break;
            
        case 'POST':
            $action = $_GET['action'] ?? 'review';
            
            if ($action === 'review') {
                // Submit product review
                if (!isLoggedIn()) {
                    sendJSON(['status' => 'error', 'message' => 'Authentication required'], 401);
                }
                
                $data = json_decode(file_get_contents('php://input'), true);
                $user_id = getCurrentUserId();
                $product_id = intval($data['product_id'] ?? 0);
                $rating = intval($data['rating'] ?? 0);
                $title = sanitizeInput($data['title'] ?? '');
                $review_text = sanitizeInput($data['review_text'] ?? '');
                $order_id = intval($data['order_id'] ?? 0);
                
                if ($product_id <= 0 || $rating < 1 || $rating > 5) {
                    sendJSON(['status' => 'error', 'message' => 'Invalid product ID or rating'], 400);
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
                
                // Check if user already reviewed this product
                $checkReviewStmt = $conn->prepare("SELECT review_id FROM reviews WHERE user_id = ? AND product_id = ?");
                $checkReviewStmt->bind_param("ii", $user_id, $product_id);
                $checkReviewStmt->execute();
                $existing = $checkReviewStmt->get_result()->fetch_assoc();
                $checkReviewStmt->close();
                
                if ($existing) {
                    sendJSON(['status' => 'error', 'message' => 'You have already reviewed this product'], 409);
                }
                
                // Verify purchase if order_id provided
                $is_verified = false;
                if ($order_id > 0) {
                    $verifyStmt = $conn->prepare("SELECT order_id FROM orders WHERE order_id = ? AND user_id = ?");
                    $verifyStmt->bind_param("ii", $order_id, $user_id);
                    $verifyStmt->execute();
                    $verified = $verifyStmt->get_result()->fetch_assoc();
                    $verifyStmt->close();
                    $is_verified = (bool)$verified;
                }
                
                // Insert review (auto-approve for now, can be moderated later)
                $insertStmt = $conn->prepare("INSERT INTO reviews 
                                             (user_id, product_id, order_id, rating, title, review_text, is_verified_purchase, is_approved)
                                             VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
                $insertStmt->bind_param("iiisssi", $user_id, $product_id, $order_id, $rating, $title, $review_text, $is_verified);
                $insertStmt->execute();
                $insertStmt->close();
                
                sendJSON([
                    'status' => 'success',
                    'message' => 'Review submitted successfully'
                ]);
                
            } else if ($action === 'feedback') {
                // Submit general feedback
                $data = json_decode(file_get_contents('php://input'), true);
                $user_id = isLoggedIn() ? getCurrentUserId() : null;
                $name = sanitizeInput($data['name'] ?? '');
                $email = sanitizeInput($data['email'] ?? '');
                $subject = sanitizeInput($data['subject'] ?? '');
                $message = sanitizeInput($data['message'] ?? '');
                $feedback_type = sanitizeInput($data['feedback_type'] ?? 'general');
                
                if (empty($name) || empty($email) || empty($message)) {
                    sendJSON(['status' => 'error', 'message' => 'Name, email, and message are required'], 400);
                }
                
                if (!validateEmail($email)) {
                    sendJSON(['status' => 'error', 'message' => 'Invalid email format'], 400);
                }
                
                $insertStmt = $conn->prepare("INSERT INTO feedback 
                                             (user_id, name, email, subject, message, feedback_type)
                                             VALUES (?, ?, ?, ?, ?, ?)");
                $insertStmt->bind_param("isssss", $user_id, $name, $email, $subject, $message, $feedback_type);
                $insertStmt->execute();
                $insertStmt->close();
                
                sendJSON([
                    'status' => 'success',
                    'message' => 'Feedback submitted successfully. Thank you!'
                ]);
            }
            break;
            
        default:
            sendJSON(['status' => 'error', 'message' => 'Method not allowed'], 405);
    }
    
} catch (Exception $e) {
    error_log("Feedback API error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'An error occurred'], 500);
}

