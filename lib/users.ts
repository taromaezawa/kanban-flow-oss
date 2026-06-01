// lib/users.ts
import { readFileSync } from 'fs'
import { join } from 'path'

export interface User {
  name: string
  email: string
  password: string
}

export interface Settings {
  slack?: { webhook_url: string; channel: string }
  users: User[]
}

let cached: Settings | null = null

export function getSettings(): Settings {
  if (cached) return cached
  // 本番(Vercel)では settei.json が git 除外で存在しないため、環境変数 SETTINGS_JSON を優先。
  // ローカル開発では従来どおり settei.json を読む。
  const fromEnv = process.env.SETTINGS_JSON
  const raw = fromEnv && fromEnv.trim()
    ? fromEnv
    : readFileSync(join(process.cwd(), 'settei.json'), 'utf-8')
  cached = JSON.parse(raw) as Settings
  return cached
}

export function findUserByEmail(email: string): User | null {
  const { users } = getSettings()
  return users.find(u => u.email === email) ?? null
}

export function getAllUsers(): Omit<User, 'password'>[] {
  const { users } = getSettings()
  return users.map(({ name, email }) => ({ name, email }))
}
