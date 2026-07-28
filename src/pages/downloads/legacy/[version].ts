import type { APIRoute } from 'astro';
import { JENKINS_JOB, LEGACY_VERSIONS } from '../../../lib/builds';

// Redirects to the last successful Jenkins artifact for a legacy version,
// like the old website did, but server-side.
export const GET: APIRoute = async ({ params, redirect }) => {
    const version = params.version ?? '';
    if (!LEGACY_VERSIONS.includes(version)) {
        return new Response('Unknown version', { status: 404 });
    }

    const res = await fetch(
        `${JENKINS_JOB}/${version}/lastSuccessfulBuild/api/json?tree=artifacts[relativePath]`,
        { headers: { 'User-Agent': 'scissors-website (https://scissors.gg)' } },
    );
    if (!res.ok) {
        return new Response('Jenkins is unavailable right now. Try again in a few minutes.', {
            status: 502,
        });
    }

    const data: { artifacts?: { relativePath: string }[] } = await res.json();
    const jar = data.artifacts?.find((a) => a.relativePath.endsWith('.jar'));
    if (!jar) {
        return new Response('No build artifact found for this version.', { status: 404 });
    }

    return redirect(`${JENKINS_JOB}/${version}/lastSuccessfulBuild/artifact/${jar.relativePath}`, 302);
};
