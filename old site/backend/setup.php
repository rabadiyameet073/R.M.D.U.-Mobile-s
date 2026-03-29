<?php
/**
 * ============================================
 * Database Setup Script
 * Run this once to set up the database
 * ============================================
 */

require_once 'config.php';

header('Content-Type: application/json');

// Security: Only allow in development
if (getenv('APP_ENV') === 'production') {
    sendJSON(['status' => 'error', 'message' => 'Setup script disabled in production'], 403);
}

try {
    $conn = getDB();
    
    // Read and execute schema file
    $schemaFile = __DIR__ . '/../database/schema.sql';
    
    if (!file_exists($schemaFile)) {
        sendJSON(['status' => 'error', 'message' => 'Schema file not found'], 404);
    }
    
    $schema = file_get_contents($schemaFile);
    
    // Split by semicolon and execute each statement
    $statements = array_filter(
        array_map('trim', explode(';', $schema)),
        function($stmt) {
            return !empty($stmt) && 
                   !preg_match('/^(--|CREATE DATABASE|USE)/i', $stmt);
        }
    );
    
    $executed = 0;
    $errors = [];
    
    foreach ($statements as $statement) {
        try {
            if ($conn->query($statement)) {
                $executed++;
            } else {
                $errors[] = $conn->error;
            }
        } catch (Exception $e) {
            // Ignore "table already exists" errors
            if (strpos($e->getMessage(), 'already exists') === false) {
                $errors[] = $e->getMessage();
            }
        }
    }
    
    sendJSON([
        'status' => 'success',
        'message' => 'Database setup completed',
        'statements_executed' => $executed,
        'errors' => $errors
    ]);
    
} catch (Exception $e) {
    error_log("Setup error: " . $e->getMessage());
    sendJSON(['status' => 'error', 'message' => 'Setup failed: ' . $e->getMessage()], 500);
}

