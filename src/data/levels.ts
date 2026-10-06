export type Question = { id: string; prompt: string; answers: string[] }
export type Level = { id: number; title: [string, string]; instruction: [string, string]; questions: Question[] }
const words = ['compare','estimate','increase','decrease','calculate','identify','describe','explain','measure','predict']
const pairs = (level: number, entries: [string, string[]][]): Question[] => entries.map(([prompt, answers], index) => ({ id: `lv${level}-${index + 1}`, prompt, answers }))
export const LEVELS: Level[] = [
  { id: 1, title: ['看英文，打英文','See it. Type it.'], instruction: ['打出氣球上的完整英文單字。','Type the English word on a balloon.'], questions: pairs(1, words.map(word => [word, [word]])) },
  { id: 2, title: ['看中文，打英文','Chinese to English'], instruction: ['看中文提示，輸入對應英文。','Read the Chinese prompt and type its English equivalent.'], questions: pairs(2, [
    ['比較',['compare']],['估算',['estimate']],['增加',['increase']],['減少',['decrease']],['計算',['calculate','compute']],['辨認',['identify']],['描述',['describe']],['解釋',['explain']],['量度',['measure']],['預測',['predict']],
  ]) },
  { id: 3, title: ['學科反義詞','Subject antonyms'], instruction: ['輸入意思相反的英文詞。','Type an English word with the opposite meaning.'], questions: pairs(3, [
    ['hot',['cold']],['increase',['decrease']],['large',['small']],['fast',['slow']],['begin',['end','finish']],['above',['below']],['maximum',['minimum']],['positive',['negative']],['true',['false']],['empty',['full']],
  ]) },
  { id: 4, title: ['英文釋義猜指令','Command words from meanings'], instruction: ['看簡短英文釋義，輸入對應學科指令詞。','Read a short English meaning and type the command word.'], questions: pairs(4, [
    ['give reasons',['explain']],['give a detailed account',['describe']],['find similarities and differences',['compare']],['work out a numerical answer',['calculate','compute']],['give an approximate value',['estimate']],['name or recognise',['identify']],['find size using an instrument',['measure']],['say what may happen next',['predict']],['give a brief answer',['state']],['support an answer with evidence',['justify']],
  ]) },
]
