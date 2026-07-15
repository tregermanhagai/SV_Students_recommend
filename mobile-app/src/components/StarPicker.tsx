interface Props {
  value: number
  onChange: (v: number) => void
}

export default function StarPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-transform active:scale-90 ${n <= value ? 'text-amber-400' : 'text-white/20'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
