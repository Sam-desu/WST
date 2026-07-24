<?php
session_start();

$userOtp = $_POST['otp'];

if (time() > $_SESSION['otp_expire']) {
    echo json_encode(["success" => false, "message" => "OTP expired"]);
    exit;
}

if ($userOtp == $_SESSION['otp']) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid OTP"]);
}
?>