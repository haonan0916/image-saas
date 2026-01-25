import { trpcClientReact } from "@/utils/api";
import { Button } from "../ui/button";
import { Trash2, Copy } from "lucide-react";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { MouseEvent } from "react";
import { useLocale } from "@/hooks/useLocale";

export function DeleteFile({
  fileId,
  onDeleteSuccess,
}: {
  fileId: string;
  onDeleteSuccess: (fileId: string) => void;
}) {
  const { dict } = useLocale();
  const { mutate: deleteFile, isPending } =
    trpcClientReact.file.deleteFile.useMutation({
      onSuccess: () => {
        onDeleteSuccess(fileId);
      },
    });

  const handleRemoveFile = () => {
    deleteFile(fileId);
    toast(dict.files.deleteSuccess);
  };
  return (
    <Button variant="ghost" onClick={handleRemoveFile} disabled={isPending}>
      <Trash2 />
    </Button>
  );
}

export function CopyUrl({
  onClick,
}: {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Button variant="ghost" onClick={onClick}>
      <Copy />
    </Button>
  );
}
