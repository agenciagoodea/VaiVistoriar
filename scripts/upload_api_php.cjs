const net = require('net');
const fs = require('fs');

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

function uploadApi() {
  return new Promise((resolve) => {
    const ctrl = new net.Socket();
    ctrl.setTimeout(20000);

    ctrl.on('error', (err) => {
      console.log(` ❌ Erro: ${err.message}`);
      resolve(false);
    });

    ctrl.on('timeout', () => {
      console.log(` ❌ Timeout`);
      ctrl.destroy();
      resolve(false);
    });

    ctrl.connect(21, FTP_HOST, async () => {
      try {
        let resp = await new Promise(r => ctrl.once('data', d => r(d.toString())));
        resp = await sendCommand(ctrl, `USER ${FTP_USER}`);
        resp = await sendCommand(ctrl, `PASS ${FTP_PASS}`);
        if (!resp.startsWith('230')) {
          console.log(` ❌ Auth incorreta: ${resp.trim()}`);
          ctrl.destroy();
          resolve(false);
          return;
        }

        await sendCommand(ctrl, 'TYPE I');
        resp = await sendCommand(ctrl, 'PASV');
        const pasv = parsePasv(resp);
        if (!pasv) {
          ctrl.destroy();
          resolve(false);
          return;
        }

        const dataSocket = new net.Socket();
        dataSocket.connect(pasv.port, pasv.host, async () => {
          resp = await sendCommand(ctrl, 'STOR public_html/api.php');
          const rs = fs.createReadStream('public/api.php');
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
  console.log('Subindo public/api.php com o novo hash de senha...');
  const ok = await uploadApi();
  if (ok) console.log('🎉 public/api.php ENVIADO COM SUCESSO!');
  else console.log('❌ Falha ao enviar api.php');
}

main();
