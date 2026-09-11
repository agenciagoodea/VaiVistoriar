<?php
header('Content-Type: text/plain; charset=utf-8');
ini_set('max_execution_time', 600);
set_time_limit(600);

echo "====================================================\n";
echo "  MIGRAÇÃO PURA PHP DO SUPABASE PARA MYSQL CPANEL   \n";
echo "====================================================\n\n";

$host = 'localhost';
$user = 'vaivistoriar_root';
$pass = '{fPOX[NZEdPhZl_(';
$db   = 'vaivistoriar_2026';

$mysqli = new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_error) {
    die("Conexão MySQL falhou: " . $mysqli->connect_error . "\n");
}
$mysqli->set_charset('utf8mb4');

echo "Conectado ao MySQL database: $db\n";

$supabaseUrl = 'https://cmrgzaoexmjilvbuduek.supabase.co';
$supabaseKey = 'sb_publishable_jD3NgKax7-Hji9-5zvUWGw_2KdanWcU';

$uploadsDir = __DIR__ . '/uploads';
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

// Função para buscar dados da REST API do Supabase
function fetchSupabaseTable($table) {
    global $supabaseUrl, $supabaseKey;
    $url = "$supabaseUrl/rest/v1/$table?select=*";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "apikey: $supabaseKey",
        "Authorization: Bearer $supabaseKey"
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true) ?: [];
}

// Função para baixar imagens do Supabase e converter URL para /uploads/...
function downloadAndSaveImage($url) {
    global $uploadsDir;
    if (empty($url) || !is_string($url) || strpos($url, 'supabase.co') === false) {
        return $url;
    }

    try {
        $parsed = parse_url($url, PHP_URL_PATH);
        $filename = basename($parsed ?: 'file.png');
        $cleanName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
        $destFile = $uploadsDir . '/' . $cleanName;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        $imgData = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && !empty($imgData)) {
            file_put_contents($destFile, $imgData);
            echo "  [IMAGEM SALVA] /uploads/$cleanName\n";
            return "/uploads/$cleanName";
        }
    } catch (Exception $e) {
        echo "  [ERRO IMAGEM] " . $e->getMessage() . "\n";
    }
    return $url;
}

// 1. MIGRAÇÃO DE PLANOS
echo "\n1. Migrando Planos...\n";
$plans = fetchSupabaseTable('plans');
$stmt = $mysqli->prepare("INSERT INTO plans (id, name, slug, price, billing_cycle, status, features, max_inspections, max_photos, max_rooms, max_brokers, storage_gb, type, badge_text, duration_days, comparison_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), status=VALUES(status)");
$pCount = 0;
foreach ($plans as $p) {
    $id = $p['id'];
    $name = $p['name'];
    $slug = $p['slug'] ?? stristr(strtolower(str_replace(' ', '-', $name)), '', true);
    $price = $p['price'] ?? 0;
    $cycle = $p['billing_cycle'] ?? 'Mensal';
    $status = $p['status'] ?? 'Ativo';
    $features = json_encode($p['features'] ?? []);
    $maxInsp = $p['max_inspections'] ?? 10;
    $maxPhotos = $p['max_photos'] ?? 50;
    $maxRooms = $p['max_rooms'] ?? 20;
    $maxBrokers = $p['max_brokers'] ?? 1;
    $storageGb = $p['storage_gb'] ?? 1.0;
    $type = $p['plan_type'] ?? 'PF';
    $badge = $p['plan_badge_text'] ?? null;
    $duration = $p['duration_days'] ?? 30;
    $compPrice = $p['comparison_price'] ?? null;

    $stmt->bind_param("sssdsssiiiidssis", $id, $name, $slug, $price, $cycle, $status, $features, $maxInsp, $maxPhotos, $maxRooms, $maxBrokers, $storageGb, $type, $badge, $duration, $compPrice);
    if ($stmt->execute()) $pCount++;
}
echo "-> $pCount planos migrados.\n";

// 2. MIGRAÇÃO DE CONFIGURAÇÕES DO SISTEMA
echo "\n2. Migrando Configurações do Sistema...\n";
$configs = fetchSupabaseTable('system_configs');
$stmtConf = $mysqli->prepare("INSERT INTO system_configs (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)");
$cCount = 0;
foreach ($configs as $c) {
    $key = $c['key'];
    $val = is_array($c['value']) ? json_encode($c['value']) : (string)($c['value'] ?? '');
    $stmtConf->bind_param("ss", $key, $val);
    if ($stmtConf->execute()) $cCount++;
}
echo "-> $cCount configurações migradas.\n";

// 3. MIGRAÇÃO DE PERFIS E USUÁRIOS
echo "\n3. Migrando Usuários e Perfis...\n";
$profiles = fetchSupabaseTable('broker_profiles');
$stmtUser = $mysqli->prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE email=VALUES(email)");
$stmtProf = $mysqli->prepare("INSERT INTO broker_profiles (id, user_id, email, full_name, role, status, phone, cpf_cnpj, creci, company_name, avatar_url, subscription_plan_id, subscription_expires_at, parent_pj_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), phone=VALUES(phone), avatar_url=VALUES(avatar_url)");
$profCount = 0;
// Hash bcrypt de 'Mudar123!'
$passHash = '$2a$10$7rX.XvU11bM2XvHk8/JqHe/p4n1.r4lV.r.8V79s0R1c6s0q1.q1S';

foreach ($profiles as $p) {
    $userId = $p['user_id'] ?? $p['id'];
    $email = $p['email'] ?? ("user_" . substr($userId, 0, 8) . "@vaivistoriar.com.br");
    $role = $p['role'] ?? 'BROKER';
    $fullName = $p['full_name'] ?? $email;
    $status = $p['status'] ?? 'Ativo';
    $phone = $p['phone'] ?? null;
    $cpfCnpj = $p['cpf_cnpj'] ?? null;
    $creci = $p['creci'] ?? null;
    $company = $p['company_name'] ?? null;
    $avatarUrl = downloadAndSaveImage($p['avatar_url'] ?? null);
    $planId = $p['subscription_plan_id'] ?? null;
    $expiresAt = !empty($p['subscription_expires_at']) ? date('Y-m-d H:i:s', strtotime($p['subscription_expires_at'])) : null;
    $parentPj = $p['parent_pj_id'] ?? null;

    $stmtUser->bind_param("ssss", $userId, $email, $passHash, $role);
    $stmtUser->execute();

    $stmtProf->bind_param("ssssssssssssss", $p['id'], $userId, $email, $fullName, $role, $status, $phone, $cpfCnpj, $creci, $company, $avatarUrl, $planId, $expiresAt, $parentPj);
    if ($stmtProf->execute()) $profCount++;
}
echo "-> $profCount perfis/usuários migrados.\n";

// 4. MIGRAÇÃO DE CLIENTES
echo "\n4. Migrando Clientes...\n";
$clients = fetchSupabaseTable('clients');
$stmtClient = $mysqli->prepare("INSERT INTO clients (id, user_id, name, email, phone, cpf, address, type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email)");
$clCount = 0;
foreach ($clients as $c) {
    $id = $c['id'];
    $uId = $c['user_id'];
    $name = $c['name'];
    $email = $c['email'] ?? null;
    $phone = $c['phone'] ?? null;
    $cpf = $c['document_number'] ?? $c['cpf'] ?? null;
    $addr = $c['address'] ?? null;
    $type = $c['profile_type'] ?? $c['type'] ?? 'Inquilino';
    $notes = $c['notes'] ?? null;

    $stmtClient->bind_param("sssssssss", $id, $uId, $name, $email, $phone, $cpf, $addr, $type, $notes);
    if ($stmtClient->execute()) $clCount++;
}
echo "-> $clCount clientes migrados.\n";

// 5. MIGRAÇÃO DE IMÓVEIS
echo "\n5. Migrando Imóveis...\n";
$properties = fetchSupabaseTable('properties');
$stmtProp = $mysqli->prepare("INSERT INTO properties (id, user_id, name, address, owner, type, image) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), address=VALUES(address), image=VALUES(image)");
$prCount = 0;
foreach ($properties as $prop) {
    $id = $prop['id'];
    $uId = $prop['user_id'];
    $name = $prop['name'];
    $addr = $prop['address'] ?? '';
    $owner = $prop['owner'] ?? null;
    $type = $prop['type'] ?? 'Apartamento';
    $img = downloadAndSaveImage($prop['image_url'] ?? $prop['facade_url'] ?? $prop['image'] ?? null);

    $stmtProp->bind_param("sssssss", $id, $uId, $name, $addr, $owner, $type, $img);
    if ($stmtProp->execute()) $prCount++;
}
echo "-> $prCount imóveis migrados.\n";

// 6. MIGRAÇÃO DE VISTORIAS E FOTOS DE VISTORIA
echo "\n6. Migrando Vistorias e Fotos...\n";
$inspections = fetchSupabaseTable('inspections');
$stmtInsp = $mysqli->prepare("INSERT INTO inspections (id, user_id, property, address, client, type, date, status, image, pdf_url, email_sent_at, whatsapp_sent_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE property=VALUES(property), status=VALUES(status), data_json=VALUES(data_json)");
$inCount = 0;
foreach ($inspections as $insp) {
    $id = $insp['id'];
    $uId = $insp['user_id'];
    $propName = $insp['property_name'] ?? $insp['property'] ?? 'Imóvel';
    $addr = $insp['address'] ?? '';
    $clientName = $insp['client_name'] ?? $insp['client'] ?? '';
    $type = $insp['type'] ?? 'Entrada';
    $date = !empty($insp['scheduled_date']) ? date('Y-m-d', strtotime($insp['scheduled_date'])) : date('Y-m-d');
    $status = $insp['status'] ?? 'Rascunho';
    $image = downloadAndSaveImage($insp['image_url'] ?? $insp['image'] ?? null);
    $pdfUrl = $insp['pdf_url'] ?? null;
    $emailSent = !empty($insp['email_sent_at']) ? date('Y-m-d H:i:s', strtotime($insp['email_sent_at'])) : null;
    $whatsSent = !empty($insp['whatsapp_sent_at']) ? date('Y-m-d H:i:s', strtotime($insp['whatsapp_sent_at'])) : null;

    // Baixar fotos dos cômodos
    $rooms = $insp['rooms'] ?? [];
    if (is_array($rooms)) {
        foreach ($rooms as &$room) {
            if (isset($room['photos']) && is_array($room['photos'])) {
                foreach ($room['photos'] as &$photo) {
                    if (!empty($photo['url'])) {
                        $photo['url'] = downloadAndSaveImage($photo['url']);
                    }
                }
            }
        }
    }

    // Baixar foto das chaves
    $keys = $insp['keys_data'] ?? [];
    if (is_array($keys) && !empty($keys['photo_url'])) {
        $keys['photo_url'] = downloadAndSaveImage($keys['photo_url']);
    }

    $dataJson = json_encode([
        'rooms' => $rooms,
        'keys_data' => $keys,
        'general_observations' => $insp['general_observations'] ?? '',
        'extra_costs' => $insp['extra_costs'] ?? [],
        'broker_data' => $insp['broker_data'] ?? []
    ]);

    $stmtInsp->bind_param("sssssssssssss", $id, $uId, $propName, $addr, $clientName, $type, $date, $status, $image, $pdfUrl, $emailSent, $whatsSent, $dataJson);
    if ($stmtInsp->execute()) $inCount++;
}
echo "-> $inCount vistorias migradas.\n";

// 7. MIGRAÇÃO DE AVALIAÇÕES
echo "\n7. Migrando Avaliações...\n";
$reviews = fetchSupabaseTable('system_reviews');
$stmtRev = $mysqli->prepare("INSERT INTO system_reviews (id, user_id, rating, comment, is_approved, created_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)");
$rCount = 0;
foreach ($reviews as $r) {
    $id = $r['id'];
    $uId = $r['user_id'];
    $rating = $r['rating'] ?? 5;
    $comment = $r['comment'] ?? null;
    $isApp = !empty($r['is_approved']) ? 1 : 0;
    $createdAt = !empty($r['created_at']) ? date('Y-m-d H:i:s', strtotime($r['created_at'])) : date('Y-m-d H:i:s');

    $stmtRev->bind_param("ssisis", $id, $uId, $rating, $comment, $isApp, $createdAt);
    if ($stmtRev->execute()) $rCount++;
}
echo "-> $rCount avaliações migradas.\n";

echo "\n====================================================\n";
echo "  MIGRAÇÃO DE DADOS E ARQUIVOS CONCLUÍDA COM SUCESSO!\n";
echo "====================================================\n";

$mysqli->close();
?>
