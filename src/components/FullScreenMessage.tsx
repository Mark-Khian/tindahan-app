import type { ReactNode } from 'react'

export function FullScreenMessage({
  title,
  children,
  icon,
}: {
  title: string
  children?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      {icon}
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  )
}
