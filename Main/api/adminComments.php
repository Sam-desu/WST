<?php
require '../config/dbConnection.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// GET ALL COMMENTS (joined with product name)
if ($action === 'all') {
    $result = $conn->query("
        SELECT c.*, p.name AS product_name
        FROM comments c
        LEFT JOIN products p ON c.product_id = p.id
        ORDER BY c.created_at DESC
    ");
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
}

// DELETE COMMENT
if ($action === 'delete') {
    $stmt = $conn->prepare("DELETE FROM comments WHERE id = ?");
    $stmt->bind_param("i", $_POST['id']);
    $stmt->execute();
    echo json_encode(['success' => true]);
}
?>