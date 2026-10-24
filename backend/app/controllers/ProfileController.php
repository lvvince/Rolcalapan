<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ProfileController extends Controller
{
    public function upload_picture()
    {
        header('Content-Type: application/json');

        // PALITAN: kunin ang user id sa auth/token mo
        $user_id = $this->session->userdata('user_id');
        if (!$user_id) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        if (!isset($_FILES['picture']) || $_FILES['picture']['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['error' => 'No file uploaded']);
            return;
        }

        $file = $_FILES['picture'];
        $maxSize = 2 * 1024 * 1024; // 2MB
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);

        if (!isset($allowed[$mime])) {
            http_response_code(400);
            echo json_encode(['error' => 'Only JPG, PNG, WEBP allowed']);
            return;
        }
        if ($file['size'] > $maxSize) {
            http_response_code(400);
            echo json_encode(['error' => 'Max 2MB only']);
            return;
        }

        $dir = __DIR__ . '/../../public/uploads/profiles/';
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $filename = 'user_' . $user_id . '_' . time() . '.' . $allowed[$mime];
        if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save file']);
            return;
        }

        $path = '/uploads/profiles/' . $filename;

        // PALITAN kung iba ang DB library/table name mo
        $this->db->table('users')->where('id', $user_id)->update(['profile_pic' => $path]);

        echo json_encode(['success' => true, 'profile_pic' => $path]);
    }
}