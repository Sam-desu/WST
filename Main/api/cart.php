<?php
session_start();
require '../config/dbConnection.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';
$user_id = $_SESSION['user_id'] ?? null;


// ─── ADD TO CART ──────────────────────────────────────────
if ($action === 'add') {
    $product_id = $_POST['product_id'];

    // check if product already in cart
    $check = $conn->query(
        "SELECT * FROM cart 
         WHERE user_id=$user_id AND product_id=$product_id"
    );

    if ($check->num_rows > 0) {
        // already in cart — just increase quantity
        $conn->query(
            "UPDATE cart SET quantity = quantity + 1 
             WHERE user_id=$user_id AND product_id=$product_id"
        );
    } else {
        // new item — add to cart
        $conn->query(
            "INSERT INTO cart (user_id, product_id, quantity) 
             VALUES ($user_id, $product_id, 1)"
        );
    }

    echo json_encode(['success' => true, 'message' => 'Added to cart!']);
}

// ─── GET CART ITEMS ───────────────────────────────────────
if ($action === 'get') {
    $result = $conn->query(
        "SELECT cart.id, cart.quantity,
                products.name, products.price, 
                products.image, products.id as product_id
         FROM cart
         JOIN products ON cart.product_id = products.id
         WHERE cart.user_id = $user_id"
    );

    $items = $result->fetch_all(MYSQLI_ASSOC);
    echo json_encode($items);
}

// ─── UPDATE QUANTITY ──────────────────────────────────────
if ($action === 'update') {
    $cart_id  = $_POST['cart_id'];
    $quantity = $_POST['quantity'];

    // if quantity is 0 remove it
    if ($quantity <= 0) {
        $conn->query("DELETE FROM cart WHERE id=$cart_id AND user_id=$user_id");
    } else {
        $conn->query(
            "UPDATE cart SET quantity=$quantity 
             WHERE id=$cart_id AND user_id=$user_id"
        );
    }

    echo json_encode(['success' => true]);
}

// ─── REMOVE ITEM ──────────────────────────────────────────
if ($action === 'remove') {
    $cart_id = $_POST['cart_id'];
    $conn->query("DELETE FROM cart WHERE id=$cart_id AND user_id=$user_id");
    echo json_encode(['success' => true]);
}

// ─── CHECKOUT ─────────────────────────────────────────────
if ($action === 'checkout') {
    // get all cart items
    $items = $conn->query(
        "SELECT cart.quantity, products.price, products.id as product_id
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

    // move each cart item to orders table
    foreach ($items as $item) {
        $total = $item['quantity'] * $item['price'];
        $conn->query(
            "INSERT INTO orders (product_id, quantity, total) 
             VALUES ({$item['product_id']}, {$item['quantity']}, $total)"
        );
    }

    // clear the cart after checkout
    $conn->query("DELETE FROM cart WHERE user_id=$user_id");

    echo json_encode([
        'success' => true,
        'message' => 'Order placed successfully!'
    ]);
}

// ─── GET CART COUNT (for navbar badge) ───────────────────
if ($action === 'count') {
    $result = $conn->query(
        "SELECT SUM(quantity) as total FROM cart WHERE user_id=$user_id"
    );
    $row = $result->fetch_assoc();
    echo json_encode(['count' => $row['total'] ?? 0]);
}

// ─── Edit Address ──────────────────────────────────────
if ($action === 'edit') {

    $id       = $_POST['id'];
    $name     = $_POST['name'];
    $address  = $_POST['address'];
    $city     = $_POST['city'];
    $phone    = $_POST['phone'];

    $stmt = $conn->prepare(
        "UPDATE users
        SET name = ?, address = ?, city = ?, phone = ?
        WHERE id = ?"
    );
    $stmt->bind_param("ssssi", $name, $address, $city, $phone, $id);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Address Updated',
        'name'    => $name,
        'id'      => $id,
        'phone'   => $phone,
        'address' => $address,
        'city'    => $city,
    ]);
}






?>