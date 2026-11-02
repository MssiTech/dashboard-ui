import { itemLines } from '../lib/presence'

export default function CellLines({ items, lines }) {
  const list = lines ?? itemLines(items)
  if (!list.length) return <span className="muted-cell">Mavjud emas</span>
  return (
    <ul className="cell-list" title={list.join('\n')}>
      {list.map((line, index) => (
        <li key={`${line}-${index}`}>{line}</li>
      ))}
    </ul>
  )
}
