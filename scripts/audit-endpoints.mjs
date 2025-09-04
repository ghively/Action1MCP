import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const filePath = path.join(root, "src", "endpoints.ts");
const src = fs.readFileSync(filePath, "utf8");

// Print Spec Audit header block
const auditStart = src.indexOf("/**");
const auditEnd = src.indexOf("*/", auditStart + 3);
const audit = auditStart !== -1 && auditEnd !== -1 ? src.slice(auditStart, auditEnd + 2) : "No Spec Audit header found.";
process.stdout.write("=== Spec Audit (src/endpoints.ts) ===\n");
process.stdout.write(audit + "\n");

// Naive usage check: count how many resources/actions exist
const resourcesMatch = src.match(/resources:\s*\{([\s\S]*?)\}\s*,\s*actions:/m);
const actionsMatch = src.match(/actions:\s*\{([\s\S]*?)\}\n/m);
const resourcesCount = (resourcesMatch?.[1].match(/:\s*\{/g) || []).length;
const actionsCount = (actionsMatch?.[1]?.match(/:\s*\{/g) || []).length;

process.stdout.write(`Resources declared: ${resourcesCount}\n`);
process.stdout.write(`Actions declared:   ${actionsCount}\n`);
process.stdout.write("Note: Tools are generic and operate across all declared resources/actions.\n");

