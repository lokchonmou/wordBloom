export type Settings = { balloonCount: number; seconds: number; tts: boolean; clearWrong: boolean; voice: string }
export const DEFAULT_SETTINGS: Settings = { balloonCount: 3, seconds: 12, tts: true, clearWrong: false, voice: '' }
export function validSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false
  const s = value as Settings
  return [1,2,3].includes(s.balloonCount) && [12,20,30].includes(s.seconds) && typeof s.tts === 'boolean' && typeof s.clearWrong === 'boolean' && typeof s.voice === 'string' && s.voice.length < 200
}
