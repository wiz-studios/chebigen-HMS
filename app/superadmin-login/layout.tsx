import { KeyRound, Shield, UserCog } from 'lucide-react'

import { AuthFrame } from '@/components/auth/auth-frame'

export default function SuperAdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthFrame
      mode="superadmin"
      badge="Privileged access"
      sideTitle="SuperAdmin portal."
      sideDescription="Manage users, roles, approvals, and system configuration."
      highlights={[
        {
          title: 'Approvals',
          description: 'Activate staff and patient accounts quickly.',
          icon: <UserCog className="size-4" />,
        },
        {
          title: 'Security controls',
          description: 'Role-based access and audit-friendly actions.',
          icon: <Shield className="size-4" />,
        },
        {
          title: 'Admin sign-in',
          description: 'Restricted access for authorized personnel.',
          icon: <KeyRound className="size-4" />,
        },
      ]}
    >
      {children}
    </AuthFrame>
  )
}

