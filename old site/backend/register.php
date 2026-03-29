<?php
/**
 * ============================================
 * User Registration API
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
    $email = sanitizeInput($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    $full_name = sanitizeInput($_POST['full_name'] ?? '');
    $phone = sanitizeInput($_POST['phone'] ?? '');
    
    // Validation
    if (empty($username) || empty($email) || empty($password)) {
        sendJSON(['status' => 'error', 'message' => 'Username, email, and password are required'], 400);
    }
    
    if (!validateEmail($email)) {
        sendJSON(['status' => 'error', 'message' => 'Invalid email format'], 400);
    }
    
    if (strlen($password) < 6) {
        sendJSON(['status' => 'error', 'message' => 'Password must be at least 6 characters'], 400);
    }
    
    if ($password !== $confirm_password) {
        sendJSON(['status' => 'error', 'message' => 'Passwords do not match'], 400);
    }
    
    // Check if username already exists
    $stmt = $conn->prepare("SELECT user_id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $stmt->close();
        sendJSON(['status' => 'error', 'message' => 'Username or email already exists'], 409);
    }
    $stmt->close();
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    // Insert new user
    $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, full_name, phone) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $username, $email, $password_hash, $full_name, $phone);
    
    if ($stmt->execute()) {
        $user_id = $conn->insert_id;
        $stmt->close();
        
        // Set session
        $_SESSION['user_id'] = $user_id;
        $_SESSION['username'] = $username;
        $_SESSION['email'] = $email;
        
        sendJSON([
            'status' => 'success',
            'message' => 'Registration successful',
            'user' => [
                'user_id' => $user_id,
                'username' => $username,
                'email' => $email
            ]
        ]);
    } else {
        $stmt->close();
        sendJSON(['status' => 'error', 'message' => 'Registration failed. Please try again.'], 500);
    }
    
} catch (Exception $e) {
    error_log("Registration error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'An error occurred during registration'], 500);
}

