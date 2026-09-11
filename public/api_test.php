<?php
header('Content-Type: application/json; charset=utf-8');

echo json_encode([
    'status' => 'OK',
    'system' => 'VaiVistoriar cPanel Native PHP Backend',
    'timestamp' => date('c')
]);
?>
