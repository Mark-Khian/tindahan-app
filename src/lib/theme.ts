export const THEME_STORAGE_KEY = 'theme'

/** Page background for the browser chrome, matching the light and dark tokens. */
export const THEME_COLORS = { light: '#ffffff', dark: '#171717' } as const

export type ThemeChoice = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === 'light') return 'light'
  if (choice === 'dark') return 'dark'
  return systemPrefersDark ? 'dark' : 'light'
}

interface ThemeReadStorage {
  getItem(key: string): string | null
}

interface ThemeWriteStorage {
  setItem(key: string, value: string): void
}

export function readThemeChoice(storage: ThemeReadStorage | null | undefined): ThemeChoice {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
    return 'system'
  } catch {
    return 'system'
  }
}

/** Returns System when the write throws, so a storage failure does not stick a theme. */
export function saveThemeChoice(storage: ThemeWriteStorage, choice: ThemeChoice): ThemeChoice {
  try {
    storage.setItem(THEME_STORAGE_KEY, choice)
    return choice
  } catch {
    return 'system'
  }
}

export function applyDocumentTheme(theme: ResolvedTheme, doc: Document = document): void {
  doc.documentElement.classList.toggle('dark', theme === 'dark')
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

let watchingSystemTheme = false

/** Re-reads the saved choice when the phone's color scheme changes. System updates live. */
export function watchSystemTheme(): void {
  if (watchingSystemTheme || typeof window === 'undefined') return
  watchingSystemTheme = true
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    let storage: ThemeReadStorage | null = null
    try {
      storage = window.localStorage
    } catch {
      // Storage blocked: readThemeChoice treats this as System.
    }
    if (readThemeChoice(storage) !== 'system') return
    applyDocumentTheme(resolveTheme('system', media.matches))
  })
}
