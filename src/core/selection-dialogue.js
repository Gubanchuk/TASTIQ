import { isSelectionDepth } from '../server/public/shared/conversation-entry.js';

export const SELECTION_TURN_LIMIT=24;
const correctionReserve=2;
const choiceAfter=6;
const offerLimit=64;
const baseQuestions=new Set(['direction','platform','company','party','context','extra']);
const isInterviewQuestion=q=>typeof q?.id==='string' && !baseQuestions.has(q.id) && !q.id.startsWith('correction:');
const questionReasons=['constraint','ambiguity','refinement'];
const reviewReasons=['sufficient','user_stop','unresolved'];
export const decisionReasons=[...questionReasons,...reviewReasons];
const decisionFields=['version','reason','gapKey','sourceIds','selectionImpact','branches','remainingGap'];
const validGap=value=>typeof value==='string' && /^[a-z0-9][a-z0-9_.:-]{0,59}$/.test(value);
const boundedText=(value,max)=>typeof value==='string' && value.length<=max && Boolean(value.trim());
const offerKey=q=>`${q.id}\n${q.title}`;
const gapSkipKey=gap=>`gap:${gap}`;
const answeredOfferKeys=state=>state.turns.filter(turn=>isInterviewQuestion(turn?.question)&&!turn.superseded).map(turn=>offerKey(turn.question));

export function normalizeSelectionInterview(state,fail) {
  if(state.depth==null)return;
  if(!isSelectionDepth(state.depth))throw fail('Не удалось прочитать режим подбора.');
  if(state.questionOffers!=null&&(!Array.isArray(state.questionOffers)||state.questionOffers.length>offerLimit
    ||state.questionOffers.some(key=>!boundedText(key,321))))throw fail('Не удалось прочитать историю уточнений.');
  state.questionOffers=[...new Set(state.questionOffers??answeredOfferKeys(state))];
  if(state.depthChangedInReview!=null&&typeof state.depthChangedInReview!=='boolean')throw fail('Не удалось прочитать состояние диалога.');
  if(state.interviewComplete!=null&&typeof state.interviewComplete!=='boolean')throw fail('Не удалось прочитать состояние подбора.');
  if(state.interview!=null) {
    const {depth,offered,answered}=state.interview;
    if(!state.interviewComplete||depth!==state.depth||!Number.isInteger(offered)||offered<0||offered>offerLimit
      ||!Number.isInteger(answered)||answered<0||answered>SELECTION_TURN_LIMIT||answered>offered)throw fail('Не удалось прочитать сведения о подборе.');
    state.interview={depth,offered,answered};
  }
}

export function restartSelectionDepth(state,action,fail) {
  if(action.depth!==undefined&&!isSelectionDepth(action.depth))throw fail('Выбери один из двух режимов подбора.');
  return action.depth??state.depth;
}

export function changeSelectionDepth(state,action,fail) {
  if(!isSelectionDepth(action.depth))throw fail('Выбери один из двух режимов подбора.');
  if(state.result||state.interviewComplete)throw fail('Чтобы сменить режим, начни новый подбор.');
  if(action.depth===state.depth)return state;
  const changed={...state,depth:action.depth,revision:state.revision+1,questionOffers:state.questionOffers??[...new Set(answeredOfferKeys(state))],
    depthChangedInReview:action.depth==='deep'&&state.phase==='review'};
  return rememberInterviewQuestion(changed,state.question);
}

export function interviewQuestionFields(q) {
  return validGap(q.gapKey)&&boundedText(q.selectionImpact,220)?{gapKey:q.gapKey,selectionImpact:q.selectionImpact}:{};
}

export const canOfferInterviewQuestion=state=>!state.depth||state.turns.length<SELECTION_TURN_LIMIT-correctionReserve
  &&(state.questionOffers?.length??0)<offerLimit;

export function rememberInterviewQuestion(state,question) {
  if(!state.depth||!isInterviewQuestion(question))return state;
  const key=offerKey(question),previous=state.questionOffers??[];
  return previous.includes(key)||previous.length>=offerLimit?state:{...state,questionOffers:[...previous,key]};
}

export function skippedInterviewQuestions(state,question) {
  const gap=question.gapKey;
  return [...state.skippedQuestions,question.id,...(state.depth&&gap?[gapSkipKey(gap)]:[])].slice(state.depth?-offerLimit:-12);
}

const unansweredGapNotice='Не удалось подтвердить пользу следующего вопроса. Проверь, всё ли нужное учтено.';
const capacityNotice=state=>state.turns.length<SELECTION_TURN_LIMIT
  ?'Разговор получился длинным. Проверь запрос. Ещё можно внести поправку.'
  :'Разговор получился длинным. Можно проверить запрос и посмотреть варианты или начать новый подбор.';

export function reviewAtInterviewCapacity(state) {
  return {...state,phase:'review',question:null,needsPlan:false,provisional:true,
    uncertainties:[...new Set([capacityNotice(state),...state.uncertainties])].slice(0,8)};
}

export function chooseInterviewQuestion(state,proposal,question) {
  if(!state.depth)return {question};
  const decision=proposal.decision;
  const review=notice=>({question:null,notice});
  if(!decision||typeof decision!=='object'||Object.keys(decision).length!==decisionFields.length
    ||!decisionFields.every(key=>Object.hasOwn(decision,key))||decision.version!==1||!Array.isArray(decision.sourceIds)
    ||decision.sourceIds.length>5||new Set(decision.sourceIds).size!==decision.sourceIds.length
    ||decision.sourceIds.some(id=>!state.turns.some(turn=>turn.id===id&&!turn.superseded))||!Array.isArray(decision.branches))return review(unansweredGapNotice);
  if(proposal.action==='review') {
    if(proposal.question!==null||!reviewReasons.includes(decision.reason)||decision.gapKey!==null||decision.selectionImpact!==null||decision.branches.length
      ||decision.remainingGap!==null&&!boundedText(decision.remainingGap,240)||decision.reason==='unresolved'&&decision.remainingGap===null)return review(unansweredGapNotice);
    return review(decision.remainingGap??undefined);
  }
  if(!isInterviewQuestion(question)||!questionReasons.includes(decision.reason)||!validGap(decision.gapKey)||!decision.sourceIds.length
    ||!boundedText(decision.selectionImpact,220)||decision.remainingGap!==null||decision.branches.length<2||decision.branches.length>3
    ||decision.branches.some(branch=>!boundedText(branch,160))||new Set(decision.branches.map(branch=>branch.trim().toLowerCase())).size!==decision.branches.length)return review(unansweredGapNotice);
  if(state.depth==='standard'&&decision.reason==='refinement')return review();
  const relevantTurns=state.turns.slice(state.turns.findLastIndex(turn=>turn.question.id?.startsWith?.('correction:'))+1);
  if(state.skippedQuestions?.some(key=>key===question.id||key===gapSkipKey(decision.gapKey))
    ||relevantTurns.some(turn=>!turn.superseded&&(offerKey(turn.question)===offerKey(question)
      ||turn.kind!=='none'&&(turn.question.id===question.id||turn.question.gapKey===decision.gapKey))))return review(unansweredGapNotice);
  if(!canOfferInterviewQuestion(state))return review(capacityNotice(state));
  return {question:{...question,gapKey:decision.gapKey,selectionImpact:decision.selectionImpact.trim()}};
}

export function interviewCheckpoint(state,question) {
  if(!state.depth||!isInterviewQuestion(question))return null;
  const offered=state.questionOffers?.length??0;
  const recent=state.turns.filter(turn=>!turn.superseded&&isInterviewQuestion(turn.question)).slice(-2);
  const neutralPair=recent.length===2&&recent.every(turn=>turn.kind!=='answer'&&!turn.text?.trim());
  if(offered<=choiceAfter&&!neutralPair)return null;
  return {reason:offered>choiceAfter?'questions':'neutral',offered,selectionImpact:question.selectionImpact??question.why??''};
}

export function completeInterview(state) {
  if(!state.depth)return {};
  if(state.interviewComplete&&state.interview)return {interviewComplete:true,interview:state.interview};
  const answered=new Set(answeredOfferKeys(state));
  const offered=new Set([...(state.questionOffers??[]),...answered]);
  return {interviewComplete:true,interview:{depth:state.depth,offered:Math.min(offered.size,offerLimit),answered:answered.size}};
}
