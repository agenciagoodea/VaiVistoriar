<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuração do Banco MySQL
$dbHost = 'localhost';
$dbUser = 'vaivistoriar_root';
$dbPass = '{fPOX[NZEdPhZl_(';
$dbName = 'vaivistoriar_2026';
$jwtSecret = 'super_secret_key_vaivistoriar_2026';

$mysqli = new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($mysqli->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Falha na conexão com o Banco de Dados']);
    exit;
}
$mysqli->set_charset('utf8mb4');

// Roteamento de URIs
$uri = $_GET['route'] ?? parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = preg_replace('/^\/api/', '', $uri);
if (empty($uri)) $uri = '/';
$method = $_SERVER['REQUEST_METHOD'];

// Ler corpo da requisição JSON
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true) ?: $_POST;

// Utilitários de JWT
function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function base64UrlDecode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}
function generateJwt($payload, $secret) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode(json_encode($payload));
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = base64UrlEncode($signature);
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}
function verifyJwt($jwt, $secret) {
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) return false;
    $header = base64UrlDecode($tokenParts[0]);
    $payload = base64UrlDecode($tokenParts[1]);
    $signatureProvided = $tokenParts[2];
    $base64UrlHeader = base64UrlEncode($header);
    $base64UrlPayload = base64UrlEncode($payload);
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
    $base64UrlSignature = base64UrlEncode($signature);
    if ($base64UrlSignature === $signatureProvided) {
        return json_decode($payload, true);
    }
    return false;
}

// Middleware de Autenticação
function getAuthUser($mysqli, $jwtSecret) {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return null;
    }
    $decoded = verifyJwt($matches[1], $jwtSecret);
    if (!$decoded || empty($decoded['userId'])) return null;

    $userId = $decoded['userId'];
    $res = $mysqli->query("SELECT bp.*, u.email FROM broker_profiles bp JOIN users u ON bp.user_id = u.id WHERE u.id = '$userId'");
    if ($res && $row = $res->fetch_assoc()) {
        return ['id' => $userId, 'email' => $row['email'], 'role' => $row['role'], 'profile' => $row];
    }
    return null;
}

// -------------------------------------------------------------
// ROTAS DA API
// -------------------------------------------------------------

// Health Check
if ($uri === '/health' || $uri === '') {
    echo json_encode(['status' => 'OK', 'system' => 'VaiVistoriar Native cPanel Engine', 'timestamp' => date('c')]);
    exit;
}

// Auth: Register
if ($uri === '/auth/register' && $method === 'POST') {
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $fullName = trim($body['full_name'] ?? $email);
    $role = $body['role'] ?? 'BROKER';

    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'E-mail e senha são obrigatórios']);
        exit;
    }

    $check = $mysqli->query("SELECT id FROM users WHERE email = '$email'");
    if ($check && $check->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'E-mail já cadastrado']);
        exit;
    }

    $userId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
    $profileId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
    $passHash = password_hash($password, PASSWORD_BCRYPT);
    $defaultPlan = $role === 'PJ' ? '5c09eeb7-100f-4f84-aaa7-9bcc5df05306' : 'fd4c420f-09b2-40a7-b43f-972e21378368';
    $expiresAt = date('Y-m-d H:i:s', strtotime('+30 days'));

    $mysqli->query("INSERT INTO users (id, email, password_hash, role) VALUES ('$userId', '$email', '$passHash', '$role')");
    $mysqli->query("INSERT INTO broker_profiles (id, user_id, email, full_name, role, status, subscription_plan_id, subscription_expires_at) VALUES ('$profileId', '$userId', '$email', '$fullName', '$role', 'Ativo', '$defaultPlan', '$expiresAt')");

    $token = generateJwt(['userId' => $userId, 'email' => $email, 'role' => $role], $jwtSecret);
    $profRes = $mysqli->query("SELECT * FROM broker_profiles WHERE user_id = '$userId'");
    $profile = $profRes->fetch_assoc();

    echo json_encode(['token' => $token, 'user' => ['id' => $userId, 'email' => $email, 'role' => $role], 'profile' => $profile]);
    exit;
}

// Auth: Lookup Email by CPF/CNPJ
if ($uri === '/auth/lookup-email-by-cpf' && $method === 'GET') {
    $rawCpf = $_GET['cpf_cnpj'] ?? '';
    $cleanDoc = preg_replace('/\D/', '', $rawCpf);
    if (!$cleanDoc) {
        echo json_encode(['email' => null]);
        exit;
    }
    $res = $mysqli->query("SELECT email FROM broker_profiles WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '') = '$cleanDoc' LIMIT 1");
    if ($res && $row = $res->fetch_assoc()) {
        echo json_encode(['email' => $row['email']]);
    } else {
        echo json_encode(['email' => null]);
    }
    exit;
}

// Auth: Login
if ($uri === '/auth/login' && $method === 'POST') {
    $identifier = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    if (!$identifier || !$password) {
        http_response_code(400);
        echo json_encode(['error' => 'CPF, CNPJ ou E-mail e senha são obrigatórios']);
        exit;
    }

    $escapedIdent = $mysqli->real_escape_string($identifier);
    $res = $mysqli->query("SELECT * FROM users WHERE email = '$escapedIdent'");

    if (!$res || $res->num_rows === 0) {
        // Tentar buscar por CPF/CNPJ no broker_profiles
        $cleanDoc = preg_replace('/\D/', '', $identifier);
        if (!empty($cleanDoc)) {
            $escapedDoc = $mysqli->real_escape_string($cleanDoc);
            $profCheck = $mysqli->query("SELECT user_id, email FROM broker_profiles WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '') = '$escapedDoc' LIMIT 1");
            if ($profCheck && $pRow = $profCheck->fetch_assoc()) {
                $userRes = $mysqli->query("SELECT * FROM users WHERE id = '{$pRow['user_id']}' OR email = '{$mysqli->real_escape_string($pRow['email'])}'");
                if ($userRes && $userRes->num_rows > 0) {
                    $res = $userRes;
                }
            }
        }
    }

    if (!$res || $res->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'CPF, CNPJ, E-mail ou senha incorretos']);
        exit;
    }

    $user = $res->fetch_assoc();
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['error' => 'CPF, CNPJ, E-mail ou senha incorretos']);
        exit;
    }

    $profRes = $mysqli->query("SELECT * FROM broker_profiles WHERE user_id = '{$user['id']}'");
    $profile = $profRes ? $profRes->fetch_assoc() : null;

    if ($profile && $profile['status'] === 'Bloqueado') {
        http_response_code(403);
        echo json_encode(['error' => 'Sua conta está suspensa ou bloqueada. Entre em contato com o suporte.']);
        exit;
    }

    $token = generateJwt(['userId' => $user['id'], 'email' => $user['email'], 'role' => $user['role']], $jwtSecret);
    echo json_encode(['token' => $token, 'user' => ['id' => $user['id'], 'email' => $user['email'], 'role' => $user['role']], 'profile' => $profile]);
    exit;
}

// Auth: Me (Session Check)
if ($uri === '/auth/me' && $method === 'GET') {
    $authUser = getAuthUser($mysqli, $jwtSecret);
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['error' => 'Não autenticado']);
        exit;
    }
    echo json_encode(['user' => ['id' => $authUser['id'], 'email' => $authUser['email'], 'role' => $authUser['role']], 'profile' => $authUser['profile']]);
    exit;
}

// Planos: Listar
if (strpos($uri, '/plans') === 0 && $method === 'GET') {
    $res = $mysqli->query("SELECT * FROM plans ORDER BY price ASC");
    $plans = [];
    while ($row = $res->fetch_assoc()) {
        $row['billingCycle'] = $row['billing_cycle'];
        $row['maxInspections'] = (int)$row['max_inspections'];
        $row['maxPhotos'] = (int)$row['max_photos'];
        $row['maxRooms'] = (int)$row['max_rooms'];
        $row['maxBrokers'] = (int)$row['max_brokers'];
        $row['storageGb'] = (float)$row['storage_gb'];
        $row['durationDays'] = (int)$row['duration_days'];
        $row['badgeText'] = $row['badge_text'];
        $row['price'] = (float)$row['price'];
        $row['features'] = json_decode($row['features'] ?? '{}', true) ?: [];
        $plans[] = $row;
    }
    echo json_encode($plans);
    exit;
}

// Imóveis: CRUD
if (strpos($uri, '/properties') === 0) {
    $user = getAuthUser($mysqli, $jwtSecret);
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'Não autorizado']); exit; }

    if ($method === 'GET') {
        $res = $mysqli->query("SELECT * FROM properties WHERE user_id = '{$user['id']}' ORDER BY created_at DESC");
        $items = [];
        while ($r = $res->fetch_assoc()) {
            $r['lastInspection'] = $r['last_inspection'];
            $items[] = $r;
        }
        echo json_encode($items);
        exit;
    }

    if ($method === 'POST') {
        $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        $name = $mysqli->real_escape_string($body['name'] ?? '');
        $addr = $mysqli->real_escape_string($body['address'] ?? '');
        $owner = $mysqli->real_escape_string($body['owner'] ?? '');
        $type = $mysqli->real_escape_string($body['type'] ?? 'Apartamento');
        $img = $mysqli->real_escape_string($body['image'] ?? '');

        $mysqli->query("INSERT INTO properties (id, user_id, name, address, owner, type, image) VALUES ('$id', '{$user['id']}', '$name', '$addr', '$owner', '$type', '$img')");
        $res = $mysqli->query("SELECT * FROM properties WHERE id = '$id'");
        echo json_encode($res->fetch_assoc());
        exit;
    }
}

// Vistorias: CRUD
if (strpos($uri, '/inspections') === 0) {
    $user = getAuthUser($mysqli, $jwtSecret);
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'Não autorizado']); exit; }

    if ($method === 'GET') {
        $parts = explode('/', trim($uri, '/'));
        if (count($parts) === 2 && strlen($parts[1]) > 5) {
            $inspId = $mysqli->real_escape_string($parts[1]);
            $res = $mysqli->query("SELECT * FROM inspections WHERE id = '$inspId'");
            if ($res && $r = $res->fetch_assoc()) {
                if ($r['data_json']) $r['data'] = json_decode($r['data_json'], true);
                echo json_encode($r);
            } else {
                http_response_code(404); echo json_encode(['error' => 'Vistoria não encontrada']);
            }
            exit;
        }

        $res = $mysqli->query("SELECT * FROM inspections WHERE user_id = '{$user['id']}' ORDER BY created_at DESC");
        $items = [];
        while ($r = $res->fetch_assoc()) {
            if ($r['data_json']) $r['data'] = json_decode($r['data_json'], true);
            $items[] = $r;
        }
        echo json_encode($items);
        exit;
    }

    if ($method === 'POST') {
        $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        $prop = $mysqli->real_escape_string($body['property'] ?? 'Imóvel');
        $addr = $mysqli->real_escape_string($body['address'] ?? '');
        $client = $mysqli->real_escape_string($body['client'] ?? '');
        $type = $mysqli->real_escape_string($body['type'] ?? 'Entrada');
        $date = $body['date'] ?? date('Y-m-d');
        $status = $mysqli->real_escape_string($body['status'] ?? 'Rascunho');
        $img = $mysqli->real_escape_string($body['image'] ?? '');
        $dataJson = $mysqli->real_escape_string(json_encode($body['data'] ?? []));

        $mysqli->query("INSERT INTO inspections (id, user_id, property, address, client, type, date, status, image, data_json) VALUES ('$id', '{$user['id']}', '$prop', '$addr', '$client', '$type', '$date', '$status', '$img', '$dataJson')");
        $res = $mysqli->query("SELECT * FROM inspections WHERE id = '$id'");
        $r = $res->fetch_assoc();
        if ($r['data_json']) $r['data'] = json_decode($r['data_json'], true);
        echo json_encode($r);
        exit;
    }
}

// Clientes: CRUD
if (strpos($uri, '/clients') === 0) {
    $user = getAuthUser($mysqli, $jwtSecret);
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'Não autorizado']); exit; }

    if ($method === 'GET') {
        $res = $mysqli->query("SELECT * FROM clients WHERE user_id = '{$user['id']}' ORDER BY created_at DESC");
        $items = [];
        while ($r = $res->fetch_assoc()) {
            $items[] = $r;
        }
        echo json_encode($items);
        exit;
    }

    if ($method === 'POST') {
        $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        $name = $mysqli->real_escape_string($body['name'] ?? '');
        $email = $mysqli->real_escape_string($body['email'] ?? '');
        $phone = $mysqli->real_escape_string($body['phone'] ?? '');
        $cpf = $mysqli->real_escape_string($body['cpf'] ?? '');
        $addr = $mysqli->real_escape_string($body['address'] ?? '');
        $type = $mysqli->real_escape_string($body['type'] ?? 'Inquilino');

        $mysqli->query("INSERT INTO clients (id, user_id, name, email, phone, cpf, address, type) VALUES ('$id', '{$user['id']}', '$name', '$email', '$phone', '$cpf', '$addr', '$type')");
        $res = $mysqli->query("SELECT * FROM clients WHERE id = '$id'");
        echo json_encode($res->fetch_assoc());
        exit;
    }
}

// Configurações: Key/Value
if (strpos($uri, '/system_configs') === 0 || strpos($uri, '/configs') === 0) {
    if ($method === 'GET') {
        $res = $mysqli->query("SELECT `key`, `value` FROM system_configs");
        $items = [];
        while ($r = $res->fetch_assoc()) {
            $items[] = $r;
        }
        echo json_encode($items);
        exit;
    }
}

// Avaliações
if (strpos($uri, '/system_reviews') === 0 || strpos($uri, '/reviews') === 0) {
    if ($method === 'GET') {
        $res = $mysqli->query("SELECT r.*, bp.full_name, bp.avatar_url FROM system_reviews r LEFT JOIN broker_profiles bp ON r.user_id = bp.user_id ORDER BY r.created_at DESC");
        $items = [];
        while ($r = $res->fetch_assoc()) {
            $items[] = $r;
        }
        echo json_encode($items);
        exit;
    }
}

// Upload de Arquivos / Fotos
if ($uri === '/upload' && $method === 'POST') {
    $user = getAuthUser($mysqli, $jwtSecret);
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'Não autorizado']); exit; }

    $fileData = $body['file'] ?? '';
    $fileName = $body['fileName'] ?? 'photo.png';
    $bucket = $body['bucket'] ?? 'upload';

    if (!$fileData) {
        http_response_code(400); echo json_encode(['error' => 'Nenhum arquivo enviado']); exit;
    }

    $uploadsDir = __DIR__ . '/uploads';
    if (!file_exists($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }

    $ext = pathinfo($fileName, PATHINFO_EXTENSION) ?: 'png';
    $uniqueName = $bucket . '_' . time() . '_' . substr(md5(mt_rand()), 0, 8) . '.' . $ext;
    $targetFile = $uploadsDir . '/' . $uniqueName;

    if (strpos($fileData, 'data:') === 0) {
        $parts = explode(',', $fileData);
        $fileData = $parts[1] ?? $parts[0];
    }

    file_put_contents($targetFile, base64_decode($fileData));
    $publicUrl = "/uploads/$uniqueName";

    echo json_encode(['publicUrl' => $publicUrl, 'path' => $uniqueName]);
    exit;
}

// Cookie Consents
if (strpos($uri, '/cookie_consents') === 0) {
    if ($method === 'POST') {
        $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $userId = $body['user_id'] ?? null;
        $escapedUserId = $userId ? "'".$mysqli->real_escape_string($userId)."'" : "NULL";
        $mysqli->query("INSERT INTO cookie_consents (id, user_id, ip_address) VALUES ('$id', $escapedUserId, '$ip')");
        echo json_encode(['success' => true, 'id' => $id]);
        exit;
    }
    echo json_encode([]);
    exit;
}

// Rota Fallback 404
http_response_code(404);
echo json_encode(['error' => "Rota não encontrada: $uri"]);
$mysqli->close();
?>
