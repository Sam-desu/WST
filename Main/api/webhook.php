<?php

// ─── LOGGING FUNCTION (must be first, before any require) ──
function wlog($msg)
{
    $line = "[" . date('Y-m-d H:i:s') . "] " . $msg . "\n";
    file_put_contents(__DIR__ . '/webhook_debug.log', $line, FILE_APPEND);
}

// ─── DB CONNECTION (after wlog is defined) ─────────────────
require '../config/dbConnection.php';

// ─── LOG EVERY INCOMING REQUEST ────────────────────────────
$payload = file_get_contents('php://input');
wlog("=== WEBHOOK HIT ===");
wlog("Raw payload: " . $payload);

// ─── VERIFY DB CONNECTION ──────────────────────────────────
if (!$conn || $conn->connect_error) {
    wlog("DB FAILED: " . ($conn->connect_error ?? 'null connection'));
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed']);
    exit;
}
wlog("DB connected successfully");

// ─── PARSE PAYLOAD ─────────────────────────────────────────
$event = json_decode($payload, true);

if (!$event) {
    wlog("ERROR: Invalid JSON payload");
    http_response_code(400);
    echo json_encode(['error' => 'Invalid payload']);
    exit;
}

$eventType = $event['data']['attributes']['type'] ?? '';
wlog("Event type: " . $eventType);

// ─── PAYMENT SUCCESS ───────────────────────────────────────
if ($eventType === 'checkout_session.payment.paid') {
    $sessionId = $event['data']['attributes']['data']['id'] ?? null;
    wlog("Session ID: " . $sessionId);

    if (!$sessionId) {
        wlog("ERROR: Missing session ID");
        http_response_code(400);
        echo json_encode(['error' => 'Missing session ID']);
        exit;
    }

    // ─── FIND PENDING ORDER ────────────────────────────────
    $stmt = $conn->prepare(
        "SELECT * FROM orders_pending 
         WHERE session_id = ? AND status = 'pending'"
    );

    if (!$stmt) {
        wlog("ERROR: Prepare failed (orders_pending): " . $conn->error);
        http_response_code(500);
        exit;
    }

    $stmt->bind_param("s", $sessionId);
    $stmt->execute();
    $pending = $stmt->get_result()->fetch_assoc();
    wlog("Pending order found: " . ($pending ? 'YES' : 'NO'));

    if ($pending) {
        $user_id = $pending['user_id'];
        $orderTotal = $pending['total'];
        $isGuest = is_null($user_id);
        wlog("User ID: $user_id | Order total: $orderTotal");
        if ($isGuest) {
            // ── GUEST: reconstruct from the saved cart snapshot ──
            $guestCart = json_decode($pending['guest_cart'], true);
            $conn->begin_transaction();
            try {
                $shippingPerItem = round(100 / count($guestCart), 2);
                $insertStmt = $conn->prepare(
                    "INSERT INTO orders (product_id, quantity, total, guest_name, guest_email, order_id)
            VALUES (?, ?, ?, ?, ?, ?)"
                );
                
                foreach ($guestCart as $item) {
                    $productId = (int) $item['product_id'];
                    $qty = (int) $item['quantity'];
                    $itemSubtotal = $qty * floatval($item['price']);
                    $itemTotal = round($itemSubtotal + $shippingPerItem, 2);
                    $guestName = $pending['guest_name'];
                    $guestEmail = $pending['guest_email'];
                    $pendingOrderId = $pending['id'];
                    $insertStmt->bind_param("iidss", $productId, $qty, $itemTotal, $guestName, $guestEmail, $pendingOrderId);
                    if (!$insertStmt->execute()) {
                        throw new Exception("Insert failed: " . $insertStmt->error);
                    } else {
                        wlog("INSERTED SUCCESSFULLY");
                    }
                    // Deduct stock
                    $stockStmt = $conn->prepare(
                        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?"
                    );
                    $stockStmt->bind_param("iii", $qty, $productId, $qty);
                    if (!$stockStmt->execute() || $stockStmt->affected_rows === 0) {
                        throw new Exception("Insufficient stock for product_id: $productId");
                    }
                }
                // Mark pending as paid
                $upd = $conn->prepare("UPDATE orders_pending SET status = 'paid' WHERE session_id = ?");
                $upd->bind_param("s", $sessionId);
                $upd->execute();
                $conn->commit();
                wlog("Guest order committed for session: $sessionId");
            } catch (Exception $e) {
                $conn->rollback();
                wlog("Guest order failed: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Guest order processing failed']);
                exit;
            }
        } else {
            // ─── GET CART ITEMS ────────────────────────────────
            // Also check cart table directly for diagnosis
            $checkCart = $conn->prepare("SELECT * FROM cart WHERE user_id = ?");
            $checkCart->bind_param("i", $user_id);
            $checkCart->execute();
            $rawCart = $checkCart->get_result()->fetch_all(MYSQLI_ASSOC);
            wlog("Raw cart rows for user $user_id: " . json_encode($rawCart));

            $stmt = $conn->prepare(
                "SELECT cart.quantity, products.price, products.id AS product_id
            FROM cart
            JOIN products ON cart.product_id = products.id
            WHERE cart.user_id = ?"
            );
            if (!$stmt) {
                wlog("ERROR: Prepare failed (cart): " . $conn->error);
                http_response_code(500);
                exit;
            }
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
            wlog("Cart items found: " . count($items));
            wlog("Cart items data: " . json_encode($items));
            if (empty($items)) {
                wlog("WARNING: No cart items found for user_id: $user_id");
                http_response_code(200);
                echo json_encode(['received' => true, 'warning' => 'No cart items']);
                exit;
            }
            // ─── START TRANSACTION ─────────────────────────────
            $conn->begin_transaction();
            wlog("Transaction started");
            try {
                $pendingOrderId = $pending['id'];
                $shippingFee = 100;
                $shippingPerItem = round($shippingFee / count($items), 2);
                $insertStmt = $conn->prepare(
                    "INSERT INTO orders (product_id, quantity, total, user_id, order_id)
                VALUES (?, ?, ?, ?, ?)"
                );
                if (!$insertStmt) {
                    throw new Exception("Prepare failed (orders insert): " . $conn->error);
                }
                foreach ($items as $item) {
                    $itemSubtotal = $item['quantity'] * $item['price'];
                    $itemTotal = round($itemSubtotal + $shippingPerItem, 2);
                    wlog("Inserting — product_id: {$item['product_id']} | qty: {$item['quantity']} | total: $itemTotal");
                    $insertStmt->bind_param(
                        "iidii",
                        $item['product_id'],
                        $item['quantity'],
                        $itemTotal,
                        $user_id,
                        $pendingOrderId
                    );
                    if (!$insertStmt->execute()) {
                        throw new Exception("Insert failed: " . $insertStmt->error);
                    }
                    wlog("Inserted successfully for product_id: {$item['product_id']}");
                    // ─── DEDUCT STOCK ──────────────────────────────────────
                    $stockStmt = $conn->prepare(
                        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?"
                    );
                    if (!$stockStmt) {
                        throw new Exception("Prepare failed (stock update): " . $conn->error);
                    }
                    $stockStmt->bind_param(
                        "iii",
                        $item['quantity'],
                        $item['product_id'],
                        $item['quantity']   // ensures stock never goes negative
                    );
                    if (!$stockStmt->execute()) {
                        throw new Exception("Stock update failed: " . $stockStmt->error);
                    }
                    if ($stockStmt->affected_rows === 0) {
                        throw new Exception("Insufficient stock for product_id: {$item['product_id']}");
                    }
                    wlog("Stock deducted for product_id: {$item['product_id']} | qty deducted: {$item['quantity']}");
                }
                // ─── CLEAR CART ────────────────────────────────
                $stmt = $conn->prepare("DELETE FROM cart WHERE user_id = ?");
                if (!$stmt) {
                    throw new Exception("Prepare failed (cart delete): " . $conn->error);
                }
                $stmt->bind_param("i", $user_id);
                if (!$stmt->execute()) {
                    throw new Exception("Cart delete failed: " . $stmt->error);
                }
                wlog("Cart cleared for user_id: $user_id");
                // ─── MARK AS PAID ──────────────────────────────
                $stmt = $conn->prepare(
                    "UPDATE orders_pending SET status = 'paid' WHERE session_id = ?"
                );
                if (!$stmt) {
                    throw new Exception("Prepare failed (orders_pending update): " . $conn->error);
                }
                $stmt->bind_param("s", $sessionId);
                if (!$stmt->execute()) {
                    throw new Exception("Status update failed: " . $stmt->error);
                }
                wlog("Marked as paid for session_id: $sessionId");

                $conn->commit();
                wlog("=== TRANSACTION COMMITTED SUCCESSFULLY ===");

            } catch (Exception $e) {
                $conn->rollback();
                wlog("CAUGHT EXCEPTION: " . $e->getMessage());
                wlog("DB last error: " . $conn->error);
                http_response_code(500);
                echo json_encode(['error' => 'Order processing failed']);
                exit;
            }
        }
    } else {
        wlog("WARNING: No pending order found for session_id: $sessionId");
    }
} else {
    wlog("Ignored event type: $eventType");
}

http_response_code(200);
echo json_encode(['received' => true]);
wlog("=== WEBHOOK COMPLETE ===");
?>