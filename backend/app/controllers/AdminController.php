<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * backend/app/controllers/AdminController.php
 * Admin / Pastor lang: dashboard stats + Users & Roles.
 */
class AdminController extends Controller
{
    private $u;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->call->helper('jwt');
        header('Content-Type: application/json');
        $this->u = require_auth(['admin']);
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

    public function stats()
    {
        $rows = $this->db->table('users')->get_all() ?: [];
        $byRole = ['admin' => 0, 'staff' => 0, 'ministry_leader' => 0, 'member' => 0];
        $active = 0;
        foreach ($rows as $r) {
            if (isset($byRole[$r['role']])) $byRole[$r['role']]++;
            if ($r['status'] === 'active') $active++;
        }

        $this->out([
            'total_users'  => count($rows),
            'active_users' => $active,
            'by_role'      => $byRole,
        ]);
    }

    // ------------------------------------------------------ USERS & ROLES
    public function users_list()
    {
        $rows = $this->db->table('users')->get_all() ?: [];
        foreach ($rows as &$r) unset($r['password']);
        unset($r);
        usort($rows, function ($a, $b) { return $a['id'] <=> $b['id']; });
        $this->out($rows);
    }

    public function user_save()
    {
        $in   = $this->input();
        $id   = !empty($in['id']) ? (int)$in['id'] : null;
        $name = trim($in['full_name'] ?? '');
        $mail = strtolower(trim($in['email'] ?? ''));
        $role = $in['role'] ?? '';
        $stat = $in['status'] ?? 'active';
        $pass = $in['password'] ?? '';

        if ($name === '') $this->out(['error' => 'Full name is required'], 422);
        if (!filter_var($mail, FILTER_VALIDATE_EMAIL)) $this->out(['error' => 'A valid email is required'], 422);
        if (!in_array($role, ['admin', 'staff', 'ministry_leader', 'member'], true)) $this->out(['error' => 'Invalid role'], 422);
        if (!in_array($stat, ['active', 'inactive'], true)) $this->out(['error' => 'Invalid status'], 422);

        $existing = $this->db->table('users')->where('email', $mail)->get();
        if ($existing && (int)$existing['id'] !== (int)$id) $this->out(['error' => 'Email is already used'], 409);

        if ($id && $id === (int)$this->u['id'] && ($role !== 'admin' || $stat !== 'active')) {
            $this->out(['error' => 'You cannot remove your own admin access'], 422);
        }

        $data = ['full_name' => $name, 'email' => $mail, 'role' => $role, 'status' => $stat];

        if ($id) {
            if ($pass !== '') {
                if (strlen($pass) < 6) $this->out(['error' => 'Password must be at least 6 characters'], 422);
                $data['password'] = password_hash($pass, PASSWORD_BCRYPT);
            }
            $this->db->table('users')->where('id', $id)->update($data);
        } else {
            if (strlen($pass) < 6) $this->out(['error' => 'Password must be at least 6 characters'], 422);
            $data['password'] = password_hash($pass, PASSWORD_BCRYPT);
            $this->db->table('users')->insert($data);
        }

        $this->out(['success' => true]);
    }

    public function user_delete()
    {
        $in = $this->input();
        $id = (int)($in['id'] ?? 0);
        if (!$id) $this->out(['error' => 'id required'], 422);
        if ($id === (int)$this->u['id']) $this->out(['error' => 'You cannot delete your own account'], 422);

        // Alisin ang koneksyon sa ibang tables para hindi masira ang records
        $this->db->table('members')->where('user_id', $id)->update(['user_id' => null]);
        $this->db->table('ministries')->where('leader_user_id', $id)->update(['leader_user_id' => null]);
        $this->db->table('users')->where('id', $id)->delete();

        $this->out(['success' => true]);
    }
}