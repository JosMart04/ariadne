/** Public asset URLs. The build uses a relative base, so this resolves next to index.html on any host. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
