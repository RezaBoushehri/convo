<?php
include_once __DIR__ . '/../heart/db_connection.php';
include_once __DIR__ . '/../logs/log.php';

$logFile = __DIR__ . '/../logs/emailChecker.log';

class EmailChecker
{
    private $host, $port, $username, $password, $mailbox, $inbox;
    private $attachmentDir = 'attachments';

    public function __construct($host, $port, $username, $password, $mailbox = 'INBOX')
    {
        $this->host = $host;
        $this->port = $port;
        $this->username = $username;
        $this->password = $password;
        $this->mailbox = $mailbox;

        if (!is_dir($this->attachmentDir)) {
            mkdir($this->attachmentDir, 0777, true);
        }
    }

    private function connect()
    {
        $connStr = "{" . $this->host . ":" . $this->port . "/imap/ssl/novalidate-cert}" . $this->mailbox;
        $this->inbox = @imap_open($connStr, $this->username, $this->password);
        if (!$this->inbox) {
            throw new Exception('Unable to connect: ' . imap_last_error());
        }
    }

    private function disconnect()
    {
        if ($this->inbox) {
            imap_close($this->inbox);
        }
    }

    private function decodeMimeStr($string, $defaultCharset = 'UTF-8')
    {
        if (empty($string)) {
            return '';
        }
        $elements = imap_mime_header_decode($string);
        $decoded = '';
        foreach ($elements as $element) {
            $fromCharset = strtolower($element->charset) === 'default' ? $defaultCharset : $element->charset;
            try {
                if ($fromCharset && $fromCharset !== 'unknown-8bit' && $fromCharset !== 'default') {
                    $decoded .= iconv($fromCharset, $defaultCharset . '//IGNORE', $element->text);
                } else {
                    $decoded .= mb_convert_encoding($element->text, $defaultCharset, 'auto');
                }
            } catch (Exception $e) {
                logError($logFile, "MIME decode error for string '$string': " . $e->getMessage());
                $decoded .= $element->text;
            }
        }
        return $decoded;
    }

    private function decode($data, $encoding, $charset = 'UTF-8')
    {
        switch ($encoding) {
            case 0: // 7BIT
                return $data;
            case 1: // 8BIT
                return imap_8bit($data);
            case 2: // BINARY
                return imap_binary($data);
            case 3: // BASE64
                $decoded = base64_decode($data);
                break;
            case 4: // QUOTED-PRINTABLE
                $decoded = quoted_printable_decode($data);
                break;
            default:
                $decoded = $data;
        }

        if ($charset !== 'UTF-8' && !empty($decoded)) {
            try {
                $decoded = mb_convert_encoding($decoded, 'UTF-8', $charset);
            } catch (Exception $e) {
                logError($logFile, "Charset conversion error from $charset to UTF-8: " . $e->getMessage());
            }
        } elseif (empty($charset) || $charset === 'unknown-8bit') {
            $decoded = mb_convert_encoding($decoded, 'UTF-8', 'auto');
        }
        return $decoded;
    }

    private function getPartsRecursive($structure, $uid, $partNumber = '', &$attachments = [])
    {
        $content = '';
        $charset = 'UTF-8';

        if (isset($structure->parameters)) {
            foreach ($structure->parameters as $param) {
                if (strtolower($param->attribute) === 'charset') {
                    $charset = strtoupper($param->value);
                }
            }
        }

        if (isset($structure->parts)) {
            foreach ($structure->parts as $index => $subPart) {
                $partNum = $partNumber === '' ? $index + 1 : $partNumber . '.' . ($index + 1);

                $isAttachment = false;
                $filename = '';

                if (isset($subPart->disposition) && strtolower($subPart->disposition) === 'attachment') {
                    $isAttachment = true;
                }

                if (!empty($subPart->dparameters)) {
                    foreach ($subPart->dparameters as $param) {
                        if (strtolower($param->attribute) === 'filename') {
                            $filename = $this->decodeMimeStr($param->value);
                            $isAttachment = true;
                        }
                    }
                }

                if ($isAttachment && $filename) {
                    $data = imap_fetchbody($this->inbox, $uid, $partNum);
                    $decoded = $this->decode($data, $subPart->encoding, $charset);
                    $path = $this->attachmentDir . '/' . $filename;
                    file_put_contents($path, $decoded);
                    $attachments[] = $path;
                } elseif ($subPart->type == 0) { // TEXT
                    $data = imap_fetchbody($this->inbox, $uid, $partNum);
                    $subContent = $this->decode($data, $subPart->encoding, $charset);
                    if (strtolower($subPart->subtype) === 'plain') {
                        $content = $subContent;
                    } elseif (strtolower($subPart->subtype) === 'html' && empty($content)) {
                        $content = strip_tags($subContent);
                    }
                }

                if (!empty($subPart->parts)) {
                    $subContent = $this->getPartsRecursive($subPart, $uid, $partNum, $attachments);
                    if ($subContent && empty($content)) {
                        $content = $subContent;
                    }
                }
            }
        } else {
            $data = imap_fetchbody($this->inbox, $uid, $partNumber ?: '1');
            $content = $this->decode($data, $structure->encoding, $charset);
        }

        return $content;
    }

    private function getEmailDetails($uid)
    {
        $structure = imap_fetchstructure($this->inbox, $uid);
        $attachments = [];
        $body = $this->getPartsRecursive($structure, $uid, '', $attachments);
        return [$body, $attachments];
    }

    public function startChecking($intervalSeconds = 60)
    {
        global $pdo, $logFile;

        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            return;
        }

        $result = [
            'emails' => [],
            'status' => 'ok',
            'time' => date('c')
        ];

        try {
            $this->connect();

            $criteriaUser = isset($_GET['seen']) && $_GET['seen'] == 'all' ? 'ALL' : 'UNSEEN';
            $criteria = 'UNSEEN';
            $isServer = isset($_GET['server']) && $_GET['server'] === 'true';

            $emails = imap_search($this->inbox, 'ALL');

            if ($emails) {
                rsort($emails);

                foreach ($emails as $email_number) {
                    $overview = imap_fetch_overview($this->inbox, $email_number, 0)[0];
                    list($body, $attachments) = $this->getEmailDetails($email_number);

                    $emailData = [
                        'subject' => $this->decodeMimeStr($overview->subject ?? '(No Subject)'),
                        'from' => $this->decodeMimeStr($overview->from),
                        'date' => $overview->date,
                        'body' => $body,
                        'attachments' => $attachments
                    ];

                    if ($criteria === 'UNSEEN' || $isServer) {
                        $stmt = $pdo->prepare("INSERT INTO forums (data) VALUES (:data)");
                        $stmt->execute([':data' => json_encode($emailData, JSON_UNESCAPED_UNICODE)]);
                        logSuccess($logFile, "Email inserted into forum table: " . $emailData['subject'] . " (" . $emailData['body'] . ")");
                    }

                    imap_delete($this->inbox, $email_number);
                    $result['emails'][] = $emailData;
                }

                imap_expunge($this->inbox);

                if ($criteria === 'UNSEEN' && !empty($result['emails'])) {
                    $stmt = $pdo->prepare("SELECT id FROM users WHERE role IN ('CUSTOMER SUPPORT', 'GOD')");
                    $stmt->execute();
                    $supportUsers = $stmt->fetchAll(PDO::FETCH_COLUMN);

                    $notificationData = json_encode([
                        'userIds' => array_map('strval', $supportUsers),
                        'title' => "<div class='text-center text-danger m-auto'>New Forum Message</div>",
                        'message' => "You have new unread messages in the forum",
                        'link' => null,
                        'taskID' => null,
                        'type' => 'popup'
                    ]);

                    $socket = @stream_socket_client("tcp://mc.farahoosh.ir:5001", $errno, $errstr, 30);
                    if ($socket) {
                        fwrite($socket, $notificationData);
                        fclose($socket);
                    }
                }
            }

            $searchValue = isset($_GET['search']) ? $_GET['search'] : '';
            $selectLimit = isset($_GET['selectLimit']) ? $_GET['selectLimit'] : '16';
            if ((int)$selectLimit == 0) {
                $result['emails'] = [];
                header('Content-Type: application/json');
                echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
                exit;
            }

            $searchValue = !empty($searchValue) ? "AND data LIKE '%$searchValue%'" : '';
            if ($criteria === 'UNSEEN' && !$isServer) {
                if ($criteriaUser == 'ALL') {
                    $stmt = $pdo->prepare("SELECT forums.*, forums.seen, forums.data, users.username FROM forums LEFT JOIN users ON forums.seen = users.id WHERE forums.id IS NOT NULL $searchValue ORDER BY forums.created_at DESC LIMIT $selectLimit");
                } else {
                    $stmt = $pdo->prepare("SELECT * FROM forums WHERE seen IS NULL $searchValue ORDER BY created_at DESC");
                }
                $stmt->execute();
                $forumMessages = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $result['emails'] = array_map(function ($message) {
                    $data = json_decode($message['data'], true);
                    $data['id'] = $message['id'];
                    $data['seen'] = $message['username'] ?? '';
                    $data['updated_at'] = $message['updated_at'] ?? '';
                    return $data;
                }, $forumMessages);
            }

            $this->disconnect();
        } catch (Exception $e) {
            $result['status'] = 'error';
            $result['error'] = $e->getMessage();
            logError($logFile, "Error processing email: " . $e->getMessage());
        }

        header('Content-Type: application/json');
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }
}
