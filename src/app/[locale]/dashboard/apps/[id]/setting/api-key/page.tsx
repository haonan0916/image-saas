"use client";
import { Button } from "@/components/ui/button";
import { trpcClientReact } from "@/utils/api";
import { Plus, Copy, Eye } from "lucide-react";
import { use, useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { useLocale } from "@/hooks/useLocale";

function KeyString({ id }: { id: number }) {
  const { data: key } = trpcClientReact.apiKeys.requestKey.useQuery(id);
  return (
    <div className="flex justify-end items-center gap-2">
      <span>{key}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          if (key) {
            copy(key);
            toast("Key copied");
          }
        }}
      >
        <Copy></Copy>Copy
      </Button>
    </div>
  );
}

export default function ApiKeyPage({ params, }: {
  params: Promise<{ id: string }>;
}) {
  const { dict } = useLocale();
  const { id } = use(params);
  const { data: apiKeys } = trpcClientReact.apiKeys.listApiKeys.useQuery({
    appId: id,
  });
  const utils = trpcClientReact.useUtils();

  const { mutate: createApiKey } =
    trpcClientReact.apiKeys.createApiKey.useMutation({
      onSuccess: (data) => {
        utils.apiKeys.listApiKeys.setData(
          {
            appId: id,
          },
          (prev) => {
            setName("");
            if (!prev || !data) {
              return prev;
            }
            return [data, ...prev];
          }
        );
      },
    });
  const [name, setName] = useState("");

  const [showKeyMap, setShowKeyMap] = useState<Record<number, boolean>>({});
  return (
    <div className="h-full flex justify-center">
      <div className="container pt-10">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl mb-6">API Keys</h1>
          <Popover>
            <PopoverTrigger asChild>
              <Button>
                <Plus></Plus>
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="flex flex-col gap-4">
                <Input
                  placeholder={dict.common.name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button
                  type="submit"
                  onClick={() => {
                    createApiKey({
                      appId: id,
                      name,
                    });
                  }}
                >
                  Submit
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <Accordion type="single" collapsible>
          {apiKeys?.map((apiKey) => {
            return (
              <AccordionItem key={apiKey.id} value={apiKey.id + ""}>
                <AccordionTrigger>{apiKey.name}</AccordionTrigger>
                <AccordionContent>
                  <div className="flex justify-between text-lg mb-4">
                    <span>Client ID</span>
                    <div className="flex justify-end items-center gap-2">
                      <span>{apiKey.clientId}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          copy(apiKey.clientId);
                          toast("Client ID copied");
                        }}
                      >
                        <Copy></Copy>Copy
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between text-lg mb-4">
                    <span>Key</span>
                    {!showKeyMap[apiKey.id] && (
                      <Button
                        onClick={() => {
                          setShowKeyMap((oldMap) => ({
                            ...oldMap,
                            [apiKey.id]: true,
                          }));
                        }}
                      >
                        <Eye></Eye>
                      </Button>
                    )}
                    {showKeyMap[apiKey.id] && <KeyString id={apiKey.id} />}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
