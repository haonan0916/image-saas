import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import CreateApp from "../../new/page";
import BackableDialog from "./BackableDialog";

export default function InterceptingCreateApp() {
  return (
    <BackableDialog>
      <DialogContent>
        <DialogTitle className="sr-only">Create New App</DialogTitle>
        <CreateApp></CreateApp>
      </DialogContent>
    </BackableDialog>
  );
}
