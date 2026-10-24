<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * backend/app/controllers/PortalController.php
 * Custom endpoints: profile, profile picture, overview, join/leave, recommender, check-in, reports, notifications.
 */
class PortalController extends Controller
{
    private $u;

    public function __construct()
    {
        parent::__construct();
        date_default_timezone_set('Asia/Manila');
        $this->call->database();
        $this->call->helper('jwt');
        header('Content-Type: application/json');
        $this->u = require_auth();
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

    private function all($table)
    {
        return $this->db->table($table)->get_all() ?: [];
    }

    private function member_row()
    {
        $m = $this->db->table('members')->where('user_id', $this->u['id'])->get();
        if ($m) return $m;
        $this->db->table('members')->insert([
            'user_id'     => $this->u['id'],
            'member_code' => 'ROL-' . strtoupper(substr(md5(uniqid('', true)), 0, 6)),
            'full_name'   => $this->u['name'],
            'email'       => $this->u['email'],
            'status'      => 'active',
        ]);
        return $this->db->table('members')->where('user_id', $this->u['id'])->get();
    }

    private function mine()
    {
        $rows = $this->db->table('ministries')->where('leader_user_id', $this->u['id'])->get_all() ?: [];
        return array_map(function ($r) { return (int)$r['id']; }, $rows);
    }

    private function tokens($text)
    {
        $stop = ['the', 'and', 'for', 'with', 'are', 'our', 'every', 'each', 'who', 'all', 'ang', 'ng', 'sa', 'mga'];
        $w = preg_split('/[^a-z0-9]+/i', strtolower($text), -1, PREG_SPLIT_NO_EMPTY);
        $w = array_filter($w, function ($x) use ($stop) { return strlen($x) >= 3 && !in_array($x, $stop, true); });
        return array_values(array_unique($w));
    }

    // ------------------------------------------------------------ PROFILE
    public function me()
    {
        $m  = $this->member_row();
        $mm = $this->db->table('ministry_members')->where('member_id', $m['id'])->get_all() ?: [];
        $names = [];
        foreach ($this->all('ministries') as $min) $names[$min['id']] = $min;
        $list = [];
        foreach ($mm as $x) {
            if (isset($names[$x['ministry_id']])) {
                $list[] = ['id' => (int)$x['ministry_id'], 'name' => $names[$x['ministry_id']]['name'], 'role' => $x['role']];
            }
        }
        $this->out(['member' => $m, 'ministries' => $list]);
    }

    public function me_update()
    {
        $m  = $this->member_row();
        $in = $this->input();
        $data = [];
        foreach (['full_name', 'phone', 'address', 'birthdate', 'family_name', 'language'] as $f) {
            if (!array_key_exists($f, $in)) continue;
            $v = is_string($in[$f]) ? trim($in[$f]) : $in[$f];
            if ($v === '' && $f !== 'full_name' && $f !== 'language') $v = null;
            $data[$f] = $v;
        }
        if (isset($data['full_name']) && $data['full_name'] === '') $this->out(['error' => 'Full name is required'], 422);
        if ($data) {
            $this->db->table('members')->where('id', $m['id'])->update($data);
            if (!empty($data['full_name'])) {
                $this->db->table('users')->where('id', $this->u['id'])->update(['full_name' => $data['full_name']]);
            }
        }
        $this->out(['success' => true, 'member' => $this->db->table('members')->where('id', $m['id'])->get()]);
    }

    // ------------------------------------------------------ PROFILE PICTURE
    public function me_picture()
    {
        $m   = $this->member_row();
        $in  = $this->input();
        $pic = $in['picture'] ?? '';

        if (!is_string($pic) || !preg_match('#^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$#', $pic)) {
            $this->out(['error' => 'Invalid image'], 422);
        }
        if (strlen($pic) > 500000) {
            $this->out(['error' => 'Image is too large'], 422);
        }

        $this->db->table('members')->where('id', $m['id'])->update(['profile_pic' => $pic]);
        $this->out(['success' => true, 'profile_pic' => $pic]);
    }

    // ----------------------------------------------------------- OVERVIEW
    public function overview()
    {
        $role  = $this->u['role'];
        $today = date('Y-m-d');
        $stats = [];

        if ($role === 'staff' || $role === 'admin') {
            $members = $this->all('members');
            $active  = count(array_filter($members, function ($r) { return $r['status'] === 'active'; }));
            $att     = count(array_filter($this->all('attendance'), function ($r) use ($today) { return $r['service_date'] === $today; }));
            $ev      = count(array_filter($this->all('events'), function ($r) use ($today) { return $r['event_date'] >= $today; }));
            $month   = date('Y-m');
            $give    = 0;
            foreach ($this->all('giving') as $g) if (substr($g['given_at'], 0, 7) === $month) $give += (float)$g['amount'];
            $stats = [
                ['label' => 'Members', 'value' => count($members)],
                ['label' => 'Active Members', 'value' => $active],
                ['label' => 'Checked in Today', 'value' => $att],
                ['label' => 'Upcoming Events', 'value' => $ev],
                ['label' => 'Giving This Month', 'value' => number_format($give, 2)],
            ];
        } elseif ($role === 'ministry_leader') {
            $mine = $this->mine();
            $mm   = array_filter($this->all('ministry_members'), function ($r) use ($mine) { return in_array((int)$r['ministry_id'], $mine, true); });
            $sch  = array_filter($this->all('ministry_schedules'), function ($r) use ($mine, $today) { return in_array((int)$r['ministry_id'], $mine, true) && $r['schedule_date'] >= $today; });
            $act  = array_filter($this->all('activities'), function ($r) use ($mine) { return in_array((int)$r['ministry_id'], $mine, true) && $r['status'] !== 'done'; });
            $stats = [
                ['label' => 'My Ministries', 'value' => count($mine)],
                ['label' => 'Ministry Members', 'value' => count($mm)],
                ['label' => 'Upcoming Schedules', 'value' => count($sch)],
                ['label' => 'Open Activities', 'value' => count($act)],
            ];
        } else {
            $m   = $this->member_row();
            $mid = (int)$m['id'];
            $my  = array_filter($this->all('ministry_members'), function ($r) use ($mid) { return (int)$r['member_id'] === $mid; });
            $att = array_filter($this->all('attendance'), function ($r) use ($mid) { return (int)$r['member_id'] === $mid; });
            $ev  = array_filter($this->all('events'), function ($r) use ($today) { return $r['event_date'] >= $today; });
            $stats = [
                ['label' => 'My Ministries & Groups', 'value' => count($my)],
                ['label' => 'Times Attended', 'value' => count($att)],
                ['label' => 'Upcoming Events', 'value' => count($ev)],
            ];
        }
        $this->out(['stats' => $stats]);
    }

    // ----------------------------------------------- MINISTRIES (member)
    public function ministries()
    {
        $m   = $this->member_row();
        $mid = (int)$m['id'];
        $mm  = $this->all('ministry_members');
        $users = [];
        foreach ($this->all('users') as $x) $users[$x['id']] = $x['full_name'];

        $out = [];
        foreach ($this->all('ministries') as $min) {
            $count = 0; $joined = false;
            foreach ($mm as $x) {
                if ((int)$x['ministry_id'] === (int)$min['id']) {
                    $count++;
                    if ((int)$x['member_id'] === $mid) $joined = true;
                }
            }
            $out[] = [
                'id' => (int)$min['id'], 'name' => $min['name'], 'type' => $min['type'],
                'description' => $min['description'], 'leader_name' => $users[$min['leader_user_id']] ?? null,
                'member_count' => $count, 'joined' => $joined,
            ];
        }
        $this->out($out);
    }

    public function join()
    {
        $m   = $this->member_row();
        $in  = $this->input();
        $mid = (int)($in['ministry_id'] ?? 0);
        if (!$this->db->table('ministries')->where('id', $mid)->get()) $this->out(['error' => 'Ministry not found'], 404);
        $exists = $this->db->table('ministry_members')->where('ministry_id', $mid)->where('member_id', $m['id'])->get();
        if (!$exists) {
            $this->db->table('ministry_members')->insert([
                'ministry_id' => $mid, 'member_id' => $m['id'], 'role' => 'member', 'status' => 'active',
            ]);
        }
        $this->out(['success' => true]);
    }

    public function leave()
    {
        $m   = $this->member_row();
        $in  = $this->input();
        $mid = (int)($in['ministry_id'] ?? 0);
        $this->db->table('ministry_members')->where('ministry_id', $mid)->where('member_id', $m['id'])->delete();
        $this->out(['success' => true]);
    }

    // --------------------------------------- RECOMMENDER (content-based)
    public function recommended()
    {
        $m   = $this->member_row();
        $mid = (int)$m['id'];
        $ministries = $this->all('ministries');
        $mm = $this->all('ministry_members');

        $joined = []; $counts = [];
        foreach ($mm as $x) {
            $counts[$x['ministry_id']] = ($counts[$x['ministry_id']] ?? 0) + 1;
            if ((int)$x['member_id'] === $mid) $joined[] = (int)$x['ministry_id'];
        }

        $profile = [];
        foreach ($ministries as $min) {
            if (in_array((int)$min['id'], $joined, true)) {
                $profile = array_merge($profile, $this->tokens($min['name'] . ' ' . $min['description'] . ' ' . $min['type']));
            }
        }
        $events = [];
        foreach ($this->all('events') as $e) $events[$e['id']] = $e['title'];
        foreach ($this->all('attendance') as $a) {
            if ((int)$a['member_id'] === $mid && (int)$a['event_id'] > 0 && isset($events[$a['event_id']])) {
                $profile = array_merge($profile, $this->tokens($events[$a['event_id']]));
            }
        }
        $profile = array_unique($profile);

        $out = [];
        foreach ($ministries as $min) {
            if (in_array((int)$min['id'], $joined, true)) continue;
            $toks  = $this->tokens($min['name'] . ' ' . $min['description'] . ' ' . $min['type']);
            $match = count(array_intersect($profile, $toks));
            $score = ($match / max(1, count($toks))) + (($counts[$min['id']] ?? 0) * 0.01);
            $out[] = [
                'id' => (int)$min['id'], 'name' => $min['name'], 'type' => $min['type'],
                'description' => $min['description'], 'member_count' => $counts[$min['id']] ?? 0,
                'score' => round($score, 2),
                'reason' => $match > 0 ? 'Similar to the ministries and events you joined' : 'Popular in our church',
            ];
        }
        usort($out, function ($a, $b) { return $b['score'] <=> $a['score']; });
        $this->out(array_slice($out, 0, 6));
    }

    // ----------------------------------------------------------- CHECK-IN
    private function distance_m($lat1, $lng1, $lat2, $lng2)
    {
        $r = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return 2 * $r * asin(min(1, sqrt($a)));
    }

    private function record_attendance($memberId, $eventId, $method)
    {
        $today = date('Y-m-d');
        $dup = $this->db->table('attendance')
            ->where('member_id', $memberId)->where('service_date', $today)->where('event_id', $eventId)->get();
        if ($dup) $this->out(['error' => 'Already checked in today'], 409);
        $this->db->table('attendance')->insert([
            'member_id' => $memberId, 'event_id' => $eventId, 'service_date' => $today, 'method' => $method,
        ]);
    }

    public function checkin()
    {
        $in   = $this->input();
        $role = $this->u['role'];

        if ($role === 'member') {
            $m  = $this->member_row();
            $ev = $this->db->table('events')->where('id', (int)($in['event_id'] ?? 0))->get();
            if (!$ev || $ev['event_type'] !== 'outside') $this->out(['error' => 'Event not found or not an off-site event'], 422);
            if ($ev['event_date'] !== date('Y-m-d')) $this->out(['error' => 'GPS check-in is only available on the event day'], 422);
            if ($ev['lat'] === null || $ev['lng'] === null) $this->out(['error' => 'Geofence is not set for this event yet'], 422);
            if (!isset($in['lat']) || !isset($in['lng'])) $this->out(['error' => 'Location is required'], 422);

            $dist   = $this->distance_m((float)$in['lat'], (float)$in['lng'], (float)$ev['lat'], (float)$ev['lng']);
            $radius = (int)$ev['radius_m'] ?: 100;
            if ($dist > $radius) {
                $this->out(['error' => 'You are too far from the event (' . round($dist) . ' m away, allowed ' . $radius . ' m)'], 422);
            }
            $this->record_attendance($m['id'], (int)$ev['id'], 'gps');
            $this->out(['success' => true, 'message' => 'Checked in to ' . $ev['title']]);
        }

        if ($role === 'staff' || $role === 'admin') {
            $code = strtoupper(trim($in['code'] ?? ''));
            if ($code === '') $this->out(['error' => 'Member code is required'], 422);
            $m = $this->db->table('members')->where('member_code', $code)->get();
            if (!$m) $this->out(['error' => 'Member code not found'], 404);
            $this->record_attendance($m['id'], (int)($in['event_id'] ?? 0), 'qr');
            $this->out(['success' => true, 'message' => 'Checked in: ' . $m['full_name']]);
        }

        $this->out(['error' => 'Forbidden'], 403);
    }

    // ------------------------------------------------------------ REPORTS
    public function reports()
    {
        if (!in_array($this->u['role'], ['admin', 'staff'], true)) $this->out(['error' => 'Forbidden'], 403);

        $att = $this->all('attendance');
        $weeks = [];
        for ($i = 7; $i >= 0; $i--) {
            $start = strtotime('monday this week -' . $i . ' week');
            $s = date('Y-m-d', $start);
            $e = date('Y-m-d', strtotime('+6 day', $start));
            $c = count(array_filter($att, function ($r) use ($s, $e) { return $r['service_date'] >= $s && $r['service_date'] <= $e; }));
            $weeks[] = ['label' => date('M j', $start), 'value' => $c];
        }

        $giving = $this->all('giving');
        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $ym = date('Y-m', strtotime('first day of -' . $i . ' month'));
            $sum = 0;
            foreach ($giving as $g) if (substr($g['given_at'], 0, 7) === $ym) $sum += (float)$g['amount'];
            $months[] = ['label' => date('M Y', strtotime($ym . '-01')), 'value' => round($sum, 2)];
        }
        $byType = [];
        foreach ($giving as $g) $byType[$g['type']] = ($byType[$g['type']] ?? 0) + (float)$g['amount'];
        $types = [];
        foreach ($byType as $k => $v) $types[] = ['label' => $k, 'value' => round($v, 2)];

        $mm = $this->all('ministry_members');
        $ministries = [];
        foreach ($this->all('ministries') as $min) {
            $c = count(array_filter($mm, function ($r) use ($min) { return (int)$r['ministry_id'] === (int)$min['id']; }));
            $ministries[] = ['label' => $min['name'], 'value' => $c];
        }

        $methods = [];
        foreach ($att as $a) $methods[$a['method']] = ($methods[$a['method']] ?? 0) + 1;
        $by = [];
        foreach ($methods as $k => $v) $by[] = ['label' => strtoupper($k), 'value' => $v];

        $members = $this->all('members');
        $this->out([
            'attendance_weekly' => $weeks,
            'giving_monthly'    => $months,
            'giving_by_type'    => $types,
            'ministry_sizes'    => $ministries,
            'attendance_method' => $by,
            'members_total'     => count($members),
            'members_active'    => count(array_filter($members, function ($r) { return $r['status'] === 'active'; })),
        ]);
    }

    // ------------------------------------------------------ NOTIFICATIONS
    public function my_notifications()
    {
        $uid = (int)$this->u['id'];
        $rows = array_values(array_filter($this->all('notifications'), function ($r) use ($uid) {
            return $r['user_id'] === null || (int)$r['user_id'] === $uid;
        }));
        usort($rows, function ($a, $b) { return $b['id'] <=> $a['id']; });
        $this->out($rows);
    }
}