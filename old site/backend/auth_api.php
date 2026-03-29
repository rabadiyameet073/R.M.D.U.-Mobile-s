<?php
/**
 * ============================================
 * Authentication API
 * Combined API for auth check and logout
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? 'check';

switch ($action) {
    case 'check':
        // Check authentication status
        if (isLoggedIn()) {
            $conn = getDB();
            $user_id = getCurrentUserId();
            
            $stmt = $conn->prepare("SELECT user_id, username, email, full_name FROM users WHERE user_id = ? AND is_active = 1");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                $user = $result->fetch_assoc();
                $stmt->close();
                sendJSON([
                    'status' => 'success',
                    'authenticated' => true,
                    'user' => $user
                ]);
            }
        }
        
        sendJSON([
            'status' => 'success',
            'authenticated' => false
        ]);
        break;
        
    case 'logout':
        // Logout user
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            sendJSON(['status' => 'error', 'message' => 'Invalid request method'], 405);
        }
        
        try {
            session_unset();
            session_destroy();
            
            sendJSON([
                'status' => 'success',
                'message' => 'Logged out successfully'
            ]);
        } catch (Exception $e) {
            error_log("Logout error: " . $e->getMessage());
            sendJSON(['status' => 'error', 'message' => 'An error occurred during logout'], 500);
        }
        break;
        
    default:
        sendJSON(['status' => 'error', 'message' => 'Invalid action'], 400);
}

