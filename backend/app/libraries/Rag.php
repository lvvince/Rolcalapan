<?php

/**
 * Simple RAG retriever (BM25 keyword ranking + Tagalog->English synonyms).
 * Walang external vector DB na kailangan.
 */
class Rag
{
    private $stop = [
        // Tagalog
        'ang', 'ng', 'sa', 'na', 'ay', 'mga', 'ba', 'po', 'opo', 'ko', 'ako', 'ano', 'saan', 'nasaan',
        'kailan', 'paano', 'pwede', 'puwede', 'anong', 'saang', 'yung', 'yong', 'may', 'meron', 'mayroon',
        'mo', 'ka', 'namin', 'natin', 'ito', 'iyan', 'yan', 'dito', 'doon', 'diyan', 'kayo', 'niyo', 'nyo',
        'kami', 'tayo', 'ikaw', 'lang', 'naman', 'din', 'rin', 'kung', 'para', 'at', 'si', 'ni', 'kay',
        'nga', 'pa', 'pag', 'kapag', 'mag', 'sino', 'bakit', 'hindi', 'ba', 'kumusta', 'magandang',
        // English
        'the', 'a', 'an', 'is', 'are', 'of', 'to', 'in', 'at', 'what', 'when', 'where', 'how', 'do',
        'does', 'i', 'you', 'we', 'for', 'and', 'or', 'me', 'my', 'can', 'be', 'there', 'any', 'your',
        'our', 'this', 'that', 'it', 'on', 'with', 'tell', 'about', 'please', 'pls', 'hi', 'hello',
        'who', 'why', 'which', 'have', 'has', 'will', 'would', 'could', 'should',
    ];

    // Tagalog (o ibang salita) -> mga English na termino sa knowledge base
    private $syn = [
        'lokasyon' => ['location', 'located', 'address'],
        'lugar' => ['location', 'located', 'address'],
        'address' => ['location', 'located'],
        'location' => ['located', 'address'],
        'located' => ['location', 'address'],
        'matatagpuan' => ['location', 'located', 'address'],
        'direksyon' => ['location', 'address', 'direction'],
        'oras' => ['time', 'schedule', 'service'],
        'iskedyul' => ['schedule', 'time', 'service'],
        'schedule' => ['time', 'service'],
        'simba' => ['service', 'worship', 'sunday', 'schedule'],
        'sumimba' => ['service', 'worship', 'sunday', 'schedule'],
        'pagsamba' => ['service', 'worship', 'sunday', 'schedule'],
        'worship' => ['service', 'sunday'],
        'linggo' => ['sunday'],
        'sabado' => ['saturday'],
        'pastor' => ['pastor'],
        'pastol' => ['pastor'],
        'telepono' => ['contact', 'phone', 'number'],
        'numero' => ['contact', 'phone', 'number'],
        'kontak' => ['contact', 'phone', 'email'],
        'tawagan' => ['contact', 'phone', 'number'],
        'sulat' => ['email', 'contact'],
        'bumisita' => ['visit', 'visitor', 'first'],
        'bisita' => ['visit', 'visitor', 'first'],
        'ministeryo' => ['ministry', 'ministries'],
        'ministri' => ['ministry', 'ministries'],
        'kabataan' => ['youth'],
        'bata' => ['kids', 'children', 'kid'],
        'anak' => ['kids', 'children', 'kid'],
        'bautismo' => ['baptism', 'baptized'],
        'binyag' => ['baptism', 'baptized'],
        'kasal' => ['wedding', 'marriage'],
        'donasyon' => ['give', 'giving', 'offering', 'tithes', 'donate'],
        'ikapu' => ['tithes', 'giving', 'offering'],
        'handog' => ['offering', 'giving', 'tithes'],
        'dasal' => ['prayer', 'pray'],
        'panalangin' => ['prayer', 'pray'],
        'bibliya' => ['bible'],
        'biblia' => ['bible'],
        'sumali' => ['join', 'member', 'membership'],
        'sali' => ['join', 'member', 'membership'],
        'miyembro' => ['member', 'membership', 'join'],
        'libre' => ['free', 'cost', 'fee'],
        'bayad' => ['cost', 'fee', 'free'],
        'magkano' => ['cost', 'fee', 'free'],
        'pangalan' => ['name'],
        'tungkol' => ['about'],
        'fb' => ['facebook', 'page'],
        'facebook' => ['page', 'online'],
        'pamilya' => ['family'],
        'paradahan' => ['parking'],
    ];

    private function norm($w)
    {
        // Simpleng plural -> singular (services -> service), pareho sa question at KB
        if (mb_strlen($w, 'UTF-8') > 3 && substr($w, -1) === 's' && substr($w, -2) !== 'ss') {
            return substr($w, 0, -1);
        }
        return $w;
    }

    private function tokens($text, $expand = false)
    {
        $text = mb_strtolower((string)$text, 'UTF-8');
        $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text);
        $parts = preg_split('/\s+/u', trim($text), -1, PREG_SPLIT_NO_EMPTY);
        $out = [];
        foreach ($parts as $p) {
            if (mb_strlen($p, 'UTF-8') < 2 || in_array($p, $this->stop, true)) {
                continue;
            }
            $out[] = $this->norm($p);
            if ($expand && isset($this->syn[$p])) {
                foreach ($this->syn[$p] as $s) {
                    $out[] = $this->norm($s);
                }
            }
        }
        return $out;
    }

    /**
     * @param string $question
     * @param array  $rows  mga row ng knowledge_base
     * @param int    $k     ilang top result
     * @return array [['score' => float, 'row' => array], ...]
     */
    public function retrieve($question, $rows, $k = 3)
    {
        $q = array_unique($this->tokens($question, true));
        if (!$q || !$rows) {
            return [];
        }

        $docs = [];
        $df = [];
        $total = 0;
        foreach ($rows as $i => $r) {
            $r = (array)$r;
            // Dalawang beses ang question para mas mabigat ang timbang kaysa answer
            $t = $this->tokens(
                ($r['question'] ?? '') . ' ' . ($r['question'] ?? '') . ' ' .
                ($r['answer'] ?? '') . ' ' . ($r['intent'] ?? '')
            );
            $docs[$i] = ['row' => $r, 'tf' => array_count_values($t), 'len' => count($t)];
            $total += count($t);
            foreach (array_keys($docs[$i]['tf']) as $w) {
                $df[$w] = ($df[$w] ?? 0) + 1;
            }
        }

        $n = count($docs);
        $avg = max($total / $n, 1);
        $k1 = 1.5;
        $b = 0.75;
        $scored = [];

        foreach ($docs as $d) {
            $s = 0;
            foreach ($q as $w) {
                if (!isset($d['tf'][$w])) {
                    continue;
                }
                $idf = log(1 + ($n - $df[$w] + 0.5) / ($df[$w] + 0.5));
                $tf = $d['tf'][$w];
                $s += $idf * ($tf * ($k1 + 1)) / ($tf + $k1 * (1 - $b + $b * $d['len'] / $avg));
            }
            if ($s > 0) {
                $scored[] = ['score' => $s, 'row' => $d['row']];
            }
        }

        usort($scored, function ($x, $y) {
            return $y['score'] <=> $x['score'];
        });

        return array_slice($scored, 0, $k);
    }
}