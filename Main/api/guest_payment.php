<?php
session_start();
require '../config/dbConnection.php';

header('Content-Type: application/json');

// ─── READ JSON BODY ───────────────────────────────────────
$body  = json_decode(file_get_contents('php://input'), true);
$name  = trim($body['name']  ?? '');
$email = trim($body['email'] ?? '');
$cart  = $body['cart']       ?? [];

if (!$name || !$email || empty($cart)) {
    echo json_encode(['success' => false, 'message' => 'Missing guest info or empty cart.']);
    exit;
}

// ─── CALCULATE TOTALS ─────────────────────────────────────
$shippingFee = 100;
$subtotal    = 0;
foreach ($cart as $item) {
    $subtotal += floatval($item['price']) * intval($item['quantity']);
}
$total = $subtotal + $shippingFee;

// ─── BUILD PAYMONGO LINE ITEMS ────────────────────────────
$lineItems = [];
foreach ($cart as $item) {
    $lineItems[] = [
        'name'     => $item['name'],
        'amount'   => (int)(floatval($item['price']) * 100),
        'currency' => 'PHP',
        'quantity' => (int)$item['quantity'],
    ];
}
$lineItems[] = [
    'name'     => 'Shipping Fee',
    'amount'   => (int)($shippingFee * 100),
    'currency' => 'PHP',
    'quantity' => 1,
];

// ─── CREATE PAYMONGO SESSION ──────────────────────────────
$secretKey = getenv("PAYMONGO");
$encoded   = base64_encode($secretKey . ':');

$payload = json_encode([
    'data' => [
        'attributes' => [
            'line_items'           => $lineItems,
            'payment_method_types' => ['gcash', 'paymaya', 'card', 'dob'],
            'success_url'          => 'http://localhost/WST/Main/success.html',
            'cancel_url'           => 'http://localhost/WST/Main/CART.html',
            'description'          => 'KapeBara Guest Order',
        ],
    ],
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.paymongo.com/v1/checkout_sessions');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Basic ' . $encoded,
]);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);

if (!isset($result['data']['attributes']['checkout_url'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Payment creation failed!',
        'error'   => $result,
    ]);
    exit;
}

$checkoutUrl = $result['data']['attributes']['checkout_url'];
$sessionId   = $result['data']['id'];

// ─── SAVE GUEST SNAPSHOT TO DB ────────────────────────────
// Encode cart as JSON so the webhook can reconstruct the order
$cartJson = $conn->real_escape_string(json_encode($cart));
$safeName  = $conn->real_escape_string($name);
$safeEmail = $conn->real_escape_string($email);

$conn->query(
    "INSERT INTO orders_pending (session_id, total, status, created_at, guest_name, guest_email, guest_cart)
     VALUES ('$sessionId', $total, 'pending', NOW(), '$safeName', '$safeEmail', '$cartJson')"
);

echo json_encode([
    'success'      => true,
    'checkout_url' => $checkoutUrl,
    'total'        => $total,
]);
?>