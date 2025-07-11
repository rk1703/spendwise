
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import { navItems } from '@/constants';

export function SidebarNav() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar(); // Get context for mobile state

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false); // Close sidebar on mobile after click
    }
  };

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} onClick={handleLinkClick}> {/* Add onClick handler */}
            <SidebarMenuButton
              asChild
              isActive={pathname.startsWith(item.href)}
              tooltip={item.label}
              className={cn(
                "justify-start",
                pathname.startsWith(item.href) 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
                  : "dark:hover:bg-sidebar-accent hover:bg-[#393028] hover:text-sidebar-accent-foreground"
              )}
            >
              <span>
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
