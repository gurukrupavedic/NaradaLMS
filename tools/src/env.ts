import { chmod, copyFile, lstat, mkdir, readFile, symlink, unlink } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineCommand, runMain } from 'citty'
import { execa } from 'execa'

const toolsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(toolsRoot, '..')
const rootEnvPath = join(repoRoot, '.env')
const encryptedEnvPath = join(repoRoot, 'packages/env/.env.sops')
const sopsConfigPath = join(repoRoot, '.sops.yaml')

const envTargets = [
  'apps/web/.env.local',
  'apps/api/.env',
  'packages/env/.env',
]

const fetch = defineCommand({
  meta: { description: 'Decrypt packages/env/.env.sops into root .env and recreate workspace .env files.' },
  async run() { await fetchEnv() },
})

const encrypt = defineCommand({
  meta: { description: 'Encrypt root .env into packages/env/.env.sops.' },
  async run() { await encryptEnv() },
})

const link = defineCommand({
  meta: { description: 'Recreate workspace .env symlinks pointing to root .env.' },
  async run() { await linkEnv() },
})

runMain(defineCommand({
  meta: { name: 'env', description: 'Manage encrypted environment files.' },
  subCommands: { fetch, encrypt, link },
}))

async function fetchEnv() {
  await assertFile(encryptedEnvPath, 'Missing packages/env/.env.sops. Ask a maintainer to create it.')
  await sops([
    '--decrypt',
    '--input-type',
    'dotenv',
    '--output-type',
    'dotenv',
    '--output',
    rootEnvPath,
    encryptedEnvPath,
  ])

  await chmod(rootEnvPath, 0o600)
  await linkEnv()
  console.log('Wrote root .env.')
  console.log('Recreated workspace .env files.')
}

async function encryptEnv() {
  await assertFile(rootEnvPath, 'Missing root .env. Create it locally before running pnpm env:encrypt.')
  await assertUsableSopsConfig()
  await sops([
    '--encrypt',
    '--input-type',
    'dotenv',
    '--output-type',
    'dotenv',
    '--filename-override',
    'packages/env/.env.sops',
    '--output',
    encryptedEnvPath,
    rootEnvPath,
  ])

  console.log('Wrote packages/env/.env.sops.')
}

async function linkEnv() {
  await assertFile(rootEnvPath, 'Missing root .env. Run pnpm env:fetch or create it locally first.')
  for (const target of envTargets.map(path => join(repoRoot, path))) {
    await mkdir(dirname(target), { recursive: true })
    await replaceSymlinkOrCopy(target)
  }
}

async function replaceSymlinkOrCopy(target: string) {
  if (await isSymlink(target)) {
    await unlink(target)
  }

  try {
    await symlink(relative(dirname(target), rootEnvPath), target)
  } catch {
    await copyFile(rootEnvPath, target)
    await chmod(target, 0o600)
  }
}

async function assertUsableSopsConfig() {
  await assertFile(sopsConfigPath, 'Missing .sops.yaml. Add age recipients before encrypting env files.')
  const config = await readFile(sopsConfigPath, 'utf8')
  if (config.includes('age1replace-with-developer-recipient')) {
    throw new Error('Replace the placeholder age recipient in .sops.yaml before encrypting env files.')
  }
}

async function assertFile(path: string, message: string) {
  try {
    const stat = await lstat(path)
    if (!stat.isFile()) {
      throw new Error(message)
    }
  } catch {
    throw new Error(message)
  }
}

async function isSymlink(path: string) {
  try {
    return (await lstat(path)).isSymbolicLink()
  } catch {
    return false
  }
}

async function sops(args: string[]) {
  try {
    await execa('sops', args, { cwd: repoRoot, stdio: 'inherit' })
  } catch (error) {
    if (isMissingCommand(error)) {
      throw new Error('Missing command: sops. Install SOPS with `brew install sops`.')
    }

    throw error
  }
}

function isMissingCommand(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
