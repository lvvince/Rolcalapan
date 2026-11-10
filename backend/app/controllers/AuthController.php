<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * backend/app/controllers/AuthController.php
 * Login (with Keep me logged in), Refresh, Logout, Register (member lang),
 * Verify email (6-digit code), Forgot/Reset password,
 * My profile (update, change password, photo upload/remove).
 */
class AuthController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        date_default_timezone_set('Asia/Manila');
        $this->call->database();
        $this->call->helper('jwt');
        $this->call->helper('remember');
        // Huwag i-force ang JSON header dito, kasi image ang sagot ng avatar().
        // Ang out() na ang nagse-set ng JSON header.
    }

    private function out($data, $code = 200)
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    private function input()
    {
        return json_decode(file_get_contents('php://input'), true) ?: [];
    }

    private function is_local()
    {
        $host = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
        return in_array($host, ['localhost', '127.0.0.1'], true);
    }

    // Standard user shape na ibinabalik sa frontend
    private function user_payload($row)
    {
        return [
            'id'    => (int) $row['id'],
            'name'  => $row['full_name'],
            'email' => $row['email'],
            'role'  => $row['role'],
            'phone' => $row['phone'] ?? '',
            'photo' => $row['photo'] ?? null,
        ];
    }

    // Gumawa ng JWT para sa isang user row
    private function make_jwt($user)
    {
        return jwt_encode([
            'id'    => (int) $user['id'],
            'name'  => $user['full_name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ]);
    }

    // ------------------------------------------------------------- LOGIN
    // POST /api/auth/login   { email, password, remember? }
    public function login()
    {
        $in    = $this->input();
        $email = strtolower(trim($in['email'] ?? ''));
        $pass  = $in['password'] ?? '';

        if ($email === '' || $pass === '') {
            $this->out(['error' => 'Email and password are required'], 422);
        }

        $user = $this->db->table('users')->where('email', $email)->get();

        if (!$user || !password_verify($pass, $user['password'])) {
            $this->out(['error' => 'Invalid email or password'], 401);
        }
        if ($user['status'] !== 'active') {
            $this->out(['error' => 'Account is inactive'], 403);
        }
        if ((int) $user['email_verified'] !== 1) {
            $this->out(['error' => 'Please verify your email before logging in.'], 403);
        }

        // "Keep me logged in": gumawa ng remember-me token + cookie (30 days)
        if (!empty($in['remember'])) {
            rol_remember_issue($this->db, $user['id']);
        }

        $this->out([
            'token' => $this->make_jwt($user),
            'user'  => $this->user_payload($user),
        ]);
    }

    // ----------------------------------------------------------- REFRESH
    // POST /api/auth/refresh   (gamit ang remember-me cookie)
    public function refresh()
    {
        $uid = rol_remember_consume($this->db);
        if (!$uid) {
            $this->out(['error' => 'Not remembered'], 401);
        }

        $user = $this->db->table('users')->where('id', $uid)->get();
        if (!$user || $user['status'] !== 'active' || (int) $user['email_verified'] !== 1) {
            rol_remember_clear($this->db);
            $this->out(['error' => 'Not remembered'], 401);
        }

        // Rotation: bagong token sa bawat refresh
        rol_remember_issue($this->db, $user['id']);

        $this->out([
            'token' => $this->make_jwt($user),
            'user'  => $this->user_payload($user),
        ]);
    }

    // ------------------------------------------------------------ LOGOUT
    // POST /api/auth/logout
    public function logout()
    {
        rol_remember_clear($this->db);
        $this->out(['success' => true]);
    }

    // ---------------------------------------------------------------- ME
    public function me()
    {
        $u   = require_auth();
        $row = $this->db->table('users')->where('id', $u['id'])->get();
        if (!$row) $this->out(['error' => 'User not found'], 404);

        $this->out(['user' => $this->user_payload($row)]);
    }

    // ------------------------------------------------------ UPDATE PROFILE
    public function update_me()
    {
        $u     = require_auth();
        $in    = $this->input();
        $name  = trim($in['full_name'] ?? '');
        $email = strtolower(trim($in['email'] ?? ''));
        $phone = trim($in['phone'] ?? '');

        if ($name === '') $this->out(['error' => 'Full name is required'], 422);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->out(['error' => 'A valid email is required'], 422);
        }
        if ($phone !== '' && !preg_match('/^\d{11}$/', $phone)) {
            $this->out(['error' => 'Phone must be exactly 11 digits'], 422);
        }

        $dup = $this->db->table('users')->where('email', $email)->get();
        if ($dup && (int) $dup['id'] !== (int) $u['id']) {
            $this->out(['error' => 'This email is already used by another account'], 409);
        }

        $this->db->table('users')->where('id', $u['id'])->update([
            'full_name' => $name,
            'email'     => $email,
            'phone'     => $phone,
        ]);

        // Sync sa linked member record (kung meron)
        $this->db->table('members')->where('user_id', $u['id'])->update([
            'full_name' => $name,
            'email'     => $email,
            'phone'     => $phone,
        ]);

        $row = $this->db->table('users')->where('id', $u['id'])->get();
        $this->out(['success' => true, 'user' => $this->user_payload($row)]);
    }

    // ----------------------------------------------------- CHANGE PASSWORD
    public function change_password()
    {
        $u    = require_auth();
        $in   = $this->input();
        $cur  = $in['current_password'] ?? '';
        $next = $in['new_password'] ?? '';

        if ($cur === '' || $next === '') {
            $this->out(['error' => 'All fields are required'], 422);
        }
        if (strlen($next) < 6) {
            $this->out(['error' => 'New password must be at least 6 characters'], 422);
        }

        $row = $this->db->table('users')->where('id', $u['id'])->get();
        if (!$row || !password_verify($cur, $row['password'])) {
            $this->out(['error' => 'Current password is incorrect'], 400);
        }
        if (password_verify($next, $row['password'])) {
            $this->out(['error' => 'New password must be different from the current one'], 422);
        }

        $this->db->table('users')->where('id', $u['id'])->update([
            'password' => password_hash($next, PASSWORD_BCRYPT),
        ]);

        // Mag-logout ang lahat ng "remembered" devices pagkapalit ng password
        $this->db->table('remember_tokens')->where('user_id', $u['id'])->delete();
        rol_remember_clear($this->db);

        $this->out(['success' => true, 'message' => 'Password changed']);
    }

    // --------------------------------------------------------- PHOTO UPLOAD
    private function avatar_dir()
    {
        $dir = dirname(__DIR__, 2) . '/public/uploads/avatars/';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        return $dir;
    }

    public function upload_photo()
    {
        $u = require_auth();

        if (empty($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
            $this->out(['error' => 'No file uploaded or upload failed'], 422);
        }
        $f = $_FILES['photo'];

        if ($f['size'] > 2 * 1024 * 1024) {
            $this->out(['error' => 'Max 2MB lang'], 422);
        }

        $finfo   = new finfo(FILEINFO_MIME_TYPE);
        $mime    = $finfo->file($f['tmp_name']);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($allowed[$mime])) {
            $this->out(['error' => 'JPG, PNG, o WEBP lang'], 422);
        }

        $name = 'u' . (int) $u['id'] . '_' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];
        $dir  = $this->avatar_dir();

        if (!move_uploaded_file($f['tmp_name'], $dir . $name)) {
            $this->out(['error' => 'Unable to save the file'], 500);
        }

        // Burahin yung lumang photo
        $row = $this->db->table('users')->where('id', $u['id'])->get();
        if (!empty($row['photo']) && is_file($dir . basename($row['photo']))) {
            @unlink($dir . basename($row['photo']));
        }

        $this->db->table('users')->where('id', $u['id'])->update(['photo' => $name]);
        $this->out(['success' => true, 'photo' => $name]);
    }

    public function remove_photo()
    {
        $u   = require_auth();
        $row = $this->db->table('users')->where('id', $u['id'])->get();
        $dir = $this->avatar_dir();

        if (!empty($row['photo']) && is_file($dir . basename($row['photo']))) {
            @unlink($dir . basename($row['photo']));
        }

        $this->db->table('users')->where('id', $u['id'])->update(['photo' => null]);
        $this->out(['success' => true]);
    }

    // Public: nagse-serve ng image para gumana sa <img> at sa Vite proxy (/api)
    public function avatar()
    {
        $file = basename($_GET['f'] ?? '');
        $path = $this->avatar_dir() . $file;

        if (!preg_match('/^[A-Za-z0-9_]+\.(jpg|png|webp)$/', $file) || !is_file($path)) {
            http_response_code(404);
            exit;
        }

        $types = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
        header('Content-Type: ' . $types[pathinfo($file, PATHINFO_EXTENSION)]);
        header('Cache-Control: public, max-age=86400');
        readfile($path);
        exit;
    }

    // ------------------------------------------- VERIFICATION CODE (helper)
    // Gumagawa ng 6-digit code, sine-save ang hash, at ine-email.
    // Returns [sent(bool), error(string|null), code(string)]
    private function issue_verification_code($userId, $email, $name)
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $this->db->table('users')->where('id', $userId)->update([
            'email_verification_token_hash' => hash('sha256', $code),
            'email_verification_expires_at' => date('Y-m-d H:i:s', time() + 900), // 15 minutes
            'email_verification_attempts'   => 0,
        ]);

        $this->call->helper('rolmail');

        $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');

        $html = '<h2>Welcome to River of Life Calapan!</h2>'
              . '<p>Hello ' . $safeName . ',</p>'
              . '<p>Your verification code is:</p>'
              . '<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0;">' . $code . '</p>'
              . '<p>Enter this code on the registration page. It expires in 15 minutes.</p>'
              . '<p>If you did not create this account, you can ignore this email.</p>';

        list($sent, $err) = rol_send_mail(
            $email,
            $name,
            'Your River of Life verification code',
            $html
        );

        return [$sent, $err, $code];
    }

    // ---------------------------------------------------------- REGISTER
    // Member lang ang pwedeng mag-register. Ang ibang role ay si Admin ang gagawa.
    public function register()
    {
        $in    = $this->input();
        $name  = trim($in['full_name'] ?? '');
        $email = strtolower(trim($in['email'] ?? ''));
        $pass  = $in['password'] ?? '';
        $phone = trim($in['phone'] ?? '');

        if ($name === '') {
            $this->out(['error' => 'Full name is required'], 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->out(['error' => 'A valid email is required'], 422);
        }

        if (!preg_match('/^\d{11}$/', $phone)) {
            $this->out(['error' => 'Phone number is required and must be exactly 11 digits.'], 422);
        }

        if (strlen($pass) < 6) {
            $this->out(['error' => 'Password must be at least 6 characters'], 422);
        }

        if ($this->db->table('users')->where('email', $email)->get()) {
            $this->out(['error' => 'This email is already registered'], 409);
        }

        $this->db->table('users')->insert([
            'full_name'      => $name,
            'email'          => $email,
            'phone'          => $phone,
            'password'       => password_hash($pass, PASSWORD_BCRYPT),
            'role'           => 'member',
            'status'         => 'active',
            'email_verified' => 0,
        ]);

        $user = $this->db->table('users')->where('email', $email)->get();

        if (!$user) {
            $this->out(['error' => 'Unable to create the account'], 500);
        }

        // I-link sa existing member record kung wala pang user_id.
        $m = $this->db->table('members')->where('email', $email)->get();

        if ($m && empty($m['user_id'])) {
            $update = ['user_id' => $user['id']];
            if (empty($m['phone'])) {
                $update['phone'] = $phone;
            }
            $this->db->table('members')
                ->where('id', $m['id'])
                ->update($update);
        } elseif (!$m) {
            $this->db->table('members')->insert([
                'user_id'     => $user['id'],
                'member_code' => 'ROL-' . strtoupper(bin2hex(random_bytes(3))),
                'full_name'   => $name,
                'email'       => $email,
                'phone'       => $phone,
                'status'      => 'active',
            ]);
        }

        $this->db->table('notifications')->insert([
            'user_id' => $user['id'],
            'title'   => 'Welcome to River of Life',
            'message' => 'Please verify your email address to activate login access.',
        ]);

        // Magpadala ng 6-digit verification code.
        list($sent, $mailError, $code) = $this->issue_verification_code($user['id'], $email, $name);

        if (!$sent) {
            error_log('Registration verification email failed: ' . $mailError);

            $response = [
                'success'    => true,
                'email_sent' => false,
                'email'      => $email,
                'message'    => 'Your account was created, but the verification email could not be sent. Please request a new code.',
            ];

            // Local development only. Never expose codes in production.
            if ($this->is_local()) {
                $response['debug_code'] = $code;
                $response['debug_note'] = $mailError;
            }

            $this->out($response, 201);
        }

        $this->out([
            'success'    => true,
            'email_sent' => true,
            'email'      => $email,
            'message'    => 'Registration successful! Enter the 6-digit code we sent to your email.',
        ], 201);
    }

    // ------------------------------------------------- VERIFY CODE (6-digit)
    // POST /api/auth/verify-code   { email, code }
    public function verify_code()
    {
        $in    = $this->input();
        $email = strtolower(trim($in['email'] ?? ''));
        $code  = trim($in['code'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^\d{6}$/', $code)) {
            $this->out(['success' => false, 'error' => 'Enter the 6-digit code sent to your email.'], 422);
        }

        $user = $this->db->table('users')->where('email', $email)->get();

        if (!$user) {
            $this->out(['success' => false, 'error' => 'Invalid code or email.'], 400);
        }

        if ((int) $user['email_verified'] === 1) {
            $this->out(['success' => true, 'message' => 'Email already verified. You can log in.']);
        }

        $attempts = (int) ($user['email_verification_attempts'] ?? 0);
        if ($attempts >= 5) {
            $this->out(['success' => false, 'error' => 'Too many wrong attempts. Please request a new code.'], 429);
        }

        $expires = $user['email_verification_expires_at'] ?? null;
        if (empty($user['email_verification_token_hash']) || !$expires || strtotime($expires) < time()) {
            $this->out(['success' => false, 'error' => 'This code has expired. Please request a new one.'], 400);
        }

        if (!hash_equals($user['email_verification_token_hash'], hash('sha256', $code))) {
            $this->db->table('users')->where('id', $user['id'])->update([
                'email_verification_attempts' => $attempts + 1,
            ]);
            $left = max(0, 4 - $attempts);
            $this->out(['success' => false, 'error' => 'Incorrect code. ' . $left . ' attempt(s) left.'], 400);
        }

        $this->db->table('users')->where('id', $user['id'])->update([
            'email_verified'                => 1,
            'email_verification_token_hash' => null,
            'email_verification_expires_at' => null,
            'email_verification_attempts'   => 0,
        ]);

        $this->out(['success' => true, 'message' => 'Email verified successfully! You can now log in.']);
    }

    // POST /api/auth/resend-code   { email }
    public function resend_code()
    {
        $in    = $this->input();
        $email = strtolower(trim($in['email'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->out(['success' => false, 'error' => 'A valid email is required'], 422);
        }

        $resp = ['success' => true, 'message' => 'A new code has been sent.'];

        $user = $this->db->table('users')->where('email', $email)->get();

        // Parehong sagot kahit wala o verified na (hindi nagle-leak ng account info)
        if (!$user || (int) $user['email_verified'] === 1) {
            $this->out($resp);
        }

        // 60-second cooldown. Ang huling send = expires_at - 900.
        $expires = $user['email_verification_expires_at'] ?? null;
        if ($expires) {
            $sentAt = strtotime($expires) - 900;
            $wait   = 60 - (time() - $sentAt);
            if ($wait > 0) {
                $this->out(['success' => false, 'error' => 'Please wait ' . $wait . ' seconds before requesting a new code.'], 429);
            }
        }

        list($sent, $err) = $this->issue_verification_code($user['id'], $user['email'], $user['full_name']);

        if (!$sent) {
            error_log('Resend verification code failed: ' . $err);
            $this->out(['success' => false, 'error' => 'Could not send the email. Please try again later.'], 500);
        }

        $this->out($resp);
    }

    // ------------------------------------------------------ FORGOT PASSWORD
    public function forgot()
    {
        $in    = $this->input();
        $email = strtolower(trim($in['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->out(['error' => 'A valid email is required'], 422);
        }

        // Parehong sagot kahit wala ang email (para hindi malaman kung may account)
        $resp = ['success' => true, 'message' => 'If that email is registered, a password reset link has been sent.'];

        $user = $this->db->table('users')->where('email', $email)->get();
        if ($user && $user['status'] === 'active') {
            $this->call->helper('rolmail');

            $token = bin2hex(random_bytes(32));
            $this->db->table('password_resets')->where('user_id', $user['id'])->delete();
            $this->db->table('password_resets')->insert([
                'user_id'    => $user['id'],
                'token_hash' => hash('sha256', $token),
                'expires_at' => date('Y-m-d H:i:s', time() + 3600), // 1 oras
            ]);

            $link = APP_URL . '/reset-password?token=' . $token;
            $n    = htmlspecialchars($user['full_name'], ENT_QUOTES, 'UTF-8');
            $html = '<p>Hello ' . $n . ',</p>'
                  . '<p>We received a request to reset your <strong>River of Life Calapan</strong> password.</p>'
                  . '<p><a href="' . $link . '">Click here to reset your password</a></p>'
                  . '<p>This link will expire in 1 hour. If you did not ask for this, you can ignore this email.</p>';

            list($ok, $err) = rol_send_mail($user['email'], $user['full_name'], 'Reset your River of Life password', $html);

            // Para sa testing sa localhost lang, kung hindi pa naka-set ang Gmail
            if (!$ok && $this->is_local()) {
                $resp['debug_link'] = $link;
                $resp['debug_note'] = $err;
            }
        }

        $this->out($resp);
    }

    // ------------------------------------------------------- RESET PASSWORD
    public function reset()
    {
        $in    = $this->input();
        $token = trim($in['token'] ?? '');
        $pass  = $in['password'] ?? '';

        if ($token === '') $this->out(['error' => 'Reset token is missing'], 422);
        if (strlen($pass) < 6) $this->out(['error' => 'Password must be at least 6 characters'], 422);

        $row = $this->db->table('password_resets')->where('token_hash', hash('sha256', $token))->get();
        if (!$row || strtotime($row['expires_at']) < time()) {
            $this->out(['error' => 'This reset link is invalid or has expired'], 400);
        }

        $this->db->table('users')->where('id', $row['user_id'])->update([
            'password' => password_hash($pass, PASSWORD_BCRYPT),
        ]);
        $this->db->table('password_resets')->where('user_id', $row['user_id'])->delete();

        // Mag-logout ang lahat ng "remembered" devices pagkatapos ng reset
        $this->db->table('remember_tokens')->where('user_id', $row['user_id'])->delete();

        $this->out(['success' => true, 'message' => 'Password updated. You can now log in.']);
    }
}