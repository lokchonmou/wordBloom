import { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, type Settings } from '../core/settings'
import { WordSpeaker } from '../services/speech'
export default function SettingsPage({ value, language, save, home }: { value: Settings; language: 'zh'|'en'; save: (s: Settings) => void; home: () => void }) {
  const [draft,setDraft] = useState(value)
  const [voices,setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [notice,setNotice] = useState('')
  const t = (zh:string,en:string) => language === 'zh' ? zh : en
  useEffect(() => { const refresh=()=>setVoices('speechSynthesis' in window ? window.speechSynthesis.getVoices().filter(v=>/^en(?:-|$)/i.test(v.lang)) : []); refresh(); if ('speechSynthesis' in window) window.speechSynthesis.addEventListener('voiceschanged',refresh); return ()=>{if ('speechSynthesis' in window) { window.speechSynthesis.removeEventListener('voiceschanged',refresh); window.speechSynthesis.cancel() }} },[])
  return <section className="utility-page"><button className="game-link" onClick={home}>← {t('首頁','Home')}</button><h1>{t('用你舒服的方式玩。','Play your way.')}</h1><p>{t('保存後，下次開始的新回合生效。續玩沿用該回合原設定。','Saved settings apply to new rounds. Resumed rounds keep their original settings.')}</p><div className="utility-card settings-fields">
    <label>{t('同屏氣球','Balloons on screen')}<select value={draft.balloonCount} onChange={e=>setDraft({...draft,balloonCount:Number(e.target.value)})}>{[1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    <label>{t('氣球速度','Balloon speed')}<select value={draft.seconds} onChange={e=>setDraft({...draft,seconds:Number(e.target.value)})}><option value={12}>{t('快 · 約 10–14 秒','Fast · about 10–14s')}</option><option value={20}>{t('中 · 約 18–22 秒','Medium · about 18–22s')}</option><option value={30}>{t('慢 · 約 28–32 秒','Slow · about 28–32s')}</option></select></label>
    <label>{t('答錯輸入','Wrong input')}<select value={String(draft.clearWrong)} onChange={e=>setDraft({...draft,clearWrong:e.target.value==='true'})}><option value="false">{t('保留，方便修改','Keep for editing')}</option><option value="true">{t('自動清空','Clear automatically')}</option></select></label>
    <label><span>{t('答對讀音','Speak correct answers')}</span><input type="checkbox" checked={draft.tts} onChange={e=>setDraft({...draft,tts:e.target.checked})}/></label>
    <label>{t('英文聲線','English voice')}<select value={draft.voice} onChange={e=>setDraft({...draft,voice:e.target.value})}><option value="">{t('自動 · 優先 Google 英文','Auto · prefer Google English')}</option>{draft.voice && !voices.some(v=>v.name===draft.voice) && <option value={draft.voice}>{draft.voice} ({t('此裝置不可用','unavailable here')})</option>}{voices.map(v=><option key={v.voiceURI} value={v.name}>{v.name} · {v.lang}</option>)}</select></label>
    <button className="secondary-button" onClick={()=>{const speaker=new WordSpeaker((_,failed)=>{if(failed)setNotice(t('聲線暫不可用','Voice unavailable'))});speaker.voiceName=draft.voice;speaker.say('compare')}}>{t('試聽 compare','Preview compare')}</button>
    <div className="result-actions"><button className="primary-button" onClick={()=>{save(draft);setNotice(t('設定已保存。','Settings saved.'))}}>{t('保存設定','Save settings')}</button><button className="secondary-button" onClick={()=>{setDraft(DEFAULT_SETTINGS);setNotice(t('預設已載入，按保存套用。','Defaults loaded. Save to apply.'))}}>{t('恢復預設','Load defaults')}</button></div><p role="status">{notice}</p>
  </div></section>
}
