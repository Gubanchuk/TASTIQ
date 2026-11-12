from pathlib import Path
import re
base=Path('src/server/public')
chevron='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
def header(library=False):
 links=''.join(f'<a href="{url}" data-shell-domain="{key}"><span>{name}</span><small>{description}</small></a>' for key,name,description,url in [('game','Игра','Во что поиграть','/pick/game/'),('film','Фильм','Одна история на вечер','/pick/watch/?domain=film'),('series','Сериал','История в несколько вечеров','/pick/watch/?domain=series'),('cartoon','Мультфильм','Анимация для любого настроения','/pick/watch/?domain=cartoon')])
 nav='<nav class="app-shell-nav" aria-label="Основное"><a href="/#doors"'+('' if library else ' aria-current="page"')+'>Подбор</a><a href="/library/"'+(' aria-current="page"' if library else '')+'>Библиотека</a></nav>'
 action='<a class="app-shell-primary" href="/#doors">Подобрать новое</a>' if library else '<button type="button" class="app-shell-restart" data-act="restart" id="restart">Начать заново</button><button type="button" class="app-shell-restore" data-act="restore-previous" id="restore" hidden>Вернуть прошлый подбор</button>'
 domain='' if library else '<div class="app-domain-control"><button type="button" class="app-domain-button" id="domain-switch" aria-expanded="false" aria-controls="domain-menu"><strong data-selection-domain>Подбираем игру</strong>'+chevron+'</button><div class="app-domain-menu" id="domain-menu" hidden aria-label="Что подобрать">'+links+'</div></div>'
 return '<header class="app-shell" aria-label="Навигация TASTIQ"><a class="app-brand" href="/" aria-label="TASTIQ — главная"><img src="/assets/brand/tastiq-logo-cobalt.svg" alt="TASTIQ" width="148" height="36"></a>'+nav+domain+'<div class="app-shell-actions">'+action+'</div></header>'
for domain in ['game','watch']:
 p=base/'pick'/domain/'index.html';s=p.read_text(encoding='utf-8');s=re.sub(r'<header class="conversation-rail".*?</header>',header(),s,flags=re.S)
 s=re.sub(r'<div class="game-navigation-tools">.*?</details></div>', '<div class="game-navigation-tools"><button class="btn btn-plain" type="button" data-act="focus-request" id="request-link" hidden>Твой запрос</button></div>',s,flags=re.S)
 for i in range(1,5):s=s.replace(f'<span aria-hidden="true">{i}</span>',f'<span aria-hidden="true"><i>{i}</i><svg viewBox="0 0 20 20" fill="none"><path d="m5 10 3 3 7-7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>')
 s=s.replace('<div id="notice"','<section id="request-editor" class="request-editor" aria-label="Редактирование запроса" hidden></section>\n      <div id="notice"')
 s=s.replace('>Поправить</button>','>Изменить</button>')
 s=s.replace('<link rel="stylesheet" href="/shared/product.css?v=1">','<link rel="stylesheet" href="/shared/product.css?v=1">\n  <link rel="stylesheet" href="/shared/workspace.css?v=2">\n  <link rel="stylesheet" href="/shared/custom-select.css?v=2">\n  <link rel="stylesheet" href="/shared/results.css?v=2">')
 p.write_text(s,encoding='utf-8')
p=base/'library/index.html';s=p.read_text(encoding='utf-8');s=re.sub(r'<header class="conversation-rail".*?</header>',header(True),s,flags=re.S)
s=s.replace('<link rel="stylesheet" href="/shared/product.css?v=1">','<link rel="stylesheet" href="/shared/product.css?v=1">\n  <link rel="stylesheet" href="/shared/workspace.css?v=2">\n  <link rel="stylesheet" href="/shared/custom-select.css?v=2">\n  <link rel="stylesheet" href="/shared/results.css?v=2">')
s=s.replace('<script type="module" src="/library/app.js">','<script type="module" src="/shared/workspace-ui.js"></script>\n  <script type="module" src="/library/app.js">');p.write_text(s,encoding='utf-8')
for domain in ['game','watch']:
 p=base/'pick'/domain/'app.js';s=p.read_text(encoding='utf-8')
 s="import {requestOverviewHtml} from '/shared/request-overview.js';\nimport {openRequestEditor,closeRequestEditor,syncRequestEditor} from '/shared/workspace-ui.js';\nimport {initCustomSelects,focusCustomSelect} from '/shared/custom-select.js';\n"+s
 start=s.index('function understanding(screen) {');end=s.index('function questionHtml(',start);old=s[start:end]
 labels=next(line for line in old.splitlines() if 'const labels=' in line)
 ctxt=next(line.strip()[1:] for line in old.splitlines() if '+`<div class="game-context">' in line)
 timecall='timeBudgetHtml(time,{timeMode:context.timeMode})' if domain=='watch' else 'timeBudgetHtml(time)'
 replacement='''function understanding(screen) {
 renderRequestPreview(screen);
 const context=screen.context??{},time=hasSessionTime(screen.sessionTime)?screen.sessionTime:null;
'''+labels+'\n const contextHtml='+ctxt+''';
 $('#understanding').innerHTML=requestOverviewHtml({screen,state:client.state,contextHtml,timeHtml:'''+timecall+''',busy:client.busy,
  toolsHtml:(contextReady(screen)?contextForm(context):'')+historyHtml()+(time?'<details class="request-time-details"><summary>Откуда ограничение времени</summary><ul>'+timeEvidenceHtml(time)+'</ul></details>':''),
  clarification:clarificationHtml({state:client.state,uncertainties:screen.uncertainties,draft:key=>client.draft(key),busy:client.busy}),correction:correctionForm(),
  restore:client.canRestoreCorrection?'<div class="clarification-restore"><p>Предыдущий запрос и варианты можно вернуть.</p><button type="button" class="btn btn-secondary" data-act="restore-correction">Вернуть предыдущие варианты</button></div>':''});
 syncRequestEditor(client.draft('__activeRequestEditor').text);
 initCustomSelects(document);
}
'''
 s=s[:start]+replacement+s[end:]
 s=s.replace('el?.focus({preventScroll:true});if(el)restoreTextSelection','if(el)focusCustomSelect(el,{preventScroll:true});if(el)restoreTextSelection')
 s=s.replace("status:feedback.status(activeEvening),persistent:feedback.persistent,draft:feedbackDrafts.get(key)","status:feedback.status(activeEvening),persistent:feedback.persistent,draft:feedbackDrafts.get(key),modern:true")
 s=s.replace("document.querySelectorAll('#main button,#main input,#main textarea,#request-panel button,#request-panel input,#request-panel textarea,#request-panel select')","document.querySelectorAll('#main button,#main input,#main textarea,#request-editor button,#request-editor input,#request-editor textarea,#request-editor select,#request-panel button,#request-panel input,#request-panel textarea,#request-panel select')")
 s=s.replace(" restoreView(focus);\n}\nfunction observeResult()", " initCustomSelects(document);\n restoreView(focus);\n}\nfunction observeResult()")
 s=s.replace(" const draft=client.draft(form.dataset.key);client.saveDraft(form.dataset.key,{...draft,kind:'none'});form.hidden=false;el.setAttribute('aria-expanded','true');form.elements.clarification.focus();return;", " const draft=client.draft(form.dataset.key);client.saveDraft(form.dataset.key,{...draft,kind:'none'});client.saveDraft('__activeRequestEditor',{text:form.dataset.key});el.setAttribute('aria-expanded','true');openRequestEditor(form);return;")
 # Replace complete one-line action handlers, preserving all transport and draft keys.
 s=re.sub(r" if\(act==='clarify'\).*?return;\}", " if(act==='clarify'){const form=document.getElementById(el.getAttribute('aria-controls'));if(!form)return;const draft=client.draft(form.dataset.key);client.saveDraft(form.dataset.key,{...draft,kind:'none'});client.saveDraft('__activeRequestEditor',{text:form.dataset.key});el.setAttribute('aria-expanded','true');openRequestEditor(form);return;}",s)
 s=re.sub(r" if\(act==='cancel-clarification'\).*?return;\}"," if(act==='cancel-clarification'){const form=el.closest('form'),draft=client.draft(form.dataset.key);client.saveDraft(form.dataset.key,{...draft,kind:'answer'});client.saveDraft('__activeRequestEditor',{text:''});closeRequestEditor(form);return;}",s)
 s=re.sub(r" if\(act==='focus-correction'\).*?return;\}"," if(act==='focus-correction'){const draft=client.draft('__correction');client.saveDraft('__correction',{...draft,kind:'none'});client.saveDraft('__activeRequestEditor',{text:'correction'});openRequestEditor($('#correction-form'));return;}",s)
 s=re.sub(r" if\(act==='cancel-correction'\).*?return;\}"," if(act==='cancel-correction'){const draft=client.draft('__correction');client.saveDraft('__correction',{...draft,kind:'answer'});client.saveDraft('__activeRequestEditor',{text:''});closeRequestEditor($('#correction-form'));return;}",s)
 # Required-only context screens have clear action wording.
 s=s.replace("'Посмотреть понимание','review'","'Проверить запрос','review'")
 s=s.replace("'Исправить запрос','focus-correction'","'Изменить пожелание','focus-correction'")
 p.write_text(s,encoding='utf-8')
