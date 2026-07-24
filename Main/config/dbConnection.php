<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$host = "localhost";
$user = "root";
$pass = "";
$db   = "kapebara_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode([
        'error' => 'Connection failed: ' . $conn->connect_error
    ]));
}

?>