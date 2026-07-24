<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require '../config/dbConnection.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ─── GET COMMENTS FOR A PRODUCT ────────────────────────────────────────────
if ($action === 'get') {
    $product_id = isset($_GET['product_id']) ? (int) $_GET['product_id'] : 0;

    if (!$product_id) {
        echo json_encode(['success' => false, 'message' => 'Invalid product ID.']);
        exit;
    }

    $stmt = $conn->prepare(
        "SELECT * FROM comments WHERE product_id = ? ORDER BY created_at DESC"
    );
    $stmt->bind_param("i", $product_id);
    $stmt->execute();
    $result = $stmt->get_result();

    echo json_encode([
        'success'  => true,
        'comments' => $result->fetch_all(MYSQLI_ASSOC)
    ]);
    exit;
}

// ─── ADD A COMMENT ─────────────────────────────────────────────────────────
if ($action === 'add') {
    $product_id = isset($_POST['product_id']) ? (int) $_POST['product_id'] : 0;
    $user_name = trim($_POST['user_name'] ?? 'Anonymous');
    $comment    = trim($_POST['comment'] ?? '');
    $rating     = isset($_POST['rating'])     ? (int) $_POST['rating']     : 0;

    // Validate inputs
    if (!$product_id) {
        echo json_encode(['success' => false, 'message' => 'Invalid product ID.']);
        exit;
    }
    if ($comment === '') {
        echo json_encode(['success' => false, 'message' => 'Comment cannot be empty.']);
        exit;
    }
    if ($rating < 1 || $rating > 5) {
        echo json_encode(['success' => false, 'message' => 'Rating must be between 1 and 5.']);
        exit;
    }

    $stmt = $conn->prepare(
        "INSERT INTO comments (product_id, comment, rating, user_name) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param("isis", $product_id, $comment, $rating, $user_name);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Review submitted successfully.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to save review.']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action.']);
?>