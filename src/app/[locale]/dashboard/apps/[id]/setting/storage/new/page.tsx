"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type S3StorageConfiguration } from "@/server/db/schema";
import { trpcClientReact } from "@/utils/api";
import { SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useLocale } from "@/hooks/useLocale";

export default function StoragePage({ params, }: {
  params: Promise<{ id: string }>;
}) {
  const { dict } = useLocale();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<S3StorageConfiguration & { name: string }>();

  const { mutate } = trpcClientReact.storage.createStorage.useMutation();
  const { id } = use(params);
  const onSubmit: SubmitHandler<S3StorageConfiguration & { name: string }> = (
    data
  ) => {
    mutate(data);
    router.push(`/dashboard/apps/${id}/storage`);
  };

  return (
    <div className="h-full pt-10">
      <h1 className="text-3xl mb-6 max-w-md mx-auto">Create Storage</h1>
      <form
        className="flex flex-col gap-4 max-w-md mx-auto"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div>
          <Label>Name</Label>
          <Input
            {...register("name", {
              required: "Name is required",
            })}
          ></Input>
          <span className="text-red-500">{errors.name?.message}</span>
        </div>
        <div>
          <Label>Bucket</Label>
          <Input
            {...register("bucket", {
              required: "Bucket is required",
            })}
          ></Input>
          <span className="text-red-500">{errors.bucket?.message}</span>
        </div>
        <div>
          <Label>AccessKeyId</Label>
          <Input
            {...register("accessKeyId", {
              required: "AccessKeyId is required",
            })}
          ></Input>
          <span className="text-red-500">{errors.accessKeyId?.message}</span>
        </div>
        <div>
          <Label>SecretAccessKey</Label>
          <Input
            type="password"
            {...register("secretAccessKey", {
              required: "SecretAccessKey is required",
            })}
          ></Input>
          <span className="text-red-500">
            {errors.secretAccessKey?.message}
          </span>
        </div>
        <div>
          <Label>Region</Label>
          <Input
            {...register("region", {
              required: "Region is required",
            })}
          ></Input>
          <span className="text-red-500">{errors.region?.message}</span>
        </div>
        <div>
          <Label>ApiEndpoint</Label>
          <Input {...register("apiEndpoint")}></Input>
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </div>
  );
}
