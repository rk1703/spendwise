
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { navItems } from '@/constants';
import { motion } from 'framer-motion';

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
      {navItems.map((item, index) => (
        <motion.div
          key={item.href}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <SidebarMenuItem>
            <Link href={item.href} onClick={handleLinkClick}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={item.label}
                className={cn(
                  "justify-start transition-all duration-200",
                  pathname.startsWith(item.href) 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={cn("h-5 w-5", pathname.startsWith(item.href) ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span className="font-medium">{item.label}</span>
                </span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </motion.div>
      ))}
    </SidebarMenu>
  );
}
