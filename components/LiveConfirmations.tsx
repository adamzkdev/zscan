"use client";

import { useState } from "react";
import { useLive } from "./live";
import { Pill } from "./ui";

/** "N Block Confirmations" that counts up as new blocks arrive. */
export function LiveConfirmations({ height, initial }: { height: number; initial: number }) {
  const [conf, setConf] = useState(initial);
  useLive((e) => {
    if (e.type === "block") setConf((c) => Math.max(c, e.data.height - height + 1));
  });
  return (
    <Pill>
      {conf.toLocaleString("en-US")} Block Confirmation{conf === 1 ? "" : "s"}
    </Pill>
  );
}
