<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
session_start();

require '../config/dbConnection.php';

$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id) {
    echo json_encode([
        'success' => false,
        'message' => 'Please login first!'
    ]);
    exit;
}

// Fetch all orders for this user
$stmt = $conn->prepare(
    "SELECT id, session_id, total, status, created_at 
     FROM orders_pending 
     WHERE user_id = ? 
     ORDER BY created_at DESC"
);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$orders = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

if (empty($orders)) {
    echo json_encode(['success' => true, 'orders' => []]);
    exit;
}

// Collect all order IDs to fetch their items in one query
$order_ids = array_column($orders, 'id');
$placeholders = implode(',', array_fill(0, count($order_ids), '?'));
$types = str_repeat('i', count($order_ids));

// JOIN orders table with products to get item details per order
$items_stmt = $conn->prepare(
    "SELECT o.order_id,
            o.product_id,
            o.quantity,
            p.name,
            p.price,
            p.image
     FROM orders AS o
     JOIN products AS p ON o.product_id = p.id
     WHERE o.order_id IN ($placeholders)"
);
$items_stmt->bind_param($types, ...$order_ids);
$items_stmt->execute();
$all_items = $items_stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// Group items by order_id
$items_by_order = [];
foreach ($all_items as $item) {
    $items_by_order[$item['order_id']][] = [
        'product_id' => $item['product_id'],
        'name'       => $item['name'],
        'quantity'   => (int) $item['quantity'],
        'price'      => (float) $item['price'],
        'image'      => $item['image'],
    ];
}

// Attach items to each order
foreach ($orders as &$order) {
    $order['items'] = $items_by_order[$order['id']] ?? [];
}

echo json_encode([
    'success' => true,
    'orders'  => $orders
]);
?>