<?php
require '../config/dbConnection.php';

$action = $_GET['action'] ?? '';

// GET SOLD COUNT FOR A SINGLE PRODUCT
if ($action === 'single') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'No product ID provided.']);
        exit;
    }

    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(quantity), 0) AS sold
        FROM orders
        WHERE product_id = ?
    ");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();

    echo json_encode(['success' => true, 'sold' => (int) $result['sold']]);
}