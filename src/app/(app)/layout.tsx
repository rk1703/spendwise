
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Coins } from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { AppHeader } from '@/components/layout/AppHeader';
import { APP_NAME } from '@/constants';
import { BottomNavBar } from '@/components/layout/BottomNavBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.replace('/login');
    }
  }, [user, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This state should ideally not be reached if redirect works quickly
    // or a global loader covers this. Can return null or a minimal message.
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
            <p>Redirecting to login...</p>
            <Loader2 className="ml-2 h-6 w-6 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="items-center">
           <Coins className="h-8 w-8 text-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 transition-all" />
          <span className="text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden font-headline">
            {APP_NAME}
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-sidebar-foreground/70">© {new Date().getFullYear()} {APP_NAME}</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 pb-20 md:p-6 lg:p-8 overflow-auto w-screen md:w-full">
          {children}
        </main>
        <BottomNavBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
