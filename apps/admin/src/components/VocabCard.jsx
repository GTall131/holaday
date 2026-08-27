export default function VocabCard({ phrase }){
  return (
    <div className="vocab-card">
      <div className="vocab-card__en">{phrase.en}</div>
      <div className="vocab-card__local">{phrase.local}</div>
      <div className="vocab-card__translit">{phrase.translit}</div>
    </div>
  );
}
