<?php
session_start();

require '../phpmailer/src/PHPMailer.php';
require '../phpmailer/src/SMTP.php';
require '../phpmailer/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;


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
    $mail->Subject = 'Thank you for purchasing!';
    $mail->Body = "<h1>Start chillin with a coffee!<h1> <br> <h2>Your OTP is: $otp</h2><p>KapeBara</p>";

    $mail->send();
    echo json_encode(["success" => true]);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "error" => $mail->ErrorInfo
    ]);
}