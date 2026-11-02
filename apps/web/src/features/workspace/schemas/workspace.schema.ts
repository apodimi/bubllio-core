import { z } from "zod";

export const WorkspaceOrganizationSchema = z.object({
  id: z.string().min(1),
  displayName: z.string(),
});
export const WorkspaceOrganizationsSchema = z.array(
  WorkspaceOrganizationSchema,
);
export type WorkspaceOrganization = z.infer<typeof WorkspaceOrganizationSchema>;

export const WorkspaceApplicationSchema = z.object({
  key: z.string(),
  displayName: z.string(),
  launchUrl: z.string(),
});
export const WorkspaceApplicationsSchema = z.array(WorkspaceApplicationSchema);
export type WorkspaceApplication = z.infer<typeof WorkspaceApplicationSchema>;
