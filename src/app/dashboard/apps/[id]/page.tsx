"use client";
import { Uppy } from "@uppy/core";
import AWSS3 from "@uppy/aws-s3";
import { useState, use, ReactNode } from "react";
import { trpcClientReact, trpcPureClient } from "@/utils/api";
import { UploadButton } from "@/components/feature/UploadButton";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/feature/Dropzone";
import { usePasteFile } from "../../../hooks/usePasteFile";
import { UploadPreview } from "@/components/feature/UploadPreview";
import { FileList } from "@/components/feature/FileList";
import { type filesOrderByColumn } from "@/server/routes/file";
import { MoveUp, MoveDown, Settings } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { UrlMaker } from "./UrlMaker";
import { UpgradeDialog } from "./Upgrade";

export default function AppPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appId } = use(params);
  const { data: apps, isPending } = trpcClientReact.app.listApps.useQuery(
    void 0,
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  const currentApp = apps?.filter((app) => app.id === appId)[0];

  const [showUpgrade, setShowUpgrade] = useState(false);

  const [uppy] = useState(() => {
    const uppy = new Uppy();
    uppy.use(AWSS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file) {
        try {
          const result = await trpcPureClient.file.createPresignedUrl.mutate({
            filename: file.data instanceof File ? file.data.name : "test",
            contentType: file.data instanceof File ? file.data.type : "",
            size: file.size || 0,
            appId,
          });
          return result;
        } catch (err) {
          setShowUpgrade(true);
          throw err;
        }
      },
    });
    return uppy;
  });

  usePasteFile({
    onFilesPaste: (files) => {
      uppy.addFiles(
        files.map((file) => ({
          data: file,
          name: file.name,
        }))
      );
    },
  });

  const [orderBy, setOrderBy] = useState<
    Exclude<filesOrderByColumn, undefined>
  >({
    field: "createdAt",
    order: "desc",
  });

  const [makingUrlImageId, setMakingUrlImageId] = useState<string | null>(null);

  const { data: plan } = trpcClientReact.user.getPlan.useQuery(void 0, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  let children: ReactNode;

  if (isPending) {
    children = <div>Loading...</div>;
  } else if (!currentApp) {
    children = (
      <div className="flex flex-col mt-10 p-4 border rounded-md max-w-48 items-center">
        <p className="text-lg">App Not Exist</p>
        <p className="text-sm">Choose another one</p>
        <div className="flex flex-col gap-4 items-center">
          {apps?.map((app) => (
            <Button key={app.id} asChild variant="link">
              <Link href={`/dashboard/apps/${app.id}`}>{app.name}</Link>
            </Button>
          ))}
        </div>
      </div>
    );
  } else {
    children = (
      <div className="mx-auto h-full flex flex-col justify-center items-center">
        <div className="container flex justify-between items-center h-[60px]">
          <Button
            onClick={() => {
              setOrderBy((current) => ({
                ...current,
                order: current?.order === "asc" ? "desc" : "asc",
              }));
            }}
          >
            Created At
            {orderBy.order === "asc" ? <MoveUp /> : <MoveDown />}
          </Button>
          <div className="flex justify-center gap-2">
            <UploadButton uppy={uppy}></UploadButton>
            <Button
              asChild
              onClick={(e) => {
                if (plan === "free") {
                  e.preventDefault();
                  setShowUpgrade(true);
                }
              }}
            >
              <Link href="/dashboard/apps/new">Create New App</Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/apps/${appId}/setting/storage`}>
                <Settings />
              </Link>
            </Button>
          </div>
        </div>
        <Dropzone uppy={uppy} className="relative h-[calc(100%-60px)]">
          {(draging) => {
            return (
              <>
                {draging && (
                  <div className="absolute inset-0 bg-secondary/50 z-10 flex justify-center items-center text-3xl">
                    Drop File Here
                  </div>
                )}
                <FileList
                  uppy={uppy}
                  orderBy={orderBy}
                  appId={appId}
                  onMakeUrl={(id) => setMakingUrlImageId(id)}
                ></FileList>
              </>
            );
          }}
        </Dropzone>
        <UploadPreview uppy={uppy}></UploadPreview>
        <UpgradeDialog
          open={showUpgrade}
          onOpenChange={(f) => setShowUpgrade(f)}
        ></UpgradeDialog>
        <Dialog
          open={Boolean(makingUrlImageId)}
          onOpenChange={(flag) => {
            if (flag === false) {
              setMakingUrlImageId(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogTitle>Make Url</DialogTitle>
            {makingUrlImageId && <UrlMaker id={makingUrlImageId}></UrlMaker>}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return children;
}
