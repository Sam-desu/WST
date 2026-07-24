<?php
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

// ─── GET CART ITEMS ───────────────────────────────────────
$items = $conn->query(
    "SELECT cart.quantity, products.price, 
            products.name, products.id as product_id
     FROM cart
     JOIN products ON cart.product_id = products.id
     WHERE cart.user_id = $user_id"
)->fetch_all(MYSQLI_ASSOC);

if (count($items) === 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Your cart is empty!'
    ]);
    exit;
}

// ─── CALCULATE TOTAL ──────────────────────────────────────
$subtotal     = 0;
foreach ($items as $item) {
    $subtotal += $item['quantity'] * $item['price'];
}

$shippingFee  = 100;                    // ₱100 flat shipping fee
$total        = $subtotal + $shippingFee;
$totalCentavos = $total * 100;          // PayMongo uses centavos

// ─── BUILD LINE ITEMS ─────────────────────────────────────
$lineItems = [];
foreach ($items as $item) {
    $lineItems[] = [
        'name'     => $item['name'],
        'amount'   => (int)($item['price'] * 100),
        'currency' => 'PHP',
        'quantity' => (int)$item['quantity']
    ];
}

// ─── ADD SHIPPING FEE AS A LINE ITEM ──────────────────────
$lineItems[] = [
    'name'     => 'Shipping Fee',
    'amount'   => (int)($shippingFee * 100), // 10000 centavos = ₱100
    'currency' => 'PHP',
    'quantity' => 1
];

// ─── CREATE PAYMONGO PAYMENT LINK ─────────────────────────
$secretKey = getenv("PAYMONGO");
$encoded   = base64_encode($secretKey . ':');

$payload = json_encode([
    'data' => [
        'attributes' => [
            'line_items'          => $lineItems,
            'payment_method_types' => [
                'gcash',
                'paymaya',
                'card',
                'dob'
            ],
            'success_url'  => 'http://localhost/WST/Main/success.html',
            'cancel_url'   => 'http://localhost/WST/Main/CART.html',
            'description'  => 'KapeBara Order'
        ]
    ]
]);

// ─── SEND REQUEST TO PAYMONGO ─────────────────────────────
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.paymongo.com/v1/checkout_sessions');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Basic ' . $encoded
]);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);

// ─── CHECK IF LINK WAS CREATED ────────────────────────────
if (isset($result['data']['attributes']['checkout_url'])) {
    $checkoutUrl = $result['data']['attributes']['checkout_url'];
    $sessionId   = $result['data']['id'];

    // save to DB — store total WITH shipping fee
    $conn->query(
        "INSERT INTO orders_pending 
        (user_id, session_id, total, status, created_at)
        VALUES ($user_id, '$sessionId', $total, 'pending', NOW())"
    );

    echo json_encode([
        'success'      => true,
        'checkout_url' => $checkoutUrl,
        'subtotal'     => $subtotal,      
        'shipping_fee' => $shippingFee,
        'total'        => $total
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Payment creation failed!',
        'error'   => $result
    ]);
}
?>