<?php
header('Content-Type: text/plain');

$host = 'localhost';
$user = 'vaivistoriar_root';
$pass = '{fPOX[NZEdPhZl_(';
$db   = 'vaivistoriar_2026';

$mysqli = new mysqli($host, $user, $pass, $db);
if ($mysqli->connect_error) {
    die("Conexao falhou: " . $mysqli->connect_error);
}

$sqlPath = __DIR__ . '/schema_mysql.sql';
if (!file_exists($sqlPath)) {
    $sqlPath = __DIR__ . '/../schema_mysql.sql';
}

if (!file_exists($sqlPath)) {
    die("Arquivo schema_mysql.sql nao encontrado!");
}

$sql = file_get_contents($sqlPath);

if ($mysqli->multi_query($sql)) {
    do {
        if ($result = $mysqli->store_result()) {
            $result->free();
        }
    } while ($mysqli->more_results() && $mysqli->next_result());
    echo "MIGRACAO_CONCLUIDA_COM_SUCESSO\n";
} else {
    echo "Erro na migracao: " . $mysqli->error . "\n";
}

// Listar tabelas criadas
$result = $mysqli->query("SHOW TABLES");
echo "\nTabelas no banco $db:\n";
while ($row = $result->fetch_array()) {
    echo "- " . $row[0] . "\n";
}

$mysqli->close();
?>
