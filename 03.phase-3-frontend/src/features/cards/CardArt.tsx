import styles from './CardArt.module.css'
import { formatCardNumber } from './format'

export interface CardArtProps {
  cardNumber: string
  embossedName: string
  /** Two-digit month, e.g. "03". */
  expiryMonth: string
  /** Four-digit year, e.g. "2027". */
  expiryYear: string
}

/** Decorative card visual shown next to the detail/update panels. */
export function CardArt({ cardNumber, embossedName, expiryMonth, expiryYear }: CardArtProps) {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.brand}>CardDemo</div>
      <div className={styles.number}>{formatCardNumber(cardNumber)}</div>
      <div className={styles.meta}>
        <span className={styles.name}>{embossedName}</span>
        <span className={styles.expiry}>
          EXP {expiryMonth.padStart(2, '0')}/{expiryYear.slice(-2)}
        </span>
      </div>
    </div>
  )
}
