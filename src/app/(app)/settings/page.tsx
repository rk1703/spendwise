"use client";

import { PageHeader } from '@/components/PageHeader';
import { CategoryManager } from '@/components/settings/CategoryManager';
// import { DataExport } from '@/components/settings/DataExport';
import { SettingsIcon } from 'lucide-react';
import { ThemeSelector } from '@/components/settings/ThemeSelector';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your SpendWise application."
        icon={SettingsIcon}
      />

      <div className="space-y-8">
        <ThemeSelector />
        <CategoryManager />
        {/* <DataExport /> */}
      </div>
    </>
  );
}
