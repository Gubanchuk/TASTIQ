import { decisionReasons } from '../core/selection-dialogue.js';

const string=maxLength=>({type:'string',maxLength});
const nullable=schema=>({anyOf:[schema,{type:'null'}]});
const properties={
  version:{type:'integer',enum:[1]},
  reason:{type:'string',enum:decisionReasons},
  gapKey:nullable(string(60)),
  sourceIds:{type:'array',maxItems:5,items:string(100)},
  selectionImpact:nullable(string(220)),
  branches:{type:'array',maxItems:3,items:string(160)},
  remainingGap:nullable(string(240)),
};
export const selectionDecisionSchema={type:'object',properties,required:Object.keys(properties),additionalProperties:false};

export function selectionDecisionInstructions(depth) {
  const policy=depth==='deep'
    ? 'Depth deep: after resolving essentials, ask about a further significant preference or trade-off if the answer can materially improve the selection. Use refinement. If there is no such difference, review immediately.'
    : 'Depth standard: resolve essentials or ambiguities that can lead to materially different results. Once the request is actionable, review; do not ask refinement questions.';
  return `${policy}
Depth describes how much to explore and is never a preference, a quota, or evidence. A short specific wish can go to review immediately. A broad genre can justify a question about desired experience; a title reference without a reason can justify asking what the person wants to carry over. Ask only about one distinction that can affect the selection. Do not ask the person to fill gaps in the catalog. Two neutral replies are a signal to make the next question clearly optional; never assume fatigue or terminate automatically. After six offered questions, a useful seventh is allowed; the interface offers a local choice to review or answer.
decision is a version:1 record of the outcome, not a transcript of reasoning. For action:question set reason constraint (resolve a consequential hard condition), ambiguity (a materially different interpretation of the main wish), or refinement (a secondary distinction after essentials, deep only). gapKey is a short stable lower-case ASCII semantic topic such as desired_pace; use the same gapKey for the topic across alternate phrasings. Cite 1–5 active turn IDs that make the question relevant. selectionImpact briefly explains in Russian which difference matters to the choice. branches contains two or three distinct concise hypothetical answers with different selection consequences; write them as possible directions, never as facts or promises about specific works. remainingGap is null. Keep why concise for the person.
For action:review set reason sufficient, user_stop, or unresolved; question, gapKey and selectionImpact are null and branches is []. sourceIds may be empty. If a material uncertainty or conflicting condition remains, use unresolved and say what remains unclear in remainingGap. Otherwise remainingGap may be null. Do not call incompatible requirements sufficient. Retain independent wishes when a correction changes only one part. Unknown can stay unresolved, indifferent closes that topic, and none allows a better framing when the distinction still matters. A meaningful typed answer alongside a neutral button carries evidence. Do not repeat a closed or skipped topic by renaming its question ID. The snapshot must preserve active hard conditions and the original quotes for every accepted fact you retain.`;
}
