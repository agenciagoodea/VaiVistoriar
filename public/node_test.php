<?php
header('Content-Type: text/plain; charset=utf-8');

$nodeBin = '/opt/alt/alt-nodejs20/root/usr/bin/node';
$cmd = "cd /home/vaivistoriar/nodeapps/vaivistoriar && $nodeBin app.js 2>&1";

echo "Executando teste no Node 20: $cmd\n\n";

$descriptorspec = array(
   0 => array("pipe", "r"),
   1 => array("pipe", "w"),
   2 => array("pipe", "w")
);

$process = proc_open($cmd, $descriptorspec, $pipes, '/home/vaivistoriar/nodeapps/vaivistoriar');

if (is_resource($process)) {
    // Dar 2 segundos para o Node inicializar
    usleep(2000000);
    
    // Obter saida acumulada
    $status = proc_get_status($process);
    echo "Status do Processo Node.js:\n";
    print_r($status);
    
    // Ler stdout/stderr se houver erro
    stream_set_blocking($pipes[1], false);
    stream_set_blocking($pipes[2], false);
    
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    
    echo "\n--- STDOUT ---\n$stdout\n";
    echo "\n--- STDERR ---\n$stderr\n";
    
    proc_terminate($process);
    proc_close($process);
} else {
    echo "Falha ao iniciar proc_open\n";
}
?>
