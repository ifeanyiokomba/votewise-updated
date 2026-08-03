import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ERR, httpStatusFor, ok, fail, type ApiResult } from "@/lib/validation";
import { HttpError } from "@/lib/guards";
import { getClientIp } from "@/lib/ratelimit";

/** Wrap a route handler with uniform error handling + JSON envelope. */
export function api<T>(
  fn: (req: NextRequest, ctx: any) => Promise<ApiResult<T>>
) {
  return async (req: NextRequest, ctx: any): Promise<NextResponse> => {
    try {
      const result = await fn(req, ctx);
      const status = result.ok ? 200 : httpStatusFor(result.error.code);
      return NextResponse.json(result, { status });
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json(fail(e.code, e.message), { status: e.status });
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          fail(ERR.VALIDATION, "Invalid input", e.flatten().fieldErrors as Record<string, string[]>),
          { status: 400 }
        );
      }
      console.error("[api] unhandled", e);
      const msg = e instanceof Error ? e.message : "Internal error";
      return NextResponse.json(fail(ERR.INTERNAL, msg), { status: 500 });
    }
  };
}

/** Parse + validate JSON body against a zod schema. */
export async function parseBody<T>(req: NextRequest, schema: { parse: (x: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return schema.parse(body);
}

export { ok, fail, getClientIp };
