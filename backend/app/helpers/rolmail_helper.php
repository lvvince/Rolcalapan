<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

if (!defined('MAIL_USER')) {
    define('MAIL_USER', getenv('MAIL_USER') ?: '');
}
if (!defined('MAIL_PASS')) {
    define('MAIL_PASS', getenv('MAIL_PASS') ?: '');
}
if (!defined('MAIL_FROM_NAME')) {
    define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'River of Life Calapan');
}
if (!defined('BREVO_API_KEY')) {
    define('BREVO_API_KEY', getenv('BREVO_API_KEY') ?: '');
}
if (!defined('APP_URL')) {
    define('APP_URL', getenv('APP_URL') ?: 'http://localhost:5173');
}

/**
 * Kung may BREVO_API_KEY -> HTTPS API (para sa Render free).
 * Kung wala -> Gmail SMTP (para sa local).
 */
function rol_send_mail($to, $toName, $subject, $html)
{
    if (BREVO_API_KEY !== '') {
        return rol_send_brevo($to, $toName, $subject, $html);
    }
    return rol_send_smtp($to, $toName, $subject, $html);
}

function rol_send_brevo($to, $toName, $subject, $html)
{
    if (MAIL_USER === '') {
        return [false, 'Missing MAIL_USER (verified sender email in Brevo).'];
    }

    $payload = json_encode([
        'sender'      => ['name' => MAIL_FROM_NAME, 'email' => MAIL_USER],
        'to'          => [['email' => $to, 'name' => $toName]],
        'subject'     => $subject,
        'htmlContent' => $html,
    ]);

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'accept: application/json',
            'content-type: application/json',
            'api-key: ' . BREVO_API_KEY,
        ],
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
    ]);

    $res  = curl_exec($ch);
    $err  = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($res === false) {
        error_log('ROL Brevo request failed: ' . $err);
        return [false, 'Brevo request failed: ' . $err];
    }
    if ($code >= 200 && $code < 300) {
        return [true, null];
    }

    error_log('ROL Brevo error ' . $code . ': ' . $res);
    return [false, 'Brevo error ' . $code . ': ' . $res];
}

function rol_send_smtp($to, $toName, $subject, $html)
{
    $autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';

    if (!file_exists($autoload)) {
        return [false, 'PHPMailer is not installed. Run composer install inside the backend folder.'];
    }
    if (MAIL_USER === '' || MAIL_PASS === '') {
        return [false, 'Missing Gmail configuration. Set MAIL_USER and MAIL_PASS in backend/.env.'];
    }

    require_once $autoload;

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);

        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = MAIL_USER;
        $mail->Password   = str_replace(' ', '', MAIL_PASS);
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        $mail->CharSet    = 'UTF-8';
        $mail->Timeout    = 15;

        $mail->setFrom(MAIL_USER, MAIL_FROM_NAME);
        $mail->addAddress($to, $toName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html;
        $mail->AltBody = trim(strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>'], "\n", $html)));

        $mail->send();
        return [true, null];
    } catch (Throwable $e) {
        error_log('ROL Mail Error: ' . $e->getMessage());
        return [false, 'Email sending failed: ' . $e->getMessage()];
    }
}