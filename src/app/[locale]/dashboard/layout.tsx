import { getServerSession } from "@/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { redirect } from "next/navigation";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Plan } from "./Plan";

export default async function DashboardLayout({
  children,
  nav,
}: Readonly<{
  children: React.ReactNode;
  nav: React.ReactNode;
}>) {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }
  return (
    <ThemeProvider>
      <div className="h-screen">
        <nav className="h-[80px] border-b relative">
          <div className="container flex gap-2 justify-end items-center h-full">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={session.user.image!}></AvatarImage>
                    <AvatarFallback>
                      {session.user.name?.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <Plan></Plan>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>{session.user.name}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="absolute h-full top-0 left-1/2 -translate-x-1/2 flex justify-center items-center">
            {nav}
          </div>
        </nav>
        <main className="h-[calc(100%-80px)]">{children}</main>
      </div>
    </ThemeProvider>
  );
}
