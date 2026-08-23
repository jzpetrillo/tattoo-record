import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BookingStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
type PaymentStatus = "UNPAID" | "DEPOSIT_PAID" | "FULLY_PAID" | "REFUNDED";
type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";
type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "APPRENTICESHIP";

const BOOKING_STATUS_CONFIG: Record<BookingStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING:   { label: "Pending",   variant: "secondary" },
  APPROVED:  { label: "Approved",  variant: "default"   },
  REJECTED:  { label: "Rejected",  variant: "outline"   },
  COMPLETED: { label: "Completed", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "outline"   },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  UNPAID:        { label: "Unpaid",        variant: "outline"   },
  DEPOSIT_PAID:  { label: "Deposit Paid",  variant: "secondary" },
  FULLY_PAID:    { label: "Fully Paid",    variant: "default"   },
  REFUNDED:      { label: "Refunded",      variant: "secondary" },
};

const VERIFICATION_STATUS_CONFIG: Record<VerificationStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING:  { label: "Pending",  variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default"   },
  REJECTED: { label: "Rejected", variant: "outline"   },
};

const JOB_TYPE_LABELS: Record<JobType, string> = {
  FULL_TIME:      "Full Time",
  PART_TIME:      "Part Time",
  CONTRACT:       "Contract",
  APPRENTICESHIP: "Apprenticeship",
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string;
  type: "booking" | "payment" | "verification" | "job-type";
  className?: string;
}

export function StatusBadge({ status, type, className, ...props }: StatusBadgeProps) {
  if (type === "booking") {
    const config = BOOKING_STATUS_CONFIG[status as BookingStatus] ?? { label: status, variant: "outline" as const };
    return (
      <Badge variant={config.variant} className={cn("text-xs", className)} {...props}>
        {config.label}
      </Badge>
    );
  }

  if (type === "payment") {
    const config = PAYMENT_STATUS_CONFIG[status as PaymentStatus] ?? { label: status, variant: "outline" as const };
    return (
      <Badge variant={config.variant} className={cn("text-xs", className)} {...props}>
        {config.label}
      </Badge>
    );
  }

  if (type === "verification") {
    const config = VERIFICATION_STATUS_CONFIG[status as VerificationStatus] ?? { label: status, variant: "outline" as const };
    return (
      <Badge variant={config.variant} className={cn("text-xs", className)} {...props}>
        {config.label}
      </Badge>
    );
  }

  if (type === "job-type") {
    const label = JOB_TYPE_LABELS[status as JobType] ?? status.replace(/_/g, " ");
    return (
      <Badge variant="secondary" className={cn("text-xs", className)} {...props}>
        {label}
      </Badge>
    );
  }

  return <Badge variant="outline" className={cn("text-xs", className)} {...props}>{status}</Badge>;
}
