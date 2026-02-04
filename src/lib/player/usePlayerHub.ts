"use client";

import { useMemo } from "react";
import { getPlayerHub } from "@/lib/player/PlayerHub";

export const usePlayerHub = () => useMemo(() => getPlayerHub(), []);
