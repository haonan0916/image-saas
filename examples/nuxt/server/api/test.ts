import { createApiClient } from "@image-saas/api";
import jwt from "jsonwebtoken";

const apiKey = "6f29fcd4-7eb2-4eb5-9a13-4fbef0faf055";
const clientId = "c7fead23-e63f-4d25-96a0-684801f13f3c";

export default defineEventHandler(async (event) => {
  const token = jwt.sign(
    {
      filename: "19软工1班李浩南137.png",
      contentType: "image/png",
      size: 570422,
      appId: "43f3f117-1050-4f3c-8554-f8ef2ad7e922",
      clientId,
    },
    apiKey,
    {
      expiresIn: "10m",
    }
  );
  // const apiClient = createApiClient({ apiKey });

  // const response = await apiClient.file?.createPresignedUrl?.mutate({
  //   filename: "19软工1班李浩南137.png",
  //   contentType: "image/png",
  //   size: 570422,
  //   appId: "43f3f117-1050-4f3c-8554-f8ef2ad7e922",
  // });

  return token;
});
