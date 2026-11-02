// A person's own explanation counts even when the keyword parser found no chips.
export function hasAnswerContent(answer) {
  return Boolean(answer && (answer.reasons?.length || answer.issues?.length
    || answer.reaction === 'love' || answer.badQuality
    || (typeof answer.text === 'string' && answer.text.trim())));
}
