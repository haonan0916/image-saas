import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (true) {
    return NextResponse.redirect("/api/auth/signin");
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard",
};
