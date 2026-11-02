export default function DownloadButton({ disabled, busy, onClick }) {
  return (
    <button type="button" className="excel-button" disabled={disabled || busy} onClick={onClick}>
      {busy ? 'Yuklanmoqda...' : 'Yuklab olish'}
    </button>
  )
}
