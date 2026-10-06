import { useEffect, useRef, useState, type FormEvent } from 'react'
import { submit, tick, type Round, type Outcome } from '../../core/balloon'
import { LEVELS, type Level } from '../../data/levels'
import { summary, type Session } from '../../core/learning'
import { type Settings } from '../../core/settings'
import { WordSpeaker } from '../../services/speech'

export default function BalloonGame({ language, home, level, next, settings, session, progress, review }: { settings: Settings; session: Session; progress: (id: string, round: Round) => void; review: () => void; level: Level; next: (id: number) => void; language: 'zh' | 'en'; home: () => void }) {
  const en = language === 'en'
  const text = (zh: string, english: string) => en ? english : zh
  const model = useRef<Round>(structuredClone(session.round))
  const [view, setView] = useState(() => structuredClone(model.current))
  const [input, setInput] = useState('')
  const [paused, setPaused] = useState(session.round.elapsedMs > 0 && !session.round.finished)
  const pausedRef = useRef(session.round.elapsedMs > 0 && !session.round.finished)
  const speakingRef = useRef(false)
  const [speaking, setSpeaking] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [tts, setTts] = useState(settings.tts)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [feedback, setFeedback] = useState('')
  const [wrong, setWrong] = useState(0)
  const [bursts, setBursts] = useState<Outcome[]>([])
  const [damage, setDamage] = useState(0)
  const handled = useRef(session.round.outcomes.length)
  const lastSaved = useRef(-Infinity)
  const inputRef = useRef<HTMLInputElement>(null)
  const speakerRef = useRef<WordSpeaker | null>(null)
  const publish = () => {
    const events = model.current.outcomes.slice(handled.current)
    handled.current = model.current.outcomes.length
    if (events.length) {
      setBursts(previous => [...previous, ...events])
      const misses = events.filter(item => item.result === 'timeout')
      if (misses.length) { setDamage(value => value + misses.length); setFeedback(text(`超時爆破：${misses.map(item => item.word).join('、')} · 扣 ${misses.length} 點生命`, `Timed out: ${misses.map(item => item.word).join(', ')} · −${misses.length} life`)) }
    }
    setView(structuredClone(model.current))
  }
  useEffect(() => {
    if (!bursts.length) return
    const timer = setTimeout(() => setBursts([]), 1200)
    return () => clearTimeout(timer)
  }, [bursts])
  const pause = (value: boolean) => {
    pausedRef.current = value
    setPaused(value)
    if (value) speakerRef.current?.stop()
    else inputRef.current?.focus()
  }
  useEffect(() => {
    const speaker = new WordSpeaker((active, failed) => { speakingRef.current = active; setSpeaking(active); setUnavailable(failed) })
    speaker.voiceName = settings.voice
    speakerRef.current = speaker
    const refresh = () => { setVoices(speaker.voices()); setVoiceName(speaker.selectedVoice()?.name ?? '') }
    refresh()
    if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.removeEventListener('voiceschanged', refresh); speaker.stop() }
  }, [])
  useEffect(() => {
    let frame = 0, last = performance.now(), lastPaint = last
    const update = (now: number) => {
      const delta = now - last
      last = now
      if (!pausedRef.current && !document.hidden) tick(model.current, delta, speakingRef.current ? 0 : delta)
      if (now - lastPaint >= 80 || model.current.finished) { publish(); lastPaint = now }
      if (!model.current.finished) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    const visibility = () => { if (document.hidden) pause(true) }
    document.addEventListener('visibilitychange', visibility)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility) }
  }, [view.finished])
  useEffect(() => {
    if (view.elapsedMs - lastSaved.current >= 1000 || view.finished || paused) { progress(session.id, view); lastSaved.current=view.elapsedMs }
  }, [view, paused, progress, session.id])
  useEffect(() => {
    const flush=()=>progress(session.id,structuredClone(model.current))
    window.addEventListener('pagehide',flush)
    return ()=>{window.removeEventListener('pagehide',flush);flush()}
  }, [progress,session.id])
  useEffect(() => {
    const viewport = window.visualViewport
    const resize = () => document.documentElement.style.setProperty('--game-visible-height', `${viewport?.height ?? window.innerHeight}px`)
    resize()
    viewport?.addEventListener('resize', resize)
    return () => { viewport?.removeEventListener('resize', resize); document.documentElement.style.removeProperty('--game-visible-height') }
  }, [])
  function answer(event: FormEvent) {
    event.preventDefault()
    if (pausedRef.current) return
    const word = input.trim().toLowerCase()
    const result = submit(model.current, input)
    if (result === 'empty') return
    if (result === 'correct') {
      setInput('')
      setFeedback(`${word} ✓`)
      if (tts) speakerRef.current?.say(word)
    } else {
      setWrong(value => value + 1)
      if (settings.clearWrong) setInput('')
      setFeedback(text(settings.clearWrong?'未配對到氣球，已清空輸入。':'未配對到氣球，修改後再試。', settings.clearWrong?'No match. Input cleared.':'No matching balloon. Edit your answer and try again.'))
    }
    progress(session.id, structuredClone(model.current))
    publish()
    inputRef.current?.focus()
  }
  function restart() {
    speakerRef.current?.stop()
    next(level.id)
    return
  }
  const correct = view.outcomes.filter(item => item.result === 'correct')
  const expired = view.outcomes.filter(item => item.result === 'timeout')
  const seconds = Math.floor(view.elapsedMs / 1000)
  const metrics = summary([{...session,round:view}])
  return <section className="game-page" aria-label={text(`Lv${level.id} 氣球花園`, `Lv${level.id} Balloon Garden`)}>
    <div className="game-topline"><button className="game-link" onClick={() => { speakerRef.current?.stop(); progress(session.id, model.current); home() }}>← {text('選關', 'Levels')}</button><span className="eyebrow">{level.id<=4?`LV ${level.id}`:text('自訂題庫','CUSTOM BANK')} · {text(...level.title)}</span><button className="game-link" onClick={() => { model.current.adjusted=true; progress(session.id,structuredClone(model.current)); setTts(value => !value); if (tts) speakerRef.current?.stop() }} aria-pressed={tts}>{text('讀音', 'Speech')} {tts ? 'ON' : 'OFF'}</button></div>
    <div className="voice-controls"><label htmlFor="voice-choice">{text('英文聲線', 'English voice')}</label><select id="voice-choice" value={voiceName} onChange={event => { model.current.adjusted=true; progress(session.id,structuredClone(model.current)); setVoiceName(event.target.value); if (speakerRef.current) { speakerRef.current.stop(); speakerRef.current.voiceName = event.target.value } }}>{voices.length ? voices.map(voice => <option key={voice.voiceURI} value={voice.name}>{voice.name} · {voice.lang}</option>) : <option value="">{text('未有英文聲線', 'No English voice')}</option>}</select><button className="game-link" onClick={() => speakerRef.current?.say('compare')}>{text('試聽', 'Preview')}</button></div>
    <div className="game-heading"><div><h1>{text('氣球花園', 'Balloon Garden')}</h1><p>{text(...level.instruction)}</p></div><div className="game-stats"><div key={damage} className={`life-panel ${damage ? 'life-hit' : ''}`} aria-label={text(`剩餘 ${view.lives} 點生命`, `${view.lives} lives left`)}><div className="lives" aria-hidden="true">{[0, 1, 2].map(index => <span key={index} className={index < view.lives ? 'heart-full' : 'heart-empty'}>♥</span>)}</div><span className="life-count">{text('生命', 'LIVES')} {view.lives}/3</span>{damage > 0 && <span className="life-loss">−1 ♥</span>}</div><span>{correct.length} / {level.questions.length} ✓</span><span>{seconds}s</span></div></div>
    {view.finished && !bursts.length ? <div className="game-result"><span className="result-flower">✦</span><h2>{text(view.lives ? '這一輪，開花了。' : '休息一下，再試一次。', view.lives ? 'A little more growth.' : 'Take a breath. Try again.')}</h2><div className="result-metrics"><div><strong>{correct.length} / {level.questions.length}</strong><span>{text('答對的詞', 'Words answered')}</span></div><div><strong>{view.attempts.length}</strong><span>{text('提交次數', 'Submissions')}</span></div><div><strong>{seconds}s</strong><span>{text('遊玩時間', 'Play time')}</span></div></div><p className="game-note">{text(`出題 ${metrics.shown} · 曾作答 ${metrics.answered} · 不同答案詞 ${metrics.words}`, `Shown ${metrics.shown} · Attempted ${metrics.answered} · Distinct words ${metrics.words}`)}</p><p>{text(`未匹配輸入 ${view.attempts.filter(item => !item.target).length} 次 · 超時 ${expired.length} 題`, `${view.attempts.filter(item => !item.target).length} unmatched inputs · ${expired.length} timed out`)}</p><div className="result-words">{level.questions.map(question => { const outcome = view.outcomes.find(item => item.questionId === question.id); return <div key={question.id}><span className={outcome?.result === 'correct' ? 'word-correct' : ''}>{outcome?.result === 'correct' ? '✓' : outcome?.result === 'timeout' ? '◷' : '—'} <span className="result-prompt">{question.prompt} → </span>{question.answers.join(' / ')}</span><button onClick={() => speakerRef.current?.say(outcome?.answer ?? question.answers[0])} aria-label={text(`重聽 ${question.answers[0]}`, `Listen to ${question.answers[0]}`)}>♪</button></div> })}</div><p className="game-note">{text('未匹配輸入不會直接算作某個詞答錯；— 代表未完成。', 'Unmatched inputs are not assigned to a word. — means unfinished.')}</p><div className="result-actions"><button className="primary-button" onClick={restart}>{text('再玩一次', 'Play again')} ↻</button><button className="secondary-button" onClick={review}>{text('錯題／候選回訪', 'Review timeouts / candidates')}</button><button className="secondary-button" onClick={home}>{text('選擇關卡', 'Choose level')}</button>{level.id < LEVELS.length && <button className="primary-button" onClick={() => next(level.id + 1)}>{text('下一關', 'Next level')} →</button>}</div></div> : <>
      <div key={`arena-${damage}`} className={`game-arena ${damage ? 'arena-hit' : ''}`} aria-label={text('氣球遊戲區', 'Balloon play area')}>
        {view.balloons.map(balloon => { const growth = Math.min(1, balloon.ageMs / balloon.limitMs); const distance = settings.balloonCount === 1 ? 0 : 15.5 + growth * 11.5; return <div className="play-balloon-wrap radial-balloon" key={balloon.id} style={{ left: `${50 + Math.cos(balloon.angle) * distance}%`, top: `${50 + Math.sin(balloon.angle) * distance}%`, width: `${25 + growth * 10}%` }}><div className={`play-balloon ${balloon.question.prompt.includes(' ') ? 'meaning-balloon' : ''} color-${balloon.lane} ${growth > .8 ? 'urgent' : ''}`}><strong>{balloon.question.prompt}</strong><span className="balloon-time">{Math.max(0, Math.ceil((balloon.limitMs - balloon.ageMs) / 1000))}s</span></div><div className="play-string" /></div> })}
        {bursts.map(({ balloon, result }) => { const growth = Math.min(1, balloon.ageMs / balloon.limitMs); const distance = settings.balloonCount === 1 ? 0 : 15.5 + growth * 11.5; return <div key={balloon.id} className={`burst-effect burst-${result}`} style={{ left: `${50 + Math.cos(balloon.angle) * distance}%`, top: `${50 + Math.sin(balloon.angle) * distance}%` }} aria-hidden="true"><div className="burst-ring" />{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ transform: `rotate(${i * 45}deg)` }}><b /></i>)}<strong>{result === 'correct' ? '✓ POP!' : '−1 ♥'}</strong><span>{balloon.word}</span></div> })}
        <span className="arena-caption">{speaking ? text('聽聽讀音 · 氣球倒數暫緩', 'Listen · balloon timers are on hold') : text('自由選一個氣球作答', 'Choose any balloon')}</span>
        {paused && <div className="pause-overlay"><h2>{text('已暫停', 'Paused')}</h2><button className="primary-button" onClick={() => pause(false)}>{text('繼續遊戲', 'Resume')}</button></div>}
      </div>
      <form className="answer-form" onSubmit={answer}><label className="sr-only" htmlFor="word-answer">{text('輸入英文單字', 'Type an English word')}</label><input key={wrong} ref={inputRef} id="word-answer" className={wrong ? 'answer-input input-shake' : 'answer-input'} autoFocus value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setInput(''); setFeedback('') } if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault() }} placeholder={text('輸入單字，按 Enter…', 'Type a word, press Enter…')} maxLength={1000} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} disabled={paused || view.finished} /><button className="submit-answer" type="submit" disabled={paused || view.finished}>{text('提交', 'Enter')} ↵</button><button type="button" className="clear-answer" onClick={() => { setInput(''); setFeedback(''); inputRef.current?.focus() }}>{text('清空', 'Clear')}</button><button type="button" className="clear-answer" onClick={() => pause(!paused)}>{text(paused ? '繼續' : '暫停', paused ? 'Resume' : 'Pause')}</button></form>
      <div className="game-feedback" role="status">{feedback || text('Backspace 修改 · Esc 清空 · 答錯不扣生命', 'Backspace to edit · Esc to clear · wrong inputs do not cost lives')}</div>
    </>}
    {unavailable && <p className="speech-warning" role="status">{text('英文讀音暫時不可用；可繼續玩，稍後按 ♪ 重試。', 'English speech is unavailable. Keep playing, or try ♪ again later.')}</p>}
    <p className="game-note">{text(`示範題庫 · ${level.questions.length} 題 · 同屏最多 ${settings.balloonCount} 題 · 3 點生命`, `Demo word bank · ${level.questions.length} questions · up to ${settings.balloonCount} balloons · 3 lives`)}</p>
  </section>
}
