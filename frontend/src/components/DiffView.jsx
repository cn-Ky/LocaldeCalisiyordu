import { diffLines } from 'diff';

export default function DiffView({ filename, oldContent = '', newContent = '' }) {
  const parts = diffLines(oldContent, newContent);
  return (
    <div className="diff-file bevel-sunken">
      <div className="diff-file-name">📄 {filename}</div>
      <div>
        {parts.map((part, i) => {
          const cls = part.added ? 'add' : part.removed ? 'remove' : 'context';
          const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
          return part.value.split('\n').filter((l, idx, arr) => !(idx === arr.length - 1 && l === '')).map((line, j) => (
            <div key={`${i}-${j}`} className={`diff-line ${cls}`}>{prefix}{line}</div>
          ));
        })}
      </div>
    </div>
  );
}
