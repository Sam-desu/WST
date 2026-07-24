<?php
require '../config/dbConnection.php';
session_start();

header('Content-Type: application/json');

$action = $_GET['action'] ?? $_POST['action'] ?? '';

if (!isset($_SESSION['user_id']) && !isset($_POST['user_id']) && !isset($_GET['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User not logged in']);
    exit;
}

$userId = $_SESSION['user_id'] ?? $_POST['user_id'] ?? $_GET['user_id'] ?? null;

/* ADD FEEDBACK */
if ($action === 'add') {
    $rating   = intval($_POST['rating'] ?? 0);
    $category = trim($_POST['category'] ?? '');
    $subject  = trim($_POST['subject'] ?? '');
    $message  = trim($_POST['message'] ?? '');

    if ($rating < 1 || $rating > 5) {
        echo json_encode(['success' => false, 'message' => 'Invalid rating']);
        exit;
    }

    if ($category === '' || $subject === '' || $message === '') {
        echo json_encode(['success' => false, 'message' => 'Please fill in all feedback fields']);
        exit;
    }

    $photoName = null;

    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === 0) {
        $ext = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png'];

        if (!in_array($ext, $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Only JPG and PNG are allowed']);
            exit;
        }

        if (!is_dir('../assets/img/feedback/')) {
            mkdir('../assets/img/feedback/', 0777, true);
        }

        $photoName = uniqid('feedback_') . '.' . $ext;
        $uploadPath = '../assets/img/feedback/' . $photoName;

        if (!move_uploaded_file($_FILES['photo']['tmp_name'], $uploadPath)) {
            echo json_encode(['success' => false, 'message' => 'Photo upload failed']);
            exit;
        }
    }

    $stmt = $conn->prepare("
        INSERT INTO feedback (user_id, rating, category, subject, message, photo)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("iissss", $userId, $rating, $category, $subject, $message, $photoName);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Feedback submitted successfully']);
    exit;
}

/* GET CURRENT USER FEEDBACK */
if ($action === 'mine') {
    $stmt = $conn->prepare("
        SELECT id, rating, category, subject, message, photo, status, created_at
        FROM feedback
        WHERE user_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
    exit;
}

/* GET ALL FEEDBACK FOR ADMIN */
if ($action === 'all') {
    $stmt = $conn->prepare("
        SELECT f.id, f.rating, f.category, f.subject, f.message, f.photo, f.status, f.created_at,
               u.name, u.email
        FROM feedback f
        JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
    ");
    $stmt->execute();
    $result = $stmt->get_result();

    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
    exit;
}
?>