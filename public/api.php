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
    $res = $mysqli->query("SELECT bp.*, u.email, u.role as user_role FROM broker_profiles bp JOIN users u ON bp.user_id = u.id WHERE u.id = '$userId'");
    if ($res && $row = $res->fetch_assoc()) {
        $realRole = !empty($row['user_role']) ? $row['user_role'] : $row['role'];
        return ['id' => $userId, 'email' => $row['email'], 'role' => $realRole, 'profile' => $row];
    }
    return null;
}

// Auto-seed e atualização da conta principal do administrador (CPF: 70153841249)
$adminUserId = 'fe74ea88-3ba9-4a04-8e63-cadba3781e29';
$adminProfileId = 'd77c7cde-4a84-4478-8fc1-c83f8fd903e7';
$mudarPassHash = '$2a$10$i02Hf10sEisUY..wnx0VmOD6Qnz60p99fDMVP.3lpoUpS2hl5DBqO'; // Hash para 'Mudar123!'
$defaultPlan = '5c09eeb7-100f-4f84-aaa7-9bcc5df05306';

$mysqli->query("INSERT INTO users (id, email, password_hash, role) VALUES ('$adminUserId', 'adriano_amorim@hotmail.com', '$mudarPassHash', 'ADMIN') ON DUPLICATE KEY UPDATE password_hash='$mudarPassHash', role='ADMIN'");
$mysqli->query("INSERT INTO broker_profiles (id, user_id, email, full_name, role, status, phone, cpf_cnpj, company_name, subscription_plan_id) VALUES ('$adminProfileId', '$adminUserId', 'adriano_amorim@hotmail.com', 'Adriano Amorim Souza', 'ADMIN', 'Ativo', '(92)9915191467', '70153841249', 'ADMINISTRADOR DO SISTEMA', '$defaultPlan') ON DUPLICATE KEY UPDATE full_name='Adriano Amorim Souza', role='ADMIN', cpf_cnpj='70153841249', status='Ativo'");

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

// Rotas de Administração (/admin/metrics, /admin/users)
if (strpos($uri, '/admin') === 0) {
    $user = getAuthUser($mysqli, $jwtSecret);
    if (!$user || $user['role'] !== 'ADMIN') {
        http_response_code(403);
        echo json_encode(['error' => 'Acesso restrito a administradores']);
        exit;
    }

    if ($uri === '/admin/metrics') {
        $uRes = $mysqli->query("SELECT COUNT(*) as cnt FROM users");
        $totalUsers = $uRes ? (int)$uRes->fetch_assoc()['cnt'] : 0;

        $iRes = $mysqli->query("SELECT COUNT(*) as cnt FROM inspections");
        $totalInspections = $iRes ? (int)$iRes->fetch_assoc()['cnt'] : 0;

        $subRes = $mysqli->query("SELECT COUNT(*) as cnt FROM broker_profiles WHERE status = 'Ativo'");
        $activeSubscriptions = $subRes ? (int)$subRes->fetch_assoc()['cnt'] : 0;

        $pRes = $mysqli->query("SELECT COUNT(*) as cnt FROM properties");
        $totalProperties = $pRes ? (int)$pRes->fetch_assoc()['cnt'] : 0;

        $mrrRes = $mysqli->query("SELECT SUM(p.price) as mrr FROM broker_profiles bp JOIN plans p ON bp.subscription_plan_id = p.id WHERE bp.status = 'Ativo'");
        $mrrRow = $mrrRes ? $mrrRes->fetch_assoc() : null;
        $mrr = $mrrRow ? (float)($mrrRow['mrr'] ?? 0) : 0;

        echo json_encode([
            'totalUsers' => $totalUsers,
            'newUsers30Days' => $totalUsers,
            'totalInspections' => $totalInspections,
            'activeSubscriptions' => $activeSubscriptions,
            'totalProperties' => $totalProperties,
            'mrr' => $mrr
        ]);
        exit;
    }

    if ($uri === '/admin/users') {
        $res = $mysqli->query("SELECT bp.*, u.email as user_email, p.name as plan_name FROM broker_profiles bp LEFT JOIN users u ON bp.user_id = u.id LEFT JOIN plans p ON bp.subscription_plan_id = p.id ORDER BY bp.created_at DESC");
        $usersList = [];
        while ($row = $res->fetch_assoc()) {
            $usersList[] = $row;
        }
        echo json_encode($usersList);
        exit;
    }
}

// Perfis / Broker Profiles
if (strpos($uri, '/broker_profiles') === 0) {
    $user = getAuthUser($mysqli, $jwtSecret);
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'Não autorizado']); exit; }

    $parts = explode('/', trim($uri, '/'));

    if ($method === 'GET') {
        // Se houver ID específico na URL (/broker_profiles/xyz)
        if (count($parts) === 2 && strlen($parts[1]) > 5) {
            $targetId = $mysqli->real_escape_string($parts[1]);
            $res = $mysqli->query("SELECT bp.*, p.name as plan_name FROM broker_profiles bp LEFT JOIN plans p ON bp.subscription_plan_id = p.id WHERE bp.id = '$targetId' OR bp.user_id = '$targetId'");
            if ($res && $r = $res->fetch_assoc()) {
                echo json_encode($r);
            } else {
                http_response_code(404); echo json_encode(['error' => 'Perfil não encontrado']);
            }
            exit;
        }

        // Filtros via query string
        $filterUserId = $_GET['user_id'] ?? null;
        $filterId = $_GET['id'] ?? null;
        $filterEmail = $_GET['email'] ?? null;

        $whereConditions = [];
        if ($filterUserId) {
            $eUserId = $mysqli->real_escape_string($filterUserId);
            $whereConditions[] = "bp.user_id = '$eUserId'";
        }
        if ($filterId) {
            $eId = $mysqli->real_escape_string($filterId);
            $whereConditions[] = "(bp.id = '$eId' OR bp.user_id = '$eId')";
        }
        if ($filterEmail) {
            $eEmail = $mysqli->real_escape_string($filterEmail);
            $whereConditions[] = "bp.email = '$eEmail'";
        }

        // Se nenhum filtro foi informado e não for ADMIN, filtra por si mesmo
        if (empty($whereConditions)) {
            if ($user['role'] !== 'ADMIN') {
                $whereConditions[] = "bp.user_id = '{$user['id']}'";
            }
        }

        $whereClause = !empty($whereConditions) ? "WHERE " . implode(' AND ', $whereConditions) : "";
        $res = $mysqli->query("SELECT bp.*, p.name as plan_name FROM broker_profiles bp LEFT JOIN plans p ON bp.subscription_plan_id = p.id $whereClause ORDER BY bp.created_at DESC");
        $profilesList = [];
        while ($r = $res->fetch_assoc()) {
            $profilesList[] = $r;
        }
        echo json_encode($profilesList);
        exit;
    }

    if ($method === 'PUT') {
        $targetId = (count($parts) === 2) ? $parts[1] : ($user['id']);
        $eTargetId = $mysqli->real_escape_string($targetId);

        $fullName = isset($body['full_name']) ? $mysqli->real_escape_string($body['full_name']) : null;
        $phone = isset($body['phone']) ? $mysqli->real_escape_string($body['phone']) : null;
        $creci = isset($body['creci']) ? $mysqli->real_escape_string($body['creci']) : null;
        $companyName = isset($body['company_name']) ? $mysqli->real_escape_string($body['company_name']) : null;
        $avatarUrl = isset($body['avatar_url']) ? $mysqli->real_escape_string($body['avatar_url']) : null;
        $cpfCnpj = isset($body['cpf_cnpj']) ? $mysqli->real_escape_string($body['cpf_cnpj']) : null;

        $updates = [];
        if ($fullName !== null) $updates[] = "full_name = '$fullName'";
        if ($phone !== null) $updates[] = "phone = '$phone'";
        if ($creci !== null) $updates[] = "creci = '$creci'";
        if ($companyName !== null) $updates[] = "company_name = '$companyName'";
        if ($avatarUrl !== null) $updates[] = "avatar_url = '$avatarUrl'";
        if ($cpfCnpj !== null) $updates[] = "cpf_cnpj = '$cpfCnpj'";

        if (!empty($updates)) {
            $setSql = implode(', ', $updates);
            $mysqli->query("UPDATE broker_profiles SET $setSql WHERE id = '$eTargetId' OR user_id = '$eTargetId'");
        }

        $res = $mysqli->query("SELECT bp.*, p.name as plan_name FROM broker_profiles bp LEFT JOIN plans p ON bp.subscription_plan_id = p.id WHERE bp.id = '$eTargetId' OR bp.user_id = '$eTargetId'");
        echo json_encode($res ? $res->fetch_assoc() : ['success' => true]);
        exit;
    }
}

// Imóveis: CRUD
if (strpos($uri, '/properties') === 0) {
    $user = getAuthUser($mysqli, $jwtSecret);
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'Não autorizado']); exit; }

    if ($method === 'GET') {
        $filterUserId = $_GET['user_id'] ?? null;
        $filterId = $_GET['id'] ?? null;
        $whereConditions = [];

        if ($filterUserId) {
            $eUserId = $mysqli->real_escape_string($filterUserId);
            $whereConditions[] = "user_id = '$eUserId'";
        }
        if ($filterId) {
            $eId = $mysqli->real_escape_string($filterId);
            $whereConditions[] = "id = '$eId'";
        }

        if (empty($whereConditions)) {
            if ($user['role'] !== 'ADMIN') {
                $whereConditions[] = "user_id = '{$user['id']}'";
            }
        }

        $whereClause = !empty($whereConditions) ? "WHERE " . implode(' AND ', $whereConditions) : "";
        $res = $mysqli->query("SELECT * FROM properties $whereClause ORDER BY created_at DESC");
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

        $filterUserId = $_GET['user_id'] ?? null;
        $whereConditions = [];

        if ($filterUserId) {
            $eUserId = $mysqli->real_escape_string($filterUserId);
            $whereConditions[] = "user_id = '$eUserId'";
        }

        if (empty($whereConditions)) {
            if ($user['role'] !== 'ADMIN') {
                $whereConditions[] = "user_id = '{$user['id']}'";
            }
        }

        $whereClause = !empty($whereConditions) ? "WHERE " . implode(' AND ', $whereConditions) : "";
        $res = $mysqli->query("SELECT * FROM inspections $whereClause ORDER BY created_at DESC");
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
        $clientName = $mysqli->real_escape_string($body['client_name'] ?? $body['clientName'] ?? '');
        $propertyAddress = $mysqli->real_escape_string($body['property_address'] ?? $body['propertyAddress'] ?? '');
        $inspectorName = $mysqli->real_escape_string($body['inspector_name'] ?? $body['inspectorName'] ?? '');
        $type = $mysqli->real_escape_string($body['type'] ?? 'Entrada');
        $status = $mysqli->real_escape_string($body['status'] ?? 'Em Andamento');
        $dataJson = $mysqli->real_escape_string(json_encode($body['data'] ?? []));

        $mysqli->query("INSERT INTO inspections (id, user_id, client_name, property_address, inspector_name, type, status, data_json) VALUES ('$id', '{$user['id']}', '$clientName', '$propertyAddress', '$inspectorName', '$type', '$status', '$dataJson')");
        $res = $mysqli->query("SELECT * FROM inspections WHERE id = '$id'");
        $row = $res->fetch_assoc();
        if ($row && $row['data_json']) $row['data'] = json_decode($row['data_json'], true);
        echo json_encode($row);
        exit;
    }
}

// Clientes: CRUD
if (strpos($uri, '/clients') === 0) {
    $user = getAuthUser($mysqli, $jwtSecret);
    if (!$user) { http_response_code(401); echo json_encode(['error' => 'Não autorizado']); exit; }

    if ($method === 'GET') {
        $filterUserId = $_GET['user_id'] ?? null;
        $filterId = $_GET['id'] ?? null;
        $whereConditions = [];

        if ($filterUserId) {
            $eUserId = $mysqli->real_escape_string($filterUserId);
            $whereConditions[] = "user_id = '$eUserId'";
        }
        if ($filterId) {
            $eId = $mysqli->real_escape_string($filterId);
            $whereConditions[] = "id = '$eId'";
        }

        if (empty($whereConditions)) {
            if ($user['role'] !== 'ADMIN') {
                $whereConditions[] = "user_id = '{$user['id']}'";
            }
        }

        $whereClause = !empty($whereConditions) ? "WHERE " . implode(' AND ', $whereConditions) : "";
        $res = $mysqli->query("SELECT * FROM clients $whereClause ORDER BY created_at DESC");
        $items = [];
        while ($r = $res->fetch_assoc()) {
            $items[] = $r;
        }
        echo json_encode($items);
        exit;
    }
}

// System Configs & Reviews & Cookie Consents
if (strpos($uri, '/system_configs') === 0) {
    if ($method === 'GET') {
        $res = $mysqli->query("SELECT * FROM system_configs");
        $items = [];
        while ($r = $res->fetch_assoc()) $items[] = $r;
        echo json_encode($items);
        exit;
    }
}

if (strpos($uri, '/system_reviews') === 0) {
    if ($method === 'GET') {
        $res = $mysqli->query("SELECT * FROM system_reviews");
        $items = [];
        while ($r = $res->fetch_assoc()) $items[] = $r;
        echo json_encode($items);
        exit;
    }
}

if (strpos($uri, '/cookie_consents') === 0) {
    if ($method === 'GET') {
        $res = $mysqli->query("SELECT * FROM cookie_consents");
        $items = [];
        while ($r = $res->fetch_assoc()) $items[] = $r;
        echo json_encode($items);
        exit;
    }
}

// Rota padrão 404
http_response_code(404);
echo json_encode(['error' => "Rota não encontrada: {$uri}"]);
