<?php
/**
 * ============================================
 * User Login API
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['status' => 'error', 'message' => 'Invalid request method'], 405);
}

try {
    $conn = getDB();
    
    // Get input data
    $username = sanitizeInput($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // Validation
    if (empty($username) || empty($password)) {
        sendJSON(['status' => 'error', 'message' => 'Username and password are required'], 400);
    }
    
    // Get user from database
    $stmt = $conn->prepare("SELECT user_id, username, email, password_hash, full_name, is_active FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        sendJSON(['status' => 'error', 'message' => 'Invalid username or password'], 401);
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    // Check if account is active
    if (!$user['is_active']) {
        sendJSON(['status' => 'error', 'message' => 'Account is deactivated. Please contact support.'], 403);
    }
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        sendJSON(['status' => 'error', 'message' => 'Invalid username or password'], 401);
    }
    
    // Set session
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['full_name'] = $user['full_name'];
    
    sendJSON([
        'status' => 'success',
        'message' => 'Login successful',
        'username' => $user['username'],
        'user' => [
            'user_id' => $user['user_id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'full_name' => $user['full_name']
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'An error occurred during login'], 500);
}

