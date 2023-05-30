import got from 'got';

export const pushToPushDeer = async (pushkey: string, text: string, desp: string) => {
    await got.post('https://api2.pushdeer.com/message/push', {
        form: {
            pushkey,
            text,
            desp,
        },
    });
};
