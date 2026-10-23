<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * POST /api/translate   (route: TranslateController::batch)
 * Body: { "lang": "tl" | "ceb" | "ilo", "texts": ["Login", "Welcome", ...] }
 * Returns: { "translations": { "Login": "...", ... } }
 *
 * Gumagamit ng parehong Ai library at API keys ng chatbot.
 */
class TranslateController extends Controller
{
    private $langs = ['tl' => 'Tagalog', 'ceb' => 'Cebuano', 'ilo' => 'Ilocano'];

    const CHUNK = 8;

    public function __construct()
    {
        parent::__construct();
        ob_start(); // para hindi masira ang JSON ng PHP notices/warnings
        require_once __DIR__ . '/../libraries/Ai.php';
        $this->call->database();
    }

    private function json($data, $code = 200)
    {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        exit;
    }

    public function batch()
    {
        try {
            $this->run();
        } catch (Throwable $e) {
            error_log('[translate] ' . $e->getMessage());
            $this->json([
                'error'  => 'Server error',
                'detail' => $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine(),
            ], 500);
        }
    }

    private function run()
    {
        @set_time_limit(120);

        $raw  = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body) || !$body) {
            $body = $_POST;
        }
        $lang  = $body['lang'] ?? '';
        $texts = $body['texts'] ?? [];
        if (is_string($texts)) {
            $texts = json_decode($texts, true);
        }

        if (!isset($this->langs[$lang]) || !is_array($texts)) {
            $this->json(['error' => 'Invalid request', 'lang' => $lang], 400);
        }

        $texts = array_values(array_unique(array_filter($texts, function ($t) {
            return is_string($t) && trim($t) !== '' && mb_strlen($t) <= 1000;
        })));
        $texts = array_slice($texts, 0, 50);

        $result  = [];
        $missing = [];

        foreach ($texts as $text) {
            $row = $this->db->table('translations')
                ->where('lang', $lang)
                ->where('hash', sha1($text))
                ->get();
            if ($row) {
                $result[$text] = $row['translated'];
            } else {
                $missing[] = $text;
            }
        }

        if ($missing) {
            $ai       = new Ai();
            $lastErr  = '';
            $gotAny   = false;

            foreach (array_chunk($missing, self::CHUNK) as $chunk) {
                $res = $this->translateChunk($ai, $chunk, $this->langs[$lang]);
                if (!$res['ok']) {
                    $lastErr = $res['error'];
                    continue; // subukan ang susunod na chunk
                }
                foreach ($chunk as $i => $text) {
                    $out = $res['data'][$i] ?? null;
                    if (!is_string($out) || trim($out) === '') {
                        continue;
                    }
                    $gotAny = true;
                    $result[$text] = $out;
                    try {
                        $this->db->table('translations')->insert([
                            'lang'       => $lang,
                            'hash'       => sha1($text),
                            'source'     => $text,
                            'translated' => $out,
                        ]);
                    } catch (Throwable $e) {
                        // duplicate mula sa sabay na request, ignore
                    }
                }
            }

            if (!$gotAny && !$result) {
                $this->json(['error' => 'AI translate failed', 'detail' => $lastErr], 502);
            }
        }

        $this->json(['translations' => $result]);
    }

    // Kapag pumalya ang chunk, hatiin sa dalawa at subukan ulit (isang beses)
    private function translateChunk($ai, array $chunk, $langName, $depth = 0)
    {
        $res = $this->aiTranslate($ai, $chunk, $langName);
        if ($res['ok'] || $depth >= 1 || count($chunk) < 2) {
            return $res;
        }

        $half = (int) ceil(count($chunk) / 2);
        $a = $this->translateChunk($ai, array_slice($chunk, 0, $half), $langName, $depth + 1);
        $b = $this->translateChunk($ai, array_slice($chunk, $half), $langName, $depth + 1);

        if (!$a['ok'] && !$b['ok']) {
            return $a;
        }
        $data = [];
        if ($a['ok']) {
            foreach ($a['data'] as $k => $v) {
                $data[$k] = $v;
            }
        }
        if ($b['ok']) {
            foreach ($b['data'] as $k => $v) {
                $data[$k + $half] = $v;
            }
        }
        return ['ok' => true, 'data' => $data];
    }

    private function aiTranslate($ai, array $items, $langName)
    {
        $payload = [];
        foreach ($items as $i => $text) {
            $payload[(string) $i] = $text;
        }

        $system = "You translate website text for a church website from English to {$langName}. "
            . "The user message is a JSON object: keys are ids, values are English strings. "
            . "Return ONLY a JSON object with the SAME keys and each value translated to {$langName}. "
            . "Keep placeholders like {name} and {{name}}, HTML tags, numbers, dates, URLs, emails and "
            . "proper names (River of Life, Alvin Jester Culla) unchanged. Use natural, respectful wording. "
            . "No explanations, no markdown, no code fences.";

        $errors = [];
        $result = $ai->ask_with_fallback(
            $ai->default_provider(),
            $system,
            json_encode($payload, JSON_UNESCAPED_UNICODE),
            $errors
        );

        if (!$result) {
            return ['ok' => false, 'error' => 'AI failed: ' . implode(' | ', $errors)];
        }

        $content = trim((string) $result['answer']);
        $clean   = trim(preg_replace('/^```(?:json)?|```$/m', '', $content));
        $out     = [];

        // Tanggapin ang object {"0":"..."} O array ["..."] galing sa AI
        $decoded = json_decode($clean, true);
        if (!is_array($decoded)) {
            $s = strpos($clean, '{');
            $e = strrpos($clean, '}');
            if ($s !== false && $e !== false && $e > $s) {
                $decoded = json_decode(substr($clean, $s, $e - $s + 1), true);
            }
        }
        if (!is_array($decoded)) {
            $s = strpos($clean, '[');
            $e = strrpos($clean, ']');
            if ($s !== false && $e !== false && $e > $s) {
                $decoded = json_decode(substr($clean, $s, $e - $s + 1), true);
            }
        }

        if (is_array($decoded)) {
            $isList = $decoded === [] || array_keys($decoded) === range(0, count($decoded) - 1);
            if (!$isList || count($decoded) === count($items)) {
                foreach ($decoded as $k => $v) {
                    if (is_string($v)) {
                        $out[(int) $k] = $v;
                    }
                }
            }
        } elseif (preg_match_all('/"(\\d+)"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"/u', $content, $m, PREG_SET_ORDER)) {
            // Putol ang JSON? Kunin pa rin ang kumpletong mga entry
            foreach ($m as $row) {
                $val = json_decode('"' . $row[2] . '"');
                if (is_string($val)) {
                    $out[(int) $row[1]] = $val;
                }
            }
        }

        if (!$out) {
            return [
                'ok'    => false,
                'error' => 'Bad AI output (len ' . strlen($content) . '): '
                    . substr($content, 0, 150) . ' ... ' . substr($content, -100),
            ];
        }
        return ['ok' => true, 'data' => $out];
    }
}