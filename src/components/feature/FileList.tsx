import { trpcClientReact, trpcPureClient } from "@/utils/api";
import Uppy, { Meta, UppyFile, Body } from "@uppy/core";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useUppyState } from "@/hooks/useUppyState";
import { LocalFileItem, RemoteFileItem } from "./FileItem";
import { inferRouterOutputs } from "@trpc/server";
import { AppRouter } from "@/server/router";
import { ScrollArea } from "../ui/scroll-area";
import { type filesOrderByColumn } from "@/server/routes/file";
import { CopyUrl, DeleteFile } from "./FileAction";

type FileResult = inferRouterOutputs<AppRouter>["file"]["listFile"];

export function FileList({
  uppy,
  orderBy,
  appId,
  onMakeUrl,
}: {
  uppy: Uppy;
  orderBy: filesOrderByColumn;
  appId: string;
  onMakeUrl: (id: string) => void;
}) {
  const utils = trpcClientReact.useUtils();

  const queryKey = {
    limit: 5,
    orderBy,
    appId,
  };

  const {
    data: infinityQueryData,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpcClientReact.file.infinityQueryFiles.useInfiniteQuery(
    { ...queryKey },
    {
      getNextPageParam: (resp) => resp.nextCursor,
    }
  );

  const fileList = infinityQueryData
    ? infinityQueryData.pages.reduce((result, page) => {
      return [...result, ...page.items];
    }, [] as FileResult)
    : [];
  const [uploadingFileIDs, setUploadingFileIDs] = useState<string[]>([]);
  const uppyFile = useUppyState(uppy, (s) => s.files);

  useEffect(() => {
    const handler = (file, resp) => {
      if (file) {
        trpcPureClient.file.saveFile
          .mutate({
            name: file.data instanceof File ? file.data.name : "test",
            path: resp.uploadURL ?? "",
            type: file.data instanceof File ? file.data.type : "",
            appId,
          })
          .then((resp) => {
            utils.file.infinityQueryFiles.setInfiniteData(
              { ...queryKey },
              (prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  pages: prev.pages.map((page, index) => {
                    if (index === 0) {
                      return {
                        ...page,
                        items: [resp, ...page.items],
                      };
                    }
                    return page;
                  }),
                };
              }
            );
          });
      }
    };

    const uploadHandler: (
      uploadID: string,
      files: UppyFile<Meta, Body>[]
    ) => void = (uploadID, files) => {
      setUploadingFileIDs((prev) => [...prev, ...files.map((f) => f.id)]);
    };

    const completeHandler = () => {
      setUploadingFileIDs([]);
    };

    uppy.on("upload", uploadHandler);

    uppy.on("upload-success", handler);

    uppy.on("complete", completeHandler);

    return () => {
      uppy.off("upload-success", handler);
      uppy.off("upload", uploadHandler);
      uppy.off("complete", completeHandler);
    };
  }, [uppy, utils]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isBottomVisible, setIsBottomVisible] = useState(false);

  useEffect(() => {
    if (isBottomVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isBottomVisible, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (bottomRef.current) {
      const observer = new IntersectionObserver(
        (e) => {
          setIsBottomVisible(e[0].isIntersecting);
        },
        {
          threshold: 0.1,
        }
      );

      const element = bottomRef.current;
      observer.observe(element);

      return () => {
        observer.unobserve(element);
        observer.disconnect();
      };
    }
  }, []);

  const onDeleteSuccess = (id: string) => {
    utils.file.infinityQueryFiles.setInfiniteData({ ...queryKey }, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page) => {
          return {
            ...page,
            items: page.items.filter((item) => item.id !== id),
          };
        }),
      };
    });
  };

  return (
    <ScrollArea className="h-full">
      {isPending && <div className="text-center">Loading...</div>}

      <div
        className={cn(
          "grid grid-cols-1 2xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 gap-4 relative container"
        )}
      >
        {uploadingFileIDs.length > 0 &&
          uploadingFileIDs.map((id) => {
            const file = uppyFile[id];
            return (
              <div
                key={file.id}
                className="h-56 flex justify-center items-center border border-red-300"
              >
                <LocalFileItem file={file.data as File} />
              </div>
            );
          })}
        {fileList?.map((file) => {
          return (
            <div
              key={file.id}
              className="h-56 relative flex justify-center items-center border overflow-hidden"
            >
              <div className="absolute inset-0 bg-background/30 opacity-0 hover:opacity-100 transition-all flex justify-center items-center">
                <CopyUrl onClick={() => onMakeUrl(file.id)}></CopyUrl>
                <DeleteFile
                  fileId={file.id}
                  onDeleteSuccess={onDeleteSuccess}
                />
              </div>
              <RemoteFileItem
                contentType={file.contentType}
                name={file.name}
                url={file.url}
              />
            </div>
          );
        })}
      </div>
      <div
        ref={bottomRef}
        className={cn(
          "justify-center p-8 hidden",
          fileList.length > 0 && "flex"
        )}
      ></div>
    </ScrollArea>
  );
}
