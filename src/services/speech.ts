/** Browser speech only: no API key, network service call, or AI tokens. */
export class WordSpeaker {
  private queue: string[] = []
  private current: SpeechSynthesisUtterance | null = null
  private watchdog: ReturnType<typeof setTimeout> | undefined
  constructor(private changed: (speaking: boolean, unavailable: boolean) => void) {}
  voiceName = ''
  voices() { return 'speechSynthesis' in window ? window.speechSynthesis.getVoices().filter(item => /^en(?:-|$)/i.test(item.lang)) : [] }
  selectedVoice() {
    const voices = this.voices()
    return voices.find(item => item.name === this.voiceName) ?? voices.find(item => /google/i.test(item.name) && item.lang === 'en-US') ?? voices.find(item => /google/i.test(item.name)) ?? voices.find(item => /Microsoft.*(Natural|Online)/i.test(item.name)) ?? voices.find(item => item.name === 'Samantha') ?? voices.find(item => /Karen|Serena/i.test(item.name)) ?? voices.find(item => item.default) ?? voices[0]
  }
  say(word: string) {
    if (!('speechSynthesis' in window)) { this.changed(false, true); return }
    if (this.queue.length < 3) this.queue.push(word)
    this.next()
  }
  private next() {
    if (this.current || !this.queue.length) return
    const voice = this.selectedVoice()
    if (!voice) { this.queue = []; this.changed(false, true); return }
    const utterance = new SpeechSynthesisUtterance(this.queue.shift()!)
    utterance.lang = voice.lang
    utterance.voice = voice
    utterance.rate = 1
    this.current = utterance
    this.changed(true, false)
    const finish = (failed = false) => {
      if (this.current !== utterance) return
      clearTimeout(this.watchdog)
      this.current = null
      if (failed) { this.queue = []; window.speechSynthesis.cancel() }
      this.changed(false, failed)
      this.next()
    }
    utterance.onend = () => finish()
    utterance.onerror = () => finish(true)
    this.watchdog = setTimeout(() => finish(true), 4000)
    try { window.speechSynthesis.speak(utterance) } catch { finish(true) }
  }
  stop() {
    clearTimeout(this.watchdog)
    this.queue = []
    this.current = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    this.changed(false, false)
  }
}
