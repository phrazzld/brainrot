// Keep this deterministic policy boundary equal to the deployed
// NEXT_PUBLIC_SPACES_BASE_URL. The route rejects drift instead of proxying it.
export const SPACES_ASSET_ORIGIN = 'https://brainrot-publishing.nyc3.digitaloceanspaces.com';

export function assertSpacesAssetUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.origin !== SPACES_ASSET_ORIGIN) {
    throw new Error('Refusing to proxy an asset outside the authoritative Spaces origin');
  }
  return parsed.toString();
}
