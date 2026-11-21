/** The server's hard ceiling for any upload; the admin's video limit (Site settings) sits below it. */
export const MAX_UPLOAD_MB = Number(process.env.CMS_MAX_UPLOAD_MB ?? 200);
