/**
 * Destructive-operation gate. Pure function so it can be tested without a server.
 *
 * Order matters: a dry run is always allowed (it never mutates); otherwise the
 * operator must have enabled destructive tools for this process AND the caller
 * must explicitly confirm this specific call.
 */
export function allowDestructive(
  confirm: string | undefined,
  dryRun: boolean | undefined,
  env: NodeJS.ProcessEnv = process.env
): { allowed: boolean; reason?: string } {
  if (dryRun) return { allowed: true };
  if (env.ALLOW_DESTRUCTIVE !== "true") {
    return { allowed: false, reason: "Destructive ops disabled. Set ALLOW_DESTRUCTIVE=true to enable." };
  }
  if (confirm !== "YES") {
    return { allowed: false, reason: 'Confirmation required: set confirm:"YES" to proceed.' };
  }
  return { allowed: true };
}
