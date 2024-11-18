export default async (pushKey: string, text: string, desp: string) => {
    const formData = new FormData();
    formData.append('pushkey', pushKey);
    formData.append('text', text);
    formData.append('desp', desp);
    formData.append('type', 'markdown');

    await fetch('https://api2.pushdeer.com/message/push', {
        method: 'POST',
        body: formData,
    });
};
