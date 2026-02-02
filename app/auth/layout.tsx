import { ShieldCheck, Sparkles, Users } from 'lucide-react'

import { AuthFrame } from '@/components/auth/auth-frame'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthFrame
      mode="default"
      badge="Secure sign-in"
      sideTitle="Welcome back to Chebigen HMS."
      sideDescription="Sign in to access dashboards, patient records, appointments, billing, and reports."
      highlights={[
        {
          title: 'Role-based access',
          description: 'Staff and patient portals with permissions baked in.',
          icon: <Users className="size-4" />,
        },
        {
          title: 'Session protection',
          description: 'Automatic session refresh and timeout handling.',
          icon: <ShieldCheck className="size-4" />,
        },
        {
          title: 'Fast workflows',
          description: 'Designed for speed during busy shifts.',
          icon: <Sparkles className="size-4" />,
        },
      ]}
    >
      {children}
    </AuthFrame>
  )
}

