"use client";

import { PageHeader } from '@/components/PageHeader';
import { CategoryManager } from '@/components/settings/CategoryManager';
// import { DataExport } from '@/components/settings/DataExport';
import { SettingsIcon, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your SpendWise application."
        icon={SettingsIcon}
      />
      
      <div className="space-y-8">
        <CategoryManager />
        {/* <DataExport /> */}

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Palette className="text-primary"/>Theme & Appearance</CardTitle>
                <CardDescription>Customize the look and feel of SpendWise (coming soon).</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-center gap-6">
                 <Image 
                    src="https://placehold.co/600x400.png" 
                    alt="Theme customization illustration" 
                    width={250} 
                    height={160} 
                    className="rounded-lg shadow-md"
                    data-ai-hint="theme interface design"
                />
                <div>
                    <p className="text-lg mb-3">
                        Personalize your SpendWise experience!
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Choose from various color themes.</li>
                        <li>Toggle dark mode / light mode.</li>
                        <li>Adjust font sizes for better readability.</li>
                    </ul>
                    <p className="mt-4 text-sm text-primary font-medium">
                        Feature currently under development. Stay tuned!
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
