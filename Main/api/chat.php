<?php
// ============================================================
//  api/chat.php  —  KapeBara Chat API
// ============================================================
require '../config/dbConnection.php';
session_start();

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ── Auth ──────────────────────────────────────────────────
// Allow admin (session) or user (session/post/get)
$isAdmin = isset($_SESSION['admin_id']); // adjust key to match your admin session var
$userId  = $_SESSION['user_id'] ?? $_POST['user_id'] ?? $_GET['user_id'] ?? null;

if (!$isAdmin && !$userId) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

// ── GET ALL CONVERSATIONS (Admin Panel) ───────────────────
if ($action === 'all') {
    $stmt = $conn->prepare("
        SELECT cm.id, cm.user_id, cm.from_role, cm.message, cm.created_at,
               u.name, u.email
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        ORDER BY cm.created_at ASC
    ");
    $stmt->execute();
    $result = $stmt->get_result();
    $rows   = $result->fetch_all(MYSQLI_ASSOC);

    // Group by user name — matches existing admin-chat.js structure
    $grouped = [];
    foreach ($rows as $row) {
        $key = $row['name'];
        $grouped[$key][] = [
            'from'    => $row['from_role'],
            'text'    => $row['message'],
            'time'    => $row['created_at'],
            'user_id' => $row['user_id'],
        ];
    }

    echo json_encode($grouped);
    exit;
}

// ── GET MESSAGES FOR CURRENT USER ─────────────────────────
if ($action === 'get') {
    $stmt = $conn->prepare("
        SELECT from_role, message, created_at
        FROM chat_messages
        WHERE user_id = ?
        ORDER BY created_at ASC
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $rows   = $result->fetch_all(MYSQLI_ASSOC);

    $messages = array_map(fn($r) => [
        'from' => $r['from_role'],
        'text' => $r['message'],
        'time' => $r['created_at'],
    ], $rows);

    echo json_encode($messages);
    exit;
}

// ── SEND A MESSAGE (user or admin) ────────────────────────
if ($action === 'send') {
    $body     = json_decode(file_get_contents('php://input'), true);
    $fromRole = $body['from']    ?? '';
    $message  = trim($body['message'] ?? '');

    // Admin sends to a specific user; user sends as themselves
    $targetId = isset($body['user_id']) ? intval($body['user_id']) : intval($userId);

    if (!$fromRole || !$message || !$targetId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
        exit;
    }

    // Only allow valid roles
    if (!in_array($fromRole, ['user', 'admin'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid from_role']);
        exit;
    }

    $stmt = $conn->prepare("
        INSERT INTO chat_messages (user_id, from_role, message)
        VALUES (?, ?, ?)
    ");
    $stmt->bind_param("iss", $targetId, $fromRole, $message);
    $stmt->execute();

    echo json_encode(['success' => true]);
    exit;
}

// ── Fallback ──────────────────────────────────────────────
http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Invalid action']);
?>