import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const scratch = mkdtempSync(join(tmpdir(), 'tastiq-layout-qa-'));
Object.assign(process.env, {
  AI_ACCESS: 'all',
  OPENAI_API_KEY: 'local-ui-fixture',
  OPENAI_MODEL: 'gpt-6.1-sol',
  AI_SPARES: '0',
  AI_EVAL_BUDGET_DIR: '',
  FEEDBACK_DATABASE_URL: '',
  FEEDBACK_DATABASE_SECRET: '',
  JOURNAL_PATH: join(scratch, 'journal.ndjson'),
});

const requestLog = [];
const richDialogue = process.argv.includes('--visual');
const designReview = process.argv.includes('--design-review');
const port = richDialogue ? 5196 : 5195;
const visualQuestion = {
  id: 'visual-experience',
  title: 'Что важнее для этого вечера?',
  why: 'Ответ поможет подобрать историю под настроение и время, которые у тебя есть сегодня.',
  options: [
    {id:'world',label:'Погрузиться в необычный мир и постепенно узнавать, как он устроен'},
    {id:'pace',label:'Почувствовать, что история сразу набирает ход'},
    {id:'people',label:'Больше узнать о героях и их отношениях'},
    {id:'calm',label:'Отдохнуть за спокойным сюжетом'},
  ],
  multiple: true,
  controls: ['unknown','indifferent','none'],
};
globalThis.fetch = async (url, init) => {
  if (url !== 'https://api.openai.com/v1/responses') {
    throw Error('The UI fixture blocks all other outbound server requests');
  }
  const request = JSON.parse(init.body);
  const schema = request.text.format.name;
  requestLog.push(schema);
  let answer;
  if (schema === 'tastiq_media_conversation' || schema === 'tastiq_conversation') {
    const state = JSON.parse(request.input);
    const ask = richDialogue && !state.turns?.some(turn=>turn.question?.id === visualQuestion.id || turn.question === visualQuestion.id)
      && state.question?.id !== visualQuestion.id && state.phase !== 'review';
    answer = {
      summary: 'Хочется увлекательной истории на вечер.', facts: [], uncertainties: [],
      action: ask ? 'question' : 'review', question: ask ? visualQuestion : null, sessionTime: null,
    };
    if(schema==='tastiq_media_conversation')answer.context={company:null,childAge:null,timeMode:null,commitment:null,onlyEnded:null,format:null};
  } else if (schema === 'tastiq_picks') {
    const ids = [...request.input.matchAll(/^id=([^\s|]+) \|/gm)].slice(0, 4).map(match => match[1]);
    if (!ids.length) throw Error('The fixture found no catalog candidates in the picker prompt');
    answer = {
      understood: 'Хочется увлекательной истории.',
      picks: ids.map(id => ({
        id, title:'', year:0, likelySeen:false,
        reason:designReview?'Пример объяснения для тестового подбора.':'История раскрывается постепенно.',
        caveat:designReview?'Здесь появится важная оговорка о варианте.':'Первый эпизод знакомит с героями.',
      })),
    };
  } else {
    throw Error('Unexpected request in the UI fixture: ' + schema);
  }
  return Response.json({
    status: 'completed',
    model: request.model,
    usage: {input_tokens:1, output_tokens:1},
    output: [{type:'message',content:[{type:'output_text',text:JSON.stringify(answer)}]}],
  });
};

const { handler } = await import('../../src/server/app.js');
createServer((req,res)=>{
  if (req.url === '/__qa-transport') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({stubbed:requestLog, paid:0}));
  } else {
    void handler(req,res);
  }
}).listen(port, '127.0.0.1', () => console.log('TASTIQ isolated UI fixture at http://127.0.0.1:' + port));
