import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { Request, Response, NextFunction } from "express";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(`
Missing Supabase environment variables.

Check:
- .env exists in project root
- SUPABASE_URL is set
- SUPABASE_SERVICE_ROLE_KEY is set
`);
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface AuthRequest extends Request {
  user?: User;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.user = data.user;
  next();
}

// import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
// import { Request, Response, NextFunction } from "express";

// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// if (!supabaseUrl || !supabaseServiceKey) {
//   console.warn("Supabase credentials missing — auth routes will fail until configured.");
// }

// export const supabase: SupabaseClient = createClient(
//   supabaseUrl ?? "",
//   supabaseServiceKey ?? "",
//   { auth: { autoRefreshToken: false, persistSession: false } }
// );

// export interface AuthRequest extends Request {
//   user?: User;
// }

// export async function requireAuth(
//   req: AuthRequest,
//   res: Response,
//   next: NextFunction
// ) {
//   const header = req.headers.authorization;
//   if (!header?.startsWith("Bearer ")) {
//     res.status(401).json({ error: "Unauthorized" });
//     return;
//   }

//   const token = header.slice(7);
//   const { data, error } = await supabase.auth.getUser(token);

//   if (error || !data.user) {
//     res.status(401).json({ error: "Invalid token" });
//     return;
//   }

//   req.user = data.user;
//   next();
// }
