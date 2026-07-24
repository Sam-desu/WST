<?php
require '../config/dbConnection.php';

$range = $_GET['range'] ?? 'monthly';

// ─── TOP SELLERS ──────────────────────────────────────────
if ($range === 'top-sellers') {
    $sql = "SELECT 
              products.name,
              products.price,
              SUM(orders.quantity) as total_quantity,
              COUNT(orders.id) as total_orders
            FROM orders
            JOIN products ON orders.product_id = products.id
            GROUP BY products.id
            ORDER BY total_quantity DESC
            LIMIT 5";

    $result = $conn->query($sql);
    echo json_encode([
        'top_sellers' => $result->fetch_all(MYSQLI_ASSOC)
    ]);
    exit;
}

// ─── TIME RANGE QUERIES ───────────────────────────────────
if ($range === 'today') {
    $sql = "SELECT 
              HOUR(orders.created_at) as label,
              SUM(orders.quantity * (products.price - products.cost)) as profit
            FROM orders
            JOIN products ON orders.product_id = products.id
            WHERE DATE(orders.created_at) = CURDATE()
            GROUP BY HOUR(orders.created_at)
            ORDER BY label ASC";

} elseif ($range === 'last-week') {
    $sql = "SELECT 
              DATE(orders.created_at) as label,
              SUM(orders.quantity * (products.price - products.cost)) as profit
            FROM orders
            JOIN products ON orders.product_id = products.id
            WHERE orders.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(orders.created_at)
            ORDER BY label ASC";

} elseif ($range === 'last-30day') {
    $sql = "SELECT 
              DATE(orders.created_at) as label,
              SUM(orders.quantity * (products.price - products.cost)) as profit
            FROM orders
            JOIN products ON orders.product_id = products.id
            WHERE orders.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(orders.created_at)
            ORDER BY label ASC";

} elseif ($range === 'this-Month') {
    $sql = "SELECT 
              DAY(orders.created_at) as label,
              SUM(orders.quantity * (products.price - products.cost)) as profit
            FROM orders
            JOIN products ON orders.product_id = products.id
            WHERE MONTH(orders.created_at) = MONTH(NOW())
            AND YEAR(orders.created_at) = YEAR(NOW())
            GROUP BY DAY(orders.created_at)
            ORDER BY label ASC";

} elseif ($range === 'this-Year') {
    $sql = "SELECT 
              DATE_FORMAT(orders.created_at, '%M') as label,
              SUM(orders.quantity * (products.price - products.cost)) as profit
            FROM orders
            JOIN products ON orders.product_id = products.id
            WHERE YEAR(orders.created_at) = YEAR(NOW())
            GROUP BY MONTH(orders.created_at)
            ORDER BY MONTH(orders.created_at) ASC";

} else {
    // default monthly last 6 months
    $sql = "SELECT 
              DATE_FORMAT(orders.created_at, '%M %Y') as label,
              SUM(orders.quantity * (products.price - products.cost)) as profit
            FROM orders
            JOIN products ON orders.product_id = products.id
            WHERE orders.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(orders.created_at, '%Y-%m')
            ORDER BY orders.created_at ASC";
}

// ─── TOTAL SALES & ORDERS ─────────────────────────────────
$totalSales = $conn->query(
    "SELECT SUM(quantity * price) as total 
     FROM orders 
     JOIN products ON orders.product_id = products.id"
)->fetch_assoc();

$totalOrders = $conn->query(
    "SELECT COUNT(*) as total FROM orders"
)->fetch_assoc();

$totalCustomer = $conn->query(
    "SELECT COUNT(*) as total FROM users"
)->fetch_assoc();


// ─── RUN MAIN QUERY ───────────────────────────────────────
$result = $conn->query($sql);
$data   = $result->fetch_all(MYSQLI_ASSOC);

echo json_encode([
    'total_sales'  => $totalSales['total'] ?? 0,
    'total_orders' => $totalOrders['total'] ?? 0,
    'total_customer' => $totalCustomer['total'] ?? 0,
    'labels'       => array_column($data, 'label'),
    'profits'      => array_column($data, 'profit')
]);
?>