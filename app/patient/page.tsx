import { requireAuth } from "@/lib/auth"
import { PatientPortal } from "@/components/patient/patient-portal"

export default async function PatientPage() {
  const user = await requireAuth(["patient"])

  return <PatientPortal user={user} />
}
