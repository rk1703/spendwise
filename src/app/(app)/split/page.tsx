"use client";

import { PageHeader } from "@/components/PageHeader";
import { SplitMoney } from "@/components/split/SplitMoney";
import { Users } from "lucide-react";

export default function SplitPage() {
  return (
    <>
      <PageHeader
        title="Split Money"
        description="Split shared expenses and see who owes whom."
        icon={Users}
      />
      <SplitMoney />
    </>
  );
}

