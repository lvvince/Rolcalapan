<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

// PALITAN ito ng sarili mong mahabang random string
if (!defined('JWT_SECRET')) define('JWT_SECRET', 'change-this-to-a-long-random-secret-key-rol-2026');
if (!defined('JWT_TTL'))    define('JWT_TTL', 60 * 60 * 8);

function b64url_encode($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode($data)
{
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode(array $payload)
{
    $header = b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_TTL;
    $body = b64url_encode(json_encode($payload));
    $sig  = b64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    return "$header.$body.$sig";
}

function jwt_decode($token)
{
    $parts = explode('.', (string)$token);
    if (count($parts) !== 3) return null;
    [$header, $body, $sig] = $parts;

    $expected = b64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;

    $payload = json_decode(b64url_decode($body), true);
    if (!$payload || ($payload['exp'] ?? 0) < time()) return null;
    return $payload;
}

function jwt_bearer_token()
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization') { $h = $v; break; }
        }
    }
    return preg_match('/Bearer\s+(.+)/i', $h, $m) ? trim($m[1]) : null;
}

function auth_user()
{
    $t = jwt_bearer_token();
    return $t ? jwt_decode($t) : null;
}

function require_auth(array $roles = [])
{
    $u = auth_user();
    if (!$u) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
    if ($roles && !in_array($u['role'], $roles, true)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
    return $u;
}