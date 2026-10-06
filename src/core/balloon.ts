import { DEFAULT_SETTINGS, type Settings } from './settings'
import { LEVELS, type Level, type Question } from '../data/levels'
export const WORDS = ['compare', 'estimate', 'increase', 'decrease', 'calculate', 'identify', 'describe', 'explain', 'measure', 'predict'] as const
export type Balloon = { id: number; word: string; question: Question; lane: number; angle: number; ageMs: number; limitMs: number }
export type Outcome = { word: string; questionId: string; answer: string | null; at: string; elapsedMs: number; result: 'correct' | 'timeout'; balloon: Balloon }
export type Attempt = { input: string; at: string; target: string | null; questionId: string | null; elapsedMs: number; screen: { word: string; questionId: string; prompt: string; growth: number }[] }
export type Round = { settings: Settings; adjusted: boolean; shown: {questionId: string; elapsedMs: number}[]; balloons: Balloon[]; order: Question[]; rotation: number; next: number; lives: number; elapsedMs: number; outcomes: Outcome[]; attempts: Attempt[]; finished: boolean }
export function createRound(level: Level = LEVELS[0], settings: Settings = DEFAULT_SETTINGS): Round {
  const answers = new Set<string>()
  for (const question of level.questions) for (const answer of question.answers) { const normalized = answer.trim().normalize('NFC').toLowerCase(); if (!normalized || answers.has(normalized)) throw new Error('Demo answers must be non-empty and unique across questions'); answers.add(normalized) }
  const order: Question[] = [...level.questions]
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  const rotation = Math.random() * Math.PI * 2
  return { adjusted: false, settings: { ...settings }, shown: order.slice(0, settings.balloonCount).map(q=>({questionId:q.id,elapsedMs:0})), order, rotation, balloons: order.slice(0, settings.balloonCount).map((question, lane) => ({ id: lane, word: question.answers[0], question, lane, angle: rotation + lane * Math.PI * 2 / settings.balloonCount + (Math.random() - .5) * .15, ageMs: 0, limitMs: (settings.seconds - 2) * 1000 + Math.random() * 4000 })), next: Math.min(settings.balloonCount,order.length), lives: 3, elapsedMs: 0, outcomes: [], attempts: [], finished: false }
}
function replace(round: Round, balloon: Balloon) {
  round.balloons = round.balloons.filter(item => item.id !== balloon.id)
  if (round.next < round.order.length && round.lives > 0) {
    const id = round.next++
    round.shown.push({questionId:round.order[id].id,elapsedMs:round.elapsedMs})
    round.balloons.push({ id, word: round.order[id].answers[0], question: round.order[id], lane: balloon.lane, angle: round.rotation + balloon.lane * Math.PI * 2 / round.settings.balloonCount + (Math.random() - .5) * .15, ageMs: 0, limitMs: (round.settings.seconds - 2) * 1000 + Math.random() * 4000 })
  }
  round.finished = round.lives === 0 || round.balloons.length === 0
}
export function tick(round: Round, elapsedMs: number, balloonTimeMs = elapsedMs): void {
  if (round.finished) return
  round.elapsedMs += elapsedMs
  for (const balloon of [...round.balloons]) {
    if (round.finished) break
    balloon.ageMs += balloonTimeMs
    if (balloon.ageMs >= balloon.limitMs) {
      round.outcomes.push({ word: balloon.word, questionId: balloon.question.id, answer: null, at: new Date().toISOString(), elapsedMs: round.elapsedMs, result: 'timeout', balloon: { ...balloon } })
      round.lives = Math.max(0, round.lives - 1)
      replace(round, balloon)
    }
  }
}
export function submit(round: Round, input: string): 'correct' | 'wrong' | 'empty' {
  if (round.finished || !input.trim()) return 'empty'
  const target = round.balloons.find(item => item.question.answers.some(answer => answer.trim().normalize('NFC').toLowerCase() === input.trim().normalize('NFC').toLowerCase()))
  round.attempts.push({ input, at: new Date().toISOString(), target: target?.word ?? null, questionId: target?.question.id ?? null, elapsedMs: round.elapsedMs, screen: round.balloons.map(item => ({ word: item.word, questionId: item.question.id, prompt: item.question.prompt, growth: item.ageMs / item.limitMs })) })
  if (!target) return 'wrong'
  round.outcomes.push({ word: target.word, questionId: target.question.id, answer: input.trim().normalize('NFC').toLowerCase(), at: new Date().toISOString(), elapsedMs: round.elapsedMs, result: 'correct', balloon: { ...target } })
  replace(round, target)
  return 'correct'
}
