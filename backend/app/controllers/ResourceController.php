<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * backend/app/controllers/ResourceController.php
 * Generic CRUD na may role permissions.
 *   GET  /api/resource?name=members
 *   POST /api/resource/save    {resource, id?, ...fields}
 *   POST /api/resource/delete  {resource, id}
 *
 * FIX: ang resource name ay galing na sa "resource" (body) o sa query string
 * (?resource= / ?name=), hindi na sa body "name", para hindi mag-collide
 * sa "name" field ng ministries.
 */
class ResourceController extends Controller
{
    private $u;
    private $R;

    public function __construct()
    {
        parent::__construct();
        date_default_timezone_set('Asia/Manila');
        $this->call->database();
        $this->call->helper('jwt');
        header('Content-Type: application/json');
        $this->u = require_auth();
        $this->R = $this->config();
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

    /**
     * Alamin kung anong resource ang tinutukoy.
     * Priority: body.resource > query ?resource > query ?name > body.name (kung valid resource lang)
     */
    private function res_name($in = [])
    {
        if (!empty($in['resource']) && is_string($in['resource'])) return $in['resource'];
        if (!empty($_GET['resource'])) return (string)$_GET['resource'];
        if (!empty($_GET['name']))     return (string)$_GET['name'];
        if (!empty($in['name']) && is_string($in['name']) && isset($this->R[$in['name']])) return $in['name'];
        return '';
    }

    private function config()
    {
        $any = ['admin', 'staff', 'ministry_leader', 'member'];
        $mgr = ['admin', 'staff', 'ministry_leader'];

        return [
            'users' => [
                'table' => 'users', 'read' => ['admin', 'staff'], 'write' => [],
                'fields' => [], 'hide' => ['password'], 'sort' => ['full_name', 'asc'],
            ],
            'members' => [
                'table' => 'members', 'read' => $mgr, 'write' => ['admin', 'staff'],
                'fields' => ['full_name', 'email', 'phone', 'address', 'birthdate', 'family_name', 'status'],
                'required' => ['full_name'],
                'nullable' => ['email', 'phone', 'address', 'birthdate', 'family_name'],
                'defaults' => ['status' => 'active'],
                'sort' => ['full_name', 'asc'],
            ],
            'ministries' => [
                'table' => 'ministries', 'read' => $any, 'write' => ['admin'],
                'fields' => ['name', 'type', 'description', 'leader_user_id'],
                'required' => ['name', 'type'],
                'nullable' => ['description', 'leader_user_id'],
                'join' => ['leader_user_id' => ['users', 'full_name', 'leader_name']],
                'sort' => ['name', 'asc'],
            ],
            'ministry_members' => [
                'table' => 'ministry_members', 'read' => $mgr, 'write' => ['admin'],
                'leader_write' => true, 'scope' => 'ministry_id', 'scope_read' => true,
                'fields' => ['ministry_id', 'member_id', 'role', 'status'],
                'required' => ['ministry_id', 'member_id'],
                'defaults' => ['role' => 'member', 'status' => 'active'],
                'unique' => ['ministry_id', 'member_id'],
                'join' => [
                    'ministry_id' => ['ministries', 'name', 'ministry_name'],
                    'member_id'   => ['members', 'full_name', 'member_name'],
                ],
                'sort' => ['id', 'desc'],
            ],
            'ministry_schedules' => [
                'table' => 'ministry_schedules', 'read' => $mgr, 'write' => ['admin', 'staff'],
                'leader_write' => true, 'scope' => 'ministry_id', 'scope_read' => true,
                'fields' => ['ministry_id', 'title', 'schedule_date', 'start_time', 'end_time', 'location', 'volunteer_member_id'],
                'required' => ['ministry_id', 'title', 'schedule_date', 'start_time', 'end_time'],
                'nullable' => ['location', 'volunteer_member_id'],
                'join' => [
                    'ministry_id'         => ['ministries', 'name', 'ministry_name'],
                    'volunteer_member_id' => ['members', 'full_name', 'volunteer_name'],
                ],
                'sort' => ['schedule_date', 'asc'],
            ],
            'activities' => [
                'table' => 'activities', 'read' => $mgr, 'write' => ['admin'],
                'leader_write' => true, 'scope' => 'ministry_id', 'scope_read' => true,
                'fields' => ['ministry_id', 'title', 'description', 'due_date', 'status'],
                'required' => ['ministry_id', 'title'],
                'nullable' => ['description', 'due_date'],
                'defaults' => ['status' => 'planned'],
                'join' => ['ministry_id' => ['ministries', 'name', 'ministry_name']],
                'sort' => ['id', 'desc'],
            ],
            'events' => [
                'table' => 'events', 'read' => $any, 'write' => ['admin', 'staff'],
                'leader_write' => true, 'scope' => 'ministry_id', 'scope_read' => false,
                'fields' => ['title', 'description', 'event_date', 'start_time', 'end_time', 'location', 'event_type', 'ministry_id', 'lat', 'lng', 'radius_m'],
                'required' => ['title', 'event_date', 'event_type'],
                'nullable' => ['description', 'start_time', 'end_time', 'location', 'ministry_id', 'lat', 'lng'],
                'defaults' => ['event_type' => 'internal', 'radius_m' => 100],
                'created_by' => true,
                'join' => ['ministry_id' => ['ministries', 'name', 'ministry_name']],
                'sort' => ['event_date', 'asc'],
            ],
            'rsvps' => [
                'table' => 'rsvps', 'read' => $mgr, 'write' => ['admin'],
                'own' => 'member_id', 'member_create' => true,
                'member_fields' => ['event_id', 'response'],
                'fields' => ['event_id', 'member_id', 'response'],
                'required' => ['event_id', 'response'],
                'upsert' => ['event_id', 'member_id'],
                'join' => [
                    'member_id' => ['members', 'full_name', 'member_name'],
                    'event_id'  => ['events', 'title', 'event_title'],
                ],
                'sort' => ['id', 'desc'],
            ],
            'attendance' => [
                'table' => 'attendance', 'read' => $mgr, 'write' => ['admin', 'staff'],
                'own' => 'member_id',
                'fields' => ['member_id', 'event_id', 'service_date', 'method'],
                'required' => ['member_id'],
                'defaults' => ['event_id' => 0, 'service_date' => '__today__', 'method' => 'manual'],
                'unique' => ['member_id', 'service_date', 'event_id'],
                'join' => [
                    'member_id' => ['members', 'full_name', 'member_name'],
                    'event_id'  => ['events', 'title', 'event_title'],
                ],
                'sort' => ['service_date', 'desc'],
            ],
            'giving' => [
                'table' => 'giving', 'read' => ['admin', 'staff'], 'write' => ['admin', 'staff'],
                'fields' => ['member_id', 'amount', 'type', 'given_at', 'notes'],
                'required' => ['amount', 'type', 'given_at'],
                'nullable' => ['member_id', 'notes'],
                'defaults' => ['given_at' => '__today__'],
                'join' => ['member_id' => ['members', 'full_name', 'member_name']],
                'sort' => ['given_at', 'desc'],
            ],
            'announcements' => [
                'table' => 'announcements', 'read' => $any, 'write' => ['admin', 'staff'],
                'fields' => ['title', 'body'], 'required' => ['title', 'body'],
                'created_by' => true, 'sort' => ['id', 'desc'],
            ],
            'sermons' => [
                'table' => 'sermons', 'read' => $any, 'write' => ['admin', 'staff'],
                'fields' => ['title', 'preacher', 'sermon_date', 'audio_url', 'transcript', 'summary'],
                'required' => ['title', 'sermon_date'],
                'nullable' => ['preacher', 'audio_url', 'transcript', 'summary'],
                'sort' => ['sermon_date', 'desc'],
            ],
            'prayer_requests' => [
                'table' => 'prayer_requests', 'read' => ['admin'], 'write' => ['admin'],
                'own' => 'member_id', 'member_create' => true,
                'member_fields' => ['request'],
                'fields' => ['member_id', 'request', 'priority', 'status'],
                'required' => ['request'],
                'defaults' => ['priority' => 'general', 'status' => 'open'],
                'join' => ['member_id' => ['members', 'full_name', 'member_name']],
                'sort' => ['id', 'desc'],
            ],
            'notifications' => [
                'table' => 'notifications', 'read' => ['admin', 'staff'], 'write' => ['admin', 'staff'],
                'fields' => ['user_id', 'title', 'message'],
                'required' => ['title', 'message'],
                'nullable' => ['user_id'],
                'join' => ['user_id' => ['users', 'full_name', 'recipient_name']],
                'sort' => ['id', 'desc'],
            ],
        ];
    }

    private function cfg($name)
    {
        if (!$name || !isset($this->R[$name])) $this->out(['error' => 'Unknown resource'], 404);
        return $this->R[$name];
    }

    private function all($table)
    {
        return $this->db->table($table)->get_all() ?: [];
    }

    private function mine()
    {
        $rows = $this->db->table('ministries')->where('leader_user_id', $this->u['id'])->get_all() ?: [];
        return array_map(function ($r) { return (int)$r['id']; }, $rows);
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

    private function t($v)
    {
        return substr(((string)$v) . ':00', 0, 8);
    }

    // ---------------------------------------------------------------- READ
    public function index()
    {
        $name = $this->res_name();
        $c    = $this->cfg($name);
        $role = $this->u['role'];
        $rows = $this->all($c['table']);

        $canRead = in_array($role, $c['read'], true);
        if (!$canRead) {
            if ($role === 'member' && !empty($c['own'])) {
                $mid  = (int)$this->member_row()['id'];
                $rows = array_values(array_filter($rows, function ($r) use ($c, $mid) {
                    return (int)$r[$c['own']] === $mid;
                }));
            } else {
                $this->out(['error' => 'Forbidden'], 403);
            }
        }

        if ($role === 'ministry_leader' && $canRead) {
            $mine = $this->mine();
            if (!empty($c['scope']) && !empty($c['scope_read'])) {
                $rows = array_values(array_filter($rows, function ($r) use ($c, $mine) {
                    return in_array((int)$r[$c['scope']], $mine, true);
                }));
            }
            if ($name === 'attendance') {
                $ids = [];
                foreach ($this->all('ministry_members') as $mm) {
                    if (in_array((int)$mm['ministry_id'], $mine, true)) $ids[] = (int)$mm['member_id'];
                }
                $rows = array_values(array_filter($rows, function ($r) use ($ids) {
                    return in_array((int)$r['member_id'], $ids, true);
                }));
            }
            if ($name === 'ministries' && !empty($_GET['mine'])) {
                $rows = array_values(array_filter($rows, function ($r) use ($mine) {
                    return in_array((int)$r['id'], $mine, true);
                }));
            }
        }

        foreach (($c['join'] ?? []) as $fk => $j) {
            $map = [];
            foreach ($this->all($j[0]) as $r) $map[$r['id']] = $r[$j[1]];
            foreach ($rows as &$row) $row[$j[2]] = $map[$row[$fk]] ?? null;
            unset($row);
        }

        foreach (($c['hide'] ?? []) as $h) {
            foreach ($rows as &$row) unset($row[$h]);
            unset($row);
        }

        if (!empty($c['sort'])) {
            $k = $c['sort'][0]; $dir = $c['sort'][1];
            usort($rows, function ($a, $b) use ($k, $dir) {
                return $dir === 'desc' ? ($b[$k] <=> $a[$k]) : ($a[$k] <=> $b[$k]);
            });
        }

        $this->out($rows);
    }

    // ---------------------------------------------------------------- SAVE
    public function save()
    {
        $in   = $this->input();
        $name = $this->res_name($in);
        $c    = $this->cfg($name);
        $role = $this->u['role'];
        $id   = !empty($in['id']) ? (int)$in['id'] : null;
        $mine = null;
        $own  = null;
        $fieldsAllowed = $c['fields'];

        if (!in_array($role, $c['write'], true)) {
            if ($role === 'ministry_leader' && !empty($c['leader_write'])) {
                $mine = $this->mine();
            } elseif ($role === 'member' && !empty($c['member_create'])) {
                if ($id) $this->out(['error' => 'Forbidden'], 403);
                $own = (int)$this->member_row()['id'];
                $fieldsAllowed = $c['member_fields'];
            } else {
                $this->out(['error' => 'Forbidden'], 403);
            }
        }

        $data = [];
        foreach ($fieldsAllowed as $f) {
            if (!array_key_exists($f, $in)) continue;
            $v = $in[$f];
            if (is_string($v)) $v = trim($v);
            if ($v === '' && in_array($f, $c['nullable'] ?? [], true)) $v = null;
            $data[$f] = $v;
        }

        if ($own !== null) $data['member_id'] = $own;

        // Defaults at required (create lang)
        if (!$id) {
            foreach (($c['defaults'] ?? []) as $k => $v) {
                if (!isset($data[$k]) || $data[$k] === '') {
                    $data[$k] = ($v === '__today__') ? date('Y-m-d') : $v;
                }
            }
            foreach (($c['required'] ?? []) as $f) {
                if (!isset($data[$f]) || $data[$f] === '') {
                    $this->out(['error' => ucfirst(str_replace('_', ' ', $f)) . ' is required'], 422);
                }
            }
        }

        // Ministry leader scope
        if ($mine !== null) {
            if ($id) {
                $existing = $this->db->table($c['table'])->where('id', $id)->get();
                if (!$existing || !in_array((int)$existing['ministry_id'], $mine, true)) {
                    $this->out(['error' => 'Not your ministry'], 403);
                }
            }
            if (!$id || isset($data['ministry_id'])) {
                if (!in_array((int)($data['ministry_id'] ?? 0), $mine, true)) {
                    $this->out(['error' => 'You can only manage your own ministry'], 403);
                }
            }
        }

        // Upsert (rsvps)
        if (!$id && !empty($c['upsert'])) {
            $q = $this->db->table($c['table']);
            foreach ($c['upsert'] as $f) $q = $q->where($f, $data[$f] ?? null);
            $found = $q->get();
            if ($found) $id = (int)$found['id'];
        }

        // Unique check (create)
        if (!$id && !empty($c['unique'])) {
            $q = $this->db->table($c['table']);
            foreach ($c['unique'] as $f) $q = $q->where($f, $data[$f] ?? null);
            if ($q->get()) $this->out(['error' => 'Record already exists'], 409);
        }

        // Hooks
        if ($name === 'members' && !$id) {
            $data['member_code'] = 'ROL-' . strtoupper(substr(md5(uniqid('', true)), 0, 6));
        }
        if (!$id && !empty($c['created_by'])) $data['created_by'] = $this->u['id'];
        if ($name === 'ministry_schedules') $this->check_conflict($data, $id);

        if ($id) {
            $this->db->table($c['table'])->where('id', $id)->update($data);
        } else {
            $this->db->table($c['table'])->insert($data);
        }
        $this->out(['success' => true]);
    }

    private function check_conflict($data, $id)
    {
        if (empty($data['volunteer_member_id']) || empty($data['schedule_date']) || empty($data['start_time']) || empty($data['end_time'])) return;

        $rows = $this->db->table('ministry_schedules')
            ->where('volunteer_member_id', $data['volunteer_member_id'])
            ->where('schedule_date', $data['schedule_date'])
            ->get_all() ?: [];

        foreach ($rows as $r) {
            if ($id && (int)$r['id'] === (int)$id) continue;
            if ($this->t($data['start_time']) < $this->t($r['end_time']) && $this->t($data['end_time']) > $this->t($r['start_time'])) {
                $msg = 'Schedule conflict: volunteer is already assigned to "' . $r['title'] . '" ('
                     . substr($r['start_time'], 0, 5) . '-' . substr($r['end_time'], 0, 5) . ') on ' . $r['schedule_date'] . '.';

                $this->db->table('notifications')->insert([
                    'user_id' => $this->u['id'], 'title' => 'Schedule conflict alert', 'message' => $msg,
                ]);
                $min = $this->db->table('ministries')->where('id', $data['ministry_id'] ?? 0)->get();
                if ($min && !empty($min['leader_user_id']) && (int)$min['leader_user_id'] !== (int)$this->u['id']) {
                    $this->db->table('notifications')->insert([
                        'user_id' => $min['leader_user_id'], 'title' => 'Schedule conflict alert', 'message' => $msg,
                    ]);
                }
                $this->out(['error' => $msg], 409);
            }
        }
    }

    // -------------------------------------------------------------- DELETE
    public function delete()
    {
        $in   = $this->input();
        $c    = $this->cfg($this->res_name($in));
        $role = $this->u['role'];
        $id   = (int)($in['id'] ?? 0);
        if (!$id) $this->out(['error' => 'id required'], 422);

        // Secretary (staff) ay hindi pwedeng mag-delete ng kahit anong record.
        if ($role === 'staff') {
            $this->out(['error' => 'Secretary cannot delete records'], 403);
        }

        if (!in_array($role, $c['write'], true)) {
            if ($role === 'ministry_leader' && !empty($c['leader_write'])) {
                $existing = $this->db->table($c['table'])->where('id', $id)->get();
                if (!$existing || !in_array((int)$existing['ministry_id'], $this->mine(), true)) {
                    $this->out(['error' => 'Not your ministry'], 403);
                }
            } else {
                $this->out(['error' => 'Forbidden'], 403);
            }
        }

        $this->db->table($c['table'])->where('id', $id)->delete();
        $this->out(['success' => true]);
    }
}