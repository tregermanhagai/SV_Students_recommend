interface Props {
  rating: number   // 1-5 average
  size?: 'sm' | 'md'
}

export default function StarDisplay({ rating, size = 'md' }: Props) {
  const sz = size === 'sm' ? 'text-sm' : 'text-lg'
  return (
    <span className={`${sz} tracking-tight`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= Math.round(rating) ? 'text-amber-400' : 'text-white/20'}>★</span>
      ))}
    </span>
  )
}
