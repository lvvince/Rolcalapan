<?php

class TranslationModel extends Model
{
    public function __construct()
    {
        parent::__construct();
    }

    // Return: [hash => translated]
    public function find_many($lang, array $hashes)
    {
        if (!$hashes) {
            return [];
        }
        $marks = implode(',', array_fill(0, count($hashes), '?'));
        $stmt = $this->db->raw(
            "SELECT hash, translated FROM translations WHERE lang = ? AND hash IN ($marks)",
            array_merge([$lang], array_values($hashes))
        );
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[$r['hash']] = $r['translated'];
        }
        return $out;
    }

    // $items: [hash => ['source' => ..., 'translated' => ...]]
    public function save_many($lang, array $items)
    {
        foreach ($items as $hash => $it) {
            $this->db->raw(
                "INSERT INTO translations (lang, hash, source, translated) VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE translated = VALUES(translated)",
                [$lang, $hash, $it['source'], $it['translated']]
            );
        }
    }
}