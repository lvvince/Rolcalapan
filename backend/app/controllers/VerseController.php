<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Save as: app/controllers/VerseController.php
 * Public endpoint: GET /api/verse/daily?portal=admin|secretary|leader|member|home
 */
class VerseController extends Controller
{
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
    }

    public function daily()
    {
        header('Content-Type: application/json');

        $verses = $this->db->table('verses')
            ->where('is_active', 1)
            ->order_by('id', 'ASC')
            ->get_all();

        if (empty($verses)) {
            echo json_encode(['success' => false, 'message' => 'No verses found']);
            return;
        }

        $total  = count($verses);
        $portal = isset($_GET['portal']) ? strtolower($_GET['portal']) : 'home';
        $portal = preg_replace('/[^a-z_]/', '', $portal);
        if ($portal === '') $portal = 'home';

        // Magkaiba ang verse kada portal, pareho sa buong araw (Philippine time)
        $offset = abs(crc32($portal)) % $total;
        $now    = new DateTime('now', new DateTimeZone('Asia/Manila'));
        $index  = ((int) $now->format('z') + $offset) % $total;
        $v      = $verses[$index];

        echo json_encode([
            'success' => true,
            'data' => [
                'reference' => $v['reference'],
                'text_en'   => $v['text_en'],
                'text_tl'   => $v['text_tl'],
            ],
        ]);
    }
}