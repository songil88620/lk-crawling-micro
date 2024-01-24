import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LinkedInAccountsService } from 'src/linked_in_accounts/linked_in_accounts.service';
import { LinkedInChatsService } from 'src/linked_in_chats/linked_in_chats.service';
import { MailService } from 'src/mail/mail.service';
import { ProspectProspectionCampaignService } from 'src/prospect_prospection_campaign/prospect_prospection_campaign.service';
import { ProspectionCampaignsService } from 'src/prospection_campaigns/prospection_campaigns.service';
import { ProspectsService } from 'src/prospects/prospects.service';
import { ChatStatus } from 'src/type/chat_status.type';
import { LinkedInAccountType } from 'src/type/linkedin_account.type';
import { LinkedInChatType } from 'src/type/linkedin_chat.type';
import { PpcType } from 'src/type/ppc.type';
import { ProspectType } from 'src/type/prospect.type';
import axios from 'axios';
import { get_encoding, encoding_for_model } from "tiktoken";
import { MessageType } from 'src/type/message.type';
import { GptMessageType } from 'src/type/gptmessage.type';
import { CampaignType } from 'src/type/campaign.type';
import { PromptDataService } from 'src/prompt_data/prompt_data.service';
import { SocketService } from 'src/socket/socket.service';
import { LinkedinLoginDataType } from 'src/type/linkedlogin.type';
import { Brackets } from 'typeorm';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin())
var ip = require('ip');

interface LinkedInBrowser {
    id: number, // linkedin account id
    page: any,
    browser: any
}

@Injectable()
export class BotService {

    private cached_linked_browser: LinkedInBrowser = { id: null, page: null, browser: null };
    private myIP = "";
    private state = false;

    // captcha api key for bypassing captcha.... 
    private captcha_key = 'CAP-36E7BF9AEE1FCAE79456B4D6681DD2F4';

    public login_fail = 0;
    public prs_read_idx = 0;
    public prs_total_len = 0;

    constructor(
        private mailService: MailService,
        @Inject(forwardRef(() => ProspectionCampaignsService)) private prospectCampaignService: ProspectionCampaignsService,
        @Inject(forwardRef(() => LinkedInAccountsService)) private linkedinAccountService: LinkedInAccountsService,
        @Inject(forwardRef(() => ProspectsService)) private prospectsService: ProspectsService,
        @Inject(forwardRef(() => ProspectProspectionCampaignService)) private ppcService: ProspectProspectionCampaignService,
        @Inject(forwardRef(() => LinkedInChatsService)) private chatService: LinkedInChatsService,
        @Inject(forwardRef(() => PromptDataService)) private promptService: PromptDataService,
        @Inject(forwardRef(() => SocketService)) private socketService: SocketService,
    ) {

    }

    async onModuleInit() {
        this.myIP = ip.address()
        // this.myIP = '167.172.42.53';
        const _now = new Date();
        const _h_now = _now.getHours();

        // const myCampaign = await this.prospectCampaignService.findMyCampaign(this.myIP);
        // myCampaign.forEach((ac: any) => {
        //     this.goToLinkedInLongMode(ac, 1)
        // })

    }


    // run bot every 10 mins
    @Cron(CronExpression.EVERY_10_MINUTES, { name: 'campaign bot' })
    async runCampaign() {
        const _now = new Date();
        const _h_now = _now.getHours();
        console.log(">>>current time___", _h_now)
        if ((_h_now >= 8 && _h_now < 20 && this.login_fail <= 5)) {
            const myCampaign = await this.prospectCampaignService.findMyCampaign(this.myIP);
            myCampaign.forEach((ac: any) => {
                this.goToLinkedInLongMode(ac, this.prs_read_idx)
            })
            this.prs_read_idx = this.prs_read_idx + 1;
        } else {
            this.login_fail = 0;
            const br = this.cached_linked_browser.browser;
            if (br) {
                br.close()
            }
            this.cached_linked_browser.browser = null;
            this.cached_linked_browser.page = null;
            console.log(">>>rest time now")
        }
    }

    @Cron(CronExpression.EVERY_10_SECONDS, { name: 'ch bot' })
    async runState() {
        if (this.cached_linked_browser.page) {
            const url = this.cached_linked_browser.page.url()
            if (url.includes('/feed/') || url.includes('/in/') || url.includes('/search/')) {
                this.state = true;
            } else {
                this.state = false;
            }
        } else {
            this.state = false;
        }
        const data = {
            id: this.cached_linked_browser.id,
            state: this.state,
            ip: this.myIP,
            stamp: Math.floor(Date.now() / 1000)
        }
        this.socketService.loginstateToMother(data)
    }

    conf() {
        return {
            headless: 'new',
            args: [
                // `--proxy-server=${proxy}`,
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-infobars',
                '--ignore-certifcate-errors',
                '--ignore-certifcate-errors-spki-list'
            ],
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation']
        }
    }


    async msg_to_user(id: any, msg: string) {
        const data = {
            id: id,
            msg: {
                type: 'current_page',
                data: msg
            }
        }
        this.socketService.messageToUser(data)
    }

    async logout(login_data: LinkedinLoginDataType) {
        try {
            const id = login_data.id;
            const browser_old = this.cached_linked_browser.browser;
            this.cached_linked_browser = { id: id, page: null, browser: null };
            if (browser_old != null) {
                await browser_old.close();
            }
        } catch (e) {
            console.log(">>>err", e)
        }
    }

    async loginLinkedIn(login_data: LinkedinLoginDataType) {
        try {
            console.log(">>>login", login_data)
            const login_email = login_data.email;
            const login_password = login_data.password;
            const browser = await puppeteer.launch(this.conf());
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            });
            await page.goto(`https://www.linkedin.com/`, { timeout: 0 });
            await page.waitForTimeout(2000);
            await page.type('#session_key', login_email);
            await page.type('#session_password', login_password);
            await page.click('button.sign-in-form__submit-btn--full-width');
            await page.waitForTimeout(5000);
            this.msg_to_user(login_data.id, 'Processing...');
            console.log(">>Url1", page.url())
            if (this.cached_linked_browser.browser != null) {
                const browser_old = this.cached_linked_browser.browser;
                if (browser_old != null) {
                    await browser_old.close();
                }
            }
            this.cached_linked_browser = {
                id: login_data.id,
                page: page,
                browser: browser
            }

            console.log(">>>", page.url())
            if (page.url().includes('/feed/')) {
                const data = {
                    id: login_data.id,
                    msg: {
                        type: 'login_success',
                        data: ''
                    }
                }
                this.socketService.messageToUser(data)
                return
            }

            if (page.url().includes('checkpoint/challenge/')) {
                this.msg_to_user(login_data.id, 'Verification page loading...');
                console.log(">>check image")
                // await page.waitForTimeout(5000);
                var vcode = null;
                try {
                    vcode = await page.waitForSelector('#input__email_verification_pin');
                } catch (e) { }

                if (vcode) {
                    const data = {
                        id: login_data.id,
                        msg: {
                            type: 'vcode_request',
                            data: ''
                        }
                    }
                    this.socketService.messageToUser(data)
                    this.msg_to_user(login_data.id, 'Requiring verification code...');
                } else {
                    console.log(">>Url2", page.url())
                    this.msg_to_user(login_data.id, 'Trying to solve the image puzzle...');
                    const frame_1 = await page.$("iframe[id='captcha-internal']");
                    const contentFrame_1 = await frame_1.contentFrame();
                    const frame_2 = await contentFrame_1.$("iframe[id='arkoseframe']");
                    const contentFrame_2 = await frame_2.contentFrame();
                    const frame_3 = await contentFrame_2.$("iframe[title='Verification challenge']");
                    const contentFrame_3 = await frame_3.contentFrame();
                    const frame_4 = await contentFrame_3.$("iframe[id='fc-iframe-wrap']");
                    const contentFrame_4 = await frame_4.contentFrame();
                    const frame_5 = await contentFrame_4.$("iframe[id='CaptchaFrame']");
                    const contentFrame_5 = await frame_5.contentFrame();
                    const acceptBtn = await contentFrame_5.$(`#home button`);
                    await acceptBtn.click();

                    // manual pass for puzzle
                    // await page.waitForTimeout(4000);
                    // const src = await contentFrame_5.evaluate(() => {
                    //     const imgElement = document.querySelector('#game_challengeItem_image');
                    //     return imgElement ? imgElement['src'] : null;
                    // });
                    // const data = {
                    //     id: login_data.id,
                    //     msg: {
                    //         type: 'puzzle_request',
                    //         data: src
                    //     }
                    // }
                    // this.socketService.messageToUser(data)
                    // return;

                    //auto bypass for puzzle
                    await page.waitForTimeout(1000);
                    const loops = [1, 2, 3, 4, 5, 6, 7];
                    try {
                        for (var l of loops) {
                            await contentFrame_5.$(`#game_children_text`);
                            const src = await contentFrame_5.evaluate(() => {
                                const imgElement = document.querySelector('#game_challengeItem_image');
                                return imgElement ? imgElement['src'] : null;
                            });
                            const img = src.substring(23);
                            const res = await axios.post('https://api.capsolver.com/createTask', {
                                "clientKey": this.captcha_key,
                                "task": {
                                    "type": "FunCaptchaClassification",
                                    "websiteURL": "https://www.linkedin.com",
                                    "images": [
                                        img
                                    ],
                                    "question": "rotated"
                                }
                            });
                            if (res.data.status == 'ready') {
                                console.log(">>>res", res.data)
                                const idx = res.data.solution.objects[0] + 1;
                                console.log(">>idx", idx)
                                await contentFrame_5.click('#image' + idx + ' > a');
                            }
                            await page.waitForTimeout(2000);
                            this.msg_to_user(login_data.id, 'Solved puzzle No.' + l + "...");
                        }
                    } catch (e) {
                        console.log(">>bypass")
                    }
                    await page.waitForTimeout(3000);
                    console.log(">>>page", page.url())
                    if (page.url().includes('checkpoint/challenge/')) {
                        this.msg_to_user(login_data.id, 'Verification page loading...');
                        try {
                            vcode = await page.waitForSelector('#input__email_verification_pin');
                        } catch (e) { }
                    }
                    if (vcode) {
                        const data = {
                            id: login_data.id,
                            msg: {
                                type: 'vcode_request',
                                data: ''
                            }
                        }
                        this.socketService.messageToUser(data)
                        this.msg_to_user(login_data.id, 'Requiring verification code...');
                        return;
                    }
                    await page.waitForTimeout(1000);
                    console.log(">>>page here", page.url())
                    if (page.url().includes('/feed/')) {
                        const data = {
                            id: login_data.id,
                            msg: {
                                type: 'login_success',
                                data: ''
                            }
                        }
                        this.socketService.messageToUser(data)
                        this.login_fail = 0;
                    } else {
                        const data = {
                            id: login_data.id,
                            msg: {
                                type: 'login_failed',
                                data: 'Something unexpected happened. Please contact support team.'
                            }
                        }
                        this.socketService.messageToUser(data)
                        this.login_fail = 3;
                    }
                }
            }
        } catch (e) {
            console.log(">>errr", e)
        }
    }

    async vcodeLinkedIn(login_data: LinkedinLoginDataType) {
        const page = await this.cached_linked_browser.page;
        await page.waitForTimeout(2000);
        await page.type('#input__email_verification_pin', login_data.vcode);
        await page.click('button#email-pin-submit-button');
        await page.waitForTimeout(2000);
        if (page.url().includes('/feed/')) {
            const data = {
                id: login_data.id,
                msg: {
                    type: 'login_success',
                    data: ''
                }
            }
            this.socketService.messageToUser(data)
        } else {
            if (page.url().includes('checkpoint/challenge/')) {
                var vcode = null;
                try {
                    vcode = await page.waitForSelector('#input__email_verification_pin');
                } catch (e) { }
                if (vcode) {
                    const data = {
                        id: login_data.id,
                        msg: {
                            type: 'vcode_wrong',
                            data: ''
                        }
                    }
                    this.socketService.messageToUser(data)
                } else {
                    const frame_1 = await page.$("iframe[id='captcha-internal']");
                    const contentFrame_1 = await frame_1.contentFrame();
                    const frame_2 = await contentFrame_1.$("iframe[id='arkoseframe']");
                    const contentFrame_2 = await frame_2.contentFrame();
                    const frame_3 = await contentFrame_2.$("iframe[title='Verification challenge']");
                    const contentFrame_3 = await frame_3.contentFrame();
                    const frame_4 = await contentFrame_3.$("iframe[id='fc-iframe-wrap']");
                    const contentFrame_4 = await frame_4.contentFrame();
                    const frame_5 = await contentFrame_4.$("iframe[id='CaptchaFrame']");
                    const contentFrame_5 = await frame_5.contentFrame();
                    const acceptBtn = await contentFrame_5.$(`#home button`);
                    await acceptBtn.click();
                    //auto bypass for puzzle
                    await page.waitForTimeout(2000);
                    const loops = [1, 1, 1, 1, 1, 1, 1];
                    try {
                        for (var l of loops) {
                            await contentFrame_5.$(`#game_children_text`);
                            const src = await contentFrame_5.evaluate(() => {
                                const imgElement = document.querySelector('#game_challengeItem_image');
                                return imgElement ? imgElement['src'] : null;
                            });
                            const img = src.substring(23);
                            const res = await axios.post('https://api.capsolver.com/createTask', {
                                "clientKey": this.captcha_key,
                                "task": {
                                    "type": "FunCaptchaClassification",
                                    "websiteURL": "https://www.linkedin.com",
                                    "images": [
                                        img
                                    ],
                                    "question": "rotated"
                                }
                            });
                            if (res.data.status == 'ready') {
                                console.log(">>>res", res.data)
                                const idx = res.data.solution.objects[0] + 1;
                                console.log(">>idx", idx)
                                await contentFrame_5.click('#image' + idx + ' > a');
                            }
                            await page.waitForTimeout(4000);
                        }
                    } catch (e) {
                        console.log(">>bypass")
                    }
                    await page.waitForTimeout(2000);
                    if (page.url().includes('checkpoint/challenge/')) {
                        const data = {
                            id: login_data.id,
                            msg: {
                                type: 'login_failed',
                                data: 'There is issue in login, contact support team'
                            }
                        }
                        this.socketService.messageToUser(data)
                    } else {
                        const data = {
                            id: login_data.id,
                            msg: {
                                type: 'login_success',
                                data: ''
                            }
                        }
                        this.socketService.messageToUser(data)
                    }
                }
            }
        }
    }

    async getLoginState(linked_in_account_id: any) {
        try {
            if (this.cached_linked_browser.id != null) {
                return {
                    id: linked_in_account_id,
                    login: true
                }
            } else {
                return {
                    id: linked_in_account_id,
                    login: false
                }
            }
        } catch (e) {
            return {
                id: linked_in_account_id,
                login: false
            }
        }
    }

    async internalLogin(linked_in_account: LinkedInAccountType) {
        const login_email = linked_in_account.email;
        const login_password = linked_in_account.password;
        const browser = await puppeteer.launch(this.conf());
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        });
        // await page.authenticate({ username, password });
        await page.goto(`https://www.linkedin.com/`, { timeout: 0 });
        await page.waitForTimeout(2000);
        await page.type('#session_key', login_email);
        await page.type('#session_password', login_password);
        await page.click('button.sign-in-form__submit-btn--full-width');
        await page.waitForTimeout(5000);

        if (this.cached_linked_browser.browser != null) {
            const browser_old = this.cached_linked_browser.browser;
            if (browser_old != null) {
                await browser_old.close();
            }
        }
        this.cached_linked_browser = {
            id: linked_in_account.id,
            page: page,
            browser: browser
        }

        await page.waitForTimeout(5000);
        if (page.url().includes('/feed/')) {
            // login success 
            const cookiesSet = await page.cookies();
            var session_id = "";
            var li_at = "";
            cookiesSet.forEach((c: any) => {
                if (c.name == 'JSESSIONID') {
                    session_id = c.value;
                    console.log(">>session_id", session_id)
                }
                if (c.name == 'li_at') {
                    li_at = c.value;
                    console.log(">>li_at", li_at)
                }
            })
            await this.linkedinAccountService.updateLinkedCookies(linked_in_account.id, li_at, session_id)
            return { page: page, success: true }
        } else {
            console.log(">>p..page.url()", page.url())
            await page.waitForTimeout(45000);
            const frame_1 = await page.$("iframe[id='captcha-internal']");
            const contentFrame_1 = await frame_1.contentFrame();
            const frame_2 = await contentFrame_1.$("iframe[id='arkoseframe']");
            const contentFrame_2 = await frame_2.contentFrame();
            const frame_3 = await contentFrame_2.$("iframe[title='Verification challenge']");
            const contentFrame_3 = await frame_3.contentFrame();
            const frame_4 = await contentFrame_3.$("iframe[id='fc-iframe-wrap']");
            const contentFrame_4 = await frame_4.contentFrame();
            const frame_5 = await contentFrame_4.$("iframe[id='CaptchaFrame']");
            const contentFrame_5 = await frame_5.contentFrame();
            const acceptBtn = await contentFrame_5.$(`#home button`);
            await acceptBtn.click();
            console.log(">> clicked...")
            //auto bypass for puzzle
            await page.waitForTimeout(4000);
            const loops = [1, 1, 1, 1, 1, 1, 1];
            try {
                for (var l of loops) {
                    await contentFrame_5.$(`#game_children_text`);
                    const src = await contentFrame_5.evaluate(() => {
                        const imgElement = document.querySelector('#game_challengeItem_image');
                        return imgElement ? imgElement['src'] : null;
                    });
                    const img = src.substring(23);
                    const res = await axios.post('https://api.capsolver.com/createTask', {
                        "clientKey": this.captcha_key,
                        "task": {
                            "type": "FunCaptchaClassification",
                            "websiteURL": "https://www.linkedin.com",
                            "images": [
                                img
                            ],
                            "question": "rotated"
                        }
                    });
                    if (res.data.status == 'ready') {
                        const idx = res.data.solution.objects[0] + 1;
                        await contentFrame_5.click('#image' + idx + ' > a');
                    }
                    await page.waitForTimeout(4000);
                }
            } catch (e) {
                console.log(">>bypass")
            }
            await page.waitForTimeout(3000);
            if (page.url().includes('/feed/')) {
                this.login_fail = 0;
                return { page: page, success: true }
            } else {
                this.login_fail = this.login_fail + 1;
                return { page: null, success: false }
            }
        }
    }

    // if (page.url().includes('/feed/') || page.url().includes('/in/')) {
    // long mode checks over 100 messages from the sidebar neither that has new message badge or not.
    async goToLinkedInLongMode(ac: CampaignType, mode: number) {
        const start_time = Date.now();
        const campaign_id = ac.id;
        const linked_in_account_id = ac.linked_in_account_id;
        try {
            console.log(">>>lin", linked_in_account_id)
            const linked_in_account: LinkedInAccountType = await this.linkedinAccountService.findOneLinkdinAccountById(linked_in_account_id);
            var my_page: any = null;
            if (this.cached_linked_browser.id != null) {
                const page = await this.cached_linked_browser.page;

                await page.goto(`https://www.linkedin.com/feed/`, { timeout: 0 });
                await page.waitForTimeout(5000);
                if (page.url().includes('/feed/') || page.url().includes('/in/') || page.url().includes('/search/')) {
                    my_page = page;
                } else {
                    const browser_old = this.cached_linked_browser.browser;
                    if (browser_old != null) {
                        await browser_old.close();
                    }
                    this.cached_linked_browser = { id: this.cached_linked_browser.id, page: null, browser: null };
                    const res = await this.internalLogin(linked_in_account);
                    if (res.success) {
                        my_page = res.page
                    } else {
                        return;
                    }
                }
            } else {
                console.log(">>>>inter login")
                const res = await this.internalLogin(linked_in_account);
                if (res.success) {
                    console.log(">>logged in")
                    my_page = res.page
                } else {
                    return;
                }
            }

            await my_page.reload();
            my_page.waitForTimeout(2000);

            // ---------- linkedin has already logged in and start to work from now ----------
            // check the messages from the right sidebar and read new message one by one after click them. 
            await my_page.setViewport({
                width: 1920,
                height: 880,
                deviceScaleFactor: 1,
            });
            await my_page.mouse.move(1800, 750);
            await my_page.waitForTimeout(10000);

            // scroll down to get the last 80 messages
            const scroll_step = [1, 1, 1, 1, 1];
            for (var i of scroll_step) {
                await my_page.mouse.wheel({ deltaY: 1500 });
                await my_page.waitForTimeout(1500);
            }
            await my_page.waitForTimeout(1000);

            const msg_vlist = await my_page.$$('.msg-overlay-list-bubble__conversations-list .msg-conversation-listitem__link');
            var new_messages: any[] = [];
            console.log(">>>new message member count", msg_vlist.length)


            const range_mux = [[0, 20], [21, 40], [41, 60], [61, 80], [81, 100], [101, 120]];
            const _range = range_mux[mode % 6];

            // check sidebar msg box start
            // this loop is for checking the new messages and new opened messages 
            var i = 0;
            for (const msg_v of msg_vlist) {
                // break;
                if (mode % 6 == 5) {
                    break;
                }
                i++;
                if (!(_range[0] <= i && i < _range[1])) {
                    continue;
                }
                try {
                    console.log(">>IDX: ", i)
                    try {
                        // close message box if it is opened
                        var count = await my_page.$$eval('.msg-convo-wrapper', elements => elements.length);
                        while (count > 0) {
                            count--;
                            await my_page.waitForTimeout(500);
                            const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                            await my_page.waitForSelector(close_btn_msgbox);
                            await my_page.click(close_btn_msgbox);
                            await this.delay(500)
                        }
                    } catch (e) {
                        console.log(">>>error on close message boxes")
                    }

                    // click item from list 
                    const item = '.msg-overlay-list-bubble__conversations-list .msg-conversation-listitem__link:nth-child(' + i + ')';
                    await my_page.waitForSelector(item);
                    await my_page.click(item);

                    // read message from message box that has message
                    await my_page.waitForTimeout(2000);
                    const msgs = await my_page.$$('li.msg-s-message-list__event')

                    var messages: MessageType[] = []
                    var date = '';
                    var time = '';
                    var name = '';
                    var my_name: any = '';
                    var user_name: any = '';
                    const u_name = await my_page.$('.msg-overlay-bubble-header .msg-overlay-bubble-header__title span')
                    if (u_name) {
                        var n = await (await u_name.getProperty('textContent')).jsonValue()
                        user_name = this.beautySpace(n);
                    }

                    var member_id = null;
                    try {
                        for (const msg of msgs) {
                            const date_ele = await msg.$('.msg-s-message-list__time-heading')
                            if (date_ele) {
                                date = await (await date_ele.getProperty('textContent')).jsonValue();
                            }
                            const time_ele = await msg.$('.msg-s-event-listitem .msg-s-message-group__meta .msg-s-message-group__timestamp')
                            if (time_ele) {
                                time = await (await time_ele.getProperty('textContent')).jsonValue()
                            }
                            const name_ele = await msg.$('.msg-s-event-listitem .msg-s-message-group__meta .msg-s-message-group__name')
                            if (name_ele) {
                                name = await (await name_ele.getProperty('textContent')).jsonValue()
                                if (i == 0) {
                                    // my_name = this.beautySpace(name);
                                }
                            }
                            const msg_body = await msg.$('.msg-s-event-listitem .msg-s-event__content .msg-s-event-listitem__body')
                            const msg_text = await (await msg_body.getProperty('textContent')).jsonValue()
                            const b_date = this.beautyDate(this.beautySpace(date), this.beautySpace(time));
                            const msg_data: MessageType = {
                                createdAt: b_date['date'],
                                //stamp: b_date['stamp'],
                                //name: this.beautySpace(name),
                                role: this.beautySpace(name) == user_name ? 'user' : 'assistant',
                                content: msg_text.replace(/\+/g, '')
                            }
                            messages.push(msg_data);
                        }

                        // scroll up to get member profile link from the message box
                        await my_page.evaluate(() => document.querySelector('.msg-s-message-list').scrollBy({ top: -3000, behavior: 'smooth' }))
                        await my_page.waitForTimeout(200);
                        await my_page.evaluate(() => document.querySelector('.msg-s-message-list').scrollBy({ top: -3000, behavior: 'smooth' }))
                        await my_page.waitForTimeout(200);

                        // open profile to get member id
                        console.log(">>open profile to get member id")
                        // in some case, faild in this section bcs network, need to make exception
                        await my_page.waitForTimeout(2000);
                        const profile_link = '.artdeco-entity-lockup__title .profile-card-one-to-one__profile-link'
                        await my_page.waitForSelector(profile_link);
                        await my_page.click(profile_link);

                        // wait and get member id
                        await my_page.waitForTimeout(2000);
                        const profile_sect = '.scaffold-layout__main .artdeco-card:nth-child(1)';
                        member_id = await my_page.$eval(profile_sect, (el: any) => {
                            return el.getAttribute("data-member-id")
                        });
                        console.log(">>member id", member_id)
                    } catch (e) {
                        console.log("sth went wrong")
                    }


                    // close message box for next
                    try {
                        const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:nth-child(5)';
                        await my_page.waitForSelector(close_btn_msgbox);
                        await my_page.click(close_btn_msgbox);
                    } catch (e) {
                        const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:nth-child(4)';
                        await my_page.waitForSelector(close_btn_msgbox);
                        await my_page.click(close_btn_msgbox);
                    }

                    // check message state for next step

                    const first_name = user_name.split(" ")[0];
                    const first_msg = ac.first_message.replace('{FirstName}', first_name);
                    if (first_msg == messages[0].content) {
                        console.log(">>platform message")

                        // open message
                        if (messages.length == 1 || (messages.length == 2 && messages[1].role == 'user')) {
                            const nc: MessageType[] = [
                                {
                                    role: 'assistant',
                                    content: first_msg,
                                    createdAt: messages[0].createdAt
                                }
                            ]
                            const new_linked_in_chat: LinkedInChatType = {
                                id: 0,
                                chat_history: JSON.stringify(nc),
                                prospect_id: member_id,
                                prospection_campaign_id: ac.id,
                                chat_status: ChatStatus.OPENING,
                                linked_in_chat_urn: "",
                                first_message_urn: "",
                                automatic_answer: true,
                                requires_human_intervention: false,
                                follow_up_count: 0
                            }
                            this.chatService.createNewChat(new_linked_in_chat);
                        }
                        // new message
                        if (messages[messages.length - 1].role == 'user') {
                            const new_msg = {
                                member_id,
                                messages
                            }
                            new_messages.push(new_msg)
                        }
                    }
                    await my_page.waitForTimeout(2000);
                } catch (e) {

                }

            }
            // check sidebar msg box end [for] 

            // sidebar message result
            console.log(">>new message list", new_messages)

            await my_page.reload();
            my_page.waitForTimeout(2000);

            // ---------------------------^^^  send core message based on user's new message on the linkedin ^^^----------------------------------
            // there is no limitation in replying 
            for (const new_message of new_messages) {
                if (!this.isLoginOn) {
                    return
                }
                const linked_in_chat: LinkedInChatType = await this.getChat_mid_c_id(new_message.member_id, campaign_id);
                // console.log(">>>>LINK...", linked_in_chat)
                if (linked_in_chat != null &&
                    linked_in_chat.automatic_answer &&
                    (linked_in_chat.chat_status != ChatStatus.ACCEPTED && linked_in_chat.chat_status != ChatStatus.REJECTED)
                ) {
                    const prospect: ProspectType = await this.prospectsService.findProspectByMemberId(new_message.member_id);
                    await this.sendCoreMessage(linked_in_chat, prospect, new_message.messages, linked_in_account, ac)
                }
            }

            await my_page.reload();
            my_page.waitForTimeout(2000);

            // ---------------------------^^^  send inquire and follow  messages ^^^------------------------------------
            // read chat list from linked_in_chat DB and process 4 messages per once, 4 msgs per 10 mins, 24 msgs per 1 hour, max 576 msgs per day
            const chats_data = await this.chatService.getChatForInquireAndFollow(campaign_id);
            var cnt = 0;
            for (const chat of chats_data) {
                console.log(">>>>START INQUERING...")
                if (this.isOver(start_time) || !this.isLoginOn()) {
                    // await my_page.close();
                    console.log(">>time out")
                    return;
                }
                try {
                    if (chat.chat_status == ChatStatus.OPENING || chat.chat_status == ChatStatus.INQUIRING || chat.chat_status == ChatStatus.UNANSWERED || chat.chat_status == ChatStatus.NOANSWERED) {
                        // inquiring and follow type 4 message section
                        const prospect_id = chat.prospect_id;
                        const prospect: ProspectType = await this.prospectsService.findProspectById(prospect_id);
                        var res = false;
                        if (chat.chat_status == ChatStatus.OPENING || chat.chat_status == ChatStatus.INQUIRING) {
                            console.log(">>>send inquiring message")
                            res = await this.sendInquiringMessage(chat, linked_in_account, prospect);
                        } else {
                            console.log(">>>>>send follow4 message")
                            res = await this.sendFollow4Message(chat, linked_in_account, prospect);
                        }
                        console.log(">>RES..", res)
                        if (res) {
                            cnt++;
                        }
                    } else {
                        // normal follow type section
                        const prospect_id = chat.prospect_id;
                        const prospect: ProspectType = await this.prospectsService.findProspectById(prospect_id);
                        const lastestChat = JSON.parse(chat.chat_history);
                        const require_follow_up = this.getFollowUpStatus(lastestChat, chat);
                        if (require_follow_up && chat.follow_up_count < 4) {
                            console.log(">>>send follow up message")
                            const res = await this.sendFollowUpMessage(chat, linked_in_account, prospect)
                            if (res) {
                                cnt++;
                            }
                        }
                    }

                    console.log(">>cnt...", cnt)
                    if (cnt == 6) {
                        // break;
                    }
                } catch (e) {

                }
            }

            return;
        } catch (e) {
            console.log(">>>error", e)
        }
    }

    async sendFollowUpMessage(linked_in_chat: LinkedInChatType, linked_in_account: LinkedInAccountType, prospect: ProspectType) {
        try {
            var messages: MessageType[] = JSON.parse(linked_in_chat.chat_history);
            const lastMessage = messages[messages.length - 1].content;
            const first_msg = messages[0];
            var answer: MessageType = {
                role: 'assistant',
                content: '',
                createdAt: this.getTimestamp()
            }
            if (linked_in_chat.follow_up_count == 3) {
                answer.content = "Puede que ahora no sea tu momento. Te dejo este mini-entrenamiento sobre cómo escalamos negocios de consultoría a 20k o más al mes utilizando inteligencia artificial y sistemas de automatización. Abrazo! Ver mini-entrenamiento aquí: https://bit.ly/minientrenamientoconsultorpro \n He pensado que podría ser de tu interés. \n Y si cambias de opinión y te gustaría que te ayudemos a escalar tu negocio, no dudes en ponerte en contacto conmigo. \nAbrazo!";
                linked_in_chat.automatic_answer = true;
                // send inquire message at the linkedin browser 
                const send_success = await this.sendMessageAtLinkedIn(prospect, linked_in_account, answer.content)
                if (send_success) {
                    linked_in_chat.follow_up_count = 4;
                    messages.push(answer);
                    linked_in_chat.chat_history = JSON.stringify(messages);
                    await this.chatService.updateChatOne(linked_in_chat);
                    return true;
                } else {
                    return false;
                }
            }
            var payload: GptMessageType[] = [
                {
                    role: 'system',
                    content: ''
                }
            ]
            var newChatStatus = await this.detectOnHoldStatus(linked_in_chat, linked_in_account.user_id, linked_in_account.apikey);
            if (newChatStatus == ChatStatus.ONHOLD || linked_in_chat.chat_status == ChatStatus.ONHOLD) {
                payload[0].content = await this.promptService.generateFollowUpSchedulePrompt(prospect, linked_in_chat.follow_up_count, linked_in_account.user_id);
                newChatStatus = ChatStatus.ONHOLD;
            } else {
                payload[0].content = await this.promptService.generateFollowUpPrompt(prospect, linked_in_chat.follow_up_count, linked_in_account.user_id);
                newChatStatus = ChatStatus.FOLLOWUP;
            }

            const timestamp = this.getTimestamp();
            var answer_2 = await this.getChatGptAnswer(payload, 'gpt-4', 0.6, timestamp, linked_in_account.apikey);

            if (answer_2 == false) {
                return false;
            }

            answer_2.content = answer_2.content.replace(/[¡¿]/g, '');

            // send inquire message at the linkedin browser 
            const send_success = await this.sendMessageAtLinkedIn(prospect, linked_in_account, answer_2.content)

            if (send_success) {
                linked_in_chat.follow_up_count = linked_in_chat.follow_up_count + 1;
                messages.push(answer_2);
                linked_in_chat.chat_history = JSON.stringify(messages);
                await this.chatService.updateChatOne(linked_in_chat);
                return true;
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    async sendInquiringMessage(linked_in_chat: LinkedInChatType, linked_in_account: LinkedInAccountType, prospect: ProspectType) {
        try {
            var messages: MessageType[] = JSON.parse(linked_in_chat.chat_history);
            const lastMessage = messages[messages.length - 1].content;
            const first_msg = messages[0];

            var answer: MessageType = {
                role: 'assistant',
                content: '',
                createdAt: this.getTimestamp()
            }

            if (this.isNowAfter(4, first_msg.createdAt)) {
                answer.content = "Y si te digo que además podemos cerrar las ventas por ti también para que tu solo te dediques a atender a tus clientes… Y sabes que es lo más potente de todo… que podemos trabajar contigo a éxito… si tú no vendes, nosotros no cobramos (win-win total)… esto te ayudaría a escalar tu negocio?";
                linked_in_chat.chat_status = ChatStatus.INQUIRING;
            }
            if (this.isNowAfter(28, first_msg.createdAt)) {
                answer.content = "Me darías la oportunidad de explicarte cómo hacemos para agregar un mínimo de 20k/mes de facturación a nuestros clientes en una videollamada corta... conversamos? (No tienes nada que perder y más de 20k / mes para crecer)";
                linked_in_chat.chat_status = ChatStatus.INQUIRING;
            }
            if (this.isNowAfter(52, first_msg.createdAt)) {
                answer.content = "Puede que ahora no sea tu momento. Te dejo este mini-entrenamiento sobre cómo escalamos negocios de consultoría a 20k o más al mes utilizando inteligencia artificial y sistemas de automatización. Abrazo! Ver mini-entrenamiento aquí: https://bit.ly/minientrenamientoconsultorpro \n He pensado que podría ser de tu interés. \n Y si cambias de opinión y te gustaría que te ayudemos a escalar tu negocio, no dudes en ponerte en contacto conmigo. \nAbrazo!";
                linked_in_chat.chat_status = ChatStatus.UNANSWERED
            }
            if (answer.content == '' || answer.content == lastMessage) {
                return false;
            }

            // send inquire message at the linkedin browser 
            const send_success = await this.sendMessageAtLinkedIn(prospect, linked_in_account, answer.content)

            if (send_success) {
                messages.push(answer);
                linked_in_chat.chat_history = JSON.stringify(messages);
                await this.chatService.updateChatOne(linked_in_chat);
                return true;
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    async sendFollow4Message(linked_in_chat: LinkedInChatType, linked_in_account: LinkedInAccountType, prospect: ProspectType) {
        try {
            var messages: MessageType[] = JSON.parse(linked_in_chat.chat_history);
            const lastMessage = messages[messages.length - 1].content;
            const first_msg = messages[0];

            var answer: MessageType = {
                role: 'assistant',
                content: '',
                createdAt: this.getTimestamp()
            }

            console.log(">>>follow8888", first_msg)

            linked_in_chat.chat_status = ChatStatus.NOANSWERED;

            if (this.isNowAfter(148, first_msg.createdAt)) {
                answer.content = 'Hola ' + prospect.first_name + ', tuviste algún momento para ver el mini entrenamiento o todavía no?';
            }
            if (this.isNowAfter(316, first_msg.createdAt)) {
                answer.content = prospect.first_name + ', no me comentaste si pudiste ver el mini entrenamiento. Me encantaría saber tu opinión acerca del mismo!';
            }
            if (this.isNowAfter(484, first_msg.createdAt)) {
                answer.content = "Entiendo que estarás muy ocupado, y no quiero molestarte. Espero que puedas ver el mini entrenamiento y que hablemos pronto " + prospect.first_name + "!";
                linked_in_chat.automatic_answer = false;
                linked_in_chat.chat_status = ChatStatus.REJECTED;
            }
            if (answer.content == '' || answer.content == lastMessage) {
                console.log(">>>return here...")
                return false;
            }
            // send inquire message at the linkedin browser 
            const send_success = await this.sendMessageAtLinkedIn(prospect, linked_in_account, answer.content)
            if (send_success) {
                messages.push(answer);
                linked_in_chat.chat_history = JSON.stringify(messages);
                await this.chatService.updateChatOne(linked_in_chat);
                return true;
            } else {
                return false;
            }

        } catch (e) {
            return false;
        }
    }

    async sendCoreMessage(linked_in_chat: LinkedInChatType, prospect: ProspectType, lastestChat: MessageType[], linked_in_account: LinkedInAccountType, ac: CampaignType) {
        try {
            const user_id = linked_in_account.user_id;
            const timestamp = this.getTimestamp();
            const messages: MessageType[] = lastestChat;
            console.log(">>>last chat", lastestChat)

            const gpt_messages: GptMessageType[] = [];
            messages.forEach((m: MessageType) => {
                const ms: GptMessageType = {
                    role: m.role,
                    content: m.content
                }
                gpt_messages.push(ms)
            })

            const spamDetected = await this.detectSpamLimit(gpt_messages);

            if (spamDetected) {
                linked_in_chat.requires_human_intervention = true;
                linked_in_chat.automatic_answer = false;
                linked_in_chat.chat_history = JSON.stringify(lastestChat);
                linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                await this.chatService.updateChatOne(linked_in_chat);
                // $linkedInAccount->user->notify(new PossibleSpamDetection($prospectionCampaign, $prospect));
                return
            }

            const lastMessage = gpt_messages[gpt_messages.length - 1].content;

            // if the message is detected as spam by AI it return true for flagged
            const result = await this.getInsultFilterResponse(lastMessage, linked_in_account.apikey);

            if (result['results'][0]['flagged']) {
                linked_in_chat.requires_human_intervention = true;
                linked_in_chat.automatic_answer = false;
                linked_in_chat.chat_history = JSON.stringify(lastestChat);
                linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                await this.chatService.updateChatOne(linked_in_chat);
                const reason = 'Insulto detectado en campaña ' + ac.name;
                // $linkedInAccount -> user -> notify(new ChatOutOfContext($reason, $lastMessage, $messages, $prospect));
                return;
            }

            const sys_content = await this.promptService.filterContextPrompt(lastMessage, user_id);
            var systemPrompt: GptMessageType[] = [
                {
                    role: 'assistant',
                    content: sys_content
                }
            ];

            const outOfContext: any = await this.getChatGptAnswer(systemPrompt, 'gpt-4', 0.3, timestamp, linked_in_account.apikey);

            if (outOfContext.content != undefined) {
                if (outOfContext.content.trim() == 'OFF_TOPIC') {
                    linked_in_chat.requires_human_intervention = true;
                    linked_in_chat.automatic_answer = false;
                    linked_in_chat.chat_history = JSON.stringify(lastestChat);
                    linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                    await this.chatService.updateChatOne(linked_in_chat);
                    const reason = 'Salida de contexto detectada en campaña ' + ac.name;
                    // $linkedInAccount -> user -> notify(new ChatOutOfContext($reason, $lastMessage, $messages, $prospect));
                    return;
                }

                if (outOfContext.content.trim() == 'CONTACT') {
                    linked_in_chat.requires_human_intervention = true;
                    linked_in_chat.automatic_answer = false;
                    linked_in_chat.chat_history = JSON.stringify(lastestChat);
                    linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                    await this.chatService.updateChatOne(linked_in_chat);
                    const reason = 'Petición de contacto detectada en campaña ' + ac.name;
                    // $linkedInAccount -> user -> notify(new ChatOutOfContext($reason, $lastMessage, $messages, $prospect));
                    return;
                }

                if (outOfContext.content.trim() == 'NO_CALENDAR') {
                    linked_in_chat.requires_human_intervention = true;
                    linked_in_chat.automatic_answer = false;
                    linked_in_chat.chat_history = JSON.stringify(lastestChat);
                    linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                    await this.chatService.updateChatOne(linked_in_chat);
                    const reason = 'Reunión presencial o telefónica detectada en campaña ' + ac.name;
                    // $linkedInAccount -> user -> notify(new ChatOutOfContext($reason, $lastMessage, $messages, $prospect));
                    // added or fixed...
                    return;
                }
            }

            linked_in_chat.requires_human_intervention = false;
            linked_in_chat.follow_up_count = 0;

            var prompt: GptMessageType[] = gpt_messages;
            var newChatStatus = ChatStatus.INPROGRESS;
            if (linked_in_chat.chat_status == ChatStatus.FOLLOWUP || linked_in_chat.chat_status == ChatStatus.ONHOLD) {
                linked_in_chat.follow_up_count = 0;
            }

            const gen_core_prompt = await this.promptService.generateCorePrompt(prospect, ac, 'creative', user_id);
            console.log(">>>core prompt", gen_core_prompt)
            const sysPrompt: GptMessageType = {
                role: 'system',
                content: gen_core_prompt
            }
            prompt.unshift(sysPrompt);

            var maxTokens = 4096;
            var maxResponseTokens = 500;
            var payloadTokens = this.getMessagesTokensCount(prompt);
            console.log(">>>prompt...", prompt)

            while (payloadTokens + maxResponseTokens >= maxTokens) {
                // We unset index 1 because 0 is system prompt and we have to keep it
                prompt.splice(1, 1);
                payloadTokens = this.getMessagesTokensCount(prompt);
            }

            var answer = await this.getChatGptAnswer(prompt, 'gpt-4', 0.8, timestamp, linked_in_account.apikey);
            if (answer == false) {
                return;
            }
            answer.content = answer.content.replace(/[¡¿]/g, '');

            var link = 'https://app.aippointing.com/schedule?p=' + prospect.id;
            var linkPlaceholder = 'CALENDAR-LINK';
            var extendedLink = 'https://app.aippointing.com/schedule/extended?p=' + prospect.id;
            var extendedLinkPlaceholder = 'EXTENDED-CALENDAR-LINK';
            var rejectedLinkPlaceholder = 'REJECTED-LINK';
            var rejectedLink = 'https://bit.ly/minientrenamientoconsultorpro';

            // if (isset($prospectionCampaign)) {
            link = link + '&c=' + ac.id;
            extendedLink = extendedLink + '&c=' + ac.id;

            answer.content = answer.content.replaceAll(extendedLinkPlaceholder, extendedLink);
            answer.content = answer.content.replaceAll(linkPlaceholder, link);
            answer.content = answer.content.replaceAll(rejectedLinkPlaceholder, rejectedLink);
            answer.content = answer.content.replace(/[\[\]{}]/g, '');

            // send core message at the linkedin browser   
            const send_success = await this.sendMessageAtLinkedIn(prospect, linked_in_account, answer.content);

            if (send_success) {
                if (answer.content.includes("https://bit.ly/minientrenamientoconsultorpro")) {
                    newChatStatus = ChatStatus.REJECTED;
                    linked_in_chat.automatic_answer = false;
                }
                messages.push(answer);
                linked_in_chat.chat_status = newChatStatus;
                linked_in_chat.chat_history = JSON.stringify(messages);
                await this.chatService.updateChatOne(linked_in_chat);
                return;
            } else {
                return;
            }
        } catch (e) {
            console.log(">>>core message error", e)
            return;
        }
    }

    async sendMessageAtLinkedIn(prospect: ProspectType, linked_in_account: LinkedInAccountType, newMsg: string) {
        try {
            var my_page = this.cached_linked_browser.page;
            const search_name = prospect.first_name + " " + prospect.last_name;
            const member_id = prospect.linked_in_member_id;
            await my_page.waitForSelector('#global-nav-typeahead .search-global-typeahead__input');
            const inputValue = await my_page.$eval('#global-nav-typeahead .search-global-typeahead__input', el => el.value);

            await my_page.click('#global-nav-typeahead .search-global-typeahead__input');
            await my_page.click('#global-nav-typeahead .search-global-typeahead__input');
            for (let i = 0; i < 40; i++) {
                await my_page.keyboard.press('Backspace');
                await my_page.waitForTimeout(40);
                await my_page.keyboard.press('Delete');
                await my_page.waitForTimeout(40);
            }
            await my_page.waitForTimeout(1000);
            // focus & type search name 
            const mgs_box_t1 = await my_page.waitForSelector('#global-nav-typeahead .search-global-typeahead__input');
            if (mgs_box_t1) {
                await my_page.focus('#global-nav-typeahead .search-global-typeahead__input')
            }
            await my_page.keyboard.type(search_name, { delay: 50 });
            await my_page.keyboard.press('Enter');
            await my_page.waitForTimeout(1000);

            // people filter button click 
            const filter_btn = '#search-reusables__filters-bar > ul > li:nth-child(1) > button';
            try {
                await my_page.waitForSelector(filter_btn);
                await my_page.click(filter_btn);
                console.log(">>>selected filter")
            } catch (e) {
                console.log(">>>selected filter no")
            }

            // select reciever from list
            await my_page.waitForTimeout(3000);
            const element = await my_page.waitForSelector('[data-chameleon-result-urn="urn:li:member:' + member_id + '"]');
            if (element) {
                const button = await element.$('button');
                if (button) {
                    const text = await (await button.getProperty('textContent')).jsonValue()
                    if (this.beautySpace(text) != 'Message') {
                        console.log(">>>>not connected prospect")
                        return false;
                    }
                    try {
                        // close message box if it is opened
                        var count = await my_page.$$eval('.msg-convo-wrapper', elements => elements.length);
                        while (count > 0) {
                            count--;
                            await my_page.waitForTimeout(500);
                            const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                            await my_page.waitForSelector(close_btn_msgbox);
                            await my_page.click(close_btn_msgbox);
                            await this.delay(500)
                        }
                    } catch (e) {
                        console.log(">>>error on close message boxes")
                    }

                    // click message button
                    await button.click();
                    await my_page.waitForTimeout(3000);

                    try {
                        // focus message box
                        const mgs_box_t1 = await my_page.waitForSelector('.msg-form__contenteditable');
                        if (mgs_box_t1) {
                            await my_page.focus('.msg-form__contenteditable')
                        }
                        // type message on the form
                        await my_page.keyboard.type(newMsg, { delay: 5 });
                        await my_page.waitForTimeout(200);
                        // click send message button 
                        await my_page.click('button.msg-form__send-button');

                        // close message box for next
                        await my_page.waitForTimeout(200);
                        const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                        await my_page.waitForSelector(close_btn_msgbox);
                        await my_page.click(close_btn_msgbox);

                        console.log(">>message box closed")
                        return true;
                    } catch (e) {
                        // close message box for next
                        await my_page.waitForTimeout(200);
                        const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                        await my_page.waitForSelector(close_btn_msgbox);
                        await my_page.click(close_btn_msgbox);

                        await my_page.waitForTimeout(200);
                        console.log(">>message box closed")
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } catch (e) {
            console.log(">>err", e)
            return false;
        }
    }

    async readFirstMsgAtLinkedIn(prospect: ProspectType, linked_in_account: LinkedInAccountType, newMsg: string) {
        try {
            var my_page = this.cached_linked_browser.page;
            const search_name = prospect.first_name + " " + prospect.last_name;
            const member_id = prospect.linked_in_member_id;
            await my_page.waitForSelector('#global-nav-typeahead .search-global-typeahead__input');
            const inputValue = await my_page.$eval('#global-nav-typeahead .search-global-typeahead__input', el => el.value);

            await my_page.click('#global-nav-typeahead .search-global-typeahead__input');
            for (let i = 0; i < 40; i++) {
                await my_page.keyboard.press('Backspace');
                await my_page.waitForTimeout(40);
                await my_page.keyboard.press('Delete');
                await my_page.waitForTimeout(40);
            }
            await my_page.waitForTimeout(1000);
            // focus & type search name 
            const mgs_box_t1 = await my_page.waitForSelector('#global-nav-typeahead .search-global-typeahead__input');
            if (mgs_box_t1) {
                await my_page.focus('#global-nav-typeahead .search-global-typeahead__input')
            }
            await my_page.keyboard.type(search_name, { delay: 100 });
            await my_page.keyboard.press('Enter');
            await my_page.waitForTimeout(1000);

            // await my_page.type('#global-nav-typeahead .search-global-typeahead__input', search_name);
            // await my_page.keyboard.press('Enter');  

            // people filter button click
            await my_page.waitForTimeout(2000);
            const filter_btn = '#search-reusables__filters-bar > ul > li:nth-child(1) > button';
            try {
                // await my_page.waitForSelector(filter_btn);
                await my_page.waitForSelector(filter_btn);
                await my_page.click(filter_btn);
                console.log(">>>selected filter")
            } catch (e) {
                console.log(">>>selected filter no")
            }

            // select reciever from list
            await my_page.waitForTimeout(2000);
            const element = await my_page.waitForSelector('[data-chameleon-result-urn="urn:li:member:' + member_id + '"]');
            if (element) {
                const button = await element.$('button');
                if (button) {
                    const text = await (await button.getProperty('textContent')).jsonValue()
                    if (this.beautySpace(text) != 'Message') {
                        console.log(">>>>not connected prospect")
                        return { status: false, msg: [] };
                    }

                    // click message button
                    await button.click();
                    await my_page.waitForTimeout(2000);

                    try {
                        const msgs = await my_page.$$('li.msg-s-message-list__event')
                        var messages: MessageType[] = []
                        var date = '';
                        var time = '';
                        var name = '';
                        var my_name: any = '';
                        var user_name: any = '';

                        const u_name = await my_page.$('.msg-overlay-bubble-header .msg-overlay-bubble-header__title span')
                        if (u_name) {
                            var n = await (await u_name.getProperty('textContent')).jsonValue()
                            user_name = this.beautySpace(n);
                        }

                        for (const msg of msgs) {
                            const date_ele = await msg.$('.msg-s-message-list__time-heading')
                            if (date_ele) {
                                date = await (await date_ele.getProperty('textContent')).jsonValue();
                            }
                            const time_ele = await msg.$('.msg-s-event-listitem .msg-s-message-group__meta .msg-s-message-group__timestamp')
                            if (time_ele) {
                                time = await (await time_ele.getProperty('textContent')).jsonValue()
                            }
                            const name_ele = await msg.$('.msg-s-event-listitem .msg-s-message-group__meta .msg-s-message-group__name')
                            if (name_ele) {
                                name = await (await name_ele.getProperty('textContent')).jsonValue()

                            }
                            const msg_body = await msg.$('.msg-s-event-listitem .msg-s-event__content .msg-s-event-listitem__body')
                            const msg_text = await (await msg_body.getProperty('textContent')).jsonValue()
                            const b_date = this.beautyDate(this.beautySpace(date), this.beautySpace(time));
                            const msg_data: MessageType = {
                                createdAt: b_date['date'],
                                //stamp: b_date['stamp'],
                                //name: this.beautySpace(name),
                                role: this.beautySpace(name) == user_name ? 'user' : 'assistant',
                                content: msg_text.replace(/\+/g, '')
                            }
                            messages.push(msg_data);
                        }

                        console.log(">>>>>NEW MESSAGE", messages)

                        // close message box for next
                        await my_page.waitForTimeout(1000);
                        const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                        await my_page.waitForSelector(close_btn_msgbox);
                        await my_page.click(close_btn_msgbox);

                        await my_page.waitForTimeout(1000);
                        console.log(">>message box closed")
                        return { status: true, msg: messages };
                    } catch (e) {
                        // close message box for next
                        await my_page.waitForTimeout(500);
                        const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                        await my_page.waitForSelector(close_btn_msgbox);
                        await my_page.click(close_btn_msgbox);

                        await my_page.waitForTimeout(2000);
                        console.log(">>message box closed")
                        return { status: false, msg: [] }
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } catch (e) {
            console.log(">>err", e)
            return false;
        }
    }


    // ------------------------------------ ^_^ utils function ^_^ -------------------------------------------  

    beautySpace(str: any) {
        return str.trim().replace(/^\n+|\n+$/g, '');
    }

    beautyDate(date_in: any, time_in: any) {
        try {
            const weeks = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            if (weeks.includes(date_in)) {
                const dayMapping = {
                    'Sunday': 0,
                    'Monday': 1,
                    'Tuesday': 2,
                    'Wednesday': 3,
                    'Thursday': 4,
                    'Friday': 5,
                    'Saturday': 6
                };
                const currentDate = new Date();
                const currentDay = currentDate.getDay();
                const difference = (dayMapping[date_in] - currentDay - 7) % 7;
                const targetDate = new Date(currentDate);
                targetDate.setDate(currentDate.getDate() + difference);
                const date_res = `${(targetDate.getMonth() + 1).toString().padStart(2, '0')}/${targetDate.getDate().toString().padStart(2, '0')}/${targetDate.getFullYear().toString().slice(-2)}`;

                const [time, period] = time_in.split(' ');
                let [hours, minutes] = time.split(':');
                hours = parseInt(hours, 10);
                if (period === 'PM' && hours < 12) {
                    hours += 12;
                } else if (period === 'AM' && hours === 12) {
                    hours = 0;
                }
                const time_res = `${hours.toString().padStart(2, '0')}:${minutes}`;

                const date = new Date(targetDate.getFullYear(), (targetDate.getMonth() + 1), targetDate.getDate(), hours, minutes);
                const timestamp = date.getTime();

                return {
                    date: date_res + " " + time_res,
                    stamp: timestamp
                }

            } else {
                var d_in = date_in;
                if (date_in == 'TODAY' || date_in == 'Today') {
                    const today = new Date();
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    const month = monthNames[today.getMonth()];
                    const day = today.getDate();
                    d_in = `${month} ${day}`;
                }
                const monthNumber = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                const currentDate = new Date();
                const year = currentDate.getFullYear();
                const parts = d_in.split(' ');
                const month = monthNumber[parts[0]];
                const day = parts[1];
                const date_res = `${month}/${day.padStart(2, '0')}/${year.toString().slice(-2)}`;

                const [time, period] = time_in.split(' ');
                let [hours, minutes] = time.split(':');
                hours = parseInt(hours, 10);
                if (period === 'PM' && hours < 12) {
                    hours += 12;
                } else if (period === 'AM' && hours === 12) {
                    hours = 0;
                }
                const time_res = `${hours.toString().padStart(2, '0')}:${minutes}`;

                const date = new Date(year, month, day, hours, minutes);
                const timestamp = date.getTime();

                return {
                    date: date_res + " " + time_res,
                    stamp: timestamp
                }
            }
        } catch (e) {
            console.log(">>")
        }
    }

    getTimestamp() {
        const currentDate = new Date();
        const padZero = (num) => (num < 10 ? `0${num}` : num);
        const month = padZero(currentDate.getMonth() + 1);
        const day = padZero(currentDate.getDate());
        const year = currentDate.getFullYear();
        const hours = padZero(currentDate.getHours());
        const minutes = padZero(currentDate.getMinutes());
        return `${month}/${day}/${year.toString().slice(-2)} ${hours}:${minutes}`;
    }

    async getChat_mid_c_id(member_id: string, campaign_id: number) {
        const prospect = await this.prospectsService.findProspectByMemberId(member_id)
        const prospect_id = prospect.id;
        const linked_in_chat = await this.chatService.findOneChatByProspect(campaign_id, prospect_id);
        return linked_in_chat;
    }

    async getChatGptAnswer(msg: GptMessageType[], model: string, temperature: number, timestamp: string, gptAPI: string) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + gptAPI,
                'OpenAI-Organization': 'org-hjz849AbFJhqrSJZ33rIkvBC'
            }
            const res = await axios.post('https://api.openai.com/v1/chat/completions',
                {
                    'model': model,
                    'messages': msg,
                    'temperature': temperature,
                    'max_tokens': 250,
                    'top_p': 1.0,
                    'frequency_penalty': 0.2,
                    'presence_penalty': 0,
                    'stop': ['11.'],
                },
                { headers }
            )
            if (res.data.error) {
                return false;
            }
            var message = res.data.choices[0].message;
            message['createdAt'] = timestamp;
            return message;
        } catch (e) {
            return false;
        }
    }

    async detectSpamLimit(messages: any[]) {
        const userMessages = messages.filter(message => message.role === 'user');
        return userMessages.length % 20 === 0;
    }


    async getInsultFilterResponse(message: any, gptAPI: string) {
        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + gptAPI,
                'OpenAI-Organization': 'org-hjz849AbFJhqrSJZ33rIkvBC'
            }
            const res = await axios.post('https://api.openai.com/v1/moderations',
                {
                    'input': message,
                },
                { headers }
            )
            return res.data;
        } catch (e) {
            return false;
        }
    }

    getMessagesTokensCount(chatMessages: GptMessageType[]) {
        const encoder = encoding_for_model("gpt-3.5-turbo");
        var tokens = 0;
        chatMessages.forEach(message => {
            tokens += 4;
            Object.entries(message).forEach(([key, value]) => {
                tokens += encoder.encode(value).length;
                if (key === 'name') {
                    tokens -= 1;
                }
            });
        });
        tokens += 2;
        return tokens;
    }

    getFollowUpStatus(lastestChat: MessageType[], linked_in_chat: LinkedInChatType) {
        const lastMessage = lastestChat[lastestChat.length - 1];
        const lastMsgCreatedAt = lastMessage.createdAt;
        if (linked_in_chat.follow_up_count == 0 && this.isNowAfter(1, lastMsgCreatedAt)) {
            return true;
        }
        if (linked_in_chat.follow_up_count == 1 && this.isNowAfter(25, lastMsgCreatedAt)) {
            return true;
        }
        if (linked_in_chat.follow_up_count == 2 && this.isNowAfter(49, lastMsgCreatedAt)) {
            return true;
        }
        if (linked_in_chat.follow_up_count == 3 && this.isNowAfter(73, lastMsgCreatedAt)) {
            return true;
        }
        return false;
    }

    async detectOnHoldStatus(linked_in_chat: LinkedInChatType, user_id: number, apikey: string) {
        var messages: MessageType[] = JSON.parse(linked_in_chat.chat_history);
        const lastMessage = messages[messages.length - 1].content;
        if (linked_in_chat.chat_history != ChatStatus.ONHOLD && linked_in_chat.chat_status != ChatStatus.FOLLOWUP) {
            const sysPrompt = [
                {
                    role: 'system',
                    content: await this.promptService.generateOnHoldStateDetectionPrompt(lastMessage, user_id)
                }
            ];
            const timestamp = this.getTimestamp();
            const isOnHold = await this.getChatGptAnswer(sysPrompt, 'gpt-3.5-turbo', 0.1, timestamp, apikey);
            if (isOnHold.content != undefined) {
                if (isOnHold.content.trim().toLowerCase() == 'true') {
                    return ChatStatus.ONHOLD;
                }
            }
        }
        return '';
    }

    isNowAfter(hour: number, times: string) {
        //const times = "01/23/23 05:23";
        const parts = times.split(/[\s/:]+/);
        const year = parseInt(parts[2], 10) + 2000;
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const hours = parseInt(parts[3], 10);
        const minutes = parseInt(parts[4], 10);
        const msg_stamp = new Date(year, month, day, hours, minutes).getTime();

        const now_stamp = Date.now()
        const milli_diff = now_stamp - msg_stamp;
        const hour_diff = milli_diff / (1000 * 60 * 60);

        if (hour_diff >= hour) {
            return true;
        } else {
            return false;
        }
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isOver(start_time: number) {
        const now_time = Date.now();
        if ((now_time - start_time) > 9.5 * 60 * 1000) {
            return true
        } else {
            return false
        }
    }

    isLoginOn() {
        if (this.cached_linked_browser.page) {
            const url = this.cached_linked_browser.page.url()
            if (url.includes('/feed/') || url.includes('/in/') || url.includes('/search/')) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    // this is for testing login process to check bypass puzzle
    async loginTest() {
        try {
            const login_email = 'admin@aippointing.com';
            const login_password = 'q7eDhhC9KfUqpa';
            const browser = await puppeteer.launch(
                {
                    headless: false,
                    args: [
                        '--start-maximized',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-gpu',
                        '--disable-dev-shm-usage',
                        '--disable-web-security',
                        '--disable-infobars',
                        '--ignore-certifcate-errors',
                        '--ignore-certifcate-errors-spki-list'
                    ],
                    defaultViewport: null,
                    ignoreDefaultArgs: ['--enable-automation']
                }
            );
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            });
            await page.goto(`https://www.linkedin.com/`, { timeout: 0 });
            await page.waitForTimeout(2000);
            await page.type('#session_key', login_email);
            await page.type('#session_password', login_password);
            await page.click('button.sign-in-form__submit-btn--full-width');
            await page.waitForTimeout(5000);

            if (page.url().includes('checkpoint/challenge/')) {

                await page.waitForTimeout(30000);
                const frame_1 = await page.$("iframe[id='captcha-internal']");
                const contentFrame_1 = await frame_1.contentFrame();
                const frame_2 = await contentFrame_1.$("iframe[id='arkoseframe']");
                const contentFrame_2 = await frame_2.contentFrame();
                const frame_3 = await contentFrame_2.$("iframe[title='Verification challenge']");
                const contentFrame_3 = await frame_3.contentFrame();
                const frame_4 = await contentFrame_3.$("iframe[id='fc-iframe-wrap']");
                const contentFrame_4 = await frame_4.contentFrame();
                const frame_5 = await contentFrame_4.$("iframe[id='CaptchaFrame']");
                const contentFrame_5 = await frame_5.contentFrame();
                const acceptBtn = await contentFrame_5.$(`#home button`);
                await acceptBtn.click();

                //auto bypass for puzzle
                await page.waitForTimeout(4000);
                const loops = [1, 1, 1, 1, 1, 1, 1];
                try {
                    for (var l of loops) {
                        await contentFrame_5.$(`#game_children_text`);
                        const src = await contentFrame_5.evaluate(() => {
                            const imgElement = document.querySelector('#game_challengeItem_image');
                            return imgElement ? imgElement['src'] : null;
                        });
                        const img = src.substring(23);
                        const res = await axios.post('https://api.capsolver.com/createTask', {
                            "clientKey": this.captcha_key,
                            "task": {
                                "type": "FunCaptchaClassification",
                                "websiteURL": "https://www.linkedin.com",
                                "images": [
                                    img
                                ],
                                "question": "rotated"
                            }
                        });
                        if (res.data.status == 'ready') {
                            console.log(">>>res", res.data)
                            const idx = res.data.solution.objects[0] + 1;
                            console.log(">>idx", idx)
                            await contentFrame_5.click('#image' + idx + ' > a');
                        }
                        await page.waitForTimeout(4000);
                    }

                } catch (e) {
                    console.log(">>passed")
                }
                console.log(">>passed")

            }
        } catch (e) {
            console.log(">>errr", e)
        }
    }

    // we don't use this manual puzzle to login
    async puzzleLinkedIn(login_data: LinkedinLoginDataType) {
        try {
            console.log(">>>puzzle", login_data)
            const page = await this.cached_linked_browser.page;
            await page.waitForTimeout(2000);
            const frame_1 = await page.$("iframe[id='captcha-internal']");
            const contentFrame_1 = await frame_1.contentFrame();
            const frame_2 = await contentFrame_1.$("iframe[id='arkoseframe']");
            const contentFrame_2 = await frame_2.contentFrame();
            const frame_3 = await contentFrame_2.$("iframe[title='Verification challenge']");
            const contentFrame_3 = await frame_3.contentFrame();
            const frame_4 = await contentFrame_3.$("iframe[id='fc-iframe-wrap']");
            const contentFrame_4 = await frame_4.contentFrame();
            const frame_5 = await contentFrame_4.$("iframe[id='CaptchaFrame']");
            const contentFrame_5 = await frame_5.contentFrame();

            const idx = login_data.puzzle;
            await contentFrame_5.click('#image' + idx + ' > a');

            console.log(">>>>do actioin")
            await page.waitForTimeout(10000);
            console.log(">>>url do", page.url())
            if (page.url().includes('checkpoint/challenge/')) {
                const data = {
                    id: login_data.id,
                    msg: {
                        type: 'vcode_request',
                        data: ''
                    }
                }
                this.socketService.messageToUser(data)
            } else {
                const data = {
                    id: login_data.id,
                    msg: {
                        type: 'login_success',
                        data: ''
                    }
                }
                this.socketService.messageToUser(data)
            }

        } catch (e) {

        }
    }

}





// ---------- this is for login with cookie ---------------
// if (cache_page.length == 0) {
//     try {
//         const browser = await puppeteer.launch({ headless: false, args: [`--proxy-server=${proxy}`, '--start-maximized'], defaultViewport: null, ignoreDefaultArgs: ['--enable-automation'] });
//         my_page = await browser.newPage();
//         await my_page.setExtraHTTPHeaders({
//             'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
//         });

//         await my_page.authenticate({ username, password });
//         await my_page.setCookie({
//             name: 'li_at',
//             value: li_at,
//             domain: 'www.linkedin.com'
//         })
//         await my_page.goto(`https://www.linkedin.com/`, { timeout: 0 });
//         console.log(">>>opened new page")

//         const lkb = {
//             id: linked_in_account_id,
//             page: my_page,
//             browser: browser
//         }
//         this.cached_linked_browser.push(lkb)
//         await my_page.waitForTimeout(2000);
//     } catch (e) {
//         this.cached_linked_browser = this.cached_linked_browser.filter(item => item.id !== linked_in_account_id);
//         return;
//     }
// } else {
//     console.log(">>here sec")

// }



// -------------- this is for login test --------------
// async loginTest() {
//     try {   
//         const login_email = 'songil88620@gmail.com';
//         const login_password = 'Gjrjdahsus88620@'; 
//         const browser = await puppeteer.launch(
//             {
//                 headless: false,
//                 args: [
//                     '--start-maximized',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     // '--headless',
//                     '--disable-gpu',
//                     '--disable-dev-shm-usage',
//                     '--disable-web-security',
//                     '--disable-infobars',
//                     '--ignore-certifcate-errors',
//                     '--ignore-certifcate-errors-spki-list'
//                 ],
//                 //executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
//                 defaultViewport: null,
//                 ignoreDefaultArgs: ['--enable-automation']
//             }
//         );
//         const page = await browser.newPage();
//         await page.setExtraHTTPHeaders({
//             'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
//         });
//         await page.goto(`https://www.linkedin.com/`, { timeout: 0 });
//         await page.waitForTimeout(2000);
//         await page.type('#session_key', login_email);
//         await page.type('#session_password', login_password);
//         await page.click('button.sign-in-form__submit-btn--full-width');
//         await page.waitForTimeout(5000); 
//         console.log(">>>", page.url()) 

//         if (page.url().includes('checkpoint/challenge/')) {

//             await page.waitForTimeout(30000);
//             const frame_1 = await page.$("iframe[id='captcha-internal']");
//             const contentFrame_1 = await frame_1.contentFrame();
//             const frame_2 = await contentFrame_1.$("iframe[id='arkoseframe']");
//             const contentFrame_2 = await frame_2.contentFrame();
//             const frame_3 = await contentFrame_2.$("iframe[title='Verification challenge']");
//             const contentFrame_3 = await frame_3.contentFrame();
//             const frame_4 = await contentFrame_3.$("iframe[id='fc-iframe-wrap']");
//             const contentFrame_4 = await frame_4.contentFrame();
//             const frame_5 = await contentFrame_4.$("iframe[id='CaptchaFrame']");
//             const contentFrame_5 = await frame_5.contentFrame();
//             const acceptBtn = await contentFrame_5.$(`#home button`);
//             await acceptBtn.click();  

//             const pk = await page.$eval('input[name="captchaSiteKey"]', ({ value }) => value);
//             const key = this.key;
//             const siteurl = page.url();
//             const url = 'http://2captcha.com/in.php?key=' + key + '&method=funcaptcha&publickey=' + pk + '&surl=https://client-api.arkoselabs.com&pageurl=' + siteurl

//             const res = await axios.get(url)
//             const id = res.data.split('|')[1];
//             console.log(">>ID", id)

//             setTimeout(async () => {
//                 const url = 'https://2captcha.com/res.php?key=' + key + '&action=get&id=' + id;
//                 const res = await axios.get(url)
//                 const code = res.data;
//                 if (code == 'CAPCHA_NOT_READY') {

//                 }
//                 const v = code.substring(3);
//                 console.log(">>v", v)   
//                 await page.evaluate((v) => {
//                     const inputField = document.querySelector('input[name="captchaUserResponseToken"]');
//                     if (inputField) {
//                         inputField['value'] = v;
//                     } 
//                 }, v);  
//                 const formId = 'captcha-challenge';   
//                 await page.evaluate((formId: string) => {
//                     const form = document.getElementById(formId) as HTMLFormElement | null;
//                     if (form) {
//                         form.submit();
//                     }
//                 }, formId);    
//             }, 35000);

//         }
//     } catch (e) {
//         console.log(">>errr", e)
//     }
// }


// manual solving puzzle
// async puzzleLinkedIn(login_data: LinkedinLoginDataType) {
//     try {
//         console.log(">>>puzzle", login_data)
//         const cache_page_idx = this.cached_linked_browser.findIndex(item => item.id === login_data.id);
//         const page = await this.cached_linked_browser[cache_page_idx].page;
//         await page.waitForTimeout(2000);
//         const frame_1 = await page.$("iframe[id='captcha-internal']");
//         const contentFrame_1 = await frame_1.contentFrame();
//         const frame_2 = await contentFrame_1.$("iframe[id='arkoseframe']");
//         const contentFrame_2 = await frame_2.contentFrame();
//         const frame_3 = await contentFrame_2.$("iframe[title='Verification challenge']");
//         const contentFrame_3 = await frame_3.contentFrame();
//         const frame_4 = await contentFrame_3.$("iframe[id='fc-iframe-wrap']");
//         const contentFrame_4 = await frame_4.contentFrame();
//         const frame_5 = await contentFrame_4.$("iframe[id='CaptchaFrame']");
//         const contentFrame_5 = await frame_5.contentFrame();

//         const idx = login_data.puzzle;
//         await contentFrame_5.click('#image' + idx + ' > a');

//         console.log(">>>>do actioin")
//         await page.waitForTimeout(10000);
//         console.log(">>>url do", page.url())
//         if (page.url().includes('checkpoint/challenge/')) {
//             const data = {
//                 id: login_data.id,
//                 msg: {
//                     type: 'vcode_request',
//                     data: ''
//                 }
//             }
//             this.socketService.messageToUser(data)
//         } else {
//             const data = {
//                 id: login_data.id,
//                 msg: {
//                     type: 'login_success',
//                     data: ''
//                 }
//             }
//             this.socketService.messageToUser(data)
//             const cookiesSet = await page.cookies();
//             var session_id = "";
//             var li_at = "";
//             cookiesSet.forEach((c: any) => {
//                 if (c.name == 'JSESSIONID') {
//                     session_id = c.value;
//                     console.log(">>session_id", session_id)
//                 }
//                 if (c.name == 'li_at') {
//                     li_at = c.value;
//                     console.log(">>li_at", li_at)
//                 }
//             })
//             await this.linkedinAccountService.updateLinkedCookies(login_data.id, li_at, session_id)
//         }

//     } catch (e) {

//     }
// }



// 2captcha API using example
// const pk = await page.$eval('input[name="captchaSiteKey"]', ({ value }) => value);
// const key = this.key;
// const siteurl = page.url();
// const url = 'http://2captcha.com/in.php?key=' + key + '&method=funcaptcha&publickey=' + pk + '&surl=https://client-api.arkoselabs.com&pageurl=' + siteurl

// const res = await axios.get(url)
// const id = res.data.split('|')[1];
// console.log(">>ID", id)

// await this.delay(40000);
// var code = 'CAPCHA_NOT_READY';
// const repeat = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5];
// for (var t of repeat) {
//     const url_res = 'https://2captcha.com/res.php?key=' + key + '&action=get&id=' + id;
//     const res_res = await axios.get(url_res)
//     code = res_res.data;
//     console.log(">>>code", code)
//     await this.delay(10000);
//     if (code != 'CAPCHA_NOT_READY') {
//         break;
//     }
// }

// if (code != 'CAPCHA_NOT_READY' && code != 'ERROR_CAPTCHA_UNSOLVABLE') {
//     const v = code.substring(3);
//     await page.evaluate((v: any) => {
//         const inputField = document.querySelector('input[name="captchaUserResponseToken"]');
//         if (inputField) {
//             inputField['value'] = v;
//         }
//     }, v);
//     const formId = 'captcha-challenge';
//     await page.evaluate(async (formId: string) => {
//         const form = document.getElementById(formId) as HTMLFormElement | null;
//         if (form) {
//             form.submit();
//         }
//     }, formId);
//     await this.delay(2000);
//     return { page: page, success: true }
// } else {
//     return { page: page, success: false }
// }

// https://dashboard.capsolver.com/dashboard/overview