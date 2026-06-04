import { spawn } from 'child_process'
import { readdirSync } from 'fs'
import { join } from 'path'

const PROJECT_DIR = '/home/z/my-project'
const PORT = 3000
const MAX_RESTARTS = 50
let restartCount = 0

function killExisting() {
  try {
    // Kill any existing next dev processes on port 3000
    const result = Bun.spawnSync(['fuser', '-k', `${PORT}/tcp`], { stderr: 'pipe' })
    console.log('Killed existing processes on port', PORT)
  } catch {
    // ignore
  }
}

function startDev() {
  if (restartCount >= MAX_RESTARTS) {
    console.error(`Max restarts (${MAX_RESTARTS}) reached. Stopping.`)
    process.exit(1)
  }

  restartCount++
  console.log(`\n[${new Date().toISOString()}] Starting Next.js dev server (attempt ${restartCount})...`)

  const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    cwd: PROJECT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  })

  let lastOutput = ''

  child.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString()
    lastOutput = msg
    process.stdout.write(msg)
  })

  child.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString()
    lastOutput = msg
    process.stderr.write(msg)
  })

  child.on('close', (code, signal) => {
    console.log(`\n[${new Date().toISOString()}] Next.js process exited with code=${code} signal=${signal}`)
    console.log('Restarting in 3 seconds...')
    setTimeout(() => startDev(), 3000)
  })

  child.on('error', (err) => {
    console.error(`\n[${new Date().toISOString()}] Failed to start:`, err)
    setTimeout(() => startDev(), 5000)
  })
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\nKeeper shutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\nKeeper terminated...')
  process.exit(0)
})

// Start
killExisting()
setTimeout(() => startDev(), 2000)
