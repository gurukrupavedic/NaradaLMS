
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLIENT_SRC = path.join(PROJECT_ROOT, 'client', 'src');

// Define the "Future Buckets" based on the Implementation Plan
// These are folders that WILL move to packages/ui
const SHARED_CANDIDATES = [
  path.join(CLIENT_SRC, 'components', 'ui'), // All UI primitives + Tiptap
  path.join(CLIENT_SRC, 'components', 'layout'), // Layouts
  path.join(CLIENT_SRC, 'features', 'shared'), // Shared pages/hooks
  path.join(CLIENT_SRC, 'lib'), // Shared utils (except utils.ts if it has specific app deps, but typically pure)
];

// These are folders that WILL move to apps/student-portal or apps/admin-portal
// Shared candidates MUST NOT import from these
const FORBIDDEN_DEPENDENCIES = [
  'features/learning',
  'features/admin',
  'features/instructor',
  'features/content',
  'features/batches',
  'features/student',
];

interface Violation {
  file: string;
  importPath: string;
  forbiddenRef: string;
}

function scanForViolations() {
  console.log('🔍 Starting Monorepo Readiness Verification...');
  console.log('=============================================');
  
  const violations: Violation[] = [];
  let scannedFiles = 0;

  // Helper to recursively walk directories
  function walkDir(dir: string, callback: (filePath: string) => void) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const dirPath = path.join(dir, f);
      const isDirectory = fs.statSync(dirPath).isDirectory();
      if (isDirectory) {
        walkDir(dirPath, callback);
      } else {
        if (f.endsWith('.ts') || f.endsWith('.tsx')) {
          callback(dirPath);
        }
      }
    }
  }

  // Check each shared candidate folder
  for (const candidateDir of SHARED_CANDIDATES) {
    console.log(`Checking candidate bucket: ${path.relative(PROJECT_ROOT, candidateDir)}`);
    
    walkDir(candidateDir, (filePath) => {
      scannedFiles++;
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Simple regex to catch imports
        // Matches: import ... from '...' or import(...) or require('...')
        const importMatch = line.match(/from\s+['"](.+)['"]|import\s*\(['"](.+)['"]\)/);
        
        if (importMatch) {
          const importPath = importMatch[1] || importMatch[2];
          if (!importPath) return;

          // Resolve alias @/ -> client/src/
          let resolvedImport = importPath;
          if (importPath.startsWith('@/')) {
             resolvedImport = importPath.replace('@/', '');
          }

          // Check against forbidden list
          for (const forbidden of FORBIDDEN_DEPENDENCIES) {
            if (resolvedImport.includes(forbidden)) {
              violations.push({
                file: path.relative(PROJECT_ROOT, filePath),
                importPath: importPath,
                forbiddenRef: forbidden
              });
            }
          }
        }
      });
    });
  }

  console.log('=============================================');
  console.log(`✅ Scanned ${scannedFiles} files.`);
  
  if (violations.length > 0) {
    console.error(`❌ Found ${violations.length} violations!`);
    console.error('Files destined for shared packages (packages/ui) are importing from app-specific features.');
    console.error('These must be refactored before migration.\n');
    
    violations.forEach((v, i) => {
      console.error(`${i + 1}. [${v.file}] imports [${v.importPath}]`);
    });
    
    process.exit(1);
  } else {
    console.log('✨ SUCCESS! No "Virtual Split" violations found.');
    console.log('The checked folders are ready to be moved to packages/ui.');
    process.exit(0);
  }
}

scanForViolations();
