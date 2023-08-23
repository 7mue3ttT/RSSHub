const config = require('@/config').value;
const { parseDate } = require('@/utils/parse-date');
const { art } = require('@/utils/render');
const path = require('path');
const { queryToBoolean } = require('@/utils/readable-social');

const baseUrl = 'https://www.tiktok.com';

module.exports = async (ctx) => {
    const { tag, iframe } = ctx.params;
    const useIframe = queryToBoolean(iframe);

    const browser = await require('@/utils/puppeteer')();
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        request.resourceType() === 'document' || request.resourceType() === 'script' ? request.continue() : request.abort();
    });

    await page.goto(`${baseUrl}/tag/${tag}`, {
        waitUntil: 'networkidle0',
    });

    // Simulate one refresh
    await page.evaluate(() => {
        window.location.reload();
    });

    await page.waitForTimeout(5000); // Wait for page to reload

    const SIGI_STATE = await page.evaluate(() => window.SIGI_STATE);

    // Simulate multiple refreshes
    const maxRefreshCount = 10;
    for (let i = 0; i < maxRefreshCount; i++) {
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });

        // Generate a random wait time between 3 to 10 seconds
        const waitTime = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
        await page.waitForTimeout(waitTime); // Wait for new content to load
    }

    const lang = SIGI_STATE.AppContext.lang;
    const SharingMetaState = SIGI_STATE.SharingMetaState;
    const ItemModule = SIGI_STATE.ItemModule;

    browser.close();

    ctx.state.data = {
        title: data.SharingMetaState.value['og:title'],
        description: data.SharingMetaState.value['og:description'],
        image: data.SharingMetaState.value['og:image'],
        link: `${baseUrl}/tag${tag}`,
        item: data.videos,
        language: data.lang,
    };
    browser.close();
};
