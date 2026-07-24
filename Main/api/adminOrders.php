<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require '../config/dbConnection.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'all';

// ─── GET ALL ORDERS ────────────────────────────────────────
if ($action === 'all') {
    $orders = $conn->query(
        "SELECT op.id, op.user_id, op.session_id, op.total, op.status, op.created_at,
                u.name  AS customer_name,
                u.email AS customer_email
         FROM orders_pending op
         LEFT JOIN users u ON op.user_id = u.id
         ORDER BY op.created_at DESC"
    )->fetch_all(MYSQLI_ASSOC);

    if (empty($orders)) {
        echo json_encode(['success' => true, 'orders' => []]);
        exit;
    }

    $order_ids    = array_column($orders, 'id');
    $placeholders = implode(',', array_fill(0, count($order_ids), '?'));
    $types        = str_repeat('i', count($order_ids));

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

    $items_by_order = [];
    foreach ($all_items as $item) {
        $items_by_order[$item['order_id']][] = [
            'product_id' => $item['product_id'],
            'name'       => $item['name'],
            'quantity'   => (int)   $item['quantity'],
            'price'      => (float) $item['price'],
            'image'      => $item['image'],
        ];
    }

    foreach ($orders as &$order) {
        $order['items'] = $items_by_order[$order['id']] ?? [];
    }

    echo json_encode(['success' => true, 'orders' => $orders]);
}

// ─── DELETE ORDER ──────────────────────────────────────────
if ($action === 'delete') {
    $id   = (int) ($_POST['id'] ?? 0);
    $stmt = $conn->prepare("DELETE FROM orders_pending WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    echo json_encode(['success' => true]);
}
?>