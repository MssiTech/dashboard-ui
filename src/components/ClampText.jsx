export default function ClampText({ value, empty = 'Mavjud emas' }) {
  const text = String(value ?? '').trim() || empty
  return (
    <span className="clamp-text" title={text}>
      {text}
    </span>
  )
}
