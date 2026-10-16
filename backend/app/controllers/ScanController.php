<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ScanController extends Controller
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

    public function scan()
    {
        $u = require_auth();

        if (!in_array($u['role'], ['secretary', 'admin'], true)) {
            $this->out(['error' => 'Only the secretary or admin can scan attendance'], 403);
        }

        $in      = $this->input();
        $code    = strtoupper(trim($in['member_code'] ?? ''));
        $eventId = (int) ($in['event_id'] ?? 0);

        if ($code === '') {
            $this->out(['error' => 'QR code is empty'], 422);
        }

        $member = $this->db->table('members')->where('member_code', $code)->get();

        if (!$member) {
            $this->out(['error' => 'Member not found'], 404);
        }
        if ($member['status'] !== 'active') {
            $this->out(['error' => 'Member is inactive'], 403);
        }

        $today = date('Y-m-d');

        $exists = $this->db->table('attendance')
            ->where('member_id', $member['id'])
            ->where('event_id', $eventId)
            ->where('service_date', $today)
            ->get();

        if ($exists) {
            $this->out([
                'success' => false,
                'already' => true,
                'message' => $member['full_name'] . ' is already marked present today.',
            ], 409);
        }

        $this->db->table('attendance')->insert([
            'member_id'    => (int) $member['id'],
            'event_id'     => $eventId,
            'service_date' => $today,
            'method'       => 'qr',
        ]);

        $this->out([
            'success' => true,
            'message' => $member['full_name'] . ' marked present.',
            'member'  => [
                'name' => $member['full_name'],
                'code' => $member['member_code'],
            ],
        ], 201);
    }
}