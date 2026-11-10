<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

const ROL_REMEMBER_COOKIE = 'rol_remember';
const ROL_REMEMBER_DAYS   = 30;

function rol_is_https()
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function rol_set_remember_cookie($value, $expires)
{
    setcookie(ROL_REMEMBER_COOKIE, $value, [
        'expires'  => $expires,
        'path'     => '/',
        'secure'   => rol_is_https(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

// Gumawa ng bagong token at i-set ang cookie
function rol_remember_issue($db, $userId)
{
    // Linisin ang expired tokens
    $db->raw('DELETE FROM remember_tokens WHERE expires_at < ?', [date('Y-m-d H:i:s')]);

    $selector  = bin2hex(random_bytes(12)); // 24 chars
    $validator = bin2hex(random_bytes(32));
    $expires   = time() + (ROL_REMEMBER_DAYS * 86400);

    $db->table('remember_tokens')->insert([
        'user_id'    => (int) $userId,
        'selector'   => $selector,
        'token_hash' => hash('sha256', $validator),
        'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
        'ip_address' => substr($_SERVER['REMOTE_ADDR'] ?? '', 0, 45),
        'expires_at' => date('Y-m-d H:i:s', $expires),
    ]);

    rol_set_remember_cookie($selector . ':' . $validator, $expires);
}

// I-check ang cookie. Returns user_id kung valid, null kung hindi.
// Binubura ang ginamit na token (rotation).
function rol_remember_consume($db)
{
    $raw = $_COOKIE[ROL_REMEMBER_COOKIE] ?? '';
    if (!preg_match('/^([a-f0-9]{24}):([a-f0-9]{64})$/', $raw, $m)) {
        return null;
    }

    $row = $db->table('remember_tokens')->where('selector', $m[1])->get();
    if (!$row) {
        rol_set_remember_cookie('', time() - 3600);
        return null;
    }

    // Selector tama pero validator mali: posibleng ninakaw. Burahin lahat ng tokens ng user.
    if (!hash_equals($row['token_hash'], hash('sha256', $m[2]))) {
        $db->table('remember_tokens')->where('user_id', $row['user_id'])->delete();
        rol_set_remember_cookie('', time() - 3600);
        return null;
    }

    $db->table('remember_tokens')->where('id', $row['id'])->delete();

    if (strtotime($row['expires_at']) < time()) {
        rol_set_remember_cookie('', time() - 3600);
        return null;
    }

    return (int) $row['user_id'];
}

// Logout: burahin ang token sa DB at ang cookie
function rol_remember_clear($db)
{
    $raw = $_COOKIE[ROL_REMEMBER_COOKIE] ?? '';
    if (preg_match('/^([a-f0-9]{24}):/', $raw, $m)) {
        $db->table('remember_tokens')->where('selector', $m[1])->delete();
    }
    rol_set_remember_cookie('', time() - 3600);
}