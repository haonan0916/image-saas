import Uppy from "@uppy/core";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { useRef } from "react";

export function UploadButton({ uppy }: { uppy: Uppy }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        <Plus size={20} />
      </Button>
      <input
        ref={inputRef}
        className="fixed left-[-10000px]"
        type="file"
        onChange={(e) => {
          if (e.target.files) {
            Array.from(e.target.files).forEach((file) => {
              uppy.addFile({
                data: file,
                name: file.name,
              });
            });
            e.target.value = "";
          }
        }}
        multiple
      />
    </>
  );
}
