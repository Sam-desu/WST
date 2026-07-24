<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Content-Type: application/json");
include_once '../../config/dbConnection.php';

$data    = json_decode(file_get_contents("php://input"), true);
$id      = intval($data['id']);
$name    = $conn->real_escape_string($data['name']);
$email   = $conn->real_escape_string($data['email']);
$phone   = $conn->real_escape_string($data['phone']);
$address = $conn->real_escape_string($data['address']);
$city    = $conn->real_escape_string($data['city']);

$sql = "UPDATE users 
        SET name='$name', email='$email', phone='$phone', address='$address', city='$city'
        WHERE id=$id AND role='customer'";

if ($conn->query($sql)) {
    echo json_encode(["status" => "success", "message" => "User updated."]);
} else {
    echo json_encode(["status" => "error", "message" => $conn->error]);
}
$conn->close();
?>