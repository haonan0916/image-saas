import { db } from "@/server/db/db";
import {
  GetObjectCommand,
  GetObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const file = await db.query.files.findFirst({
    where: (files, { eq }) => eq(files.id, id),
    with: {
      app: {
        with: {
          storage: true,
        },
      },
    },
  });

  if (!file?.app.storage) {
    throw new TRPCError({
      code: "BAD_REQUEST",
    });
  }

  const storage = file.app.storage;

  if (!file || !file.contentType.startsWith("image")) {
    return new NextResponse("", {
      status: 400,
    });
  }

  const param: GetObjectCommandInput = {
    Bucket: storage.configuration.bucket,
    Key: file.path,
  };

  const s3Client = new S3Client({
    endpoint: storage.configuration.apiEndpoint,
    region: storage.configuration.region,
    credentials: {
      accessKeyId: storage.configuration.accessKeyId,
      secretAccessKey: storage.configuration.secretAccessKey,
    },
  });

  const command = new GetObjectCommand(param);
  console.warn(file.path, storage, storage.configuration.bucket, command);
  const response = await s3Client.send(command);
  console.log("response", response);

  const byteArray = await response.Body?.transformToByteArray();

  if (!byteArray) {
    return new NextResponse("", {
      status: 400,
    });
  }

  const image = sharp(byteArray);

  const query = new URL(request.url).searchParams;

  let width = parseInt(query.get("width") || "");
  width = width ?? 250;
  image.resize({
    width,
  });

  let rotate = parseInt(query.get("rotate") || "");
  rotate = rotate || 0;
  image.rotate(rotate);

  const buffer = await image.webp().toBuffer();

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
