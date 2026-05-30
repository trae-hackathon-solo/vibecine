"use client";

import { useEffect, useState } from "react";
import { Input, Button } from "@heroui/react";
import {
  getPixverseApiKey,
  hasPixverseApiKey,
  setPixverseApiKey,
} from "@/lib/pixverse/api-key";

export function PixverseKeyInput() {
  const [value, setValue] = useState("");
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    setConfigured(hasPixverseApiKey());
    if (!process.env.NEXT_PUBLIC_PIXVERSE_API_KEY) {
      const stored = getPixverseApiKey();
      if (stored) setValue(stored);
    }
  }, []);

  if (configured && process.env.NEXT_PUBLIC_PIXVERSE_API_KEY) {
    return (
      <span className="text-xs text-emerald-500/90">PixVerse connected</span>
    );
  }

  if (configured) {
    return (
      <span className="text-xs text-emerald-500/90">PixVerse key saved</span>
    );
  }

  return (
    <div className="nodrag flex items-center gap-2">
      <Input
        size="sm"
        type="password"
        placeholder="PixVerse API key"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        classNames={{
          inputWrapper: "h-8 min-h-8 w-44 border-white/10 bg-zinc-900",
          input: "text-xs",
        }}
      />
      <Button
        size="sm"
        variant="flat"
        onPress={() => {
          setPixverseApiKey(value);
          setConfigured(hasPixverseApiKey());
        }}
      >
        Save
      </Button>
    </div>
  );
}
