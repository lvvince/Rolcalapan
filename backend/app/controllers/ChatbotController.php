<?php

class ChatbotController extends Controller
{
    // Rate limit para sa chat: ilang request kada ilang segundo, kada IP
    const RATE_MAX = 20;
    const RATE_WINDOW = 60;

    public function __construct()
    {
        parent::__construct();
        ob_start(); // para hindi masira ang JSON ng PHP notices/warnings
        $this->cors();
    }

    private function env($key)
    {
        $v = getenv($key);
        if ($v === false || $v === '') {
            $v = $_ENV[$key] ?? ($_SERVER[$key] ?? '');
        }
        return (string)$v;
    }

    private function debug_on()
    {
        return in_array(strtolower($this->env('APP_DEBUG')), ['1', 'true', 'on', 'yes'], true);
    }

    private function with_debug(array $payload, $msg)
    {
        if ($this->debug_on() && $msg !== '') {
            $payload['debug'] = $msg;
        }
        return $payload;
    }

    // ALLOW_ORIGIN (pwedeng maraming URL, paghiwalayin ng comma) + localhost
    private function cors()
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = array_filter(array_map('trim', explode(',', $this->env('ALLOW_ORIGIN'))));

        $ok = $origin !== '' && (
            in_array($origin, $allowed, true) ||
            preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)
        );

        if ($ok) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
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

    private function body()
    {
        $body = json_decode(file_get_contents('php://input'), true);
        return is_array($body) ? $body : [];
    }

    // Simpleng rate limit kada IP (file-based, walang kailangang extra service)
    private function rate_limit()
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($xff !== '') {
            $ip = trim(explode(',', $xff)[0]);
        }

        $file = sys_get_temp_dir() . '/rol_rl_' . md5($ip);
        $now = time();
        $state = ['start' => $now, 'count' => 0];

        $fp = @fopen($file, 'c+');
        if (!$fp) {
            return; // kung hindi makasulat, huwag harangin ang chat
        }
        flock($fp, LOCK_EX);
        $raw = stream_get_contents($fp);
        $saved = json_decode((string)$raw, true);
        if (is_array($saved) && isset($saved['start'], $saved['count'])
            && ($now - (int)$saved['start']) < self::RATE_WINDOW) {
            $state = $saved;
        }
        $state['count']++;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($state));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);

        if ($state['count'] > self::RATE_MAX) {
            header('Retry-After: ' . self::RATE_WINDOW);
            $this->json(['success' => false, 'message' => 'Masyadong maraming tanong. Subukan ulit mamaya.'], 429);
        }
    }

    // Simpleng language check para sa fallback na sagot
    private function is_tagalog($text)
    {
        $words = [
            'ano', 'saan', 'kailan', 'sino', 'paano', 'bakit', 'ba', 'po', 'opo', 'ang', 'ng', 'mga',
            'sa', 'ko', 'mo', 'niyo', 'nyo', 'namin', 'kayo', 'ako', 'pwede', 'puwede', 'meron', 'magkano',
            'oras', 'simba', 'nasaan', 'yung', 'ito', 'iyan', 'araw', 'anong', 'paki', 'bukas', 'salamat',
        ];
        $tokens = preg_split('/[^\p{L}]+/u', mb_strtolower($text, 'UTF-8'), -1, PREG_SPLIT_NO_EMPTY);
        return count(array_intersect($tokens, $words)) >= 1;
    }

    // Sagot kapag hindi maabot ang Python NLP bot
    private function no_info_answer($question)
    {
        $fb = 'https://www.facebook.com/riveroflifeintcalapan';
        $ph = '09635903836';
        return $this->is_tagalog($question)
            ? 'Pasensya na po, hindi ko po masagot ngayon. Pakikontak po ang church sa ' . $ph . ' o bisitahin ang Facebook page namin: ' . $fb
            : "Sorry, I can't answer right now. Please contact the church at " . $ph . ' or visit our Facebook page: ' . $fb;
    }

    private function fail(Throwable $e)
    {
        $msg = $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine();
        error_log('[chatbot] ' . $msg);
        $this->json($this->with_debug(
            ['success' => false, 'message' => 'May error sa server.'],
            $msg
        ), 500);
    }

    // ------------------------------------------------------------------
    // PYTHON NLP BOT
    // ------------------------------------------------------------------

    // Tumatawag sa Python NLP bot (Flask /chat). Env: PY_CHATBOT_URL (buong URL), PY_API_KEY
    private function nlp_ask($question, &$err)
    {
        $url = $this->env('PY_CHATBOT_URL');
        if ($url === '') {
            $url = 'http://127.0.0.1:5000/chat';
        }

        $headers = ['Content-Type: application/json'];
        $key = $this->env('PY_API_KEY');
        if ($key !== '') {
            $headers[] = 'X-API-Key: ' . $key;
        }

        $payload = json_encode(
            ['messages' => [['role' => 'user', 'content' => $question]]],
            JSON_UNESCAPED_UNICODE
        );

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 30, // sapat para sa cold start ng Render free tier
            CURLOPT_TIMEOUT => 60,
        ]);
        $raw = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cerr = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            $err = 'NLP unreachable: ' . $cerr . ' | url=' . $url;
            return null;
        }

        $data = json_decode($raw, true);
        if ($code !== 200 || !is_array($data) || empty($data['success']) || !isset($data['answer'])) {
            $err = 'NLP error HTTP ' . $code . ' | url=' . $url . ' | body=' . substr((string)$raw, 0, 200);
            return null;
        }

        return [
            'answer' => (string)$data['answer'],
            'confidence' => (float)($data['confidence'] ?? 0),
        ];
    }

    // ------------------------------------------------------------------
    // CHAT (NLP)
    // ------------------------------------------------------------------

    // POST /api/chat
    // body: { "message": "..." }
    public function ask()
    {
        try {
            $this->process();
        } catch (Throwable $e) {
            $this->fail($e);
        }
    }

    private function process()
    {
        $this->rate_limit();

        $body = $this->body();

        $question = trim((string)($body['message'] ?? ''));
        if ($question === '' || mb_strlen($question, 'UTF-8') > 500) {
            $this->json(['success' => false, 'message' => 'Maglagay ng tanong (hanggang 500 characters).'], 400);
        }

        // Python NLP intent classifier (trained sa dataset.xlsx)
        $errors = [];
        $err = '';
        $result = $this->nlp_ask($question, $err);

        if ($result) {
            $answer = trim($result['answer']);
            $used = 'nlp';
            $threshold = $this->env('NLP_THRESHOLD') !== '' ? (float)$this->env('NLP_THRESHOLD') : 0.25;
            if ($answer === '') {
                $answer = $this->no_info_answer($question);
            }
        } else {
            $errors[] = $err;
            error_log('[chat] NLP failed: ' . $err);
            $answer = $this->no_info_answer($question);
            $used = 'none';
        }

        $this->json($this->with_debug([
            'success' => true,
            'answer' => $answer,
            'sources' => [],
            'provider' => $used,
        ], implode(' | ', $errors)));
    }
}