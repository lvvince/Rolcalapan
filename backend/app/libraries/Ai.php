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
                'max_tokens' => 500,
                'system' => $system,
                'messages' => [['role' => 'user', 'content' => $question]],
            ]
        );
        return trim($data['content'][0]['text'] ?? '');
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
                'max_tokens' => 500,
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
        $data = $this->post(
            'https://generativelanguage.googleapis.com/v1beta/models/' . $model . ':generateContent',
            ['x-goog-api-key: ' . $key],
            [
                'system_instruction' => ['parts' => [['text' => $system]]],
                'contents' => [['role' => 'user', 'parts' => [['text' => $question]]]],
                'generationConfig' => ['temperature' => 0.2, 'maxOutputTokens' => 500],
            ]
        );
        return trim($data['candidates'][0]['content']['parts'][0]['text'] ?? '');
    }

    private function post($url, $headers, $payload)
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => $this->env('AI_SSL_VERIFY', '1') !== '0',
            CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
            CURLOPT_POSTFIELDS => json_encode($payload),
        ]);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

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