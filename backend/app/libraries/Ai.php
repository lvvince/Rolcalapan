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
 */
class Ai
{
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

    public function ask($provider, $system, $question)
    {
        switch ($provider) {
            case 'claude':
                return $this->claude($system, $question);
            case 'gemini':
                return $this->gemini($system, $question);
            case 'openai':
                return $this->openai($system, $question);
            default:
                throw new Exception('Unknown AI provider: ' . $provider);
        }
    }

    /**
     * Susubukan muna ang piniling provider, tapos ang iba pang may API key.
     * Return: ['provider' => ..., 'answer' => ...] o null kung lahat pumalya.
     * $errors = listahan ng mga error (para sa debug/log).
     */
    public function ask_with_fallback($provider, $system, $question, &$errors)
    {
        $errors = [];
        $order = array_values(array_unique(array_merge([$provider], ['gemini', 'openai', 'claude'])));

        foreach ($order as $p) {
            if (!$this->has_key($p)) {
                if ($p === $provider) {
                    $errors[] = $p . ': API key not set';
                }
                continue;
            }
            try {
                $answer = trim((string)$this->ask($p, $system, $question));
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

    private function claude($system, $question)
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
                'max_tokens' => 2000,
                'system' => $system,
                'messages' => [['role' => 'user', 'content' => $question]],
            ]
        );
        $text = '';
        foreach (($data['content'] ?? []) as $block) {
            $text .= $block['text'] ?? '';
        }
        return trim($text);
    }

    private function openai($system, $question)
    {
        $key = $this->env('OPENAI_API_KEY');
        if ($key === '') {
            throw new Exception('OPENAI_API_KEY is not set');
        }
        $base = rtrim($this->env('OPENAI_BASE_URL', 'https://api.groq.com/openai/v1'), '/');
        $data = $this->post(
            $base . '/chat/completions',
            ['Authorization: Bearer ' . $key],
            [
                'model' => $this->env('OPENAI_MODEL', 'llama-3.3-70b-versatile'),
                'max_tokens' => 600,
                'temperature' => 0.2,
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $question],
                ],
            ]
        );
        return trim($data['choices'][0]['message']['content'] ?? '');
    }

    private function gemini($system, $question)
    {
        $key = $this->env('GEMINI_API_KEY');
        if ($key === '') {
            throw new Exception('GEMINI_API_KEY is not set');
        }
        $model = $this->env('GEMINI_MODEL', 'gemini-2.5-flash');

        $gen = ['temperature' => 0.2, 'maxOutputTokens' => 800];
        // Ang 2.5-flash ay "nagiisip" muna at inuubos ang tokens; patayin para laging may sagot
        if (strpos($model, '2.5-flash') !== false) {
            $gen['thinkingConfig'] = ['thinkingBudget' => 0];
        }

        $data = $this->post(
            'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent',
            ['x-goog-api-key: ' . $key],
            [
                'system_instruction' => ['parts' => [['text' => $system]]],
                'contents' => [['role' => 'user', 'parts' => [['text' => $question]]]],
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
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
                CURLOPT_CONNECTTIMEOUT => 20,
                CURLOPT_TIMEOUT => 60,
                CURLOPT_SSL_VERIFYPEER => $this->env('AI_SSL_VERIFY', '1') !== '0',
                CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
                CURLOPT_POSTFIELDS => json_encode($payload),
            ]);
            $res = curl_exec($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);

            // Isang retry lang kung overloaded (429/503) o pumalya ang network (DNS/timeout)
            if ($attempt === 1 && ($res === false || $code === 429 || $code === 503)) {
                sleep(1);
                continue;
            }
            break;
        }

        if ($res === false) {
            throw new Exception('Network error: ' . $err);
        }
        if ($code >= 400) {
            throw new Exception('AI error ' . $code . ': ' . substr($res, 0, 300));
        }
        $data = json_decode($res, true);
        if (!is_array($data)) {
            throw new Exception('Invalid AI response');
        }
        return $data;
    }
}