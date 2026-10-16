<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

if (!defined('MAIL_USER')) {
    define('MAIL_USER', getenv('MAIL_USER') ?: 'riveroflifecalapan.ph@gmail.com');
}

if (!defined('MAIL_PASS')) {
    define('MAIL_PASS', getenv('MAIL_PASS') ?: 'mnwa bvrl afal wjfc');
}

if (!defined('MAIL_FROM_NAME')) {
    define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'River of Life Calapan');
}

if (!defined('APP_URL')) {
    define('APP_URL', getenv('APP_URL') ?: 'http://localhost:5173');
}

function rol_send_mail($to, $toName, $subject, $html)
{
    $autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';

    if (!file_exists($autoload)) {
        return [
            false,
            'PHPMailer is not installed. Run composer require phpmailer/phpmailer inside the backend folder.'
        ];
    }

    if (empty(MAIL_USER) || empty(MAIL_PASS)) {
        return [
            false,
            'Missing Gmail configuration. Set MAIL_USER and MAIL_PASS.'
        ];
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
        $mail->AltBody = trim(
            strip_tags(
                str_replace(
                    ['<br>', '<br/>', '<br />', '</p>'],
                    "\n",
                    $html
                )
            )
        );

        $mail->send();

        return [true, null];

    } catch (Throwable $e) {
        error_log('ROL Mail Error: ' . $e->getMessage());

        return [
            false,
            'Email sending failed: ' . $e->getMessage()
        ];
    }
}