import { Database, Settings2, UserPlus } from 'lucide-react'

import { AuthFrame } from '@/components/auth/auth-frame'

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthFrame
      mode="setup"
      badge="First-time setup"
      sideTitle="Set up your HMS in minutes."
      sideDescription="Create the first SuperAdmin account and configure initial system settings."
      contentClassName="max-w-3xl"
      highlights={[
        {
          title: 'Database check',
          description: 'Verify connectivity before creating accounts.',
          icon: <Database className="size-4" />,
        },
        {
          title: 'Create SuperAdmin',
          description: 'Provision the first admin with active status.',
          icon: <UserPlus className="size-4" />,
        },
        {
          title: 'Configure basics',
          description: 'Set hospital profile and initial preferences.',
          icon: <Settings2 className="size-4" />,
        },
      ]}
    >
      {children}
    </AuthFrame>
  )
}
