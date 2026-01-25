"use client";
import { Button } from "@/components/ui/button";
import { trpcClientReact } from "@/utils/api";
import { Plus } from "lucide-react";
import { use } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function StoragePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: storages } = trpcClientReact.storage.listStorages.useQuery();
  const { id } = use(params);
  const { data: apps } = trpcClientReact.app.listApps.useQuery();
  const utils = trpcClientReact.useUtils();
  const { mutate } = trpcClientReact.app.changeStorage.useMutation({
    onSuccess: (data, { appId, storageId }) => {
      utils.app.listApps.setData(void 0, (prev) => {
        if (!prev) {
          return prev;
        }
        return prev.map((p) =>
          p.id === appId
            ? {
              ...p,
              storageId,
            }
            : p
        );
      });
    },
  });

  const currentApp = apps?.find((app) => app.id === id);
  return (
    <div className="h-full flex justify-center">
      <div className="container pt-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl mb-6">Storage</h1>
          <Button asChild>
            <Link href={`/dashboard/apps/${id}/setting/storage/new`}>
              <Plus></Plus>
            </Link>
          </Button>
        </div>
        <Accordion type="single" collapsible>
          {storages?.map((storage) => {
            return (
              <AccordionItem key={storage.id} value={storage.id + ""}>
                <AccordionTrigger
                  className={
                    currentApp?.storageId === storage.id
                      ? "text-destructive"
                      : ""
                  }
                >
                  {storage.name}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="text-lg mb-6">
                    <div className="flex justify-between items-center">
                      <span>Region</span>
                      <span>{storage.configuration.region}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Bucket</span>
                      <span>{storage.configuration.bucket}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>API Endpoint</span>
                      <span>{storage.configuration.apiEndpoint}</span>
                    </div>
                  </div>
                  <Button
                    disabled={currentApp?.storageId === storage.id}
                    onClick={() =>
                      mutate({
                        appId: id,
                        storageId: storage.id,
                      })
                    }
                  >
                    {currentApp?.storageId === storage.id ? "Used" : "Use"}
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
