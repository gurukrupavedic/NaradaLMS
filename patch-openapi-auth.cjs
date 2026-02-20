const fs = require('fs');
const path = 'openapi.yaml';
let c = fs.readFileSync(path, 'utf8');
// Match with flexible line endings
const old = /  securitySchemes:\r?\n    sessionAuth:\r?\n      type: apiKey\r?\n      in: cookie\r?\n      name: connect\.sid\r?\n      description: PostgreSQL-backed session cookie \(Passport\.js\)/;
const newBlock = `  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT obtained from POST /api/auth/login; send as Authorization Bearer <token>`;
if (!old.test(c)) {
  console.error('sessionAuth block not found');
  process.exit(1);
}
c = c.replace(old, newBlock);
fs.writeFileSync(path, c);
console.log('Done');
