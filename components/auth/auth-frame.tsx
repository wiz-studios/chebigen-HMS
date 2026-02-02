import type React from 'react'

import Link from 'next/link'
import { Stethoscope } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

type Highlight = {
  title: string
  description: string
  icon: React.ReactNode
}

export type AuthFrameMode = 'default' | 'superadmin' | 'setup' | 'utility'

const MODE_STYLES: Record<
  AuthFrameMode,
  {
    wrapper: string
    glow: string
    badge: string
  }
> = {
  default: {
    wrapper:
      'bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
    glow:
      'bg-[radial-gradient(60%_60%_at_20%_10%,rgba(56,189,248,0.35),transparent_60%),radial-gradient(60%_60%_at_80%_20%,rgba(99,102,241,0.25),transparent_55%),radial-gradient(60%_60%_at_60%_90%,rgba(14,165,233,0.18),transparent_60%)] dark:bg-[radial-gradient(60%_60%_at_20%_10%,rgba(56,189,248,0.16),transparent_60%),radial-gradient(60%_60%_at_80%_20%,rgba(99,102,241,0.14),transparent_55%),radial-gradient(60%_60%_at_60%_90%,rgba(14,165,233,0.12),transparent_60%)]',
    badge: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/20',
  },
  superadmin: {
    wrapper:
      'bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-950 dark:to-rose-950/30',
    glow:
      'bg-[radial-gradient(60%_60%_at_20%_10%,rgba(244,63,94,0.28),transparent_60%),radial-gradient(60%_60%_at_80%_20%,rgba(249,115,22,0.22),transparent_55%),radial-gradient(60%_60%_at_60%_90%,rgba(244,63,94,0.14),transparent_60%)] dark:bg-[radial-gradient(60%_60%_at_20%_10%,rgba(244,63,94,0.16),transparent_60%),radial-gradient(60%_60%_at_80%_20%,rgba(249,115,22,0.12),transparent_55%),radial-gradient(60%_60%_at_60%_90%,rgba(244,63,94,0.10),transparent_60%)]',
    badge:
      'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/20',
  },
  setup: {
    wrapper:
      'bg-gradient-to-br from-emerald-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/25',
    glow:
      'bg-[radial-gradient(60%_60%_at_20%_10%,rgba(16,185,129,0.22),transparent_60%),radial-gradient(60%_60%_at_80%_20%,rgba(14,165,233,0.18),transparent_55%),radial-gradient(60%_60%_at_60%_90%,rgba(16,185,129,0.12),transparent_60%)] dark:bg-[radial-gradient(60%_60%_at_20%_10%,rgba(16,185,129,0.14),transparent_60%),radial-gradient(60%_60%_at_80%_20%,rgba(14,165,233,0.12),transparent_55%),radial-gradient(60%_60%_at_60%_90%,rgba(16,185,129,0.10),transparent_60%)]',
    badge:
      'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20',
  },
  utility: {
    wrapper:
      'bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900',
    glow:
      'bg-[radial-gradient(60%_60%_at_20%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(60%_60%_at_80%_20%,rgba(14,165,233,0.14),transparent_55%),radial-gradient(60%_60%_at_60%_90%,rgba(148,163,184,0.18),transparent_60%)] dark:bg-[radial-gradient(60%_60%_at_20%_10%,rgba(99,102,241,0.12),transparent_60%),radial-gradient(60%_60%_at_80%_20%,rgba(14,165,233,0.10),transparent_55%),radial-gradient(60%_60%_at_60%_90%,rgba(148,163,184,0.10),transparent_60%)]',
    badge:
      'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-200 dark:ring-slate-400/20',
  },
}

export function AuthFrame({
  children,
  mode = 'default',
  badge,
  sideTitle,
  sideDescription,
  highlights = [],
  contentClassName,
}: {
  children: React.ReactNode
  mode?: AuthFrameMode
  badge?: string
  sideTitle: string
  sideDescription: string
  highlights?: Highlight[]
  contentClassName?: string
}) {
  const styles = MODE_STYLES[mode]
  const year = new Date().getFullYear()

  return (
    <div className={cn('relative min-h-screen overflow-hidden', styles.wrapper)}>
      <div className={cn('pointer-events-none absolute inset-0', styles.glow)} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)]" />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden lg:flex flex-col justify-between p-10">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Stethoscope className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight">Chebigen HMS</div>
              <div className="text-sm text-muted-foreground">Hospital Management System</div>
            </div>
          </div>

          <div className="max-w-md space-y-5">
            {badge ? (
              <div
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1',
                  styles.badge,
                )}
              >
                {badge}
              </div>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{sideTitle}</h1>
            <p className="text-base text-muted-foreground">{sideDescription}</p>

            {highlights.length ? (
              <div className="mt-6 grid gap-4">
                {highlights.map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="mt-0.5 grid size-9 place-items-center rounded-xl border bg-card text-foreground shadow-sm">
                      {item.icon}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="text-xs text-muted-foreground">
            © {year} Chebigen HMS. Secure access via Supabase.
          </div>
        </aside>

        <main className="relative flex min-h-screen flex-col">
          <div className="flex items-center justify-between px-6 pt-6 lg:px-10 lg:pt-10">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div className="grid size-9 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Stethoscope className="size-4" />
              </div>
              <span className="font-semibold tracking-tight">Chebigen HMS</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 pb-10 pt-8 lg:px-10 lg:py-16">
            <div className={cn('w-full', contentClassName ?? 'max-w-md')}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
