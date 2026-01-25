import { DialogContent, DialogTitle } from "@/components/ui/dialog";
import BackableDialog from "./BackableDialog";
import { CreateAppForm } from "../../new/CreateAppForm";

export default function InterceptingCreateApp() {
  return (
    <BackableDialog>
      <DialogContent>
        <DialogTitle className="sr-only">Create New App</DialogTitle>
        <CreateAppForm />
      </DialogContent>
    </BackableDialog>
  );
}
