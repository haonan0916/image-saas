"use client";
import { Uppy } from "@uppy/core";
import AWSS3 from "@uppy/aws-s3";
import { useState, use, ReactNode } from "react";
import { trpcClientReact, trpcPureClient } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/feature/Dropzone";
import { usePasteFile } from "@/hooks/usePasteFile";
import { UploadPreview } from "@/components/feature/UploadPreview";
import { FileList } from "@/components/feature/FileList";
import { DatasetManager } from "@/components/feature/DatasetManager";
import { DatasetDetail } from "@/components/feature/DatasetDetail";
import { ModelManager } from "@/components/feature/ModelManager";
import { TaskManager } from "@/components/feature/TaskManager";
import { TaskDetail } from "@/components/feature/TaskDetail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type filesOrderByColumn } from "@/server/routes/file";
import { MoveUp, MoveDown, Settings, Files, Database, Brain, Play, Plus } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UrlMaker } from "./UrlMaker";
import { UpgradeDialog } from "./Upgrade";
import { useLocale } from "@/hooks/useLocale";

export default function AppPage({ params, }: {
  params: Promise<{ id: string }>;
}) {
  const { dict } = useLocale();
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
  const [showStorageConfig, setShowStorageConfig] = useState(false);
  const [activeTab, setActiveTab] = useState("files");
  const [viewingDatasetId, setViewingDatasetId] = useState<string | null>(null);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);

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
        <p className="text-lg">App does not exist</p>
        <p className="text-sm">Choose another app</p>
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
      <div className="w-full h-full flex flex-col">
        {/* 应用头部信息 */}
        <div className="w-full flex justify-between items-center h-[60px] border-b px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{currentApp.name}</h1>
            {currentApp.description && (
              <span className="text-sm text-muted-foreground">
                {currentApp.description}
              </span>
            )}
          </div>
          <div className="flex justify-center gap-2">
            <Button
              asChild
              onClick={(e) => {
                if (plan === "free") {
                  e.preventDefault();
                  setShowUpgrade(true);
                }
              }}
            >
              <Link href="/dashboard/apps/new">Create New</Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/apps/${appId}/setting/storage`}>
                <Settings />
              </Link>
            </Button>
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="w-full flex justify-center px-6 py-4 border-b">
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <Files className="h-4 w-4" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="datasets" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Datasets
                </TabsTrigger>
                <TabsTrigger value="models" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Models
                </TabsTrigger>
                <TabsTrigger value="tasks" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 文件管理标签页 */}
            <TabsContent value="files" className="flex-1 flex flex-col mt-0">
              <div className="w-full flex justify-between items-center h-[60px] px-6">
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      // 检查存储配置
                      if (!currentApp?.storage) {
                        setShowStorageConfig(true);
                        return;
                      }
                      // 如果有存储配置，触发文件选择
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) {
                          Array.from(files).forEach((file) => {
                            uppy.addFile({
                              data: file,
                              name: file.name,
                            });
                          });
                        }
                      };
                      input.click();
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Dropzone uppy={uppy} className="relative flex-1">
                {(draging) => {
                  return (
                    <>
                      {draging && (
                        <div className="absolute inset-0 bg-secondary/50 z-10 flex justify-center items-center text-3xl">
                          Drop files here
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
            </TabsContent>

            {/* 数据集管理标签页 */}
            <TabsContent value="datasets" className="flex-1 mt-0">
              <div className="w-full max-w-7xl mx-auto px-6 py-6">
                {viewingDatasetId ? (
                  <DatasetDetail
                    datasetId={viewingDatasetId}
                    onBack={() => setViewingDatasetId(null)}
                    uppy={uppy}
                  />
                ) : (
                  <DatasetManager
                    appId={appId}
                    onViewDataset={(datasetId) => setViewingDatasetId(datasetId)}
                  />
                )}
              </div>
            </TabsContent>

            {/* 模型管理标签页 */}
            <TabsContent value="models" className="flex-1 mt-0">
              <div className="w-full max-w-7xl mx-auto px-6 py-6">
                <ModelManager appId={appId} />
              </div>
            </TabsContent>

            {/* 任务管理标签页 */}
            <TabsContent value="tasks" className="flex-1 mt-0">
              <div className="w-full max-w-7xl mx-auto px-6 py-6">
                {viewingTaskId ? (
                  <TaskDetail
                    taskId={viewingTaskId}
                    onBack={() => setViewingTaskId(null)}
                  />
                ) : (
                  <TaskManager
                    appId={appId}
                    onViewTask={(taskId) => setViewingTaskId(taskId)}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 对话框 */}
        <UpgradeDialog
          open={showUpgrade}
          onOpenChange={(f) => setShowUpgrade(f)}
        ></UpgradeDialog>

        {/* 存储配置提示对话框 */}
        <AlertDialog open={showStorageConfig} onOpenChange={setShowStorageConfig}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Storage Configuration Required</AlertDialogTitle>
              <AlertDialogDescription>
                Please configure storage before uploading files
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Link href={`/dashboard/apps/${appId}/setting/storage`}>
                  Go to Configuration
                </Link>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={Boolean(makingUrlImageId)}
          onOpenChange={(flag) => {
            if (flag === false) {
              setMakingUrlImageId(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogTitle>Make URL</DialogTitle>
            {makingUrlImageId && <UrlMaker id={makingUrlImageId}></UrlMaker>}
          </DialogContent>
        </Dialog>

        {/* 只在文件管理标签页激活时显示上传预览 */}
        {activeTab === "files" && <UploadPreview uppy={uppy} />}
      </div>
    );
  }

  return children;
}
