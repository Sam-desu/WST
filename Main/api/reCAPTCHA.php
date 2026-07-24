<?php
$secretKey = getenv("CAPTCHA"); 

$responseKey = $_POST['g-recaptcha-response'] ?? '';

// Block immediately if token is missing
if (empty($responseKey)) {
    http_response_code(403);
    echo "CAPTCHA failed ❌ — no token provided.";
    exit;
}

$userIP = $_SERVER['REMOTE_ADDR'];
$url = "https://www.google.com/recaptcha/api/siteverify";

$data = [
    'secret'   => $secretKey,
    'response' => $responseKey,
    'remoteip' => $userIP
];

$options = [
    'http' => [
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data)
    ]
];

$context  = stream_context_create($options);
$result   = file_get_contents($url, false, $context);

// Block if the request to Google failed
if ($result === false) {
    http_response_code(503);
    echo "CAPTCHA failed ❌ — verification service unavailable.";
    exit;
}

$response = json_decode($result);

// Strict check: must be explicitly true
if (isset($response->success) && $response->success === true) {
    echo "CAPTCHA passed ✔";
    // ✅ Proceed with your login logic here
} else {
    http_response_code(403);
    echo "CAPTCHA failed ❌";
    exit;
}
?>