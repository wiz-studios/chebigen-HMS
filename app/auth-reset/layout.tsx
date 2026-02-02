import { LifeBuoy, ShieldAlert, RefreshCcw } from 'lucide-react'

import { AuthFrame } from '@/components/auth/auth-frame'

export default function AuthResetLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthFrame
      mode="utility"
      badge="Recovery tool"
      sideTitle="Trouble signing in?"
      sideDescription="Reset your local authentication state and return to login."
      highlights={[
        {
          title: 'Safe reset',
          description: 'Clears local session data and signs out securely.',
          icon: <ShieldAlert className="size-4" />,
        },
        {
          title: 'Quick recovery',
          description: 'Back to the login screen in seconds.',
          icon: <RefreshCcw className="size-4" />,
        },
        {
          title: 'Need help?',
          description: 'Contact your SuperAdmin or support team.',
          icon: <LifeBuoy className="size-4" />,
        },
      ]}
    >
      {children}
    </AuthFrame>
  )
}

