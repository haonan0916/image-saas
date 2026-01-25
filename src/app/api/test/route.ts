import { NextRequest, NextResponse } from "next/server";
import { createAppSchema } from "@/server/db/validate-schema";
export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const name = query.get("name");
  const email = query.get("email");
  const id = query.get("id");
  const result = createAppSchema.safeParse({ name, email, id });
  if (!result.success) {
    return NextResponse.json({ error: result.error });
  }
  return NextResponse.json(result);
}
