import { permanentRedirect } from "next/navigation";
import { STATS_URL } from "@/lib/nav";

// Moved to ZScan Stats: the explorer keeps entities, lists and tools; dashboards live there.
export default function Moved() {
  permanentRedirect(`${STATS_URL}/ecosystem#bridges`);
}
