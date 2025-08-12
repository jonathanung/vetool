import clsx from 'clsx'

export default function Avatar({ src, alt, className }: { src?: string | null; alt?: string; className?: string }) {
  return (
    <img src={src || 'https://placehold.co/32x32'} alt={alt || 'Avatar'} className={clsx('rounded-full', className)} />
  )
} 