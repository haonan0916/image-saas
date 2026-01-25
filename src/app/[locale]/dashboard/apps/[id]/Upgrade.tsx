import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpcClientReact } from "@/utils/api";

export function UpgradeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (f: boolean) => void;
}) {
  const { mutate, isPending } = trpcClientReact.user.upgrade.useMutation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade</DialogTitle>
          <DialogDescription>
            Upgrade your app to use more features.
          </DialogDescription>
        </DialogHeader>
        <p>Upgrade your app to use more features.</p>
        <Button onClick={() => mutate()} disabled={isPending}>
          Upgrade
        </Button>
      </DialogContent>
    </Dialog>
  );
}
