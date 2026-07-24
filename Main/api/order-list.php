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

// ─── Fetch all unique products the user has ever ordered ───────────────────
// Uses the latest order's date and status for each product.
// Also sums total quantity ordered across all orders.
$stmt = $conn->prepare(
    "SELECT
         p.id            AS product_id,
         p.name,
         p.price,
         p.image,
         SUM(o.quantity)                                    AS total_qty,
         MAX(op.created_at)                                 AS last_ordered_at,
         (SELECT op2.status
          FROM orders_pending op2
          JOIN orders o2 ON o2.order_id = op2.id
          WHERE o2.product_id = p.id
            AND op2.user_id   = ?
          ORDER BY op2.created_at DESC
          LIMIT 1)                                          AS last_status
     FROM orders AS o
     JOIN orders_pending AS op ON o.order_id = op.id
     JOIN products       AS p  ON o.product_id = p.id
     WHERE op.user_id = ?
     GROUP BY p.id, p.name, p.price, p.image
     ORDER BY last_ordered_at DESC"
);
$stmt->bind_param("ii", $user_id, $user_id);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

if (empty($rows)) {
    echo json_encode(['success' => true, 'products' => []]);
    exit;
}

$products = [];
foreach ($rows as $row) {
    $products[] = [
        'product_id'      => (int)   $row['product_id'],
        'name'            =>         $row['name'],
        'price'           => (float) $row['price'],
        'image'           =>         $row['image'],
        'total_qty'       => (int)   $row['total_qty'],
        'last_ordered_at' =>         $row['last_ordered_at'],
        'last_status'     =>         $row['last_status'],
    ];
}

echo json_encode([
    'success'  => true,
    'products' => $products
]);
?>