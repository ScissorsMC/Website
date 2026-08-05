const FILL = 'https://fill.scissors.gg/v3/projects';
export type FillProject = 'scissors' | 'scissors-folia';
export const JENKINS_JOB = 'https://ci.plex.us.org/job/Scissors/job';

// Mainline Jenkins jobs, newest first. All legacy versions are unsupported.
export const LEGACY_VERSIONS = [
    '1.20.6',
    '1.20.4',
    '1.20.2',
    '1.20.1',
    '1.20',
    '1.19.4',
    '1.19.3',
    '1.18.2',
    '1.17.1',
];

// Folia branches on the same Jenkins multibranch project.
export const FOLIA_LEGACY_VERSIONS = ['1.20.1'];

// Folia jobs come from branches named "folia/<version>". Jenkins encodes the
// slash in the job name, and the URL path encodes the percent sign again.
export function jenkinsJobUrl(version: string, project: FillProject = 'scissors'): string {
    const job = project === 'scissors-folia' ? `folia%252F${version}` : version;
    return `${JENKINS_JOB}/${job}`;
}

export type SupportStatus = 'SUPPORTED' | 'DEPRECATED' | 'UNSUPPORTED';

export interface FillVersion {
    id: string;
    status: SupportStatus;
    javaMinimum?: number;
}

export interface FillBuild {
    id: number;
    time: string;
    channel: string;
    commits: { sha: string; message: string }[];
    download: {
        name: string;
        url: string;
        size: number;
        sha256: string;
    } | null;
}

async function fillFetch(project: FillProject, path: string): Promise<any | null> {
    const res = await fetch(`${FILL}/${project}${path}`, {
        headers: { 'User-Agent': 'scissors-website (https://scissors.gg)' },
    });
    if (!res.ok) return null;
    return res.json();
}

export async function getFillVersions(fillProject: FillProject = 'scissors'): Promise<FillVersion[]> {
    const project = await fillFetch(fillProject, '');
    if (!project) return [];
    const ids: string[] = Object.values(project.versions as Record<string, string[]>).flat();
    return Promise.all(
        ids.map(async (id) => {
            const data = await fillFetch(fillProject, `/versions/${id}`);
            return {
                id,
                status: (data?.version?.support?.status ?? 'SUPPORTED') as SupportStatus,
                javaMinimum: data?.version?.java?.version?.minimum,
            };
        }),
    );
}

export async function getFillVersion(id: string, project: FillProject = 'scissors'): Promise<FillVersion | null> {
    const data = await fillFetch(project, `/versions/${id}`);
    if (!data) return null;
    return {
        id,
        status: data.version?.support?.status ?? 'SUPPORTED',
        javaMinimum: data.version?.java?.version?.minimum,
    };
}

export async function getFillBuilds(version: string, project: FillProject = 'scissors'): Promise<FillBuild[] | null> {
    const builds = await fillFetch(project, `/versions/${version}/builds`);
    if (!builds) return null;
    return builds.map((b: any) => ({
        id: b.id,
        time: b.time,
        channel: b.channel,
        commits: b.commits ?? [],
        download: b.downloads?.['server:default']
            ? {
                  name: b.downloads['server:default'].name,
                  url: b.downloads['server:default'].url,
                  size: b.downloads['server:default'].size,
                  sha256: b.downloads['server:default'].checksums?.sha256,
              }
            : null,
    }));
}

export interface JenkinsBuild {
    id: number;
    time: string;
    download: { name: string; url: string };
}

export async function getJenkinsBuilds(
    version: string,
    project: FillProject = 'scissors',
): Promise<JenkinsBuild[] | null> {
    const job = jenkinsJobUrl(version, project);
    const res = await fetch(
        `${job}/api/json?tree=builds[number,timestamp,result,artifacts[fileName,relativePath]]`,
        { headers: { 'User-Agent': 'scissors-website (https://scissors.gg)' } },
    );
    if (!res.ok) return null;
    const data: {
        builds?: {
            number: number;
            timestamp: number;
            result: string;
            artifacts?: { fileName: string; relativePath: string }[];
        }[];
    } = await res.json();
    return (data.builds ?? [])
        .filter((b) => b.result === 'SUCCESS' && b.artifacts?.some((a) => a.relativePath.endsWith('.jar')))
        .map((b) => {
            const jar = b.artifacts!.find((a) => a.relativePath.endsWith('.jar'))!;
            return {
                id: b.number,
                time: new Date(b.timestamp).toISOString(),
                download: {
                    name: jar.fileName,
                    url: `${job}/${b.number}/artifact/${jar.relativePath}`,
                },
            };
        });
}

// Responds with a redirect to the last successful Jenkins artifact for a
// legacy version, like the old website did, but server-side.
export async function legacyDownloadResponse(
    version: string,
    versions: string[],
    project: FillProject = 'scissors',
): Promise<Response> {
    if (!versions.includes(version)) {
        return new Response('Unknown version', { status: 404 });
    }

    const job = jenkinsJobUrl(version, project);
    const res = await fetch(`${job}/lastSuccessfulBuild/api/json?tree=artifacts[relativePath]`, {
        headers: { 'User-Agent': 'scissors-website (https://scissors.gg)' },
    });
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

    return Response.redirect(`${job}/lastSuccessfulBuild/artifact/${jar.relativePath}`, 302);
}

export function formatSize(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}
