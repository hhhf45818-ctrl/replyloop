import { ReplyloopProvider } from "@/components/ReplyloopProvider";
import { DashboardShell } from "@/components/DashboardShell";

// Shared layout for every authenticated route. Provides the global
// Replyloop state + app chrome (sidebar, modal, toasts).
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReplyloopProvider>
      <DashboardShell>{children}</DashboardShell>
    </ReplyloopProvider>
  );
}
