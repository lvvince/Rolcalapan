<?php

error_reporting(E_ALL);
ini_set('display_errors', '1');

define('PREVENT_DIRECT_ACCESS', true);

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/app/helpers/rolmail_helper.php';

$to = $argv[1] ?? '';

if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    exit("Usage: php mail_test.php recipient@gmail.com\n");
}

echo "Testing Gmail SMTP...\n";

$result = rol_send_mail(
    $to,
    'Test Recipient',
    'River of Life Calapan - Email Test',
    '<h2>Email Test</h2><p>Testing the email system.</p>'
);

if ($result[0]) {
    echo "SUCCESS: Email sent to SMTP server.\n";
} else {
    echo "FAILED: " . $result[1] . "\n";
}