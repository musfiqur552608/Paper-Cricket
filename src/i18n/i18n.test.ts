import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BOARD_SEGMENTS } from '../config/gameConfig'
import { translations } from './index'

type Leaf = string | string[]
type Tree = { [key: string]: Leaf | Tree }

function isLeaf(value: Leaf | Tree): value is Leaf {
  return typeof value === 'string' || Array.isArray(value)
}

function flatten(tree: Tree, prefix = ''): Set<string> {
  const keys = new Set<string>()
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (isLeaf(value)) keys.add(path)
    else flatten(value, path).forEach((nested) => keys.add(nested))
  }
  return keys
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) ? [full] : []
  })
}

function staticTranslationKeys(): Map<string, string[]> {
  const found = new Map<string, string[]>()
  const pattern = /\bt\(\s*['"]([A-Za-z0-9_.-]+)['"]/g
  for (const file of sourceFiles(resolve(process.cwd(), 'src'))) {
    if (file.endsWith(join('i18n', 'index.ts'))) continue
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(pattern)) {
      const key = match[1]
      if (!key) continue
      const list = found.get(key) ?? []
      list.push(relative(process.cwd(), file))
      found.set(key, list)
    }
  }
  return found
}

describe('translations', () => {
  it('has exactly the same keys in Bengali and English', () => {
    const en = flatten(translations.en)
    const bn = flatten(translations.bn)
    expect([...en].filter((key) => !bn.has(key))).toEqual([])
    expect([...bn].filter((key) => !en.has(key))).toEqual([])
  })

  it('contains every statically referenced translation key', () => {
    const en = flatten(translations.en)
    const missing = [...staticTranslationKeys()]
      .filter(([key]) => !en.has(key))
      .map(([key, files]) => `${key} (${[...new Set(files)].join(', ')})`)
    expect(missing).toEqual([])
  })

  it('has a non-empty value for every key', () => {
    const empty = [...flatten(translations.en)].filter((key) => {
      const value = key.split('.').reduce<unknown>((node, part) => (node as Tree)?.[part], translations.en)
      if (typeof value === 'string') return value.trim().length === 0
      if (Array.isArray(value)) return value.length === 0 || value.some((entry) => entry.trim().length === 0)
      return true
    })
    expect(empty).toEqual([])
  })

  it('has a commentary pool for every board outcome', () => {
    for (const language of ['en', 'bn'] as const) {
      const commentary = translations[language].commentary as unknown as Record<string, string[]>
      for (const segment of BOARD_SEGMENTS) {
        expect(commentary[segment.code]?.length, `${language} commentary for ${segment.code}`).toBeGreaterThan(0)
      }
      for (const key of ['freeHitSave', 'freeHitFour', 'freeHitSix']) {
        expect(commentary[key]?.length, `${language} commentary for ${key}`).toBeGreaterThan(0)
      }
    }
  })
})
