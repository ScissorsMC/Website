import type { APIRoute } from 'astro';
import { FOLIA_LEGACY_VERSIONS, legacyDownloadResponse } from '../../../../lib/builds';

export const GET: APIRoute = ({ params }) =>
    legacyDownloadResponse(params.version ?? '', FOLIA_LEGACY_VERSIONS, 'scissors-folia');
