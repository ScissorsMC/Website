import type { APIRoute } from 'astro';
import { LEGACY_VERSIONS, legacyDownloadResponse } from '../../../lib/builds';

export const GET: APIRoute = ({ params }) =>
    legacyDownloadResponse(params.version ?? '', LEGACY_VERSIONS, 'scissors');
