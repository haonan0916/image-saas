import Uppy, { Meta, Body, UppyFile } from "@uppy/core";
import { UploadButton, UploadButtonProps } from "./UploadButton";
import { useEffect, useRef } from "preact/hooks";

export function UploaderButtonWithUploader({
  uploader,
  onFileUploaded,
  ...uploadButtonProps
}: {
  uploader: Uppy;
  onFileUploaded: (url: string, file: UppyFile<Meta, Body>) => void;
} & UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const successCallback = (file, resp) => {
      onFileUploaded(resp.uploadURL!, file!);
    };
    const completeCallback = () => {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };
    uploader.on("upload-success", successCallback);
    uploader.on("complete", completeCallback);

    return () => {
      uploader.off("upload-success", successCallback);
      uploader.off("complete", completeCallback);
    };
  });

  function onFiles(files: any) {
    uploader.addFiles(
      files.map((file) => ({
        data: file,
      }))
    );

    uploader.upload();
  }
  return (
    <UploadButton
      {...uploadButtonProps}
      onFileChoosed={onFiles}
      inputRef={inputRef}
    ></UploadButton>
  );
}
