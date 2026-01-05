import Image from "next/image";
import { useMemo } from "react";

export function FileItem({
  url,
  name,
  isImage,
}: {
  url: string;
  name: string;
  isImage: boolean;
}) {
  return isImage ? (
    <img src={url} alt={name}></img>
  ) : (
    <Image
      src="/unknownfile.png"
      alt="unkown file type"
      width={100}
      height={100}
    ></Image>
  );
}

export function LocalFileItem({ file }: { file: File }) {
  const isImage = file.type.startsWith("image");

  const url = useMemo(() => {
    if (isImage) {
      return URL.createObjectURL(file);
    }
    return "";
  }, [isImage, file]);

  return <FileItem url={url} name={file.name} isImage={isImage} />;
}

export function RemoteFileItem({
  contentType,
  name,
  url,
}: {
  contentType: string;
  name: string;
  url: string;
}) {
  const isImage = contentType.startsWith("image");
  return <FileItem url={url} name={name} isImage={isImage} />;
}
