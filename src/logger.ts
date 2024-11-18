let isAllSuccess = true;
const pushText = [] as string[];
const expose = {
    debug: (text: string) => {
        if (process.env.NODE_ENV === 'development') {
            console.info((new Date()).toISOString(), text);
        }
    },
    info: (text: string, allSuccess = true) => {
        isAllSuccess &&= allSuccess;

        console.info((new Date()).toISOString(), text);
        pushText.push(`✅${text}`);
    },
    warn: (text: string, allSuccess = true) => {
        isAllSuccess &&= allSuccess;

        console.warn((new Date()).toISOString(), text);
        pushText.push(`⚠️${text}`);
    },
    error: (text: string, allSuccess = false) => {
        isAllSuccess &&= allSuccess;

        console.error((new Date()).toISOString(), text);
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
