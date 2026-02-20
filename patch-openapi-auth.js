const fs = require('fs');
const path = 'openapi.yaml';
let c = fs.readFileSync(path, 'utf8');
const old = [
  '  securitySchemes:',
  '    sessionAuth:',
  '      type: apiKey',
  '      in: cookie',
  '      name: connect.sid',
  '      description: PostgreSQL-backed session cookie (Passport.js)',
].join('\n');
const newBlock = [
  '  securitySchemes:',
  '    bearerAuth:',
  '      type: http',
  '      scheme: bearer',
  '      bearerFormat: JWT',
  '      description: JWT obtained from POST /api/auth/login; send as Authorization Bearer <token>',
].join('\n');
if (!c.includes('sessionAuth')) {
  console.error('sessionAuth not found');
  process.exit(1);
}
c = c.replace(old, newBlock);
fs.writeFileSync(path, c);
console.log('Done');
