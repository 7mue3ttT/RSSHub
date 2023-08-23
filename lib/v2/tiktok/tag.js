const config = require('@/config').value;
const { parseDate } = require('@/utils/parse-date');
const { art } = require('@/utils/render');
const path = require('path');
const { queryToBoolean } = require('@/utils/readable-social');

const baseUrl = 'https://www.tiktok.com';

module.exports = async (ctx) => {
    const { tag, iframe } = ctx.params;
    const useIframe = queryToBoolean(iframe);

    const data = await ctx.cache.tryGet(
        `tiktok:tag:${tag}`,
        async () => {
            const browser = await require('@/utils/puppeteer')();
            const page = await browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                request.resourceType() === 'document' || request.resourceType() === 'script' ? request.continue() : request.abort();
            });
            await page.goto(`${baseUrl}/tag/${tag}`, {
                waitUntil: 'networkidle0',
            });

            const pageHeight = await page.evaluate(() => {
                return document.body.scrollHeight;
            });

            const scrollTimes = 10;
            const minDelay = 500; // Minimum delay in milliseconds
            const maxDelay = 2000; // Maximum delay in milliseconds
            const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
            for (let i = 0; i < scrollTimes; i++) {
                await page.evaluate(() => {
                    window.scrollBy(0, pageHeight);
                });
                await page.waitForTimeout(randomDelay);
            }

            const selector = '[data-e2e="challenge-item-list"]'
            await page.waitForSelector(selector)
            const videos = await page.$$eval(`${selector}>div`, (els) => {
                return els.map((el) => {
                    const hrefs = el.querySelectorAll('a');
                    const link = hrefs[0].href;
                    const title = hrefs[1].title;
                    return { link, title };
                });
            });

            const SIGI_STATE = await page.evaluate(() => window.SIGI_STATE);
            browser.close();

            const lang = SIGI_STATE.AppContext.lang;
            const SharingMetaState = SIGI_STATE.SharingMetaState;
            const ItemModule = SIGI_STATE.ItemModule;

            return { lang, SharingMetaState, ItemModule, videos };
        },
        config.cache.routeExpire,
        false
    );

    const items = data.videos.map((item) => ({
        title: item.title,
        link: item.link,
    }));

    ctx.state.data = {
        title: data.SharingMetaState.value['og:title'],
        description: data.SharingMetaState.value['og:description'],
        image: data.SharingMetaState.value['og:image'],
        link: `${baseUrl}/tag${tag}`,
        item: data.videos,
        language: data.lang,
    };
};
