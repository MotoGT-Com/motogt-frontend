// Logout action route
import { redirect } from "react-router";
import type { Route } from "./+types/_main.logout";
import { flushAuth } from "~/lib/auth-middleware";

export async function action({ context }: Route.ActionArgs) {
  const response = redirect("/login");
  return await flushAuth({ response, context });
}
