import Uppy from "@uppy/core";
import { HTMLAttributes, ReactNode, useRef, useState } from "react";

export function Dropzone({
  uppy,
  children,
  ...divProps
}: {
  uppy: Uppy;
  children: ReactNode | ((draging: boolean) => ReactNode);
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  const [draging, setDraging] = useState(false);
  const dragCounter = useRef(0);

  return (
    <div
      {...divProps}
      onDragEnter={(e) => {
        e.preventDefault();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          setDraging(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) {
          setDraging(false);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragCounter.current = 0;
        setDraging(false);
        const files = e.dataTransfer.files;
        Array.from(files).forEach((file) => {
          uppy.addFile({
            data: file,
            name: file.name,
          });
        });
      }}
    >
      {typeof children === "function" ? children(draging) : children}
    </div>
  );
}
