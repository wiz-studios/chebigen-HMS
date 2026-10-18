import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'

// Run after pnpm build. Use dummy configuration and never contact production.
const port = 3101
const origin = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, [
  'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port),
], {
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'security-validation-placeholder',
  },
  stdio: 'ignore',
})

try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Validation server exited before becoming ready')
    try {
      await fetch(`${origin}/auth/login`, { signal: AbortSignal.timeout(1000) })
      ready = true
      break
    } catch { await setTimeout(100) }
  }
  assert.ok(ready, 'Validation server must become ready')

  let checks = 0
  for (const path of ['/auth/login', '/auth/signup', '/dashboard', '/reports', '/reports/templates', '/notifications']) {
    for (const headers of [
      {},
      { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' },
      { 'x-nextjs-data': '1' },
    ]) {
      const response = await fetch(`${origin}${path}`, {
        headers, redirect: 'manual', signal: AbortSignal.timeout(5000),
      })
      if (path.startsWith('/auth/')) {
        assert.equal(response.status, 200, `${path}: public auth page`)
      } else {
        assert.equal(response.status, 307, `${path}: unauthenticated access must redirect`)
        assert.equal(new URL(response.headers.get('location'), origin).pathname, '/auth/login')
      }
      await response.arrayBuffer()
      checks++
    }
  }
  console.log(`${checks} HTTP security smoke checks: PASS`)
} finally {
  server.kill('SIGTERM')
}
