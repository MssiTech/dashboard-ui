import { paginationItems } from '../lib/pagination'

export default function Pager({ page, pageCount, disabled = false, hasNext, onPage }) {
  const total = pageCount ?? page
  const nextDisabled = disabled || (hasNext === undefined ? page >= total : !hasNext || pageCount === page)

  return (
    <div className="pager">
      <button type="button" disabled={page === 1 || disabled} onClick={() => onPage((current) => current - 1)}>
        Oldingi
      </button>
      {paginationItems(page, total).map((item, index) =>
        item === '…' ? (
          <span key={`gap-${index}`} className="pager-gap">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? 'page-number active' : 'page-number'}
            aria-current={item === page ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onPage(item)}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" disabled={nextDisabled} onClick={() => onPage((current) => current + 1)}>
        Keyingi
      </button>
    </div>
  )
}
