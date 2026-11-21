/** The admin's Preview button: opens the draft on the website (the /preview route checks the editor is signed in). */
export const previewAt =
  (path: (doc: Record<string, unknown>) => string) =>
  (doc: Record<string, unknown>) =>
    `/preview?path=${encodeURIComponent(path(doc))}`;
