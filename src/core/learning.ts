import { type Round, createRound } from './balloon'
import { LEVELS, type Level, type Question } from '../data/levels'
import { DEFAULT_SETTINGS, validSettings, type Settings } from './settings'
export type Review = { id: string; questionId: string; input: string; correct: boolean; assisted: boolean; at: string; elapsedMs: number }
export type Session = { id: string; startedAt: string; updatedAt: string; level: Level; settings: Settings; round: Round; reviews: Review[] }
export type Save = { format: 'word-bloom'; version: 1; settings: Settings; banks: Level[]; sessions: Session[]; activeId: string|null }
export const emptySave = (): Save => ({format:'word-bloom',version:1,settings:{...DEFAULT_SETTINGS},banks:[],sessions:[],activeId:null})
export function newSession(level: Level, settings: Settings): Session { const now=new Date().toISOString();return {id:crypto.randomUUID(),startedAt:now,updatedAt:now,level:structuredClone(level),settings:{...settings},round:createRound(level,settings),reviews:[]} }
export function reviewQuestions(session: Session): Question[] {
  const ids = new Set(session.round.outcomes.filter(o=>o.result==='timeout').map(o=>o.questionId))
  for (const attempt of session.round.attempts.filter(a=>!a.questionId)) for (const item of attempt.screen) ids.add(item.questionId)
  return session.level.questions.filter(q=>ids.has(q.id))
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const str=(v:unknown,max=500):v is string=>typeof v==='string'&&v.length<=max
const num=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0
const date=(v:unknown)=>str(v,50)&&Number.isFinite(Date.parse(v))
function question(v:unknown):v is Question { return object(v)&&str(v.id,100)&&!!v.id&&str(v.prompt,300)&&!!v.prompt.trim()&&Array.isArray(v.answers)&&v.answers.length>0&&v.answers.length<=10&&v.answers.every(a=>str(a,100)&&!!a.trim()) }
export function validLevel(v:unknown):v is Level {return object(v)&&Number.isInteger(v.id)&&num(v.id)&&Array.isArray(v.title)&&v.title.length===2&&v.title.every(x=>str(x,100))&&Array.isArray(v.instruction)&&v.instruction.length===2&&v.instruction.every(x=>str(x,400))&&Array.isArray(v.questions)&&v.questions.length>0&&v.questions.length<=500&&v.questions.every(question)&&new Set(v.questions.map(q=>q.id)).size===v.questions.length}
export function parseSave(content:string):Save {
  if(new Blob([content]).size>5_000_000)throw new Error('存檔超過 5 MB / Save exceeds 5 MB')
  const v:unknown=JSON.parse(content)
  if(!object(v)||v.format!=='word-bloom'||v.version!==1||!validSettings(v.settings)||!Array.isArray(v.banks)||v.banks.length>100||!v.banks.every(validLevel)||new Set(v.banks.map(b=>b.id)).size!==v.banks.length||!Array.isArray(v.sessions)||v.sessions.length>1000||!(v.activeId===null||str(v.activeId,100)))throw new Error('不支援或不完整的存檔 / Invalid save format')
  const ids=new Set<string>()
  for(const s of v.sessions){
    if(!object(s)||!str(s.id,100)||!s.id||ids.has(s.id)||!date(s.startedAt)||!date(s.updatedAt)||!validLevel(s.level)||!validSettings(s.settings)||!object(s.round)||!Array.isArray(s.reviews)||s.reviews.length>10000)throw new Error('回合資料不完整 / Invalid session')
    ids.add(s.id)
    const r=s.round; const sessionSettings=s.settings; const elapsedMs=r.elapsedMs; const questions=s.level.questions; const qids=new Set(questions.map(q=>q.id))
    const matches=(q:unknown)=>question(q)&&questions.some(x=>JSON.stringify(x)===JSON.stringify(q))
    const balloon=(b:unknown)=>object(b)&&Number.isInteger(b.id)&&num(b.id)&&b.id<questions.length&&str(b.word)&&matches(b.question)&&b.word===(b.question as Question).answers[0]&&Number.isInteger(b.lane)&&num(b.lane)&&b.lane<sessionSettings.balloonCount&&typeof b.angle==='number'&&Number.isFinite(b.angle)&&num(b.ageMs)&&num(b.limitMs)&&b.limitMs>=1000&&b.limitMs<=60000
    if((r.adjusted!==undefined&&typeof r.adjusted!=='boolean')||!validSettings(r.settings)||JSON.stringify(r.settings)!==JSON.stringify(s.settings)||!num(r.elapsedMs)||r.elapsedMs>365*86400000||!num(r.rotation)||!Number.isInteger(r.next)||!num(r.next)||r.next>questions.length||!Number.isInteger(r.lives)||!num(r.lives)||r.lives>3||typeof r.finished!=='boolean'||!Array.isArray(r.order)||r.order.length!==questions.length||!r.order.every(matches)||new Set(r.order.map(q=>q.id)).size!==questions.length||!Array.isArray(r.balloons)||r.balloons.length>s.settings.balloonCount||!r.balloons.every(balloon)||!Array.isArray(r.shown)||r.shown.length!==r.next||!r.shown.every(x=>object(x)&&str(x.questionId)&&qids.has(x.questionId)&&num(x.elapsedMs)&&x.elapsedMs<=Number(elapsedMs))||!Array.isArray(r.outcomes)||r.outcomes.length>questions.length||!Array.isArray(r.attempts)||r.attempts.length>10000)throw new Error('遊戲狀態不完整 / Invalid round state')
    if(new Set(r.balloons.map(b=>b.lane)).size!==r.balloons.length)throw new Error('重複氣球位置 / Duplicate balloon position')
    for(const o of r.outcomes)if(!object(o)||!str(o.questionId)||!qids.has(o.questionId)||!str(o.word)||(o.at!==undefined&&!date(o.at))||(o.elapsedMs!==undefined&&(!num(o.elapsedMs)||o.elapsedMs>r.elapsedMs))||!balloon(o.balloon)||o.questionId!==(o.balloon as {question:Question}).question.id||!['correct','timeout'].includes(String(o.result))||!(o.answer===null||str(o.answer,100)))throw new Error('結果資料不完整 / Invalid outcome')
    for(const o of r.outcomes){const q=questions.find(q=>q.id===o.questionId)!;if(o.result==='timeout'?o.answer!==null:!str(o.answer,100)||!q.answers.some(a=>a.trim().normalize('NFC').toLowerCase()===String(o.answer).toLowerCase()))throw new Error('結果與答案不一致 / Outcome does not match answer bank')}
    if(new Set(r.outcomes.map(o=>o.questionId)).size!==r.outcomes.length||r.lives!==3-r.outcomes.filter(o=>o.result==='timeout').length||r.finished!==(r.lives===0||r.balloons.length===0))throw new Error('生命／結果不一致 / Inconsistent outcomes')
    for(const a of r.attempts)if(!object(a)||!str(a.input,1000)||(a.at!==undefined&&!date(a.at))||!(a.target===null||str(a.target))||!(a.questionId===null||(str(a.questionId)&&qids.has(a.questionId)))||!num(a.elapsedMs)||a.elapsedMs>r.elapsedMs||!Array.isArray(a.screen)||a.screen.length>3||!a.screen.every(x=>object(x)&&str(x.word)&&str(x.prompt)&&str(x.questionId)&&qids.has(x.questionId)&&num(x.growth)&&x.growth<=2))throw new Error('作答資料不完整 / Invalid attempt')
    for(const a of s.reviews)if(!object(a)||!str(a.id,100)||!str(a.questionId)||!qids.has(a.questionId)||!str(a.input,1000)||typeof a.correct!=='boolean'||typeof a.assisted!=='boolean'||!date(a.at)||!num(a.elapsedMs))throw new Error('回訪資料不完整 / Invalid review')
  }
  if(v.activeId!==null&&!ids.has(String(v.activeId)))throw new Error('找不到續玩回合 / Missing active session')
  return JSON.parse(JSON.stringify(v)) as Save
}
export function mergeSaves(current:Save,incoming:Save):Save {
  const sessions=new Map(current.sessions.map(s=>[s.id,s]))
  for(const s of incoming.sessions){const old=sessions.get(s.id);if(!old){sessions.set(s.id,s);continue}if(JSON.stringify(old.level)!==JSON.stringify(s.level)||JSON.stringify(old.settings)!==JSON.stringify(s.settings))throw new Error('同一回合識別碼內容衝突 / Session identity conflict')
    const base=s.round.outcomes.length>old.round.outcomes.length||(s.round.outcomes.length===old.round.outcomes.length&&s.round.elapsedMs>old.round.elapsedMs)?s:old
    const reviews=new Map(old.reviews.map(a=>[a.id,a]));for(const a of s.reviews){const existing=reviews.get(a.id);if(existing&&JSON.stringify(existing)!==JSON.stringify(a))throw new Error('回訪識別碼衝突 / Review identity conflict');reviews.set(a.id,a)}
    sessions.set(s.id,{...base,reviews:[...reviews.values()]})
  }
  const banks=new Map(current.banks.map(b=>[b.id,b]));for(const b of incoming.banks){const old=banks.get(b.id);if(old&&JSON.stringify(old)!==JSON.stringify(b))throw new Error('題庫編號衝突 / Bank identity conflict');banks.set(b.id,b)}
  return {...current,settings:incoming.settings,banks:[...banks.values()],sessions:[...sessions.values()],activeId:incoming.activeId??current.activeId}
}
export function readLocal():{save:Save;warning:string} {try{const raw=localStorage.getItem('word-bloom-save');return {save:raw?parseSave(raw):emptySave(),warning:''}}catch{return {save:emptySave(),warning:'本機存檔未能讀取；原資料未刪除。可匯入備份。 / Could not read local save; original data was not deleted.'}}}
export function download(name:string,text:string,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function summary(sessions:Session[]) {
  return {rounds:sessions.length,timeMs:sessions.reduce((n,s)=>n+s.round.elapsedMs,0),shown:sessions.reduce((n,s)=>n+s.round.shown.length,0),answered:sessions.reduce((n,s)=>n+new Set(s.round.attempts.flatMap(a=>a.questionId?[a.questionId]:a.screen.length===1?[a.screen[0].questionId]:[])).size,0),submissions:sessions.reduce((n,s)=>n+s.round.attempts.length,0),words:new Set(sessions.flatMap(s=>s.round.shown.map(item=>s.level.questions.find(q=>q.id===item.questionId)!.answers[0]))).size,correct:sessions.reduce((n,s)=>n+s.round.outcomes.filter(o=>o.result==='correct').length,0),unmatched:sessions.reduce((n,s)=>n+s.round.attempts.filter(a=>!a.questionId).length,0),reviews:sessions.reduce((n,s)=>n+s.reviews.length,0)}
}
export const presets = LEVELS
