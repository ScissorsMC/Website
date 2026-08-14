import type { APIRoute } from 'astro';
import { ASP_LEGACY_VERSIONS, legacyDownloadResponse } from '../../../../lib/builds';

export const GET: APIRoute = ({ params }) =>
    legacyDownloadResponse(params.version ?? '', ASP_LEGACY_VERSIONS, 'scissors-asp');
