<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$mobileSMS = $_POST['mobileSMS'];
$messageSMS = $_POST['messageSMS'];

$url = 'https://portal.mellicloud.com/smss/SendMessage1.php';
$data = ['mobileSMS' => $mobileSMS, 'messageSMS' => $messageSMS];

$options = [
    'http' => [
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data),
    ],
];

$context  = stream_context_create($options);
$response = file_get_contents($url, false, $context);

echo $response;
?>
