<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");
include_once '../../config/dbConnection.php';

$data = json_decode(file_get_contents("php://input"), true);
$id   = intval($data['id']);

// Only registered users can be deleted by ID
$sql = "DELETE FROM users WHERE id=$id AND role='customer'";

if ($conn->query($sql)) {
    echo json_encode(["status" => "success", "message" => "User deleted."]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}
$conn->close();
?>