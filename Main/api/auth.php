<?php
session_start();
require '../config/dbConnection.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'email') {
    $email    = $_POST['email'];
    $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Email already registered!'
        ]);
        exit;
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Continue'
        ]);
    }
}




// ─── SIGNUP ───────────────────────────────────────────────
if ($action === 'signup') {
    $name     = $_POST['name'];
    $email    = $_POST['email'];
    $password = $_POST['password'];
    $address = $_POST['address'];
    $city = $_POST['city'];
    $phone = $_POST['phone'];
    $role     = 'customer'; // always customer on signup

    // check if email already exists
    $check = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Email already registered!'
        ]);
        exit;
    }

    $stmt = $conn->prepare(
        "INSERT INTO users (name, email, password, address, city, phone, role) 
        VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param("sssssss", $name, $email, $password, $address, $city, $phone, $role);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully!'
    ]);
}

// ─── LOGIN ────────────────────────────────────────────────
if ($action === 'login') {

    $email    = $_POST['email'];
    $password = $_POST['password'];

    $stmt = $conn->prepare(
        "SELECT id, name, email, password, role, phone, address, city
        FROM users WHERE email = ?"
    );
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user   = $result->fetch_assoc();

    // check if user exists and password matches
    if (!$user || $password !== $user['password']) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email or password!'
        ]);
        exit;
    }

    // save user info in session
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['user_phone'] = $user['phone'];
    $_SESSION['user_address'] = $user['address'];
    $_SESSION['user_city'] = $user['city'];
    $_SESSION['user_role'] = $user['role'];

    echo json_encode([
        'success'  => true,
        'message'  => 'Login successful!',
        'id'       => $user['id'],
        'role'     => $user['role'],
        'name'     => $user['name'],
        'phone'    => $user['phone'],
        'address'  => $user['address'],
        'city'     => $user['city']
    ]);
}

// ─── LOGOUT ───────────────────────────────────────────────
if ($action === 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
}

// ─── CHECK SESSION (who is logged in?) ───────────────────
if ($action === 'check') {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'logged_in' => true,
            'name'      => $_SESSION['user_name'],
            'role'      => $_SESSION['user_role']
        ]);
    } else {
        echo json_encode(['logged_in' => false]);
    }
}


if ($action === 'changePass') {

    $password = $_POST['pass'];
    $email = $_POST['email'];

    $stmt = $conn->prepare(
        "UPDATE users SET password = ? WHERE email = ?"
    );
    $stmt->bind_param("ss", $password, $email);
    $stmt->execute();
    echo json_encode([
        'success' => true,
        'message' => 'Password changed successfully!'
    ]);
}

// ─── UPDATE PROFILE ───────────────────────────────────────
if ($action === 'update') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Not logged in']);
        exit;
    }

    $id       = $_SESSION['user_id'];
    $name     = trim($_POST['name']     ?? '');
    $email    = trim($_POST['email']    ?? '');
    $phone    = trim($_POST['phone']    ?? '');
    $address  = trim($_POST['address']  ?? '');
    $city     = trim($_POST['city']     ?? '');
    $username = trim($_POST['username'] ?? '');

    if (!$name || !$email) {
        echo json_encode(['success' => false, 'message' => 'Name and email are required.']);
        exit;
    }

    // Check if email is taken by another user
    $check = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $check->bind_param("si", $email, $id);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Email already in use by another account.']);
        exit;
    }

    $stmt = $conn->prepare(
        "UPDATE users SET name = ?, email = ?, phone = ?, address = ?, city = ? WHERE id = ?"
    );
    $stmt->bind_param("sssssi", $name, $email, $phone, $address, $city, $id);
    $stmt->execute();

    // Update session
    $_SESSION['user_name'] = $name;

    echo json_encode([
        'success' => true,
        'message' => 'Profile updated successfully!',
        'name'    => $name,
        'email'   => $email,
        'phone'   => $phone,
        'address' => $address,
        'city'    => $city
    ]);
}
?>