"use client";
import { useUppyState } from "@/app/dashboard/useUppyState";
import Uppy from "@uppy/core";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { LocalFileItem } from "./FileItem";

export function UploadPreview({ uppy }: { uppy: Uppy }) {
  const files = useUppyState(uppy, (s) => Object.values(s.files));
  const open = useMemo(() => files.length > 0, [files]);

  const [index, setIndex] = useState(0);
  const file = files[index];

  const clear = () => {
    files.forEach((file) => {
      uppy.removeFile(file.id);
    });
    setIndex(0);
  };

  return file ? (
    <Dialog
      open={open}
      onOpenChange={(flag) => {
        if (!flag) {
          clear();
        }
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>Upload Preview</DialogTitle>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() =>
              setIndex((i) => (i - 1 + files.length) % files.length)
            }
          >
            <ChevronLeft />
          </Button>
          <div
            key={file.id}
            className="w-56 h-56 flex justify-center items-center"
          >
            <LocalFileItem file={file.data as File} />
          </div>
          <Button
            variant="ghost"
            onClick={() => setIndex((i) => (i + 1) % files.length)}
          >
            <ChevronRight />
          </Button>
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => {
              uppy.removeFile(file.id);
              // 如果删除的是最后一个文件，索引减1
              if (index === files.length - 1 && index > 0) {
                setIndex(index - 1);
              }
              // 如果删除后没有文件了，索引设为0
              else if (files.length === 1) {
                setIndex(0);
              }
            }}
          >
            Delete this
          </Button>
          <Button
            onClick={() => {
              uppy.upload().then(() => {
                clear();
              });
            }}
          >
            Upload All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;
}
