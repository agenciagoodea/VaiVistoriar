const net = require('net');
const fs = require('fs');
const path = require('path');

const FTP_HOST = 'vaivistoriar.com.br';
const FTP_USER = 'vaivistoriar';
const FTP_PASS = '.k1g@(on]$7boL+x';

function sendCommand(socket, cmd) {
  return new Promise((resolve) => {
    const onData = (data) => {
      const resp = data.toString();
      socket.removeListener('data', onData);
      resolve(resp);
    };
    socket.on('data', onData);
    socket.write(cmd + '\r\n');
  });
}

function parsePasv(resp) {
  const match = resp.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
  if (!match) return null;
  return { host: `${match[1]}.${match[2]}.${match[3]}.${match[4]}`, port: parseInt(match[5]) * 256 + parseInt(match[6]) };
}

function uploadFile(localPath, remotePath) {
  return new Promise((resolve) => {
    const ctrl = new net.Socket();
    ctrl.setTimeout(25000);

    ctrl.on('error', (err) => {
      console.log(` ❌ Erro (${localPath}): ${err.message}`);
      resolve(false);
    });

    ctrl.on('timeout', () => {
      console.log(` ❌ Timeout (${localPath})`);
      ctrl.destroy();
      resolve(false);
    });

    ctrl.connect(21, FTP_HOST, async () => {
      try {
        let resp = await new Promise(r => ctrl.once('data', d => r(d.toString())));
        resp = await sendCommand(ctrl, `USER ${FTP_USER}`);
        resp = await sendCommand(ctrl, `PASS ${FTP_PASS}`);
        if (!resp.startsWith('230')) {
          console.log(` ❌ Auth incorreta`);
          ctrl.destroy();
          resolve(false);
          return;
        }

        await sendCommand(ctrl, 'TYPE I');

        const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
        if (remoteDir && remoteDir !== '.' && remoteDir !== '/') {
          const parts = remoteDir.split('/').filter(Boolean);
          let curr = '';
          for (const p of parts) {
            curr += '/' + p;
            await sendCommand(ctrl, `MKD ${curr}`);
          }
        }

        resp = await sendCommand(ctrl, 'PASV');
        const pasv = parsePasv(resp);
        if (!pasv) {
          ctrl.destroy();
          resolve(false);
          return;
        }

        const dataSocket = new net.Socket();
        dataSocket.connect(pasv.port, pasv.host, async () => {
          resp = await sendCommand(ctrl, `STOR ${remotePath}`);
          const rs = fs.createReadStream(localPath);
          rs.pipe(dataSocket);
          rs.on('end', () => dataSocket.end());
        });

        dataSocket.on('close', async () => {
          resp = await new Promise(r => ctrl.once('data', d => r(d.toString())));
          ctrl.write('QUIT\r\n');
          ctrl.end();
          resolve(resp.startsWith('226'));
        });

      } catch (e) {
        console.log(` ❌ Exceção: ${e.message}`);
        ctrl.destroy();
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log('=== ENVIANDO PACOTE CORRIGIDO DO FRONTEND (DIST) ===\n');

  const rootDir = path.resolve('.');
  const distDir = path.join(rootDir, 'dist');
  const items = [];

  function scan(dir) {
    const list = fs.readdirSync(dir);
    for (const f of list) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) scan(full);
      else {
        const rel = path.relative(distDir, full).replace(/\\/g, '/');
        items.push({ local: full, remote: `public_html/${rel}` });
      }
    }
  }
  scan(distDir);

  for (const item of items) {
    const rel = path.relative(rootDir, item.local).replace(/\\/g, '/');
    process.stdout.write(`Subindo ${rel} -> ${item.remote} ... `);
    let ok = await uploadFile(item.local, item.remote);
    if (!ok) {
      await new Promise(r => setTimeout(r, 2000));
      ok = await uploadFile(item.local, item.remote);
    }
    console.log(ok ? '✅ OK' : '❌ FALHOU');
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n=== FINALIZADO ===');
}

main();
