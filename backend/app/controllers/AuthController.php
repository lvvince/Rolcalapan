<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * backend/app/controllers/AuthController.php
 * Login, Register (member lang), Forgot password, Reset password.
 */
class AuthController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        date_default_timezone_set('Asia/Manila');
        $this->call->database();
        $this->call->helper('jwt');
        header('Content-Type: application/json');
    }

    private function out($data, $code = 200)
    {
        http_response_code($code);
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

    // ------------------------------------------------------------- LOGIN
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

    $token = jwt_encode([
        'id'    => (int)$user['id'],
        'name'  => $user['full_name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ]);

    $this->out([
        'token' => $token,
        'user'  => [
            'id'    => (int)$user['id'],
            'name'  => $user['full_name'],
            'email' => $user['email'],
            'role'  => $user['role'],
        ],
    ]);
}
    public function me()
    {
        $u = require_auth();
        $this->out(['user' => [
            'id' => $u['id'], 'name' => $u['name'], 'email' => $u['email'], 'role' => $u['role'],
        ]]);
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

    // Gumawa ng secure verification token.
    $token = bin2hex(random_bytes(32));

    $this->db->table('users')->insert([
        'full_name'                       => $name,
        'email'                            => $email,
        'password'                         => password_hash($pass, PASSWORD_BCRYPT),
        'role'                             => 'member',
        'status'                           => 'active',
        'email_verified'                   => 0,
        'email_verification_token_hash'    => hash('sha256', $token),
        'email_verification_expires_at'    => date('Y-m-d H:i:s', time() + 3600),
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

    // Magpadala ng verification email gamit ang PHPMailer helper.
    $this->call->helper('rolmail');

    $link = rtrim(APP_URL, '/') . '/verify-email?token=' . urlencode($token);

    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $safeLink = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');

    $html = '<h2>Welcome to River of Life Calapan!</h2>'
          . '<p>Hello ' . $safeName . ',</p>'
          . '<p>Thank you for registering. Please verify your email address by clicking the link below:</p>'
          . '<p><a href="' . $safeLink . '">Verify My Email</a></p>'
          . '<p>This verification link expires in 1 hour.</p>'
          . '<p>If you did not create this account, you can ignore this email.</p>';

    list($sent, $mailError) = rol_send_mail(
        $email,
        $name,
        'Verify your River of Life Calapan account',
        $html
    );

    if (!$sent) {
        error_log('Registration verification email failed: ' . $mailError);

        $response = [
            'success' => true,
            'email_sent' => false,
            'message' => 'Your account was created, but the verification email could not be sent. Please contact the administrator for assistance.'
        ];

        // Local development only. Never expose tokens in production.
        if ($this->is_local()) {
            $response['debug_link'] = $link;
            $response['debug_note'] = $mailError;
        }

        $this->out($response, 201);
    }

    $this->out([
        'success' => true,
        'email_sent' => true,
        'message' => 'Registration successful! Please check your email and click the verification link before logging in.'
    ], 201);
}
public function verify_email()
{
    $token = trim($_GET['token'] ?? '');

    if ($token === '' || !preg_match('/^[a-f0-9]{64}$/', $token)) {
        $this->out(['success' => false, 'error' => 'Invalid verification link.'], 400);
    }

    $user = $this->db->table('users')
        ->where('email_verification_token_hash', hash('sha256', $token))
        ->get();

    if (!$user) {
        $this->out(['success' => false, 'error' => 'Invalid verification link or token not found.'], 400);
    }

    if ((int) $user['email_verified'] === 1) {
        $this->out(['success' => true, 'message' => 'Email already verified. You can log in.']);
    }

    $expires = $user['email_verification_expires_at'] ?? null;

    if (!$expires || strtotime($expires) < time()) {
        $this->out(['success' => false, 'error' => 'Verification link expired.'], 400);
    }

    // Huwag burahin ang token hash, para safe ang paulit-ulit na click.
    $this->db->table('users')
        ->where('id', $user['id'])
        ->update(['email_verified' => 1]);

    $this->out(['success' => true, 'message' => 'Email verified successfully! You can now log in.']);
}
    // ------------------------------------------------------ FORGOT PASSWORD
    public function forgot()
    {
        $in    = $this->input();
        $email = strtolower(trim($in['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $this->out(['error' => 'A valid email is required'], 422);

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

        $this->out(['success' => true, 'message' => 'Password updated. You can now log in.']);
    }
}