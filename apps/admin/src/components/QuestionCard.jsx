import { SYMBOLS } from "../data/flags";
import { ADMIN_STATUS_LABELS } from "../data/admin";
import { patchLessonQuestion, removeLessonQuestion } from "../store";

function phraseQuestionPreviewText(q, phrase){
  if (!phrase) return "Pick a phrase above.";
  if (q.kind === "comprehend") return `Hears: ${phrase.data.local} → ${phrase.data.en}`;
  return `Prompt: How do you say "${phrase.data.en}"? → ${phrase.data.local}`;
}

export default function QuestionCard({ q, i, lessonData, phrases }){
  const canUsePhraseBank = (q.kind === "produce" || q.kind === "comprehend")
    && lessonData.scope === "country-specific" && !!lessonData.languageId;
  const usingPhraseBank = canUsePhraseBank && q.source === "phrase";
  const phrasePool = canUsePhraseBank ? phrases : [];
  const selectedPhrase = usingPhraseBank && q.phraseId ? phrasePool.find(p => p.id === q.phraseId) : null;

  const patch = p => patchLessonQuestion(i, p);

  return (
    <div className="admin-question-card">
      <div className="admin-question-card__head">
        <span className="admin-question-card__index">Question {i + 1}</span>
        <button type="button" className="admin-remove-btn" onClick={() => removeLessonQuestion(i)}>Remove</button>
      </div>

      <label className="field-label">Kind</label>
      <select className="admin-select" value={q.kind} onChange={e => patch({ kind: e.target.value })}>
        <option value="produce">Produce — "How do you say X?"</option>
        <option value="comprehend">Comprehend — hear a phrase, pick what it means</option>
        <option value="symbol">Symbol — read a sign/icon</option>
        <option value="situational">Situational — "what would you do?"</option>
      </select>

      <label className="field-label">Scenario context</label>
      <textarea className="notes" style={{ minHeight: "44px" }} placeholder="e.g. You sit down and a waiter hands you a menu."
        value={q.context} onChange={e => patch({ context: e.target.value })} />

      {q.kind === "symbol" ? (
        <>
          <label className="field-label">Symbol icon</label>
          <select className="admin-select" value={q.symbol} onChange={e => patch({ symbol: e.target.value })}>
            {Object.keys(SYMBOLS).map(key => <option key={key} value={key}>{key}</option>)}
          </select>
        </>
      ) : null}

      {canUsePhraseBank ? (
        <>
          <label className="field-label">Content source</label>
          <select className="admin-select" value={q.source} onChange={e => patch({ source: e.target.value })}>
            <option value="custom">Custom text</option>
            <option value="phrase">From phrase bank</option>
          </select>
        </>
      ) : null}

      {usingPhraseBank ? (
        <>
          <label className="field-label">Phrase</label>
          <select className="admin-select" value={q.phraseId || ""} onChange={e => patch({ phraseId: e.target.value || null })}>
            <option value="">— pick a phrase —</option>
            {phrasePool.map(p => (
              <option key={p.id} value={p.id}>
                {p.data.en} — {p.data.local}{p.status !== "published" ? ` (${ADMIN_STATUS_LABELS[p.status]})` : ""}
              </option>
            ))}
          </select>
          {!phrasePool.length ? <p className="admin-hint">No phrases authored yet for this Lesson's country/language — add one from the Country or Language page.</p> : null}
          <p className="admin-hint">{phraseQuestionPreviewText(q, selectedPhrase)}</p>
        </>
      ) : null}

      {(!usingPhraseBank && q.kind === "comprehend") ? (
        <>
          <label className="field-label">What they say (local phrase)</label>
          <input className="text-input" value={q.heard} placeholder="e.g. Nan-ban-sen desu ka?" onChange={e => patch({ heard: e.target.value })} />
        </>
      ) : null}

      {(!usingPhraseBank || q.kind === "comprehend") ? (
        <>
          <label className="field-label">Question prompt</label>
          <input className="text-input" value={q.question} placeholder="e.g. What are they asking?" onChange={e => patch({ question: e.target.value })} />
        </>
      ) : null}

      {!usingPhraseBank ? (
        <>
          <label className="field-label">Correct answer</label>
          <input className="text-input" value={q.correctAnswer} placeholder="The right option" onChange={e => patch({ correctAnswer: e.target.value })} />

          <label className="field-label">Distractors (comma-separated)</label>
          <input className="text-input" value={q.distractors} placeholder="Wrong option one, wrong option two" onChange={e => patch({ distractors: e.target.value })} />
        </>
      ) : null}
    </div>
  );
}
