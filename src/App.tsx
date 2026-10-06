import ImportPage from './features/ImportPage'
import SettingsPage from './features/SettingsPage'
import ProgressPage from './features/ProgressPage'
import ReviewPage from './features/ReviewPage'
import { readLocal, newSession, type Save, type Session, type Review } from './core/learning'
import { type Round } from './core/balloon'
import { type Level } from './data/levels'
import LevelPicker from './games/LevelPicker'
import { LEVELS } from './data/levels'
import BalloonGame from './games/balloon/BalloonGame'
import { useCallback, useEffect, useState } from 'react'

type Language = 'zh' | 'en'
type Theme = 'light' | 'dark'
const english: Record<string, string> = {
  '氣球遊戲外觀示意，尚未開始遊戲': 'Balloon game preview. The game has not started.',
  '比較': 'Compare', '估算': 'Estimate', '增加': 'Increase',
  '每一個小練習': 'A little practice.', '都讓你多懂一點。': 'A little more understanding.',
  'BALLOON GARDEN / 遊戲畫面示意': 'BALLOON GARDEN / GAME PREVIEW',
  '下一站，氣球花園。': 'Next stop: Balloon Garden.', 'START / 開始練習': 'START / PRACTICE',
  '開始頁已準備好。下一步會加入預設題庫、關卡選擇與真正可以遊玩的氣球模式。': 'The start page is ready. Preset word banks, stage selection, and a playable balloon game are coming next.',
  '目前是開始頁原型，尚未接上遊戲。': 'This is a start-page prototype. Gameplay is not available yet.',
  '用你舒服的方式玩。': 'Play your way.', 'SETTINGS / 設定': 'SETTINGS',
  '這裡將提供氣球數量、速度、英文讀音開關，以及答錯後保留或清空輸入的設定。': 'Choose the balloon count, speed, spoken English, and whether to keep or clear an incorrect answer.',
  '設定功能將在下一步逐項加入。': 'Settings will be added step by step.',
  '把你的詞庫帶進來。': 'Bring your own word bank.', 'IMPORT / 匯入題庫': 'IMPORT / WORD BANK',
  '先選題型，再匯入老師準備的 CSV，預覽提示與可接受答案，最後設定每一關的玩法。': 'Choose a task, import your CSV, preview prompts and accepted answers, then set up your stages.',
  'CSV 範本已準備，正式匯入列 Phase 3；老師課程列 Phase 4。': 'CSV examples are ready; importing is planned for Phase 3, teacher courses for Phase 4.',
  '關閉': 'Close', '返到開始頁': 'Back to start', 'Word Bloom 首頁': 'Word Bloom home',
  '學習遊戲': 'Learning game', '學科英語，也可以玩著學': 'A LITTLE PLAY. A LITTLE ENGLISH.',
  '讓每個單字，': 'Let every word', '都': '', '慢慢開花': 'grow with you',
  '從認得一個詞，到記得怎樣用。': 'From a familiar word to a lasting connection.',
  '在氣球花園裡，練習英文、聽聽讀音，': 'Practice English in Balloon Garden, listen,',
  '用自己的節奏，一點一點累積。': 'and learn a little more at your own pace.',
  '開始練習': 'Start practice', '設定': 'Settings', '為初中學科詞彙而設計': 'Made for secondary school vocabulary',
  '電腦・平板・手機': 'Desktop · Tablet · Mobile', '一個花園，幾種練習方式。': 'One garden. A few ways to grow.',
  '看見，然後記住。': 'See it. Remember it.', '完整單字輸入，配合英文讀音。': 'Type whole words and hear them spoken.',
  '從熟習拼寫開始。': 'Start with spelling.', '把意思連起來。': 'Connect the meaning.',
  '看中文、想英文。': 'Read Chinese. Recall English.', '讓詞彙與意思慢慢建立連結。': 'Build a connection, one word at a time.',
  '帶上自己的詞庫。': 'Make it your own.', '匯入題庫，貼近課堂練習。': 'Import words for classroom practice.',
  '讓練習貼近課堂。': 'Bring practice closer to class.', 'Phase 2 · CSV 匯入': 'Phase 2 · CSV import',
  '小小練習，慢慢成長。': 'Small practice. Steady growth.',
}
function translate(language: Language, text: string) { return language === 'en' ? english[text] ?? text : text }
function savedPreference(key: string) { try { return localStorage.getItem(key) } catch { return null } }
function ThemeIcon({ dark }: { dark: boolean }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">{dark ? <><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></> : <path d="M20.4 14.3A8.5 8.5 0 0 1 9.7 3.6a8.5 8.5 0 1 0 10.7 10.7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />}</svg>
}

function Arrow({ className = '' }: { className?: string }) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
function BloomIcon() {
  return <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 6c-8-8-15 2-7 9-11 1-8 14 2 11 1 10 14 8 12-2 10 2 13-11 2-13 3-9-8-13-9-5Z" fill="currentColor" /><circle cx="16" cy="16" r="3" fill="var(--paper)" /></svg>
}
function BubbleScene({ language }: { language: Language }) {
  const t = (text: string) => translate(language, text)
  return <div className="bubble-scene" aria-label={t('氣球遊戲外觀示意，尚未開始遊戲')}>
    <div className="scene-orbit orbit-one" /><div className="scene-orbit orbit-two" />
    <span className="scene-star star-one">✦</span><span className="scene-star star-two">✧</span><span className="scene-dot dot-one" />
    <div className="word-bubble bubble-peach"><span className="bubble-label">比較</span><strong>compare</strong><span className="bubble-string" /></div>
    <div className="word-bubble bubble-sage"><span className="bubble-label">估算</span><strong>estimate</strong><span className="bubble-string" /></div>
    <div className="word-bubble bubble-yellow"><span className="bubble-label">增加</span><strong>increase</strong><span className="bubble-string" /></div>
    <div className="scene-note"><span className="note-spark">✦</span><div>{t('每一個小練習')}<br /><strong>{t('都讓你多懂一點。')}</strong></div></div>
    <div className="demo-input"><span className="demo-caret" />estimate<span className="demo-enter">↵</span></div>
    <span className="scene-caption">{t('BALLOON GARDEN / 遊戲畫面示意')}</span>
  </div>
}
export default function App() {
  const [initial] = useState(readLocal)
  const [saveData,setSaveData] = useState<Save>(initial.save)
  const [storageNotice,setStorageNotice] = useState(initial.warning)
  const [page,setPage] = useState<'home'|'settings'|'progress'|'review'|'import'>('home')
  const [current,setCurrent] = useState<Session|null>(null)
  const [reviewSession,setReviewSession] = useState<Session|null>(null)
  const [gameKey,setGameKey] = useState(0)
  const updateRound=useCallback((id:string,round:Round)=>setSaveData(old=>({...old,sessions:old.sessions.map(s=>s.id===id?{...s,round:structuredClone(round),updatedAt:new Date().toISOString()}:s)})),[])
  const recordReview=(id:string,attempt:Review)=>setSaveData(old=>({...old,sessions:old.sessions.map(s=>s.id===id?{...s,reviews:[...s.reviews,attempt],updatedAt:new Date().toISOString()}:s)}))
  useEffect(()=>{if(saveData===initial.save)return;try{localStorage.setItem('word-bloom-save',JSON.stringify(saveData));setStorageNotice('')}catch{setStorageNotice('未能保存到本機，請匯出 save 備份。 / Local save failed; export a backup.')}},[saveData,initial.save])
  function startLevel(level:Level){const session=newSession(level,saveData.settings);setCurrent(session);setLevelId(level.id);setGameKey(k=>k+1);setPlaying(true);setPage('home');setSaveData(old=>({...old,activeId:session.id,sessions:[...old.sessions,session]}))}
  function resume(session:Session){setCurrent(session);setLevelId(session.level.id);setGameKey(k=>k+1);setPlaying(true);setPage('home');setSaveData(old=>({...old,activeId:session.id}))}
  function openReview(session:Session){setPlaying(false);setReviewSession(session);setPage('review')}
  const [playing, setPlaying] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [levelId, setLevelId] = useState(1)
  const [language, setLanguage] = useState<Language>(() => savedPreference('word-bloom-language') === 'en' ? 'en' : 'zh')
  const [theme, setTheme] = useState<Theme>(() => savedPreference('word-bloom-theme') === 'dark' ? 'dark' : 'light')
  const t = (text: string) => translate(language, text)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en'
    document.title = language === 'zh' ? 'Word Bloom · 學科英語練習' : 'Word Bloom · Academic English Practice'
    try { localStorage.setItem('word-bloom-theme', theme); localStorage.setItem('word-bloom-language', language) } catch { /* Preferences still work without storage. */ }
  }, [theme, language])
  return <div className="app-shell min-h-screen">
    <header className="site-header flex items-center justify-between gap-4"><a href="#" className="brand flex items-center gap-2.5" onClick={() => { setPlaying(false); setChoosing(false); setPage('home') }} aria-label={t('Word Bloom 首頁')}><BloomIcon /><span>word<span className="brand-light">bloom</span><span className="brand-period">.</span></span></a><div className="header-meta flex items-center gap-3"><span className="prototype-badge">{playing ? (levelId<=4?`LV ${levelId}`:language==='zh'?'自訂題庫':'CUSTOM BANK') : t('學習遊戲')}</span><span className="header-caption">A LITTLE PLAY. A LITTLE GROWTH.</span><div className="header-controls flex items-center gap-2"><button className="theme-toggle" role="switch" aria-checked={theme === 'dark'} aria-label={language === 'zh' ? '深色模式' : 'Dark mode'} title={language === 'zh' ? (theme === 'dark' ? '切換淺色模式' : '切換深色模式') : (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span className="theme-toggle-knob"><ThemeIcon dark={theme === 'dark'} /></span></button><button className="language-toggle" aria-label={language === 'zh' ? 'Switch to English' : '切換繁體中文'} onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}>{language === 'zh' ? '[EN]' : '[中]'}</button></div></div></header>
    <main>{playing && current ? <BalloonGame key={gameKey} session={current} settings={current.settings} progress={updateRound} review={()=>openReview(saveData.sessions.find(s=>s.id===current.id)??current)} level={current.level} language={language} home={() => { setPlaying(false); setChoosing(true) }} next={id => startLevel(LEVELS[id - 1])} /> : page==='import' ? <ImportPage language={language} home={()=>setPage('home')} nextId={Math.max(1000,...saveData.banks.map(b=>b.id))+1} add={level=>setSaveData(old=>({...old,banks:[...old.banks,level]}))}/> : page==='settings' ? <SettingsPage value={saveData.settings} language={language} save={settings=>setSaveData(old=>({...old,settings}))} home={()=>setPage('home')}/> : page==='progress' ? <ProgressPage data={saveData} language={language} change={setSaveData} resume={resume} review={openReview} home={()=>setPage('home')}/> : page==='review'&&reviewSession ? <ReviewPage key={reviewSession.id} session={reviewSession} language={language} record={recordReview} home={()=>setPage('progress')}/> : choosing ? <LevelPicker levels={[...LEVELS,...saveData.banks]} language={language} home={() => setChoosing(false)} start={id=>startLevel([...LEVELS,...saveData.banks].find(l=>l.id===id)!)}/> : <>
      <section className="hero-grid grid items-center gap-8 lg:grid-cols-2">
        <div className="hero-copy"><div className="eyebrow flex items-center gap-2"><span className="tiny-leaf" />{t('學科英語，也可以玩著學')}</div><h1>{t('讓每個單字，')}<br />{t('都')}<span className="highlight-word">{t('慢慢開花')}<svg viewBox="0 0 260 22" preserveAspectRatio="none" aria-hidden="true"><path d="M3 15 Q120 1 255 10" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg></span>{language === 'zh' ? '。' : '.'}</h1><p className="hero-description">{t('從認得一個詞，到記得怎樣用。')}<br />{t('在氣球花園裡，練習英文、聽聽讀音，')}<br className="desktop-break" />{t('用自己的節奏，一點一點累積。')}</p><div className="hero-actions flex flex-wrap items-center gap-3"><button className="primary-button" onClick={() => setChoosing(true)}>{t('開始練習')} <Arrow /></button><button className="secondary-button" onClick={() => setPage('settings')}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="9" cy="7" r="3" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" /><circle cx="15" cy="17" r="3" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" /></svg>{t('設定')}</button></div><div className="progress-entry result-actions"><button className="secondary-button" onClick={()=>setPage('progress')}>{language==='zh'?'進度／save／老師報告':'Progress / save / teacher report'}</button>{saveData.activeId && saveData.sessions.some(s=>s.id===saveData.activeId&&!s.round.finished)&&<button className="secondary-button" onClick={()=>resume(saveData.sessions.find(s=>s.id===saveData.activeId)!)}>{language==='zh'?'續玩上次回合':'Resume last round'}</button>}</div><div className="hero-footnote flex items-center gap-2"><span className="status-dot" />{t('為初中學科詞彙而設計')} <span className="footnote-divider">/</span> {t('電腦・平板・手機')}</div></div>
        <BubbleScene language={language} />
      </section>
      <section className="learning-section" aria-labelledby="learning-title"><div className="section-heading flex items-center justify-between gap-4"><h2 id="learning-title">{t('一個花園，幾種練習方式。')}</h2><span>LEARN AT YOUR OWN PACE</span></div><div className="learning-grid grid gap-4 md:grid-cols-3">
        <article className="learning-card"><span className="card-icon icon-peach">Aa</span><div><h3>{t('看見，然後記住。')}</h3><p>{t('完整單字輸入，配合英文讀音。')}<br />{t('從熟習拼寫開始。')}</p></div><span className="card-number">01</span></article>
        <article className="learning-card"><span className="card-icon icon-sage">中<span>↔</span>英</span><div><h3>{t('把意思連起來。')}</h3><p>{t('看中文、想英文。')}<br />{t('讓詞彙與意思慢慢建立連結。')}</p></div><span className="card-number">02</span></article>
        <button className="learning-card import-card" onClick={() => setPage('import')}><span className="card-icon icon-yellow"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div><h3>{t('帶上自己的詞庫。')}</h3><p>{t('匯入題庫，貼近課堂練習。')}<br />{t('讓練習貼近課堂。')}</p><span className="phase-label">{t('Phase 2 · CSV 匯入')}</span></div><Arrow className="card-arrow" /></button>
      </div></section>
    </>}</main>
    <footer className="site-footer flex flex-wrap items-center justify-between gap-3"><p>{t('小小練習，慢慢成長。')}</p><span>WORD BLOOM · PHASE 1 / {playing ? 'BALLOON GARDEN' : 'START PAGE'}</span></footer>
    {storageNotice&&<p role="status" className="speech-warning">{storageNotice}</p>}
  </div>
}
