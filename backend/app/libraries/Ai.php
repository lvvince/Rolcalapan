<?php

/**
 * Switchable AI provider: claude | openai | gemini
 * "openai" = anumang OpenAI-compatible API (OpenAI, Groq, OpenRouter, etc.)
 *
 * Env variables (Render Environment o .env sa backend root):
 *   AI_PROVIDER        claude | openai | gemini   (default: openai)
 *   ANTHROPIC_API_KEY, ANTHROPIC_MODEL            (default model: claude-haiku-5-5)
 *   OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL (default: Groq free tier)
 *   GEMINI_API_KEY, GEMINI_MODEL                  (default: gemini-2.5-flash)
 *   AI_SSL_VERIFY=0                               (local Laragon lang, kung may SSL error)
 *   AI_TOTAL_TIMEOUT=45                           (max na segundo para sa lahat ng provider)
 */
class Ai
{
    // Oras kung kailan dapat tumigil ang lahat ng pagsubok (unix time)
    private $deadline = 0;

    private function env($key, $default = '')
    {
        $v = getenv($key);
        if ($v === false || $v === '') {
            $v = $_ENV[$key] ?? ($_SERVER[$key] ?? '');
        }
        if ($v === '') {
            static $file = null;
            if ($file === null) {
                $file = [];
                $path = dirname(__DIR__, 2) . '/.env';
                if (is_readable($path)) {
                    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                        $line = trim($line);
                        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) {
                            continue;
                        }
                        list($k, $val) = explode('=', $line, 2);
                        $file[trim($k)] = trim($val, " \t\"'");
                    }
                }
            }
            $v = $file[$key] ?? '';
        }
        return $v !== '' ? $v : $default;
    }

    public function default_provider()
    {
        return strtolower($this->env('AI_PROVIDER', 'openai'));
    }

    public function has_key($provider)
    {
        switch ($provider) {
            case 'claude':
                return $this->env('ANTHROPIC_API_KEY') !== '';
            case 'gemini':
                return $this->env('GEMINI_API_KEY') !== '';
            case 'openai':
                return $this->env('OPENAI_API_KEY') !== '';
        }
        return false;
    }

    /**
     * $messages = string (isang tanong) o array ng ['role' => 'user|assistant', 'content' => '...']
     */
    public function ask($provider, $system, $messages)
    {
        if (is_string($messages)) {
            $messages = [['role' => 'user', 'content' => $messages]];
        }
        switch ($provider) {
            case 'claude':
                return $this->claude($system, $messages);
            case 'gemini':
                return $this->gemini($system, $messages);
            case 'openai':
                return $this->openai($system, $messages);
            default:
                throw new Exception('Unknown AI provider: ' . $provider);
        }
    }

    /**
     * Susubukan muna ang piniling provider, tapos ang iba pang may API key.
     * May total time limit para hindi mag-timeout ang Render / frontend.
     * Return: ['provider' => ..., 'answer' => ...] o null kung lahat pumalya.
     */
    public function ask_with_fallback($provider, $system, $messages, &$errors)
    {
        $errors = [];
        $total = (int)$this->env('AI_TOTAL_TIMEOUT', '45');
        if ($total < 10) {
            $total = 45;
        }
        $this->deadline = time() + $total;

        $order = array_values(array_unique(array_merge([$provider], ['gemini', 'openai', 'claude'])));

        foreach ($order as $p) {
            if (!$this->has_key($p)) {
                if ($p === $provider) {
                    $errors[] = $p . ': API key not set';
                }
                continue;
            }
            if ($this->time_left() < 3) {
                $errors[] = 'Time limit reached before trying ' . $p;
                break;
            }
            try {
                $answer = trim((string)$this->ask($p, $system, $messages));
                if ($answer !== '') {
                    return ['provider' => $p, 'answer' => $answer];
                }
                $errors[] = $p . ': empty response';
            } catch (Throwable $e) {
                $errors[] = $p . ': ' . $e->getMessage();
            }
        }
        return null;
    }

    private function time_left()
    {
        return $this->deadline > 0 ? $this->deadline - time() : 30;
    }

    private function claude($system, $messages)
    {
        $key = $this->env('ANTHROPIC_API_KEY');
        if ($key === '') {
            throw new Exception('ANTHROPIC_API_KEY is not set');
        }
        $data = $this->post(
            'https://api.anthropic.com/v1/messages',
            ['x-api-key: ' . $key, 'anthropic-version: 2023-06-01'],
            [
                'model' => $this->env('ANTHROPIC_MODEL', 'claude-haiku-5-5'),
                'max_tokens' => 700,
                'temperature' => 0.5,
                'system' => $system,
                'messages' => $messages,
            ]
        );
        $text = '';
        foreach (($data['content'] ?? []) as $block) {
            $text .= $block['text'] ?? '';
        }
        return trim($text);
    }

    private function openai($system, $messages)
    {
        $key = $this->env('OPENAI_API_KEY');
        if ($key === '') {
            throw new Exception('OPENAI_API_KEY is not set');
        }
        $base = rtrim($this->env('OPENAI_BASE_URL', 'https://api.groq.com/openai/v1'), '/');
        $model = $this->env('OPENAI_MODEL', 'llama-3.3-70b-versatile');

        $payload = [
            'model' => $model,
            'messages' => array_merge([['role' => 'system', 'content' => $system]], $messages),
        ];

        // Bagong OpenAI models (gpt-5, o-series): max_completion_tokens, walang custom temperature
        $new_openai = strpos($base, 'api.openai.com') !== false
            && preg_match('/^(gpt-5|o\d)/i', $model);

        if ($new_openai) {
            $payload['max_completion_tokens'] = 700;
        } else {
            $payload['max_tokens'] = 700;
            $payload['temperature'] = 0.5;
        }

        $data = $this->post($base . '/chat/completions', ['Authorization: Bearer ' . $key], $payload);
        return trim($data['choices'][0]['message']['content'] ?? '');
    }

    private function gemini($system, $messages)
    {
        $key = $this->env('GEMINI_API_KEY');
        if ($key === '') {
            throw new Exception('GEMINI_API_KEY is not set');
        }
        $model = $this->env('GEMINI_MODEL', 'gemini-2.5-flash');

        $gen = ['temperature' => 0.5, 'maxOutputTokens' => 800];
        // Ang 2.5-flash ay "nagiisip" muna at inuubos ang tokens; patayin para laging may sagot
        if (strpos($model, '2.5-flash') !== false) {
            $gen['thinkingConfig'] = ['thinkingBudget' => 0];
        }

        $contents = [];
        foreach ($messages as $m) {
            $contents[] = [
                'role' => $m['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $m['content']]],
            ];
        }

        $data = $this->post(
            'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent',
            ['x-goog-api-key: ' . $key],
            [
                'system_instruction' => ['parts' => [['text' => $system]]],
                'contents' => $contents,
                'generationConfig' => $gen,
            ]
        );

        $text = '';
        foreach (($data['candidates'][0]['content']['parts'] ?? []) as $part) {
            $text .= $part['text'] ?? '';
        }
        return trim($text);
    }

    private function post($url, $headers, $payload)
    {
        $res = false;
        $code = 0;
        $err = '';

        for ($attempt = 1; $attempt <= 2; $attempt++) {
            // Huwag lumampas sa total time limit
            $left = $this->time_left();
            if ($left < 3) {
                throw new Exception('Time limit reached');
            }
            $timeout = max(3, min(20, $left));
            $connect = max(3, min(10, $timeout));

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => $connect,
                CURLOPT_TIMEOUT => $timeout,
                CURLOPT_SSL_VERIFYPEER => $this->env('AI_SSL_VERIFY', '1') !== '0',
                CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
                CURLOPT_POSTFIELDS => json_encode($payload),
            ]);
            $res = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);

            // Isang retry lang: network error o overloaded (429/503)
            $retry = ($res === false) || ($code === 429 || $code === 503);
            if ($retry && $attempt === 1) {
                sleep(1);
                continue;
            }
            break;
        }

        if ($res === false) {
            throw new Exception('Network error: ' . $err);
        }
        if ($code >= 400) {
            throw new Exception('AI error ' . $code . ': ' . substr(preg_replace('/\s+/', ' ', (string)$res), 0, 200));
        }
        $data = json_decode($res, true);
        if (!is_array($data)) {
            throw new Exception('Invalid AI response');
        }
        return $data;
    }
}