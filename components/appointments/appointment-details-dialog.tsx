import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Appointment } from "./appointment-management"

interface AppointmentDetailsDialogProps {
  appointment: Appointment
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusUpdate: (appointmentId: string, newStatus: Appointment["status"]) => void
  canUpdateStatus: (appointment: Appointment) => boolean
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onStatusUpdate,
  canUpdateStatus,
}: AppointmentDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-semibold">Patient</div>
            <div className="col-span-3">
              {appointment.patient?.first_name} {appointment.patient?.last_name}
              <div className="text-sm text-gray-500">MRN: {appointment.patient?.mrn}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-semibold">Doctor</div>
            <div className="col-span-3">{appointment.doctor?.full_name}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-semibold">Status</div>
            <div className="col-span-3">
              <Badge variant="outline">
                {appointment.status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-semibold">Type</div>
            <div className="col-span-3">{appointment.appointment_type || "Consultation"}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="font-semibold">Notes</div>
            <div className="col-span-3">{appointment.notes || "No notes"}</div>
          </div>
        </div>
        <div className="mt-4 space-x-2 flex justify-end">
          {canUpdateStatus(appointment) && appointment.status === "scheduled" && (
            <Button onClick={() => onStatusUpdate(appointment.id, "confirmed")}>
              Confirm Appointment
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}