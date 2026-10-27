<?php

/**
 * Sariling PDO connection (may SSL para sa TiDB Cloud).
 * Gumagamit ng parehong DB_* env variables ng backend.
 * Optional: DB_SSL_CA = path ng CA file (kung hindi ma-detect)
 */
class KnowledgeModel
{
    private $pdo = null;

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

    private function find_ca()
    {
        $cands = [
            $this->env('DB_SSL_CA'),
            ini_get('curl.cainfo'),
            ini_get('openssl.cafile'),
            'C:\\laragon\\etc\\ssl\\cacert.pem',
            '/etc/ssl/certs/ca-certificates.crt',
            '/etc/ssl/cert.pem',
            '/etc/pki/tls/certs/ca-bundle.crt',
        ];
        foreach ($cands as $p) {
            if ($p && is_readable($p)) {
                return $p;
            }
        }
        return null;
    }

    private function pdo()
    {
        if ($this->pdo) {
            return $this->pdo;
        }

        $host = $this->env('DB_HOST', '127.0.0.1');
        $port = $this->env('DB_PORT', '3306');
        $name = $this->env('DB_NAME', 'rolcalapan');
        $user = $this->env('DB_USER', 'root');
        $pass = $this->env('DB_PASSWORD', '');

        $opts = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 10,
        ];

        $local = in_array($host, ['127.0.0.1', 'localhost'], true);
        if (!$local) {
            $ca = $this->find_ca();
            if ($ca) {
                $opts[PDO::MYSQL_ATTR_SSL_CA] = $ca;
                $opts[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
            }
        }

        $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
        $this->pdo = new PDO($dsn, $user, $pass, $opts);
        return $this->pdo;
    }

    public function get_active()
    {
        return $this->pdo()
            ->query('SELECT id, category, question, answer, intent FROM knowledge_base WHERE is_active = 1')
            ->fetchAll();
    }

    // Para sa admin: kasama pati inactive
    public function get_all()
    {
        return $this->pdo()
            ->query('SELECT id, category, question, answer, intent, is_active FROM knowledge_base ORDER BY id DESC')
            ->fetchAll();
    }

    // Insert kung walang id, update kung may id. Ibinabalik ang id.
    public function save($data)
    {
        $id = (int)($data['id'] ?? 0);
        $category = trim((string)($data['category'] ?? ''));
        if ($category === '') {
            $category = 'FAQ';
        }
        $params = [
            $category,
            $data['question'],
            $data['answer'],
            $data['intent'] ?? null,
            !empty($data['is_active']) ? 1 : 0,
        ];

        if ($id > 0) {
            $st = $this->pdo()->prepare(
                'UPDATE knowledge_base SET category = ?, question = ?, answer = ?, intent = ?, is_active = ? WHERE id = ?'
            );
            $params[] = $id;
            $st->execute($params);
            return $id;
        }

        $st = $this->pdo()->prepare(
            'INSERT INTO knowledge_base (category, question, answer, intent, is_active) VALUES (?, ?, ?, ?, ?)'
        );
        $st->execute($params);
        return (int)$this->pdo()->lastInsertId();
    }

    public function delete($id)
    {
        $st = $this->pdo()->prepare('DELETE FROM knowledge_base WHERE id = ?');
        return $st->execute([(int)$id]);
    }

    public function log_chat($data)
    {
        $st = $this->pdo()->prepare(
            'INSERT INTO chat_logs (question, answer, provider, matched_ids) VALUES (?, ?, ?, ?)'
        );
        return $st->execute([
            $data['question'],
            $data['answer'],
            $data['provider'] ?? null,
            $data['matched_ids'] ?? null,
        ]);
    }
}