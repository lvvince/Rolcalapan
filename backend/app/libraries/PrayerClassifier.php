<?php
defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

/**
 * PrayerClassifier - tumatawag sa Python prayer classifier service (prayer_py).
 * Ilagay sa: backend/app/libraries/PrayerClassifier.php
 *
 * Gamit sa controller:
 *   require_once APP_DIR . 'libraries/PrayerClassifier.php';
 *   $ai = (new PrayerClassifier())->classify($message);
 *   // $ai = ['category'=>..., 'urgency'=>..., 'confidence'=>..., 'needs_review'=>..., 'priority'=>...]
 */
class PrayerClassifier
{
    private $url;
    private $timeout = 5;

    // Priority levels
    const P_URGENT  = 'urgent';
    const P_HIGH    = 'high';
    const P_GENERAL = 'general';

    // Self-harm / pagpapakamatay: laging URGENT kahit "normal" ang urgency ng AI
    const SELF_HARM_RE = '/(suicid|magpakamatay|gusto\s+(ko|kong)\s+((na|nang)\s+)?mamatay|ayaw\s+ko\s+(na|nang)\s+(mabuhay|sa\s+buhay)|ayoko\s+(na|nang)\s+(mabuhay|sa\s+buhay)|wala\s+nang\s+pag-?asa|self[\s-]?harm|saktan\s+ang\s+sarili|patayin\s+ang\s+sarili|end\s+my\s+life|kill\s+myself|want\s+to\s+die)/iu';

    // Emergency / krisis: URGENT kapag high din ang urgency
    const CRISIS_RE = '/(\bcritical\b|\bicu\b|\bcoma\b|hospital|ospital|naglayas|nawawala|missing|kinidnap|aksidente|accident|namatay|\bnaaresto\b|\bnakulong\b|stroke|inatake|emergency|operation|operasyon)/iu';

    public function __construct()
    {
        $this->url = getenv('PRAYER_AI_URL') ?: 'http://127.0.0.1:8001';
    }

    /**
     * Awtomatikong priority mula sa text + resulta ng AI.
     *  urgent  = self-harm, o high urgency na may crisis keyword
     *  high    = high urgency, o kailangang i-review ng tao
     *  general = lahat ng iba
     */
    public static function derivePriority(string $text, ?string $urgency, $needsReview): string
    {
        if (preg_match(self::SELF_HARM_RE, $text)) {
            return self::P_URGENT;
        }

        $isHigh = strtolower((string) $urgency) === 'high';

        if ($isHigh && preg_match(self::CRISIS_RE, $text)) {
            return self::P_URGENT;
        }

        if ($isHigh || (int) $needsReview === 1) {
            return self::P_HIGH;
        }

        return self::P_GENERAL;
    }

    public function classify(string $text): array
    {
        $fallback = [
            'category'     => null,
            'urgency'      => null,
            'confidence'   => null,
            'needs_review' => 1,
        ];

        $result = $this->callService($text) ?? $fallback;

        // Kahit down ang AI service, gumagana pa rin ang keyword check at needs_review
        $result['priority'] = self::derivePriority($text, $result['urgency'], $result['needs_review']);

        return $result;
    }

    private function callService(string $text): ?array
    {
        $ch = curl_init(rtrim($this->url, '/') . '/classify');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode(['text' => $text]),
        ]);

        $response = curl_exec($ch);
        $status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $status !== 200) {
            return null; // hindi mag-fail ang pag-save kahit down ang AI service
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            return null;
        }

        return [
            'category'     => $data['category'] ?? null,
            'urgency'      => $data['urgency'] ?? null,
            'confidence'   => $data['category_confidence'] ?? null,
            'needs_review' => !empty($data['needs_review']) ? 1 : 0,
        ];
    }
}