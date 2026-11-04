let isAllSuccess = true;
const pushText = [] as string[];
const expose = {
    debug: (text: string) => {
        if (process.env.NODE_ENV === 'development') {
            console.info(Temporal.Now.instant().toString(), text);
        }
    },
    info: (text: string, allSuccess = true) => {
        isAllSuccess &&= allSuccess;

        console.info(Temporal.Now.instant().toString(), text);
        pushText.push(`✅${text}`);
    },
    warn: (text: string, allSuccess = true) => {
        isAllSuccess &&= allSuccess;

        console.warn(Temporal.Now.instant().toString(), text);
        pushText.push(`⚠️${text}`);
    },
    error: (text: string, allSuccess = false) => {
        isAllSuccess &&= allSuccess;

        console.error(Temporal.Now.instant().toString(), text);
        pushText.push(`❌${text}`);
    },
    getPushInfo: () => ({
        isAllSuccess,
        pushText,
    }),
    clearPushInfo: () => {
        isAllSuccess = true;
        pushText.length = 0;
    },
};

export default expose;
