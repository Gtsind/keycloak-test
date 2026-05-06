import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import { type AuthValue } from "../types";

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
