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

/* =====================================================================
 * SENDING (Brevo sa Render, Gmail SMTP sa local)
 * ===================================================================== */

/**
 * Kung may BREVO_API_KEY -> HTTPS API (para sa Render free).
 * Kung wala -> Gmail SMTP (para sa local).
 * Return: [true, null] o [false, 'error']
 */
function rol_send_mail($to, $toName, $subject, $html)
{
    $to = trim((string) $to);
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return [false, 'Invalid or missing email address.'];
    }

    if (BREVO_API_KEY !== '') {
        return rol_send_brevo($to, $toName, $subject, $html);
    }
    return rol_send_smtp($to, $toName, $subject, $html);
}

function rol_html_to_text($html)
{
    $text = str_replace(['<br>', '<br/>', '<br />', '</p>', '</h2>', '</div>'], "\n", (string) $html);
    return trim(html_entity_decode(strip_tags($text), ENT_QUOTES, 'UTF-8'));
}

function rol_send_brevo($to, $toName, $subject, $html)
{
    if (MAIL_USER === '') {
        return [false, 'Missing MAIL_USER (verified sender email in Brevo).'];
    }

    $recipient = ['email' => $to];
    if (trim((string) $toName) !== '') {
        $recipient['name'] = $toName;
    }

    $payload = json_encode([
        'sender'      => ['name' => MAIL_FROM_NAME, 'email' => MAIL_USER],
        'to'          => [$recipient],
        'subject'     => $subject,
        'htmlContent' => $html,
        'textContent' => rol_html_to_text($html),
    ]);

    if ($payload === false) {
        return [false, 'Could not encode email payload.'];
    }

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
        $mail->addAddress($to, (string) $toName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html;
        $mail->AltBody = rol_html_to_text($html);

        $mail->send();
        return [true, null];
    } catch (Throwable $e) {
        error_log('ROL Mail Error: ' . $e->getMessage());
        return [false, 'Email sending failed: ' . $e->getMessage()];
    }
}

/* =====================================================================
 * PASSWORD RESET EMAIL
 * ===================================================================== */

/**
 * HTML template ng password reset email.
 *
 * WALANG LINK sa email: ang Brevo ay binabalot ang kahit anong URL (kahit plain text)
 * sa tracking link (sendibt3.com) na minsan hindi nagbubukas. Kaya reset CODE lang
 * ang ipinapadala; ipapaste ito ng user sa Reset page.
 *
 * Gamit: rol_reset_html($resetUrl)         -> kinukuha na automatic ang token sa URL (?token=...)
 *        rol_reset_html($resetUrl, $token) -> kung gusto mong ibigay manually
 */
function rol_reset_html($resetUrl, $token = '')
{
    $resetUrl = (string) $resetUrl;

    if ($token === '' || $token === null) {
        $query = (string) parse_url($resetUrl, PHP_URL_QUERY);
        parse_str($query, $q);
        $token = $q['token'] ?? '';
    }

    $code = htmlspecialchars((string) $token, ENT_QUOTES, 'UTF-8');
    $from = htmlspecialchars(MAIL_FROM_NAME, ENT_QUOTES, 'UTF-8');

    if ($code !== '') {
        $body = '
        <p style="font-size:15px;line-height:1.5;">Use this reset code to set a new password. Copy it, then paste it in the <strong>Reset code</strong> box on the website. The code expires soon.</p>
        <p style="font-size:15px;font-family:monospace;background:#f3f4f6;padding:14px;border-radius:6px;word-break:break-all;user-select:all;">' . $code . '</p>';
    } else {
        // Wala ang token (hindi dapat mangyari): ibigay na lang ang URL bilang plain text
        $url  = str_replace('://', '&#58;//', htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8'));
        $body = '
        <p style="font-size:15px;line-height:1.5;">Copy the text below and paste it into your browser to set a new password.</p>
        <p style="font-size:14px;background:#f3f4f6;padding:12px;border-radius:6px;word-break:break-all;">' . $url . '</p>';
    }

    return '
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:20px;">
        <h2 style="margin:0 0 12px;">Reset your password</h2>'
        . $body . '
        <p style="color:#888;font-size:12px;margin-top:24px;">If you did not request this, you can ignore this email.<br>' . $from . '</p>
    </div>';
}

/* =====================================================================
 * NOTIFICATION EMAIL
 * ===================================================================== */

/**
 * HTML template ng notification email.
 */
function rol_notif_html($title, $message)
{
    $safeTitle = htmlspecialchars((string) $title, ENT_QUOTES, 'UTF-8');
    $safeMsg   = nl2br(htmlspecialchars((string) $message, ENT_QUOTES, 'UTF-8'));
    $link      = htmlspecialchars(rtrim(APP_URL, '/'), ENT_QUOTES, 'UTF-8');
    $from      = htmlspecialchars(MAIL_FROM_NAME, ENT_QUOTES, 'UTF-8');

    return '
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:20px;">
        <h2 style="margin:0 0 12px;">' . $safeTitle . '</h2>
        <p style="font-size:15px;line-height:1.5;">' . $safeMsg . '</p>
        <p style="margin-top:24px;">
            <a href="' . $link . '" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Open River of Life</a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:24px;">' . $from . '</p>
    </div>';
}

/**
 * Kunin ang recipients.
 * $target:
 *   - kosong / null / 0  -> Everyone (active + verified lang)
 *   - "role:member"      -> lahat ng active + verified na may role na yan
 *   - number / "12"      -> isang user lang (kahit hindi pa verified)
 */
function rol_notif_recipients($db, $target)
{
    $target = is_string($target) ? trim($target) : $target;

    // Isang user lang
    if ($target !== null && $target !== '' && $target !== 0 && $target !== '0'
        && !(is_string($target) && strpos($target, 'role:') === 0)) {
        $one = $db->table('users')->where('id', $target)->get();
        return $one ? [$one] : [];
    }

    // Everyone o role group: active at verified lang
    $q = $db->table('users')->where('status', 'active')->where('email_verified', 1);

    if (is_string($target) && strpos($target, 'role:') === 0) {
        $q = $q->where('role', substr($target, 5));
    }

    $rows = $q->get_all();
    return is_array($rows) ? $rows : [];
}

/**
 * EMAIL LANG. Gamit sa /resource/save (notifications) dahil naka-insert
 * na ang notif row doon -> iwas double notification.
 * Return: ['sent' => n, 'failed' => n, 'skipped' => n]
 */
function rol_email_notification($db, $target, $title, $message)
{
    $html = rol_notif_html($title, $message);

    $sent = 0;
    $failed = 0;
    $skipped = 0;

    foreach (rol_notif_recipients($db, $target) as $u) {
        $email = trim((string) ($u['email'] ?? ''));
        if ($email === '') {
            $skipped++;
            continue;
        }
        $name = $u['full_name'] ?? ($u['name'] ?? '');

        try {
            [$ok] = rol_send_mail($email, $name, $title, $html);
        } catch (Throwable $e) {
            error_log('ROL notif email error: ' . $e->getMessage());
            $ok = false;
        }
        $ok ? $sent++ : $failed++;
    }

    return ['sent' => $sent, 'failed' => $failed, 'skipped' => $skipped];
}

/**
 * WEBSITE NOTIF + EMAIL sa isang tawag (para sa conflict alert, etc.).
 * Isang user lang. Naka-save pa rin ang notif kahit pumalya ang email.
 * Return: [true, null] o [false, 'error'] (result ng email)
 */
function rol_notify($db, $userId, $title, $message)
{
    try {
        $db->table('notifications')->insert([
            'user_id'    => $userId,
            'title'      => $title,
            'message'    => $message,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    } catch (Throwable $e) {
        error_log('ROL notif insert error: ' . $e->getMessage());
    }

    $r = rol_email_notification($db, $userId, $title, $message);
    return $r['sent'] > 0 ? [true, null] : [false, 'Email not sent (no email or send failed).'];
}