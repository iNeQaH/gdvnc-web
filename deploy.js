const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('cd /var/www/gdvnc-web-main && git pull origin main && npm run build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ && pm2 restart gdvn-web', (err, stream2) => {
    if (err) throw err;
    stream2.on('data', d => process.stdout.write(d))
           .stderr.on('data', d => process.stderr.write(d))
           .on('close', () => conn.end());
  });
}).connect({
  host: '103.231.248.235',
  port: 22,
  username: 'root',
  password: '$y1CTW@07NkC'
});
