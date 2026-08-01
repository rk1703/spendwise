"use client";

import { PageHeader } from "@/components/PageHeader";
import { SplitMoney } from "@/components/split/SplitMoney";
import { PersonalLedger } from "@/components/split/PersonalLedger";
import { Users, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SplitPage() {
  return (
    <>
      <PageHeader
        title="Split Ledger & Groups"
        description="Split shared expenses with groups or keep track of direct lending & borrowing in your personal ledger."
        icon={Users}
      />
      
      <Tabs defaultValue="groups" className="w-full space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Shared Groups
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Personal Ledger
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="groups" className="mt-0 focus-visible:outline-none">
          <SplitMoney />
        </TabsContent>
        
        <TabsContent value="ledger" className="mt-0 focus-visible:outline-none">
          <PersonalLedger />
        </TabsContent>
      </Tabs>
    </>
  );
}
