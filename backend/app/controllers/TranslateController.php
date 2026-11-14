<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * POST /api/translate   (route: TranslateController::batch)
 * Body: { "lang": "tl" | "ceb" | "ilo" | "hil", "texts": ["Login", "Welcome", ...] }
 * Returns: { "translations": { "Login": "...", ... } }
 *
 * - tl, ceb : Google Apps Script (LanguageApp)
 * - ilo, hil: diretso mula sa PHP papunta sa libreng Google Translate endpoint
 *             (hinaharang ng Google ang Apps Script servers, HTTP 429)
 * Env (para sa tl at ceb):
 *   TRANSLATE_GAS_URL   = https://script.google.com/macros/s/XXXX/exec
 *   TRANSLATE_GAS_TOKEN = parehong secret ng TOKEN sa Code.gs
 */
class TranslateController extends Controller
{
    private $langs = [
        'tl'  => 'Tagalog',
        'ceb' => 'Cebuano',
        'ilo' => 'Ilocano',
        'hil' => 'Hiligaynon',
    ];

    // Mga language na diretso sa web endpoint (hindi dumadaan sa Apps Script)
    private $direct = ['ilo', 'hil'];

    // Glossary: eksaktong salin para sa mga karaniwang label (hindi na dadaan sa Google)
    private $glossary = [
        'tl' => [
            'prayer requests' => 'Mga Kahilingan sa Panalangin',
            'ministries'      => 'Mga Ministeryo',
            'sermons'         => 'Mga Sermon',
            'announcements'   => 'Mga Anunsyo',
            'events'          => 'Mga Event',
            'giving'          => 'Pagbibigay',
            'members'         => 'Mga Miyembro',
            'language'        => 'Wika',
            'save'            => 'I-save',
            'cancel'          => 'Kanselahin',
            'notifications'   => 'Mga Abiso',
        ],
        'ceb' => [
            'prayer requests' => 'Mga Hangyo sa Pag-ampo',
            'ministries'      => 'Mga Ministeryo',
            'sermons'         => 'Mga Sermon',
            'announcements'   => 'Mga Pahibalo',
            'events'          => 'Mga Kalihokan',
            'giving'          => 'Paghatag',
            'members'         => 'Mga Miyembro',
            'save'            => 'I-save',
        ],
        'ilo' => [
            'prayer requests' => 'Dagiti Dawat a Kararag',
            'announcements'   => 'Dagiti Pakaammo',
            'members'         => 'Dagiti Miembro',
            'language'        => 'Pagsasao',
        ],
        // Hiligaynon: maikli lang muna, ipa-check sa native speaker bago dagdagan
        'hil' => [
            'ministries'      => 'Mga Ministeryo',
            'sermons'         => 'Mga Sermon',
            'announcements'   => 'Mga Pahibalo',
            'giving'          => 'Paghatag',
            'members'         => 'Mga Miyembro',
            'language'        => 'Pinulongan',
            'save'            => 'I-save',
        ],
    ];

    public function __construct()
    {
        parent::__construct();
        ob_start(); // para hindi masira ang JSON ng PHP notices/warnings
        $this->call->database();
    }

    private function env($key)
    {
        $v = getenv($key);
        if ($v === false || $v === '') {
            $v = $_ENV[$key] ?? ($_SERVER[$key] ?? '');
        }
        return (string)$v;
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
            // 1) Glossary (eksaktong label)
            $key = mb_strtolower(trim($text));
            if (isset($this->glossary[$lang][$key])) {
                $result[$text] = $this->glossary[$lang][$key];
                continue;
            }

            // 2) Cache sa database
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
            $res = in_array($lang, $this->direct, true)
                ? $this->webTranslateBatch($missing, $lang)
                : $this->gasTranslate($missing, $lang);

            if (!$res['ok'] && !$result) {
                $this->json(['error' => 'Translate failed', 'detail' => $res['error']], 502);
            }

            if ($res['ok']) {
                foreach ($missing as $i => $text) {
                    $out = $res['data'][$i] ?? null;
                    if (!is_string($out) || trim($out) === '') {
                        continue; // pumalya ang isang ito, huwag i-cache
                    }
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
        }

        $this->json(['translations' => $result]);
    }

    /* ------------------------------------------------------------------
     * ilo / hil: libreng web endpoint ng Google Translate (hindi opisyal)
     * ------------------------------------------------------------------ */
    private function webTranslateBatch(array $items, $lang)
    {
        $data  = [];
        $codes = [];
        $last  = '';

        foreach ($items as $text) {
            $r = $this->webTranslateOne((string)$text, $lang);
            $data[]  = $r['text'];
            $codes[] = $r['code'];
            if ($r['error']) {
                $last = $r['error'];
            }
            usleep(120000); // 0.12s, iwas rate limit
        }

        $good = array_filter($data, function ($d) {
            return is_string($d) && $d !== '';
        });
        if (!$good && $last !== '') {
            return ['ok' => false, 'error' => $last];
        }
        return ['ok' => true, 'data' => $data];
    }

    private function webTranslateOne($text, $lang)
    {
        $fail = function ($msg, $code = 0) {
            return ['text' => null, 'code' => $code, 'error' => $msg];
        };

        if (trim($text) === '') {
            return $fail('');
        }

        // Protektahan ang {name}, {{name}} at HTML tags
        $ph = [];
        $masked = preg_replace_callback('/\{\{[^}]*\}\}|\{[^}]*\}|<[^>]+>/', function ($m) use (&$ph) {
            $ph[] = $m[0];
            return '§' . (count($ph) - 1) . '§';
        }, $text);

        // Walang dapat isalin (puro numero o placeholder lang)
        if (!preg_match('/[A-Za-z]/', preg_replace('/§\d+§/u', '', $masked))) {
            return ['text' => $text, 'code' => 200, 'error' => ''];
        }

        $url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl='
            . rawurlencode($lang) . '&dt=t&q=' . rawurlencode($masked);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            CURLOPT_HTTPHEADER     => ['Accept: application/json, text/plain, */*'],
        ]);
        $raw  = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cerr = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return $fail('Web translate unreachable: ' . $cerr);
        }
        if ($code !== 200) {
            return $fail('Web translate HTTP ' . $code, $code);
        }

        $j = json_decode($raw, true);
        if (!is_array($j) || !isset($j[0]) || !is_array($j[0])) {
            return $fail('Web translate bad output', $code);
        }

        $t = '';
        foreach ($j[0] as $seg) {
            if (is_array($seg) && isset($seg[0]) && is_string($seg[0])) {
                $t .= $seg[0];
            }
        }
        if (trim($t) === '') {
            return $fail('', $code);
        }

        // Siguraduhing buo pa ang lahat ng placeholder
        for ($i = 0; $i < count($ph); $i++) {
            if (!preg_match('/§\s*' . $i . '\s*§/u', $t)) {
                return $fail('', $code);
            }
        }
        $t = preg_replace_callback('/§\s*(\d+)\s*§/u', function ($m) use ($ph) {
            return $ph[(int)$m[1]] ?? '';
        }, $t);

        return ['text' => $t, 'code' => $code, 'error' => ''];
    }

    /* ------------------------------------------------------------------
     * tl / ceb: Google Apps Script web app
     * ------------------------------------------------------------------ */
    private function gasTranslate(array $items, $lang)
    {
        $url   = $this->env('TRANSLATE_GAS_URL');
        $token = $this->env('TRANSLATE_GAS_TOKEN');
        if ($url === '' || $token === '') {
            return ['ok' => false, 'error' => 'TRANSLATE_GAS_URL / TRANSLATE_GAS_TOKEN not set'];
        }

        $payload = json_encode([
            'token' => $token,
            'lang'  => $lang,
            'texts' => array_values($items),
        ], JSON_UNESCAPED_UNICODE);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true, // Apps Script ay nagre-redirect (302)
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT        => 100,
        ]);
        $raw  = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cerr = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return ['ok' => false, 'error' => 'GAS unreachable: ' . $cerr];
        }

        $data = json_decode($raw, true);
        if ($code !== 200 || !is_array($data)) {
            return ['ok' => false, 'error' => 'GAS error HTTP ' . $code . ': ' . substr((string) $raw, 0, 150)];
        }
        if (isset($data['error'])) {
            return ['ok' => false, 'error' => 'GAS: ' . $data['error']];
        }
        if (!isset($data['translations']) || !is_array($data['translations'])) {
            return ['ok' => false, 'error' => 'GAS bad output: ' . substr((string) $raw, 0, 150)];
        }

        return ['ok' => true, 'data' => $data['translations']];
    }
}