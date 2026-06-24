import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Read root .env
const rootEnv = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
// Read web .env
const webEnv = fs.readFileSync(path.join(process.cwd(), "apps/web/.env"), "utf8");

const envs = {};
for (const line of rootEnv.split("\n")) {
  if (line.trim() && !line.startsWith("#")) {
    const [key, ...rest] = line.split("=");
    envs[key] = rest.join("=").trim();
  }
}

for (const line of webEnv.split("\n")) {
  if (line.trim() && !line.startsWith("#")) {
    const [key, ...rest] = line.split("=");
    envs[key] = rest.join("=").trim();
  }
}

// Remove VITE_API_URL and PORT and CORS_ORIGIN for Vercel
delete envs["VITE_API_URL"];
delete envs["PORT"];
delete envs["CORS_ORIGIN"];

// Prepare arguments
const args = ["vercel", "--yes", "--prod"];
for (const [key, value] of Object.entries(envs)) {
  // Pass env variable to both build and runtime environments
  args.push(`--env`);
  args.push(`${key}=${value}`);
  args.push(`--build-env`);
  args.push(`${key}=${value}`);
}

console.log("Running Vercel deployment...");
try {
  const result = execSync(`npx ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`, { stdio: "inherit" });
} catch (e) {
  console.error("Deploy failed");
  process.exit(1);
}
