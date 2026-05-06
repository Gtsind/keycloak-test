import { createContext } from "react";
import type { AuthValue } from "../types";

export const AuthContext = createContext<AuthValue | null>(null);
