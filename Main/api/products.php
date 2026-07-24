<?php
require '../config/dbConnection.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// GET ALL PRODUCTS BY CATEGORY
if ($action === 'get') {
    $category = $_GET['category'] ?? 'drinks';
    $stmt = $conn->prepare("SELECT * FROM products WHERE category = ?");
    $stmt->bind_param("s", $category);
    $stmt->execute();
    $result = $stmt->get_result();
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
}

// GET SINGLE PRODUCT
if ($action === 'single') {
    $id = $_GET['id'];
    $stmt = $conn->prepare("SELECT * FROM products WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $product = $stmt->get_result()->fetch_assoc();
    echo json_encode($product);
}

// GET ALL PRODUCTS (for admin)
if ($action === 'all') {
    $result = $conn->query("SELECT * FROM products");
    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
}

// ADD PRODUCT
if ($action === 'add') {

    $name        = $_POST['name'];
    $description = $_POST['description'];
    $price       = $_POST['price'];
    $stock       = $_POST['stock'];
    $category    = $_POST['category'];

    // ─── HANDLE FILE UPLOAD ───────────────────────
    $image = '';

    if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
        $originalName = $_FILES['image']['name'];
        
        // get file extension (jpg, png, etc.)
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        
        // create unique filename
        $newName = uniqid('product_') . '.' . $ext;
        
        // kung saan i-uupload
        $uploadPath = '../assets/img/items/' . $newName;

        // move file from temp folder to your images folder
        if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
            $image = $newName; // save new filename to database
        } else {
            echo json_encode([
                'success' => false, 
                'message' => 'Image upload failed!'
            ]);
            exit;
        }
    }

    $stmt = $conn->prepare(
        "INSERT INTO products (name, description, price, image, category, stock) 
        VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param(
        "ssdssi",
        $name, $description, $price, $image, $category, $stock
    );
    $stmt->execute();
    echo json_encode(['success' => true, 'id' => $conn->insert_id]);
}

// EDIT PRODUCT
if ($action === 'edit') {

    $id          = $_POST['id'];
    $name        = $_POST['name'];
    $description = $_POST['description'];
    $price       = $_POST['price'];
    $stock       = $_POST['stock'];
    $category    = $_POST['category'];

    // Check if a new image was uploaded
    if (isset($_FILES['image']) && $_FILES['image']['error'] === 0) {
        $ext        = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
        $newName    = uniqid('product_') . '.' . $ext;
        $uploadPath = '../assets/img/items/' . $newName;

        if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
            $image = $newName;
        } else {
            echo json_encode(['success' => false, 'message' => 'Image upload failed!']);
            exit;
        }

        // Update WITH new image
        $stmt = $conn->prepare(
            "UPDATE products SET name=?, description=?, price=?, image=?, category=?, stock=? WHERE id=?"
        );
        $stmt->bind_param("ssdssii", $name, $description, $price, $image, $category, $stock, $id);

    } else {
        // No new image — update WITHOUT touching the image column
        $stmt = $conn->prepare(
            "UPDATE products SET name=?, description=?, price=?, category=?, stock=? WHERE id=?"
        );
        $stmt->bind_param("ssdsii", $name, $description, $price, $category, $stock, $id);
    }

    $stmt->execute();
    echo json_encode(['success' => true]);
}

// DELETE PRODUCT
if ($action === 'delete') {
    $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
    $stmt->bind_param("i", $_POST['id']);
    $stmt->execute();
    echo json_encode(['success' => true]);
}

if ($action === 'search') {
    $search = trim($_GET['search'] ?? '');

    if ($search === '') {
        echo json_encode([]);
        exit;
    }

    $like = "%" . $search . "%";

    $stmt = $conn->prepare("
        SELECT id, name, price, image, category
        FROM products
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY name ASC
        LIMIT 6
    ");
    $stmt->bind_param("ss", $like, $like);
    $stmt->execute();
    $result = $stmt->get_result();

    echo json_encode($result->fetch_all(MYSQLI_ASSOC));
    exit;
}

?>

