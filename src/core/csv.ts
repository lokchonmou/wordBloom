import { type Level } from '../data/levels'
export function csvExample(level:Level){const quote=(s:string)=>`"${s.replaceAll('"','""')}"`;return '\uFEFFprompt,answer,answer2,answer3\r\n'+level.questions.map(q=>[q.prompt,...q.answers,'','',''].slice(0,4).map(quote).join(',')).join('\r\n')}
export function parseCSV(text:string):string[][]{
 if(new Blob([text]).size>1_000_000)throw new Error('CSV 超過 1 MB / CSV exceeds 1 MB')
 text=text.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[],field='',quoted=false,closed=false
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=c;continue}
 if(c==='"'){if(field||closed)throw new Error('CSV 引號格式錯誤 / Invalid CSV quoting');quoted=true;continue}
 if(c===','||c==='\n'||c==='\r'){row.push(field.trim());field='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[]}continue}
 if(closed&&c.trim())throw new Error('CSV 引號後有多餘文字 / Unexpected text after quoted field');field+=c
 }
 if(quoted)throw new Error('CSV 引號未閉合 / Unclosed CSV quote');row.push(field.trim());if(row.some(Boolean))rows.push(row);return rows
}
export function importCSV(text:string,template:Level,name:string,id:number):Level{
 const rows=parseCSV(text);const header=rows.shift();if(!header||header.join(',')!=='prompt,answer,answer2,answer3')throw new Error('欄名必須為 prompt,answer,answer2,answer3 / Required headers: prompt,answer,answer2,answer3')
 if(!rows.length||rows.length>500)throw new Error('題數須為 1–500 / Use 1–500 questions')
 const seen=new Set<string>()
 const questions=rows.map((row,i)=>{if(row.length!==4||!row[0]||!row[1])throw new Error(`第 ${i+2} 筆：須有四欄、提示及答案 / Record ${i+2}: four columns, prompt and answer required`);if(row[0].length>300||row.slice(1).some(x=>x.length>100))throw new Error(`第 ${i+2} 筆：文字太長 / Record ${i+2}: text too long`);const answers=[...new Set(row.slice(1).filter(Boolean).map(x=>x.normalize('NFC').toLowerCase()))];for(const a of answers){if(seen.has(a))throw new Error(`第 ${i+2} 筆：答案 ${a} 跨題重複；本版請拆成不同題庫 / Record ${i+2}: duplicate answer ${a}; split the banks`);seen.add(a)}return {id:`bank-${id}-${i+1}`,prompt:row[0],answers}})
 return {id,title:[name,name],instruction:template.instruction,questions}
}
