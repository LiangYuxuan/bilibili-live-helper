interface ChromeReleaseVersion {
    releases: {
        name: string,
        serving: {
            startTime: string,
        },
        fraction: number,
        version: string,
        fractionGroup: string,
        pinnable: boolean,
    }[],
    nextPageToken: string,
}

const getChromeVersion = async (): Promise<number> => {
    const res = await fetch('https://versionhistory.googleapis.com/v1/chrome/platforms/mac/channels/stable/versions/all/releases?filter=endtime=none');
    const data = await res.json() as ChromeReleaseVersion;
    const mostVersion = data.releases.reduce((prev, curr) => {
        if (curr.fractionGroup > prev.fractionGroup) {
            return curr;
        }

        if (curr.fractionGroup === prev.fractionGroup && curr.fraction > prev.fraction) {
            return curr;
        }

        return prev;
    });
    return parseInt(mostVersion.version.split('.')[0], 10);
};

const major = await getChromeVersion().catch(() => 132);

export default `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major.toString()}.0.0.0 Safari/537.36`;
