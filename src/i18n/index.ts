import { messages } from './messages'

export const languages = [
  { value: 'en', label: 'English' },
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'pt-PT', label: 'Português' },
] as const
export type Language = typeof languages[number]['value']
const storageKey = 'printassist-language'
let language: Language = 'en'
try {
  const saved = typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey)
  if (languages.some(item => item.value === saved)) language = saved as Language
} catch { /* Language switching also works when storage is unavailable. */ }
const listeners = new Set<() => void>()
export const getLanguage = () => language
export const subscribeLanguage = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function setLanguage(next: Language) {
  if (!languages.some(item => item.value === next) || next === language) return
  language = next
  try { if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, next) } catch { /* Optional persistence. */ }
  listeners.forEach(listener => listener())
}

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
const patterns = Object.keys(messages).filter(key => /\{\w+\}/.test(key)).map(key => {
  const names: string[] = []
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const source = escaped.replace(/\\\{(\w+)\\\}/g, (_, name: string) => {
    names.push(name)
    return '(.+?)'
  })
  return { key, names, regex: new RegExp('^' + source + '$') }
})
export function t(value: string | number | null | undefined, variables?: Record<string, string | number>): string {
  if (value == null) return ''
  const original = String(value)
  const key = normalize(original)
  let translated = key
  let values = variables
  if (language !== 'en') {
    const entry = messages[key]
    if (entry) translated = entry[language === 'zh-Hant' ? 0 : 1]
    else {
      for (const pattern of patterns) {
        const match = pattern.regex.exec(key)
        if (!match) continue
        values = Object.fromEntries(pattern.names.map((name, index) => [name, match[index + 1]]))
        translated = messages[pattern.key][language === 'zh-Hant' ? 0 : 1]
        break
      }
    }
  }
  if (!values && translated === key) return original
  const result = translated.replace(/\{(\w+)\}/g, (token, name: string) => values?.[name] == null ? token : String(values[name]))
  return (original.match(/^\s*/)?.[0] || '') + result + (original.match(/\s*$/)?.[0] || '')
}
export const countLabel = (count: number, noun: string) => t('{count} ' + (count === 1 ? noun : noun === 'copy' ? 'copies' : noun + 's'), { count })
export function translateSummary(summary: string) {
  return summary.split(' · ').map(part => {
    const separator = part.indexOf(': ')
    return separator < 0 ? t(part) : t(part.slice(0, separator)) + ': ' + t(part.slice(separator + 2))
  }).join(' · ')
}
export function formatTime(value: number, short = false) {
  return new Intl.DateTimeFormat(language === 'en' ? undefined : language, short
    ? { hour: 'numeric', minute: '2-digit', second: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(value)
}
