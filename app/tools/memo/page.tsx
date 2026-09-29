import type { Metadata } from "next";
import { MemoTool } from "@/components/tools/MemoTool";
import { PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Zcash Memo Encoder",
  description: "Turn text into memo bytes (hex, or base64url for ZIP-321) and back, within the 512-byte limit.",
};

export default function Page() {
  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Tools" title="Memo Encoder">
        Turn text into memo bytes (hex, or base64url for ZIP-321) and back, within the 512-byte limit.
      </PageTitle>
      <MemoTool />
    </div>
  );
}
