<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
include_once '../../config/dbConnection.php';

$type = isset($_GET['type']) ? $_GET['type'] : 'all';

if ($type === 'registered') {
    $sql = "SELECT id, name, email, phone, address, city, created_at, role
            FROM users
            WHERE role = 'customer'
            ORDER BY created_at DESC";
    $result = $conn->query($sql);
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $row['source'] = 'registered';
        $rows[] = $row;
    }
    echo json_encode(["status" => "success", "data" => $rows]);

} elseif ($type === 'guest') {
    $sql = "SELECT 
                guest_name   AS name,
                guest_email  AS email,
                MIN(created_at) AS created_at,
                COUNT(*) AS total_orders
            FROM orders
            WHERE guest_email IS NOT NULL AND guest_email != ''
            GROUP BY guest_email, guest_name
            ORDER BY created_at DESC";
    $result = $conn->query($sql);
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $row['source'] = 'guest';
        $rows[] = $row;
    }
    echo json_encode(["status" => "success", "data" => $rows]);

} else {
    // All: registered users + guest order summaries
    $sql1 = "SELECT id, name, email, phone, address, city, created_at, role, 'registered' AS source
             FROM users WHERE role = 'customer' ORDER BY created_at DESC";

    $sql2 = "SELECT 
                NULL AS id,
                guest_name   AS name,
                guest_email  AS email,
                MIN(created_at) AS created_at,
                'guest' AS role,
                'guest' AS source
             FROM orders
             WHERE guest_email IS NOT NULL AND guest_email != ''
             GROUP BY guest_email, guest_name";

    $rows = [];
    foreach ([$sql1, $sql2] as $sql) {
        $result = $conn->query($sql);
        while ($row = $result->fetch_assoc()) $rows[] = $row;
    }
    echo json_encode(["status" => "success", "data" => $rows]);
}

$conn->close();
?>