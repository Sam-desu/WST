<?php
session_start();

require '../phpmailer/src/PHPMailer.php';
require '../phpmailer/src/SMTP.php';
require '../phpmailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// generate OTP
$otp = rand(100000, 999999);
$_SESSION['otp'] = $otp;
$_SESSION['otp_expire'] = time() + 300;

$action = $_POST['action'] ?? " ";
$email = $_POST['email'];

$mail = new PHPMailer(true);

try {
    $mail->isSMTP();
    $mail->Host = 'smtp.gmail.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'kapebaraverify@gmail.com';
    $mail->Password = 'hlgc agso gkxb dfns';
    $mail->SMTPSecure = 'tls';
    $mail->Port = 587;

    $mail->setFrom('kapebaraverify@gmail.com', 'KapeBara');
    $mail->addAddress($email);

    $mail->isHTML(true);
    $mail->Subject = 'Your OTP Code';
    if ($action == 'change') {
        $mail->Body = "<h1>Someone is trying to change your password<h1>
        <h2>Your OTP is: $otp</h2> <p>KapeBara</p>";
    } else {
        $mail->Body = "<h1>Start chillin with a coffee!<h1><h2>Your OTP is: $otp</h2> <br> <p>KapeBara</p>";
    }
    

    $mail->send();
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "error" => $mail->ErrorInfo
    ]);
}