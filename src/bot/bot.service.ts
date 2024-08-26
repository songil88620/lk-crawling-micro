import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LinkedInAccountsService } from 'src/linked_in_accounts/linked_in_accounts.service';
import { LinkedInChatsService } from 'src/linked_in_chats/linked_in_chats.service';

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
import { SocketService } from 'src/socket/socket.service';
import { LinkedinLoginDataType } from 'src/type/linkedlogin.type';
import { Brackets } from 'typeorm';
import { PromptMultiService } from 'src/prompt_data/prompt_multi.service';
import { UserService } from 'src/user/user.service';
import { FirstmsgService } from 'src/firstmsg/firstmsg.service';
import { first } from 'rxjs';
import { ProxiesService } from 'src/proxies/proxies.service';
import { SystemService } from 'src/system/system.service';
import { LeadgenService } from 'src/leadgen/leadgen.service';
import { LeadgendataService } from 'src/leadgendata/leadgendata.service';
import { Leadgen } from 'src/type/leadgen.type';
import { Leadgendata } from 'src/type/leadgendata.type';

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin())
var ip = require('ip');
var process = require('process')


interface LinkedInBrowser {
    id: number, // linkedin account id
    page: any,
    browser: any
}

@Injectable()
export class BotService {

    private cached_linked_browser: LinkedInBrowser = { id: null, page: null, browser: null };
    private my_ip = "";
    private state = false;

    // captcha api key for bypassing captcha.... 
    private captcha_key = '';
    private daily_max = 500;

    public login_fail_notify = 0;
    public login_fail = 0;
    public prs_read_idx = 0;
    public prs_total_len = 0;
    public people_btn = false;

    public side_idx = 0;
    public start_time = 0;
    public notool_msg = 0;

    public lang = 0;

    private invite_count = 0;
    private current_page = 1;
    private more_invitation = true;
    private connection_count = 0;
    private more_connection = true;
    private withdraw_state = true;

    private collect_req = false;
    private collect_cpage = 0;
    private more_collect = true;
    private collect_count = 0;

    constructor(
        @Inject(forwardRef(() => ProspectionCampaignsService)) private prospectCampaignService: ProspectionCampaignsService,
        @Inject(forwardRef(() => LinkedInAccountsService)) private linkedinAccountService: LinkedInAccountsService,
        @Inject(forwardRef(() => ProspectsService)) private prospectsService: ProspectsService,
        @Inject(forwardRef(() => ProspectProspectionCampaignService)) private ppcService: ProspectProspectionCampaignService,
        @Inject(forwardRef(() => LinkedInChatsService)) private chatService: LinkedInChatsService,
        @Inject(forwardRef(() => PromptMultiService)) private promptService: PromptMultiService,
        @Inject(forwardRef(() => SocketService)) private socketService: SocketService,
        @Inject(forwardRef(() => UserService)) private userService: UserService,
        @Inject(forwardRef(() => FirstmsgService)) private firstmsgService: FirstmsgService,
        @Inject(forwardRef(() => ProxiesService)) private proxiesService: ProxiesService,
        @Inject(forwardRef(() => SystemService)) private systemService: SystemService,
        @Inject(forwardRef(() => LeadgenService)) private leadgenService: LeadgenService,
        @Inject(forwardRef(() => LeadgendataService)) private leadgendataService: LeadgendataService,
    ) {

    }

    async onModuleInit() {
        const sk = await this.systemService.findByKey('capkey');
        this.captcha_key = sk.value;
        this.my_ip = ip.address();
        const _now = new Date();
        const _h_now = _now.getHours();
        const ac: any = await this.prospectCampaignService.findMyCampaign(this.my_ip);
        if (ac) {
            this.start_time = Date.now();
            this.goToLinkedInFastMode(ac)
        }
    }

    handleCollect() {
        if (this.collect_req == false && this.more_collect == true && this.collect_count < 150) {
            this.collect_req = true;
            setTimeout(async () => {
                const leadgen: Leadgen = await this.leadgenService.get_one_ip(this.my_ip);
                this.goToCollectMode(leadgen);
            }, 10000)
        }
    }

    // run bot every 30 mins
    @Cron(CronExpression.EVERY_10_MINUTES, { name: 'campaign bot' })
    async runCampaign() {

        const _now = new Date();
        const _h_now = _now.getHours();
        const _m_now = _now.getMinutes();

        if (this.collect_req == true && this.more_collect == true && this.collect_count < 150) {
            const leadgen: Leadgen = await this.leadgenService.get_one_ip(this.my_ip);
            this.goToCollectMode(leadgen);
            return
        }

        if ((_h_now >= 6 && _h_now < 22 && this.login_fail <= 5)) {

            // 6:00~7:00 send invitation & follow message
            // 7:00~21:30 normal working
            // 21:30~22:00 withdraw invitation checking

            if (_h_now < 7 && this.invite_count < 100 && this.more_invitation == true) {
                const leadgen: Leadgen = await this.leadgenService.get_one_ip(this.my_ip);
                if (leadgen.status == 'active' && !this.isLoginOn()) {
                    this.goToInvitationSendingMode(leadgen)
                }
            } else if (_h_now == 21 && _m_now > 25 && this.withdraw_state == true) {
                const leadgen: Leadgen = await this.leadgenService.get_one_ip(this.my_ip);
                if (leadgen.status == 'active' && !this.isLoginOn()) {
                    this.goToPendingWithdrawMode(leadgen)
                }
            } else {
                this.people_btn = false;
                const ac: any = await this.prospectCampaignService.findMyCampaign(this.my_ip);
                console.log(",,,timer", this.isLoginOn(), this.isOver())
                if (ac && this.isOver() || !this.isLoginOn()) {
                    this.start_time = Date.now();
                    this.goToLinkedInFastMode(ac)
                }
            }

        } else {
            if (this.login_fail == 6 && this.login_fail_notify < 2) {
                const ac: any = await this.prospectCampaignService.findMyCampaign(this.my_ip);
                await this.prospectCampaignService.update({ c: { id: ac.id }, i: { warn: true } })
                await this.linkedinAccountService.updateLinkedWarn(ac.linked_in_account_id, true)
                const data = {
                    id: ac.id,
                    msg: {
                        type: 'warn',
                        data: ac.linked_in_account_id
                    }
                }
                await this.linkedinAccountService.updateLinkedCookies(ac.linked_in_account_id, '', '')
                this.socketService.messageToUser(data);
                this.login_fail_notify++;
            }
            const br = this.cached_linked_browser.browser;
            if (br) {
                br.close()
            }
            this.cached_linked_browser.browser = null;
            this.cached_linked_browser.page = null;
            this.prs_read_idx = 0;
        }

        if (!(_h_now >= 6 && _h_now < 22)) {
            const ts = Date.now();
            this.proxiesService.update(this.my_ip, false, ts)
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
            ip: this.my_ip,
            stamp: Math.floor(Date.now() / 1000)
        }
        this.socketService.loginstateToMother(data)
    }

    conf() {
        return {
            headless: 'new',
            // headless: false,
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
            // console.log(">>>err", e)
        }
    }

    async loginLinkedIn(login_data: LinkedinLoginDataType) {
        try {
            console.log(">>>login req...", login_data)
            const login_email = login_data.email;
            const login_password = login_data.password;
            const browser = await puppeteer.launch(this.conf());
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
            });
            await page.goto(`https://www.linkedin.com/`, { timeout: 0 });
            await page.waitForTimeout(2000);

            try {
                await page.type('#session_key', login_email);
                await page.type('#session_password', login_password);
                await page.click('button.sign-in-form__submit-btn--full-width');
            } catch (e) {
                await page.goto(`https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin`, { timeout: 0 });
                await page.waitForTimeout(2000);
                await page.type('#username', login_email);
                await page.type('#password', login_password);
                await page.click('button.from__button--floating');
            }

            console.log(">>>external login req...")

            await page.waitForTimeout(5000);
            this.msg_to_user(login_data.id, 'Processing...');
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
            await page.waitForTimeout(1000);
            console.log(">>here", page.url())

            if (page.url().includes('/feed/')) {
                const data = {
                    id: login_data.id,
                    msg: {
                        type: 'login_success',
                        data: ''
                    }
                }
                this.socketService.messageToUser(data)
                const cookiesSet = await page.cookies();
                var session_id = "";
                var li_at = "";
                cookiesSet.forEach((c: any) => {
                    if (c.name == 'JSESSIONID') {
                        session_id = c.value;
                    }
                    if (c.name == 'li_at') {
                        li_at = c.value;
                    }
                })
                await this.linkedinAccountService.updateLinkedCookies(login_data.id, li_at, session_id)
                return
            } else if (page.url().includes('checkpoint/challenge/')) {
                this.msg_to_user(login_data.id, 'Verification page loading...');
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

                    //auto bypass for puzzle
                    await page.waitForTimeout(1000);
                    const loops = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                    try {
                        for (var l of loops) {
                            await contentFrame_5.$(`#game_children_text`);
                            const src = await contentFrame_5.evaluate(() => {
                                const imgElement = document.querySelector('#game_challengeItem_image');
                                return imgElement ? imgElement['src'] : null;
                            });
                            const img = src.substring(23);
                            if (this.daily_max < 0) {
                                return
                            }
                            this.daily_max--;
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
                                // console.log(">>>res", res.data)
                                const idx = res.data.solution.objects[0] + 1;
                                // console.log(">>idx", idx)
                                await contentFrame_5.click('#image' + idx + ' > a');
                            }
                            await page.waitForTimeout(2000);
                            this.msg_to_user(login_data.id, 'Solved puzzle No.' + l + "...");
                        }
                    } catch (e) {
                        // console.log(">>bypass")
                    }
                    await page.waitForTimeout(3000);
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
                        const cookiesSet = await page.cookies();
                        var session_id = "";
                        var li_at = "";
                        cookiesSet.forEach((c: any) => {
                            if (c.name == 'JSESSIONID') {
                                session_id = c.value;
                            }
                            if (c.name == 'li_at') {
                                li_at = c.value;
                            }
                        })
                        await this.linkedinAccountService.updateLinkedCookies(login_data.id, li_at, session_id)
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
            } else {
                const data = {
                    id: login_data.id,
                    msg: {
                        type: 'login_failed',
                        data: 'Wrong email or password.'
                    }
                }
                this.socketService.messageToUser(data)
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
            const cookiesSet = await page.cookies();
            var session_id = "";
            var li_at = "";
            cookiesSet.forEach((c: any) => {
                if (c.name == 'JSESSIONID') {
                    session_id = c.value;
                }
                if (c.name == 'li_at') {
                    li_at = c.value;
                }
            })
            await this.linkedinAccountService.updateLinkedCookies(login_data.id, li_at, session_id)
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
                            if (this.daily_max < 0) {
                                return
                            }
                            this.daily_max--;
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
                                // console.log(">>>res", res.data)
                                const idx = res.data.solution.objects[0] + 1;
                                // console.log(">>idx", idx)
                                await contentFrame_5.click('#image' + idx + ' > a');
                            }
                            await page.waitForTimeout(4000);
                        }
                    } catch (e) {
                        // console.log(">>bypass")
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

    async internalLoginWithPw(email: string, pw: string) {
        const login_email = email;
        const login_password = pw;
        const browser = await puppeteer.launch(this.conf());
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        });
        // await page.authenticate({ username, password });
        await page.goto(`https://www.linkedin.com/`, { timeout: 0 });
        await page.waitForTimeout(2000);
        try {
            await page.type('#session_key', login_email);
            await page.type('#session_password', login_password);
            await page.click('button.sign-in-form__submit-btn--full-width');
        } catch (e) {
            await page.goto(`https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin`, { timeout: 0 });
            await page.waitForTimeout(2000);
            await page.type('#username', login_email);
            await page.type('#password', login_password);
            await page.click('button.from__button--floating');
        }

        await page.waitForTimeout(5000);

        if (this.cached_linked_browser.browser != null) {
            const browser_old = this.cached_linked_browser.browser;
            if (browser_old != null) {
                await browser_old.close();
            }
        }
        this.cached_linked_browser = {
            id: 1,
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
                    // console.log(">>session_id", session_id)
                }
                if (c.name == 'li_at') {
                    li_at = c.value;
                    // console.log(">>li_at", li_at)
                }
            })
            return { page: page, success: true }
        } else {
            // console.log(">>p..page.url()", page.url())
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
            // console.log(">> clicked...")
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
                // console.log(">>bypass")
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

    async internalLogin(linked_in_account: LinkedInAccountType) {
        console.log(">>>internal login...")
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
        try {
            await page.type('#session_key', login_email);
            await page.type('#session_password', login_password);
            await page.click('button.sign-in-form__submit-btn--full-width');
        } catch (e) {
            await page.goto(`https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin`, { timeout: 0 });
            await page.waitForTimeout(2000);
            await page.type('#username', login_email);
            await page.type('#password', login_password);
            await page.click('button.from__button--floating');
        }

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
        console.log(">>>internal login page 1...", page.url())
        await page.waitForTimeout(5000);
        if (page.url().includes('/feed/')) {
            // login success 
            const cookiesSet = await page.cookies();
            var session_id = "";
            var li_at = "";
            cookiesSet.forEach((c: any) => {
                if (c.name == 'JSESSIONID') {
                    session_id = c.value;
                    // console.log(">>session_id", session_id)
                }
                if (c.name == 'li_at') {
                    li_at = c.value;
                    // console.log(">>li_at", li_at)
                }
            })
            await this.linkedinAccountService.updateLinkedCookies(linked_in_account.id, li_at, session_id)
            return { page: page, success: true }
        } else {
            console.log(">>internal captcha", page.url())
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
            // console.log(">> clicked...")
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
                    if (this.daily_max < 0) {
                        return
                    }
                    this.daily_max--;
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
                console.log(">>internal bypass", e)
            }
            console.log(">>>internal login page 2...", page.url())

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

    async internalLoginWithCookie(linked_in_account: LinkedInAccountType) {
        const li_at = linked_in_account.li_at;
        const browser = await puppeteer.launch(this.conf());
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        });
        // await page.authenticate({ username, password });  

        await page.setCookie({
            name: 'li_at',
            value: li_at,
            domain: 'www.linkedin.com'
        })
        await page.goto(`https://www.linkedin.com/`, { timeout: 0 });
        console.log(">>>opened new page")
    }

    async goToCollectMode(leadgen: Leadgen) {
        console.log(">>>>collect mode")
        const lk_id = Number(leadgen.linked_in_account_id);
        const lk_account: LinkedInAccountType = await this.linkedinAccountService.findOneLinkdinAccountById(lk_id);
        const user_id = lk_account.user_id;
        const lg_id = leadgen.id;
        const mail = lk_account.email;
        const pw = lk_account.password;

        var mode = 'people'; //companies 
        const setting: any = JSON.parse(leadgen.setting)

        try {
            var my_page: any = null;
            if (this.cached_linked_browser.browser != null) {
                const page = await this.cached_linked_browser.page;
                await page.waitForTimeout(5000);
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
                    const res = await this.internalLoginWithPw(mail, pw);
                    if (res.success) {
                        my_page = res.page
                    } else {
                        return;
                    }
                }
            } else {
                const res = await this.internalLoginWithPw(mail, pw);
                if (res.success) {
                    my_page = res.page
                } else {
                    return;
                }
            }

            // linkedin account language check
            const u_name = await my_page.$('.global-nav__nav .global-nav__primary-items li:nth-child(1) a span')
            if (u_name) {
                var n = await (await u_name.getProperty('textContent')).jsonValue()
                const home = this.beautySpace(n);
                if (home == 'Home') {
                    this.lang = 0;
                } else if (home == 'Inicio') {
                    this.lang = 1;
                } else {

                }
            }

            await my_page.setViewport({
                width: 1920,
                height: 880,
                deviceScaleFactor: 1,
            });

            // const first_search_url = 'https://www.linkedin.com/search/results/people/?keywords=software engineer&network=["F","S","O"]&origin=FACETED_SEARCH';
            var first_search_url = this.parseSearchUrl(setting, mode, 1)

            await my_page.goto(first_search_url, { timeout: 0 });
            await my_page.waitForTimeout(5000);

            // scraping loop
            while (this.collect_count <= 150 && this.more_collect && this.isLoginOn) {
                var sid = 0;
                while (sid < 10) {
                    sid++;
                    try {
                        const list_item = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ')';

                        const is_more_item = await my_page.$(list_item) !== null
                        if (!is_more_item) {
                            this.more_collect = false;
                            this.collect_req = false;
                            continue;
                        }

                        await my_page.waitForSelector(list_item);
                        const has_btn = await my_page.evaluate((selector) => {
                            const div = document.querySelector(selector);
                            if (div) {
                                return div.querySelector('.artdeco-button') !== null;
                            }
                            return false;
                        }, list_item);

                        if (has_btn) {

                            // get detail of the member start
                            const avatar_tag = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .presence-entity__image'
                            const imageUrl = await my_page.$eval(`${avatar_tag}`, (img: any) => img.src);

                            const profile_sect = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') div';
                            const member_urn = await my_page.$eval(profile_sect, (el: any) => {
                                return el.getAttribute("data-chameleon-result-urn")
                            });
                            const member_id = member_urn.split(":")[3]

                            const subtitle_sect = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .entity-result__primary-subtitle'
                            const st = await my_page.$eval(`${subtitle_sect}`, (element: any) => element.innerHTML)
                            const subtitle = this.beautySpace(st).slice(7, -7)

                            const name_sect = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .app-aware-link span span:nth-child(1)'
                            const nm = await my_page.$eval(`${name_sect}`, (element: any) => element.innerHTML)
                            const full_name = this.beautySpace(nm).slice(7, -7)

                            const href = await my_page.$eval('.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .app-aware-link', (element: any) => element.href);

                            // get detail of the member end


                            // message, connect, follow button
                            const action_btn = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .artdeco-button';
                            await my_page.waitForSelector(action_btn);

                            // Message/Enviar mensaje, Connect/Conectar, 
                            const button_name = await my_page.evaluate((selector) => {
                                const button = document.querySelector(selector);
                                return button ? button.textContent.trim() : null;
                            }, action_btn);

                            if (button_name == 'Connect' || button_name == 'Conectar' || button_name == 'Follow' || button_name == 'Seguir' ) {
                                var btn = 'connect';
                                if(button_name == 'Follow' || button_name == 'Seguir'){
                                    btn = 'follow'
                                } 
                                const leadgendata: Leadgendata = {
                                    member_id,
                                    name: full_name,
                                    avatar: imageUrl,
                                    data: JSON.stringify({ subtitle }),
                                    status: 'collecting',
                                    f_stage: 0,
                                    updated_at: this.getTimestamp(),
                                    user_id,
                                    lg_id,
                                    urls: href,
                                    btn: btn
                                }
                                const res = await this.leadgendataService.create_new(leadgendata, 'collecting');
                                if (res) {
                                    this.collect_count++;
                                    const data = {
                                        id: lg_id,
                                        msg: {
                                            type: 'collecting',
                                            data: this.collect_count
                                        }
                                    }
                                    this.socketService.messageToUser(data)
                                }
                            }
                            console.log(">>>collect cnt", this.collect_count)
                        }

                        if (this.connection_count == 101) {
                            break;
                        }
                    } catch (e) {
                        console.log("...err", e)
                    }
                }
                this.collect_cpage++;
                const next_page_url = this.parseSearchUrl(setting, mode, this.collect_cpage);
                await my_page.goto(next_page_url, { timeout: 0 });
                await my_page.waitForTimeout(2000);
                sid = 0;
                console.log(">>>page number", this.collect_cpage);
            }
            this.collect_req = false;
            console.log(">>cant collect more...")

        } catch (e) {
            console.log(">>>error collecting", e)
        }
    }

    // linkedin invitation and follow up message mode
    async goToInvitationSendingMode(leadgen: Leadgen) {
        console.log(">>inv mode")
        const lk_id = Number(leadgen.linked_in_account_id);
        const lk_account: LinkedInAccountType = await this.linkedinAccountService.findOneLinkdinAccountById(lk_id);
        const user_id = lk_account.user_id;
        const lg_id = leadgen.id;
        const mail = lk_account.email;
        const pw = lk_account.password;

        var inv_message = leadgen.inv_message;
        const f1_message = leadgen.f1_message;
        var first_message = f1_message;
        var f2_message = '';
        var f3_message = '';
        const f1_block = leadgen.f1_block;
        const f2_block = leadgen.f2_block;
        const f3_block = leadgen.f3_block;
        const f1_delay = leadgen.f1_delay;
        const f2_delay = leadgen.f2_delay;
        const f3_dalay = leadgen.f3_delay;

        if (f1_block == false) {
            f2_message = leadgen.f2_message;
            first_message = f2_message;
            if (f2_block == false) {
                f3_message = leadgen.f3_message
                first_message = f3_message
            }
        }

        var mode = 'people'; //companies 
        const setting: any = JSON.parse(leadgen.setting)

        try {
            var my_page: any = null;
            if (this.cached_linked_browser.browser != null) {
                const page = await this.cached_linked_browser.page;
                await page.waitForTimeout(5000);
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
                    const res = await this.internalLoginWithPw(mail, pw);
                    if (res.success) {
                        my_page = res.page
                    } else {
                        return;
                    }
                }
            } else {
                const res = await this.internalLoginWithPw(mail, pw);
                if (res.success) {
                    my_page = res.page
                } else {
                    return;
                }
            }

            // linkedin account language check
            const u_name = await my_page.$('.global-nav__nav .global-nav__primary-items li:nth-child(1) a span')
            if (u_name) {
                var n = await (await u_name.getProperty('textContent')).jsonValue()
                const home = this.beautySpace(n);
                if (home == 'Home') {
                    this.lang = 0;
                } else if (home == 'Inicio') {
                    this.lang = 1;
                } else {

                }
            }

            await my_page.setViewport({
                width: 1920,
                height: 880,
                deviceScaleFactor: 1,
            });

            // const first_search_url = 'https://www.linkedin.com/search/results/people/?keywords=software engineer&network=["F","S","O"]&origin=FACETED_SEARCH';
            var first_search_url = this.parseSearchUrl(setting, mode, 1)

            await my_page.goto(first_search_url, { timeout: 0 });
            await my_page.waitForTimeout(5000);

            // sending invitation loop
            while (this.invite_count < 100 && this.more_invitation && this.isLoginOn) {
                var sid = 0;
                while (sid < 10) {
                    sid++;
                    try {
                        const list_item = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ')';

                        const is_more_item = await my_page.$(list_item) !== null
                        if (!is_more_item) {
                            this.more_invitation = false;
                            continue;
                        }

                        await my_page.waitForSelector(list_item);
                        const has_btn = await my_page.evaluate((selector) => {
                            const div = document.querySelector(selector);
                            if (div) {
                                return div.querySelector('.artdeco-button') !== null;
                            }
                            return false;
                        }, list_item);

                        if (has_btn) {
                            console.log("has btn")

                            // get detail of the member start
                            const avatar_tag = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .presence-entity__image'
                            const imageUrl = await my_page.$eval(`${avatar_tag}`, (img: any) => img.src);

                            const profile_sect = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') div';
                            const member_urn = await my_page.$eval(profile_sect, (el: any) => {
                                return el.getAttribute("data-chameleon-result-urn")
                            });
                            const member_id = member_urn.split(":")[3]

                            const subtitle_sect = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .entity-result__primary-subtitle'
                            const st = await my_page.$eval(`${subtitle_sect}`, (element: any) => element.innerHTML)
                            const subtitle = this.beautySpace(st).slice(7, -7)

                            const name_sect = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .app-aware-link span span:nth-child(1)'
                            const nm = await my_page.$eval(`${name_sect}`, (element: any) => element.innerHTML)
                            const full_name = this.beautySpace(nm).slice(7, -7)
                            // get detail of the member end


                            // message, connect, follow button
                            const action_btn = '.reusable-search__entity-result-list .reusable-search__result-container:nth-child(' + sid + ') .artdeco-button';
                            await my_page.waitForSelector(action_btn);

                            // Message/Enviar mensaje, Connect/Conectar, 
                            const button_name = await my_page.evaluate((selector) => {
                                const button = document.querySelector(selector);
                                return button ? button.textContent.trim() : null;
                            }, action_btn);

                            if (button_name == 'Connect' || button_name == 'Conectar') {
                                // click connect button of the list item
                                await my_page.click(action_btn);
                                await my_page.waitForTimeout(500);

                                // check if add_note button exist or not and if there is modal, need to close it
                                const addnote = '.artdeco-modal .artdeco-modal__actionbar .artdeco-button:nth-child(1)';
                                const is_addnote = await my_page.$(addnote) !== null

                                if (!is_addnote) {
                                    const clos_btn = '.upsell-modal .artdeco-modal__dismiss';
                                    await my_page.waitForSelector(clos_btn);
                                    await my_page.click(clos_btn);
                                    continue;
                                }

                                // click addnote button of the modal
                                // const addnote = '.artdeco-modal .artdeco-modal__actionbar .artdeco-button:nth-child(1)';
                                await my_page.waitForSelector(addnote);
                                await my_page.click(addnote);

                                const inv_msg_box = '.artdeco-modal #custom-message';
                                const is_msgbox = await my_page.$(inv_msg_box) !== null

                                if (!is_msgbox) {
                                    const clos_btn = '.upsell-modal .artdeco-modal__dismiss';
                                    await my_page.waitForSelector(clos_btn);
                                    await my_page.click(clos_btn);
                                    await my_page.waitForTimeout(500);

                                    // if there is no message box, need to open modal again and click 'send without a note'
                                    await my_page.click(action_btn);
                                    await my_page.waitForTimeout(500);
                                    const send_without_note = '.artdeco-modal .artdeco-modal__actionbar .artdeco-button:nth-child(2)';
                                    await my_page.waitForSelector(send_without_note);
                                    await my_page.click(send_without_note);

                                    const leadgendata: Leadgendata = {
                                        member_id,
                                        name: full_name,
                                        avatar: imageUrl,
                                        data: JSON.stringify({ subtitle }),
                                        status: 'pending',
                                        f_stage: 0,
                                        updated_at: this.getTimestamp(),
                                        user_id,
                                        lg_id,
                                        urls:'',
                                        btn:''
                                    }
                                    await this.leadgendataService.create_new(leadgendata, 'pending');
                                    this.invite_count++;
                                    await this.leadgenService.increase_quee(lg_id, 0)
                                    continue;
                                }

                                // type invitation message on note                                
                                await my_page.waitForTimeout(1000);
                                const message_box = await my_page.waitForSelector(inv_msg_box);
                                if (message_box) {
                                    await my_page.focus(inv_msg_box)
                                }
                                await my_page.keyboard.type(inv_message, { delay: 5 });
                                await my_page.waitForTimeout(1000);

                                const sendconnect = '.artdeco-modal .artdeco-modal__actionbar .artdeco-button:nth-child(2)';
                                await my_page.waitForSelector(sendconnect);
                                await my_page.click(sendconnect);

                                const leadgendata: Leadgendata = {
                                    member_id,
                                    name: full_name,
                                    avatar: imageUrl,
                                    data: JSON.stringify({ subtitle }),
                                    status: 'pending',
                                    f_stage: 0,
                                    updated_at: this.getTimestamp(),
                                    user_id,
                                    lg_id,
                                    urls:'',
                                    btn:''
                                }
                                await this.leadgendataService.create_new(leadgendata, 'pending');
                                this.invite_count++;
                                await this.leadgenService.increase_quee(lg_id, 0)
                                console.log(">>invit", this.invite_count)
                            }
                        }
                    } catch (e) {
                        console.log("...err", e)
                    }
                }
                this.current_page++;
                const next_page_url = this.parseSearchUrl(setting, mode, this.current_page);
                await my_page.goto(next_page_url, { timeout: 0 });
                await my_page.waitForTimeout(2000);
                sid = 0;
                console.log(">>>page number", this.current_page);
            }
            console.log(">>cant send more...")

            // checking connection state loop
            const connection_url = 'https://www.linkedin.com/mynetwork/invite-connect/connections/';
            await my_page.goto(connection_url, { timeout: 0 });
            await my_page.waitForTimeout(10000);

            while (this.more_connection && this.isLoginOn) {
                this.connection_count++;
                try {
                    if (my_page.url() != connection_url) {
                        await my_page.goto(connection_url, { timeout: 0 });
                        await my_page.waitForTimeout(5000);
                    }

                    await my_page.waitForTimeout(1000);
                    const list_item = '.scaffold-finite-scroll__content .artdeco-list:nth-child(' + this.connection_count + ')';

                    //check if there are more list items
                    const is_more_item = await my_page.$(list_item) !== null
                    if (!is_more_item) {
                        this.more_connection = false;
                        continue;
                    }

                    // get detail of the member start
                    const avatar_tag = '.scaffold-finite-scroll__content .artdeco-list:nth-child(' + this.connection_count + ') .presence-entity__image'
                    const imageUrl = await my_page.$eval(`${avatar_tag}`, (img: any) => img.src);
                    const full_name = await my_page.$eval(`${avatar_tag}`, (img: any) => img.alt);

                    const action_btn = '.scaffold-finite-scroll__content .artdeco-list:nth-child(' + this.connection_count + ') .artdeco-button';
                    await my_page.waitForSelector(action_btn);
                    await my_page.click(action_btn);
                    await my_page.waitForTimeout(2000);

                    // read message from message box
                    await my_page.waitForTimeout(2000);
                    const msgs = await my_page.$$('li.msg-s-message-list__event')

                    var messages: MessageType[] = []
                    var date = '';
                    var time = '';
                    var name = '';
                    var user_name: any = '';
                    const u_name = await my_page.$('.msg-overlay-bubble-header .msg-overlay-bubble-header__title span')
                    if (u_name) {
                        var n = await (await u_name.getProperty('textContent')).jsonValue()
                        user_name = this.beautySpace(n);
                    }

                    const first_name = user_name.split(" ")[0];
                    const last_name = user_name.split(" ")[1];

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

                        const b_date = this.beautyDate(this.beautySpace(date), this.beautySpace(time), this.lang);
                        const _msg = this.beautySpace(msg_text.replace(/\+/g, ''));

                        const msg_data: MessageType = {
                            createdAt: b_date['date'],
                            role: this.beautySpace(name) == user_name ? 'user' : 'assistant',
                            content: _msg
                        }
                        messages.push(msg_data);
                    }

                    console.log(">>msg", messages)

                    // check message deliveryed state
                    var replied = false;
                    var f1_sent = false;
                    var f2_sent = false;
                    var f3_sent = false;
                    var first_sent = false;
                    messages.forEach((m: MessageType) => {
                        if (m.role == 'user') {
                            replied = true
                        }
                        if (m.role == 'assistant') {
                            if (m.content == first_message) {
                                first_sent = true;
                            }
                            if (m.content == f1_message) {
                                f1_sent = true
                            }
                            if (m.content == f2_message) {
                                f2_sent = true
                            }
                            if (m.content == f3_message) {
                                f3_sent = true
                            }
                        }
                    })

                    // clear old placeholder message  
                    await my_page.waitForSelector('.msg-form__contenteditable');
                    await my_page.focus('.msg-form__contenteditable');
                    await my_page.keyboard.down('Control');
                    await my_page.keyboard.press('KeyA');
                    await my_page.keyboard.up('Control');
                    await my_page.keyboard.press('Backspace');
                    await my_page.waitForTimeout(200);

                    if (replied) {
                        if (first_sent == false) {
                            first_message = first_message.replace('{FirstName}', first_name).replace(/(\r\n|\n|\r)/gm, " ").replace(/ {2,}/g, " ")
                            await my_page.keyboard.type(first_message, { delay: 100 });
                            await my_page.waitForTimeout(500);
                            try {
                                await my_page.click('button.msg-form__send-button');
                            } catch (e) {
                                await my_page.click('button.msg-form__send-btn');
                            }
                            console.log(">>send first msg action...", first_message)
                        }
                        await this.leadgendataService.update_status_by_name(full_name, 'replied', lg_id)
                    } else {
                        var msg = '';
                        if (f1_sent == false) {
                            if (messages.length == 0) {
                                msg = f1_message;
                                await this.leadgenService.increase_quee(lg_id, 1)
                            } else {
                                if (this.isNowAfter(f1_delay * 24, messages[0].createdAt)) {
                                    msg = f1_message;
                                    await this.leadgenService.increase_quee(lg_id, 1)
                                }
                            }
                        } else if (f2_sent == false) {
                            if (this.isNowAfter(f2_delay * 24, messages[messages.length - 1].createdAt)) {
                                msg = f2_message;
                                await this.leadgenService.increase_quee(lg_id, 2)
                            }
                        } else if (f3_sent == false) {
                            if (this.isNowAfter(f3_dalay * 24, messages[messages.length - 1].createdAt)) {
                                msg = f3_message;
                                await this.leadgenService.increase_quee(lg_id, 3)
                            }
                        } else {

                        }
                        if (msg != '') {
                            msg = msg.replace('{FirstName}', first_name).replace(/(\r\n|\n|\r)/gm, " ").replace(/ {2,}/g, " ")
                            await my_page.keyboard.type(msg, { delay: 100 });
                            await my_page.waitForTimeout(500);
                            try {
                                await my_page.click('button.msg-form__send-button');
                            } catch (e) {
                                await my_page.click('button.msg-form__send-btn');
                            }
                            console.log(">>>msg", msg)
                        }
                        await this.leadgendataService.update_status_by_name(full_name, 'accepted', lg_id)
                    }

                    // close message box for next
                    try {
                        const close_btn = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                        await my_page.waitForSelector(close_btn);
                        await my_page.click(close_btn);
                    } catch (e) {

                    }
                    await my_page.waitForTimeout(500);
                } catch (e) {
                    console.log(">>err", e)
                }
            }
            console.log(">>>>check connectioin end")
        } catch (e) {
            console.log(">>>error invitation", e)
        }
    }

    // linkedin invitation pending withdraw mode
    async goToPendingWithdrawMode(leadgen: Leadgen) {
        const lk_id = Number(leadgen.linked_in_account_id);
        const lk_account: LinkedInAccountType = await this.linkedinAccountService.findOneLinkdinAccountById(lk_id);
        const user_id = lk_account.user_id;
        const lg_id = leadgen.id;

        const mail = lk_account.email;
        const pw = lk_account.password;

        try {

            var my_page: any = null;
            if (this.cached_linked_browser.browser != null) {
                const page = await this.cached_linked_browser.page;
                await page.waitForTimeout(5000);
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
                    const res = await this.internalLoginWithPw(mail, pw);
                    if (res.success) {
                        my_page = res.page
                    } else {
                        return;
                    }
                }
            } else {
                const res = await this.internalLoginWithPw(mail, pw);
                if (res.success) {
                    my_page = res.page
                } else {
                    return;
                }
            }

            // check linkedin account language mode
            const u_name = await my_page.$('.global-nav__nav .global-nav__primary-items li:nth-child(1) a span')
            if (u_name) {
                var n = await (await u_name.getProperty('textContent')).jsonValue()
                const home = this.beautySpace(n);
                if (home == 'Home') {
                    this.lang = 0;
                } else if (home == 'Inicio') {
                    this.lang = 1;
                } else {

                }
            }

            // ---------- linkedin has already logged in and start to work from now ----------
            // check the messages from the right sidebar and read new message one by one after click them. 
            await my_page.setViewport({
                width: 1920,
                height: 880,
                deviceScaleFactor: 1,
            });

            // checking withdraw state loop
            const withdraw_url = 'https://www.linkedin.com/mynetwork/invitation-manager/sent/';
            await my_page.goto(withdraw_url, { timeout: 0 });
            await my_page.waitForTimeout(10000);

            var withdarw_count = 0;
            while (this.withdraw_state) {
                withdarw_count++;
                try {
                    if (my_page.url() != withdraw_url) {
                        await my_page.goto(withdraw_url, { timeout: 0 });
                        await my_page.waitForTimeout(5000);
                    }
                    await my_page.waitForTimeout(1000);
                    const list_item = '.mn-invitation-list .artdeco-list__item:nth-child(' + withdarw_count + ')';

                    //check if there are more list items
                    const is_more_item = await my_page.$(list_item) !== null
                    if (!is_more_item) {
                        this.withdraw_state = false;
                        continue;
                    }

                    const name_sect = '.mn-invitation-list .artdeco-list__item:nth-child(' + withdarw_count + ') .app-aware-link .app-aware-link'
                    const nm = await my_page.$eval(`${name_sect}`, (element: any) => element.innerHTML)
                    const w_name = this.beautySpace(nm).slice(7, -7)

                    const time_sect = '.mn-invitation-list .artdeco-list__item:nth-child(' + withdarw_count + ') .time-badge';
                    var tm = await my_page.$eval(`${time_sect}`, (element: any) => element.innerHTML)
                    tm = this.beautySpace(tm)
                    console.log(">>tm", tm, this.lang)

                    const en_date = tm.split(' ')[2]
                    const es_date = tm.split(' ')[tm.split(' ').length - 1];
                    if (en_date == 'month' || en_date == 'months' || es_date == 'mes') {
                        // withdraw now
                        console.log(">>withdraw")
                        const action_btn = '.mn-invitation-list .artdeco-list__item:nth-child(' + withdarw_count + ') .artdeco-button';
                        await my_page.waitForSelector(action_btn);
                        await my_page.click(action_btn);
                        await my_page.waitForTimeout(500);

                        const withdarw_btn = '.artdeco-modal .artdeco-modal__actionbar .artdeco-button:nth-child(2)';
                        const is_wbtn = await my_page.$(withdarw_btn) !== null

                        if (is_wbtn) {
                            await my_page.waitForSelector(withdarw_btn);
                            await my_page.click(withdarw_btn);
                            withdarw_count--;
                            await this.leadgendataService.update_status_by_name(w_name, 'withdrawed', lg_id)
                        }
                    }

                } catch (e) {
                    console.log(">>er", e)
                }
            }
            console.log(">>>>withdraw is ended for today...")
        } catch (e) {
            console.log(">>>error withdraw", e)
        }
    }

    // if (page.url().includes('/feed/') || page.url().includes('/in/')) {
    // long mode checks over 100 messages from the sidebar neither that has new message badge or not.
    async goToLinkedInFastMode(ac: CampaignType) {
        await this.linkedinAccountService.updateLinkedWarn(ac.linked_in_account_id, false)
        await this.prospectCampaignService.update({ c: { id: ac.id }, i: { warn: false } })
        const campaign_id = ac.id;
        const linked_in_account_id = ac.linked_in_account_id;
        try {
            const linked_in_account: LinkedInAccountType = await this.linkedinAccountService.findOneLinkdinAccountById(linked_in_account_id);

            var my_page: any = null;
            if (this.cached_linked_browser.browser != null) {
                const page = await this.cached_linked_browser.page;
                await page.waitForTimeout(5000);
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
                    console.log(">>login res_1", res)
                    if (res.success) {
                        my_page = res.page
                    } else {
                        return;
                    }
                }
            } else {
                const res = await this.internalLogin(linked_in_account);
                console.log(">>login res_2", res)
                if (res.success) {
                    my_page = res.page
                } else {
                    return;
                }
            }

            const u_name = await my_page.$('.global-nav__nav .global-nav__primary-items li:nth-child(1) a span')
            if (u_name) {
                var n = await (await u_name.getProperty('textContent')).jsonValue()
                const home = this.beautySpace(n);
                if (home == 'Home') {
                    this.lang = 0;
                } else if (home == 'Inicio') {
                    this.lang = 1;
                } else {

                }
            }

            // ---------- linkedin has already logged in and start to work from now ----------
            // check the messages from the right sidebar and read new message one by one after click them. 
            await my_page.setViewport({
                width: 1920,
                height: 880,
                deviceScaleFactor: 1,
            });

            await my_page.mouse.move(1800, 750);
            await my_page.waitForTimeout(500);
            // await this.sideListScroll(my_page, 1500);   

            const elementHandle = await my_page.$('.msg-overlay-list-bubble-search');
            if (elementHandle) {
                // console.log(">>message list is openned state")
            } else {
                // console.log(">>need to open the message list")
                try {
                    const close_btn_msgbox = '.msg-overlay-bubble-header__controls button:last-child';
                    await my_page.waitForSelector(close_btn_msgbox);
                    await my_page.click(close_btn_msgbox);
                    await this.delay(1500) 
                } catch (e) {
                    console.log(">>>component error 1664:", e)
                } 
                try {
                    const elementHandle2 = await my_page.$('.msg-overlay-list-bubble-search');
                    if (elementHandle2) {
                        console.log(">>>openned message list")
                    } else {
                        console.log(">>>can't open message list")
                    }
                } catch (e) {
                    console.log(">>>component error 1674")
                }
            }

            // scroll down to get the last 80 messages
            var time_out = false;
            var new_msg_count = 0;
            while (!time_out && this.collect_req == false) {
                if (this.isOver() || !this.isLoginOn()) {
                    time_out = true
                    console.log(">>time out or logout")
                    break;
                }
                this.side_idx = this.side_idx + 1;
                var sid = this.side_idx;
                if (this.side_idx % 13 == 0) {
                    console.log(">>rest a bit to reduce the RAM load")
                    await this.delay(10000)
                }
                if (this.side_idx % 80 == 0) {
                    if (new_msg_count == 0) {
                        await my_page.reload();
                        await this.delay(5000)
                    }
                    this.side_idx = this.side_idx - 1;
                    new_msg_count++;
                    sid = new_msg_count;
                    if (new_msg_count == 10) {
                        new_msg_count = 0;
                        this.side_idx = this.side_idx + 1;
                    }
                    continue;
                }

                try {
                    console.log(">>sid, IDX: ", sid, this.side_idx, my_page.url())
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
                        // console.log(">>>error on close message boxes")
                    }



                    // click item from list  
                    try {

                        // to debug class
                        // const elementHandle3 = await my_page.$('.msg-overlay-list-bubble__content--scrollable');
                        // if (elementHandle3) {
                        //     console.log(">>>>333 here")
                        //     const componentHTML = await my_page.evaluate(element => element.outerHTML, elementHandle3);
                        //     const componentClass = await my_page.evaluate(element => element.className, elementHandle3);
                        //     console.log('Component HTML:', componentHTML);
                        //     console.log('Component Class:', componentClass);

                        // } else {
                        //     console.log(">>>333 not exist")
                        // }

                        const new_comp = await my_page.$('.msg-overlay-list-bubble__default-conversation-container .entry-point:nth-child(' + sid + ')');
                        if (new_comp) {
                            const item = '.msg-overlay-list-bubble__default-conversation-container .entry-point:nth-child(' + sid + ')';
                            await my_page.waitForSelector(item);
                            await my_page.click(item);
                        } else {
                            const item = '.msg-overlay-list-bubble__default-conversation-container .msg-conversation-listitem__link:nth-child(' + sid + ')';
                            await my_page.waitForSelector(item);
                            await my_page.click(item);
                        }   

                    } catch (e) {
                        console.log(">>here 784", e)
                        var sc_count = Math.floor(this.side_idx / 10);
                        while (sc_count > 0) {
                            sc_count--;
                            await this.sideListScroll(my_page, 1500);
                        }
                        this.side_idx = this.side_idx - 1;
                        continue;
                    }

                    console.log(">>stopped")

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

                    const first_name = user_name.split(" ")[0];
                    const last_name = user_name.split(" ")[1];

                    const f_msgs = await this.firstmsgService.get_first_msg(ac.id)

                    var first_msgs = [];
                    f_msgs.forEach((f: any) => {
                        const fm = f.replace('{FirstName}', first_name).replace(/(\r\n|\n|\r)/gm, " ").replace(/ {2,}/g, " ")
                        first_msgs.push(fm)
                    })

                    // const first_msg = ac.first_message.replace('{FirstName}', first_name).replace(/(\r\n|\n|\r)/gm, " ").replace(/ {2,}/g, " ")

                    var member_id = null;
                    try {
                        var campaign_msg = false;
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

                            const b_date = this.beautyDate(this.beautySpace(date), this.beautySpace(time), this.lang);
                            const _msg = this.beautySpace(msg_text.replace(/\+/g, ''));

                            if (first_msgs.includes(_msg)) {
                                campaign_msg = true;
                            }
                            if (campaign_msg) {
                                const msg_data: MessageType = {
                                    createdAt: b_date['date'],
                                    role: this.beautySpace(name) == user_name ? 'user' : 'assistant',
                                    content: _msg
                                }
                                messages.push(msg_data);
                            }
                        }

                        await this.msgBoxScroll(my_page, 3)

                        // open profile to get member id 
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
                        // console.log(">>member id", member_id)
                    } catch (e) {
                        // console.log("sth went wrong 777")
                    }

                    const profile_url = my_page.url();
                    // check prospect data, if not exist the tool create a prospect for the next usage.
                    await this.prospectsService.checkProspect(member_id, first_name, last_name, profile_url);

                    // check message state for next step   
                    console.log(">>messages")

                    // if (messages.length > 0 && first_msg == messages[0].content) {
                    if (messages.length > 0 && first_msgs.includes(messages[0].content)) {

                        var linked_in_chat: LinkedInChatType = await this.getChat_mid_c_id(member_id, campaign_id);

                        if (linked_in_chat == null) {
                            console.log(">>open message")
                            // open message

                            var st = false;
                            messages.forEach((m) => {
                                if (m.role == 'user') {
                                    st = true;
                                }
                            })
                            const status = st ? ChatStatus.INPROGRESS : ChatStatus.OPENING
                            const new_linked_in_chat: LinkedInChatType = {
                                id: 0,
                                chat_history: JSON.stringify(messages),
                                prospect_id: member_id,
                                prospection_campaign_id: ac.id,
                                chat_status: status,
                                linked_in_chat_urn: my_page.url(),
                                first_message_urn: "",
                                automatic_answer: true,
                                requires_human_intervention: false,
                                follow_up_count: 0,
                                updated_at: this.getTimestamp(),
                                created_at: this.getTimestamp(),
                                hi_chats: '',
                                hi_get: 0,
                                err_msg: '',
                                follow_up_state: 0
                            }
                            await this.chatService.createNewChat(new_linked_in_chat);

                        } else {
                            if (messages[messages.length - 1].role == 'user') {
                                const new_message = {
                                    member_id,
                                    messages
                                }
                                try {

                                    var hi_chats: MessageType[] = [];
                                    if (linked_in_chat.hi_chats != null && linked_in_chat.hi_chats != '') {
                                        hi_chats = JSON.parse(linked_in_chat.hi_chats);
                                    }

                                    // normal case
                                    if (linked_in_chat != null &&
                                        linked_in_chat.automatic_answer &&
                                        (linked_in_chat.chat_status != ChatStatus.ACCEPTED && linked_in_chat.chat_status != ChatStatus.REJECTED)
                                    ) {
                                        if (hi_chats.length == 0) {
                                            const prospect: ProspectType = await this.prospectsService.findProspectByMemberId(new_message.member_id);
                                            await this.sendCoreMessage(linked_in_chat, prospect, new_message.messages, linked_in_account, ac)
                                        }
                                    }

                                    // human intervention case

                                    if ((linked_in_chat != null && linked_in_chat.requires_human_intervention) || (hi_chats != null && hi_chats.length > 0)) {
                                        const prospect: ProspectType = await this.prospectsService.findProspectByMemberId(new_message.member_id);
                                        var db_chats: MessageType[] = JSON.parse(linked_in_chat.chat_history);
                                        var tmp_hi: MessageType[] = JSON.parse(linked_in_chat.hi_chats);
                                        if (new_message.messages.length != db_chats.length) {
                                            const hi_get = new_message.messages.length - db_chats.length;
                                            linked_in_chat.hi_get = Number(linked_in_chat.hi_get) + hi_get;
                                            linked_in_chat.chat_history = JSON.stringify(new_message.messages);
                                            linked_in_chat.updated_at = this.getTimestamp();
                                            this.chatService.updateChatOne(linked_in_chat);
                                        }

                                        if (hi_chats.length > 0) {
                                            for (var hc of hi_chats) {
                                                const res = await this.sendMessageAtLinkedIn(prospect, linked_in_account, hc.content);
                                                console.log(">>send hi chat... user", hc.content)
                                                if (res) {
                                                    tmp_hi.shift();
                                                    db_chats.push(hc);
                                                    linked_in_chat.err_msg = '';
                                                    linked_in_chat.chat_history = JSON.stringify(db_chats);
                                                    linked_in_chat.hi_chats = JSON.stringify(tmp_hi);
                                                    linked_in_chat.updated_at = this.getTimestamp();
                                                    this.chatService.updateChatOne(linked_in_chat);
                                                } else {
                                                    linked_in_chat.err_msg = 'Error occured while sending message from linkedin account'
                                                    linked_in_chat.updated_at = this.getTimestamp();
                                                    this.chatService.updateChatOne(linked_in_chat);
                                                }
                                            }
                                        }
                                    }

                                } catch (e) {
                                    // console.log(">>err occured while replying for new message")
                                }
                            }
                            // follow, inquring, ... 
                            else {
                                const new_message = {
                                    member_id,
                                    messages
                                }
                                console.log(">>>member_id", member_id, campaign_id)
                                // var chat = await this.chatService.getChatByMidCid(member_id, campaign_id);
                                try {

                                    var hi_chats: MessageType[] = [];
                                    if (linked_in_chat.hi_chats != null && linked_in_chat.hi_chats != '') {
                                        hi_chats = JSON.parse(linked_in_chat.hi_chats);
                                    }

                                    if (linked_in_chat.automatic_answer) {
                                        if (linked_in_chat.chat_status == ChatStatus.OPENING || linked_in_chat.chat_status == ChatStatus.INQUIRING || linked_in_chat.chat_status == ChatStatus.UNANSWERED || linked_in_chat.chat_status == ChatStatus.NOANSWERED) {
                                            // inquiring and follow type 4 message section
                                            const prospect_id = linked_in_chat.prospect_id;
                                            const prospect: ProspectType = await this.prospectsService.findProspectById(prospect_id);
                                            var res = false;
                                            if (linked_in_chat.chat_status == ChatStatus.OPENING || linked_in_chat.chat_status == ChatStatus.INQUIRING) {
                                                // console.log(">>>send inquiring message")
                                                res = await this.sendInquiringMessage(linked_in_chat, linked_in_account, prospect);
                                            } else {
                                                // console.log(">>>>>send follow4 message")
                                                res = await this.sendFollow4Message(linked_in_chat, linked_in_account, prospect);
                                            }
                                            // console.log(">>RES..", res)
                                        } else {
                                            // normal follow type section
                                            if (hi_chats.length == 0) {
                                                const prospect_id = linked_in_chat.prospect_id;
                                                const prospect: ProspectType = await this.prospectsService.findProspectById(prospect_id);
                                                const lastestChat = JSON.parse(linked_in_chat.chat_history);
                                                const require_follow_up = this.getFollowUpStatus(lastestChat, linked_in_chat);
                                                if (require_follow_up && linked_in_chat.follow_up_count < 4) {
                                                    // console.log(">>>send follow up message")
                                                    const res = await this.sendFollowUpMessage(linked_in_chat, linked_in_account, prospect, campaign_id)
                                                }
                                            }
                                        }
                                    }


                                    // human intervention case  
                                    if ((linked_in_chat != null && linked_in_chat.requires_human_intervention) || (hi_chats != null && hi_chats.length > 0)) {
                                        const prospect: ProspectType = await this.prospectsService.findProspectByMemberId(new_message.member_id);
                                        var db_chats: MessageType[] = JSON.parse(linked_in_chat.chat_history);
                                        var tmp_hi: MessageType[] = JSON.parse(linked_in_chat.hi_chats);

                                        if (new_message.messages.length != db_chats.length) {
                                            linked_in_chat.chat_history = JSON.stringify(new_message.messages);
                                            linked_in_chat.updated_at = this.getTimestamp();
                                            this.chatService.updateChatOne(linked_in_chat);
                                        }

                                        if (hi_chats.length > 0) {
                                            for (var hc of hi_chats) {
                                                const res = await this.sendMessageAtLinkedIn(prospect, linked_in_account, hc.content);
                                                console.log(">>send hi chat...follow", hc.content)
                                                if (res) {
                                                    tmp_hi.shift();
                                                    db_chats.push(hc);
                                                    linked_in_chat.err_msg = '';
                                                    linked_in_chat.chat_history = JSON.stringify(db_chats);
                                                    linked_in_chat.hi_chats = JSON.stringify(tmp_hi);
                                                    linked_in_chat.updated_at = this.getTimestamp();
                                                    this.chatService.updateChatOne(linked_in_chat);
                                                } else {
                                                    linked_in_chat.err_msg = 'Error occured while sending message from linkedin account';
                                                    linked_in_chat.updated_at = this.getTimestamp();
                                                    this.chatService.updateChatOne(linked_in_chat);
                                                }
                                            }
                                        }
                                    }

                                } catch (e) {
                                    console.log("...", e)
                                }
                            }
                        }
                        this.notool_msg = 0;
                    } else {
                        this.notool_msg = this.notool_msg + 1;
                        if (this.notool_msg == 90) {
                            this.notool_msg = 0;
                            this.side_idx = 0;
                        }
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

                    await my_page.waitForTimeout(1000);
                } catch (e) {
                    console.log(">>ERR", e)
                }
            }
            if (!this.isLoginOn()) {
                // console.log(">>>>>>RE login")
                this.goToLinkedInFastMode(ac)
            }
        } catch (e) {
            console.log(">>>error 889", e)
        }
    }


    async sendFollowUpMessage(linked_in_chat: LinkedInChatType, linked_in_account: LinkedInAccountType, prospect: ProspectType, ac_id: number) {
        try {
            const user_id = linked_in_account.user_id;
            const prompt_data = await this.promptService.findOne(user_id);
            var messages: MessageType[] = JSON.parse(linked_in_chat.chat_history);
            const lastMessage = messages[messages.length - 1].content;
            const first_msg = messages[0];
            var answer: MessageType = {
                role: 'assistant',
                content: '',
                createdAt: this.getTimestamp()
            }
            if (linked_in_chat.follow_up_count == 3) {
                if (prompt_data.q_11_1 == "" && prompt_data.q_11_2 != "") {
                    answer.content = "Puede que ahora no sea tu momento. De momento te dejo este regalo.\n. Abrazo! Ver regalo aquí: " + prompt_data.q_11_2 + "\n He pensado que podría ser de tu interés. \n Y si cambias de opinión, no dudes en ponerte en contacto conmigo. \nAbrazo!";
                } else if (prompt_data.q_11_1 == "" && prompt_data.q_11_2 == "") {
                    answer.content = "Puede que ahora no sea tu momento.\n Si cambias de opinión, no dudes en ponerte en contacto conmigo. \nAbrazo!";
                } else {
                    answer.content = "Puede que ahora no sea tu momento. De momento te dejo este regalo: " + prompt_data.q_11_1 + "\n. Abrazo! Ver regalo aquí: " + prompt_data.q_11_2 + "\n He pensado que podría ser de tu interés. \n Y si cambias de opinión, no dudes en ponerte en contacto conmigo. \nAbrazo!";
                }
                linked_in_chat.automatic_answer = true;
                // send inquire message at the linkedin browser 
                const send_success = await this.sendMessageAtLinkedIn(prospect, linked_in_account, answer.content)
                if (send_success) {
                    linked_in_chat.follow_up_count = 4;
                    messages.push(answer);
                    linked_in_chat.chat_history = JSON.stringify(messages);
                    linked_in_chat.updated_at = this.getTimestamp();
                    linked_in_chat.chat_status = ChatStatus.STANDBY;
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

            var link = 'https://app.aippointing.com/schedule?p=' + prospect.id;
            var extendedLink = 'https://app.aippointing.com/schedule/extended?p=' + prospect.id;
            link = link + '&c=' + ac_id;
            extendedLink = extendedLink + '&c=' + ac_id;

            var newChatStatus: any = await this.detectOnHoldStatus(messages, link, extendedLink);
            if (newChatStatus == ChatStatus.ONHOLD || linked_in_chat.chat_status == ChatStatus.ONHOLD) {
                payload[0].content = await this.promptService.generateFollowUpSchedulePrompt(prospect, linked_in_chat.follow_up_count, linked_in_account.user_id);
                newChatStatus = ChatStatus.ONHOLD;
                linked_in_chat.follow_up_state = 3;
            } else {
                payload[0].content = await this.promptService.generateFollowUpPrompt(prospect, linked_in_chat.follow_up_count, linked_in_account.user_id);
                newChatStatus = ChatStatus.FOLLOWUP;
                linked_in_chat.follow_up_state = 2;
            }

            const timestamp = this.getTimestamp();
            var answer_2 = await this.getChatGptAnswer(payload, 'gpt-4o', 0.6, timestamp, linked_in_account.apikey);

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
                linked_in_chat.updated_at = this.getTimestamp();
                linked_in_chat.chat_status = newChatStatus;
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
            const user_id = linked_in_account.user_id;
            const prompt_data = await this.promptService.findOne(user_id);
            var messages: MessageType[] = JSON.parse(linked_in_chat.chat_history);
            const lastMessage = messages[messages.length - 1].content;
            const first_msg = messages[0];

            var answer: MessageType = {
                role: 'assistant',
                content: '',
                createdAt: this.getTimestamp()
            }

            if (this.isNowAfter(4, linked_in_chat.created_at)) {
                answer.content = prompt_data.q_10_1;
                linked_in_chat.chat_status = ChatStatus.INQUIRING;
            }
            if (this.isNowAfter(28, linked_in_chat.created_at)) {
                answer.content = prompt_data.q_10_2;
                linked_in_chat.chat_status = ChatStatus.INQUIRING;
            }
            if (this.isNowAfter(52, linked_in_chat.created_at)) {
                if (prompt_data.q_11_1 == "" && prompt_data.q_11_2 != "") {
                    answer.content = "Puede que ahora no sea tu momento. De momento te dejo este regalo.\n. Abrazo! Ver regalo aquí: " + prompt_data.q_11_2 + "\n He pensado que podría ser de tu interés. \n Y si cambias de opinión, no dudes en ponerte en contacto conmigo. \nAbrazo!";
                } else if (prompt_data.q_11_1 == "" && prompt_data.q_11_2 == "") {
                    answer.content = "Puede que ahora no sea tu momento.\n Si cambias de opinión, no dudes en ponerte en contacto conmigo. \nAbrazo!";
                } else {
                    answer.content = "Puede que ahora no sea tu momento. De momento te dejo este regalo: " + prompt_data.q_11_1 + "\n. Abrazo! Ver regalo aquí: " + prompt_data.q_11_2 + "\n He pensado que podría ser de tu interés. \n Y si cambias de opinión, no dudes en ponerte en contacto conmigo. \nAbrazo!";
                }
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
                linked_in_chat.updated_at = this.getTimestamp();
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

            linked_in_chat.chat_status = ChatStatus.NOANSWERED;

            if (this.isNowAfter(148, linked_in_chat.created_at)) {
                answer.content = 'Hola ' + prospect.first_name + ', tuviste algún momento para ver el mini entrenamiento o todavía no?';
            }
            if (this.isNowAfter(316, linked_in_chat.created_at)) {
                answer.content = prospect.first_name + ', no me comentaste si pudiste ver el mini entrenamiento. Me encantaría saber tu opinión acerca del mismo!';
            }
            if (this.isNowAfter(484, linked_in_chat.created_at)) {
                answer.content = "Entiendo que estarás muy ocupado, y no quiero molestarte. Espero que puedas ver el mini entrenamiento y que hablemos pronto " + prospect.first_name + "!";
                linked_in_chat.automatic_answer = false;
                linked_in_chat.chat_status = ChatStatus.REJECTED;
            }
            if (answer.content == '' || answer.content == lastMessage) {
                // console.log(">>>return here...")
                return false;
            }
            // send inquire message at the linkedin browser 
            const send_success = await this.sendMessageAtLinkedIn(prospect, linked_in_account, answer.content)
            if (send_success) {
                messages.push(answer);
                linked_in_chat.chat_history = JSON.stringify(messages);
                linked_in_chat.updated_at = this.getTimestamp();
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
            const user_email = linked_in_account.email;
            const timestamp = this.getTimestamp();
            const messages: MessageType[] = lastestChat;
            // console.log(">>>last chat", lastestChat)

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
                linked_in_chat.updated_at = this.getTimestamp();
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
                linked_in_chat.updated_at = this.getTimestamp();
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

            var is_contact = false;
            const outOfContext: any = await this.getChatGptAnswer(systemPrompt, 'gpt-4o', 0.3, timestamp, linked_in_account.apikey);

            if (outOfContext.content != undefined) {
                if (outOfContext.content.trim() == 'OFF_TOPIC') {
                    linked_in_chat.requires_human_intervention = true;
                    linked_in_chat.automatic_answer = false;
                    linked_in_chat.chat_history = JSON.stringify(lastestChat);
                    linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                    linked_in_chat.updated_at = this.getTimestamp();
                    await this.chatService.updateChatOne(linked_in_chat);
                    const reason = 'Salida de contexto detectada en campaña ' + ac.name;
                    // $linkedInAccount -> user -> notify(new ChatOutOfContext($reason, $lastMessage, $messages, $prospect));
                    return;
                }

                if (outOfContext.content.trim() == 'CONTACT') {

                    // linked_in_chat.requires_human_intervention = true;
                    // linked_in_chat.automatic_answer = false;
                    // linked_in_chat.chat_history = JSON.stringify(lastestChat);
                    // linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                    // linked_in_chat.updated_at = this.getTimestamp();
                    // await this.chatService.updateChatOne(linked_in_chat);
                    // const reason = 'Petición de contacto detectada en campaña ' + ac.name;
                    // $linkedInAccount -> user -> notify(new ChatOutOfContext($reason, $lastMessage, $messages, $prospect));
                    //return; 

                    is_contact = true;
                    if (linked_in_chat.contact_count != 0) {
                        linked_in_chat.requires_human_intervention = true;
                        linked_in_chat.automatic_answer = false;
                        linked_in_chat.chat_history = JSON.stringify(lastestChat);
                        linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                        linked_in_chat.contact_count = 2;
                        linked_in_chat.updated_at = lastestChat[lastestChat.length - 1].createdAt;
                        await this.chatService.updateChatOne(linked_in_chat);
                        return true;
                    } else {
                        linked_in_chat.contact_count = 1;
                    }
                }

                if (outOfContext.content.trim() == 'NO_CALENDAR') {
                    linked_in_chat.requires_human_intervention = true;
                    linked_in_chat.automatic_answer = false;
                    linked_in_chat.chat_history = JSON.stringify(lastestChat);
                    linked_in_chat.chat_status = ChatStatus.INPROGRESS;
                    linked_in_chat.updated_at = this.getTimestamp();
                    await this.chatService.updateChatOne(linked_in_chat);
                    const reason = 'Reunión presencial o telefónica detectada en campaña ' + ac.name;
                    // $linkedInAccount -> user -> notify(new ChatOutOfContext($reason, $lastMessage, $messages, $prospect)); 
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

            //const gen_core_prompt = await this.promptService.generateCorePrompt(prospect, ac, 'creative', user_id);
            var gen_core_prompt = '';
            if (is_contact) {
                gen_core_prompt = await this.promptService.generateCorePrompt(prospect, ac, 'contact', user_id, user_email);
            } else {
                gen_core_prompt = await this.promptService.generateCorePrompt(prospect, ac, 'creative', user_id, user_email);
            }

            const sysPrompt: GptMessageType = {
                role: 'system',
                content: gen_core_prompt
            }
            prompt.unshift(sysPrompt);

            var maxTokens = 4096;
            var maxResponseTokens = 500;
            var payloadTokens = this.getMessagesTokensCount(prompt);


            while (payloadTokens + maxResponseTokens >= maxTokens) {
                // We unset index 1 because 0 is system prompt and we have to keep it
                prompt.splice(1, 1);
                payloadTokens = this.getMessagesTokensCount(prompt);
            }

            var answer = await this.getChatGptAnswer(prompt, 'gpt-4o', 0.8, timestamp, linked_in_account.apikey);
            if (answer == false) {
                return;
            }
            answer.content = answer.content.replace(/[¡¿]/g, '');

            var link = 'https://app.aippointing.com/schedule?p=' + prospect.id;
            var linkPlaceholder = 'CALENDAR-LINK';
            var extendedLink = 'https://app.aippointing.com/schedule/extended?p=' + prospect.id;
            var extendedLinkPlaceholder = 'EXTENDED-CALENDAR-LINK';
            var rejectedLinkPlaceholder = 'REJECTED-LINK';
            // var rejectedLink = 'https://bit.ly/minientrenamientoconsultorpro';

            const prompt_data = await this.promptService.findOne(user_id);
            var rejectedLink = prompt_data.q_11_1;

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
                if (answer.content.includes(rejectedLink)) {
                    newChatStatus = ChatStatus.REJECTED;
                    linked_in_chat.automatic_answer = false;
                }
                if (answer.content.includes(link) || answer.content.includes(extendedLink)) {
                    newChatStatus = ChatStatus.ONHOLD;
                }
                messages.push(answer);
                linked_in_chat.chat_status = newChatStatus;
                linked_in_chat.chat_history = JSON.stringify(messages);
                linked_in_chat.updated_at = this.getTimestamp()
                await this.chatService.updateChatOne(linked_in_chat);
                return;
            } else {
                return;
            }
        } catch (e) {
            // console.log(">>>core message error", e)
            return;
        }
    }

    async sendMessageAtLinkedIn(prospect: ProspectType, linked_in_account: LinkedInAccountType, newMsg: string) {
        var my_page = this.cached_linked_browser.page;
        try {
            // focus message box
            const mgs_box_t1 = await my_page.waitForSelector('.msg-form__contenteditable');
            if (mgs_box_t1) {
                await my_page.focus('.msg-form__contenteditable')
            }
            // type message on the form
            await my_page.keyboard.type(newMsg, { delay: 5 });
            await my_page.waitForTimeout(1000);
            console.log(">>send...")
            // click send message button 
            try {
                await my_page.click('button.msg-form__send-button');
            } catch (e) {
                await my_page.click('button.msg-form__send-btn');
            }

            return true;
        } catch (e) {
            console.log("<>>>err...", e)
            return false;
        }
    }

    async sendMessageAtLinkedInByNameSearch(prospect: ProspectType, linked_in_account: LinkedInAccountType, newMsg: string) {
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
            if (!this.people_btn) {
                try {
                    await my_page.waitForSelector(filter_btn);
                    await my_page.click(filter_btn);
                    this.people_btn = true;
                    // console.log(">>>selected filter")
                } catch (e) {
                    // console.log(">>>selected filter no")
                }
            }

            // select reciever from list
            await my_page.waitForTimeout(3000);
            const element = await my_page.waitForSelector('[data-chameleon-result-urn="urn:li:member:' + member_id + '"]');
            if (element) {
                const button = await element.$('button');
                if (button) {
                    const text = await (await button.getProperty('textContent')).jsonValue()
                    if (this.beautySpace(text) != 'Message') {
                        // console.log(">>>>not connected prospect")
                        return false;
                    }
                    try {
                        // close message box if it is opened
                        var count = await my_page.$$eval('.msg-convo-wrapper', elements => elements.length);
                        while (count > 0) {
                            count--;
                            await my_page.waitForTimeout(1500);
                            const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                            await my_page.waitForSelector(close_btn_msgbox);
                            await my_page.click(close_btn_msgbox);
                            await this.delay(1500)
                        }
                    } catch (e) {
                        // console.log(">>>error on close message boxes")
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
                        await my_page.waitForTimeout(1000);
                        // click send message button 
                        await my_page.click('button.msg-form__send-button');

                        // close message box for next
                        await my_page.waitForTimeout(1000);
                        const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                        await my_page.waitForSelector(close_btn_msgbox);
                        await my_page.click(close_btn_msgbox);

                        // console.log(">>message box closed")
                        return true;
                    } catch (e) {
                        // close message box for next
                        // console.log(">>error", e)
                        await my_page.waitForTimeout(200);
                        const close_btn_msgbox = '.msg-overlay-conversation-bubble .msg-overlay-bubble-header__controls button:last-child';
                        await my_page.waitForSelector(close_btn_msgbox);
                        await my_page.click(close_btn_msgbox);

                        await my_page.waitForTimeout(200);
                        // console.log(">>message box closed")
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } catch (e) {
            // console.log(">>err", e)
            return false;
        }
    }

    async sideListScroll(my_page: any, amount: number) {
        console.log(">>side scrolling...")
        await my_page.mouse.move(1800, 750);
        await my_page.waitForTimeout(200);
        await my_page.mouse.wheel({ deltaY: amount });
        await my_page.waitForTimeout(1000);
    }

    async msgBoxScroll(my_page: any, amount: number) {
        while (amount > 0) {
            await my_page.evaluate(() => document.querySelector('.msg-s-message-list').scrollBy({ top: -3000, behavior: 'smooth' }))
            await my_page.waitForTimeout(500);
            amount--;
        }
    }

    async scrollDown(my_page: any) {
        try {
            await my_page.evaluate(async () => {
                window.scrollBy(0, 500);
            });
        } catch (e) {
        }
    }

    async scrollUp(my_page: any) {
        try {
            await my_page.evaluate(async () => {
                window.scrollBy(0, -500);
            });
        } catch (e) {
        }
    }

    async pageScrollToTop(my_page: any) {
        try {
            await my_page.evaluate(async () => {
                await new Promise<void>((resolve, reject) => {
                    let totalHeight = document.body.scrollHeight;
                    const distance = 100;
                    const timer = setInterval(() => {
                        window.scrollBy(0, -distance);
                        totalHeight -= distance;
                        if (totalHeight <= 0) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
        } catch (e) {
        }
    }

    async pageScrollToBottom(my_page: any) {
        try {
            await my_page.evaluate(async () => {
                await new Promise<void>((resolve, reject) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= document.body.scrollHeight - 1100) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
        } catch (e) {
        }
    }

    parseSearchUrl(setting: any, mode: string, page: number) {
        var params = mode + '/?';

        if (setting.companysize.length > 0 && mode == 'companies') {
            params = params + 'companySize=' + '%5B';
            setting.companysize.forEach((p: any) => {
                params = params + '%22' + p.value + '%22' + '%2C';
            })
            params = params.slice(0, -3);
            params = params + '%5D' + '&';
        }
        if (setting.joblisting == 1 && mode == 'companies') {
            params = params + 'hasJobs=' + '%5B%22' + setting.searchkey + '%22%5D&';
        }

        if (setting.opento.length > 0) {
            params = params + 'contactInterest=' + '%5B';
            setting.opento.forEach((p: any) => {
                params = params + '"' + p.value + '"' + '%2C';
            })
            params = params.slice(0, -3);
            params = params + '%5D' + '&';
        }
        if (setting.locations.length > 0) {
            params = params + 'geoUrn=' + '%5B';
            setting.locations.forEach((p: any) => {
                params = params + '%22' + p.value + '%22' + '%2C';
            })
            params = params.slice(0, -3);
            params = params + '%5D' + '&';
        }
        if (setting.industry.length > 0) {
            params = params + 'industry=' + '%5B';
            setting.industry.forEach((p: any) => {
                params = params + '%22' + p.value + '%22' + '%2C';
            })
            params = params.slice(0, -3);
            params = params + '%5D' + '&';
        }
        if (setting.searchkey != "") {
            params = params + 'keywords=' + setting.searchkey + '&';
        }
        if (page > 0) {
            params = params + 'page=' + page + '&';
        }
        if (setting.connections.length > 0) {
            params = params + 'network=' + '%5B';
            setting.connections.forEach((p: any) => {
                params = params + '%22' + p.value + '%22' + '%2C';
            })
            params = params.slice(0, -3);
            params = params + '%5D' + '&';
        }
        if (setting.language.length > 0) {
            params = params + 'profileLanguage=' + '%5B';
            setting.language.forEach((p: any) => {
                params = params + '%22' + p.value + '%22' + '%2C';
            })
            params = params.slice(0, -3);
            params = params + '%5D' + '&';
        }
        params = params.slice(0, -1);
        params = params + '&origin=FACETED_SEARCH'

        const url = 'https://www.linkedin.com/search/results/' + params;
        console.log(url)
        return url;
    }

    // ------------------------------------ ^_^ utils function ^_^ -------------------------------------------  

    beautySpace(str: any) {
        return str.trim().replace(/^\n+|\n+$/g, '');
    }

    beautyDateEs(date_in: any, time_in: any) {
        try {
            const weeks = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
            if (weeks.includes(date_in)) {
                const dayMapping = {
                    'domingo': 0,
                    'lunes': 1,
                    'martes': 2,
                    'miércoles': 3,
                    'jueves': 4,
                    'viernes': 5,
                    'sábado': 6
                };
                const currentDate = new Date();
                const currentDay = currentDate.getDay();
                const difference = (dayMapping[date_in] - currentDay - 7) % 7;
                const targetDate = new Date(currentDate);
                targetDate.setDate(currentDate.getDate() + difference);
                const date_res = targetDate.getFullYear().toString() + "-" + (targetDate.getMonth() + 1).toString().padStart(2, '0') + "-" + targetDate.getDate().toString().padStart(2, '0');

                const [time, period] = time_in.split(' ');
                let [hours, minutes] = time.split(':');
                hours = parseInt(hours, 10);
                const time_res = `${hours.toString().padStart(2, '0')}:${minutes}`;
                const date = new Date(targetDate.getFullYear(), (targetDate.getMonth() + 1), targetDate.getDate(), hours, minutes);
                const timestamp = date.getTime();
                return {
                    date: date_res + " " + time_res,
                    stamp: timestamp
                }

            } else {
                var d_in = date_in;
                if (date_in == 'HOY' || date_in == 'Hoy') {
                    const today = new Date();
                    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
                    const month = monthNames[today.getMonth()];
                    const day = today.getDate();
                    d_in = `${month} ${day}`;
                }
                const monthNumber = {
                    'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
                    'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
                };
                const currentDate = new Date();
                const year = currentDate.getFullYear();
                const parts = d_in.split(' ');
                const month = monthNumber[parts[1]];
                const day = parts[0];
                const date_res = year.toString() + "-" + month + "-" + day.padStart(2, '0');
                const [time, period] = time_in.split(' ');
                let [hours, minutes] = time.split(':');
                hours = parseInt(hours, 10);
                const time_res = `${hours.toString().padStart(2, '0')}:${minutes}`;
                const date = new Date(year, month, day, hours, minutes);
                const timestamp = date.getTime();
                return {
                    date: date_res + " " + time_res,
                    stamp: timestamp
                }
            }
        } catch (e) {
            // console.log(">>")
        }
    }

    beautyDate(date_in: any, time_in: any, lang: number) {
        if (lang == 0) {
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
                    const date_res = targetDate.getFullYear().toString() + "-" + (targetDate.getMonth() + 1).toString().padStart(2, '0') + "-" + targetDate.getDate().toString().padStart(2, '0');

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
                    const date_res = year.toString() + "-" + month + "-" + day.padStart(2, '0');
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

            }
        } else if (lang == 1) {
            try {
                const weeks = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
                if (weeks.includes(date_in)) {
                    const dayMapping = {
                        'domingo': 0,
                        'lunes': 1,
                        'martes': 2,
                        'miércoles': 3,
                        'jueves': 4,
                        'viernes': 5,
                        'sábado': 6
                    };
                    const currentDate = new Date();
                    const currentDay = currentDate.getDay();
                    const difference = (dayMapping[date_in] - currentDay - 7) % 7;
                    const targetDate = new Date(currentDate);
                    targetDate.setDate(currentDate.getDate() + difference);
                    const date_res = targetDate.getFullYear().toString() + "-" + (targetDate.getMonth() + 1).toString().padStart(2, '0') + "-" + targetDate.getDate().toString().padStart(2, '0');

                    const [time, period] = time_in.split(' ');
                    let [hours, minutes] = time.split(':');
                    hours = parseInt(hours, 10);
                    const time_res = `${hours.toString().padStart(2, '0')}:${minutes}`;
                    const date = new Date(targetDate.getFullYear(), (targetDate.getMonth() + 1), targetDate.getDate(), hours, minutes);
                    const timestamp = date.getTime();
                    //console.log(">>out:", date_res + " " + time_res)
                    return {
                        date: date_res + " " + time_res,
                        stamp: timestamp
                    }

                } else {
                    var d_in = date_in;
                    if (date_in == 'HOY' || date_in == 'Hoy') {
                        const today = new Date();
                        // const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const month = monthNames[today.getMonth()];
                        const day = today.getDate();
                        d_in = `${month} ${day}`;

                        const monthNumber = {
                            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                        };
                        const currentDate = new Date();
                        const year = currentDate.getFullYear();
                        const parts = d_in.split(' ');
                        const months = monthNumber[parts[0]];
                        const days = parts[1];
                        const date_res = year.toString() + "-" + months + "-" + days.padStart(2, '0');
                        const [time, period] = time_in.split(' ');
                        let [hours, minutes] = time.split(':');
                        hours = parseInt(hours, 10);
                        const time_res = `${hours.toString().padStart(2, '0')}:${minutes}`;
                        const date = new Date(year, months, days, hours, minutes);
                        const timestamp = date.getTime();
                        //console.log(">>out:", date_res + " " + time_res)
                        return {
                            date: date_res + " " + time_res,
                            stamp: timestamp
                        }

                    } else {
                        const monthNumber = {
                            'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
                            'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
                        };
                        const currentDate = new Date();
                        const year = currentDate.getFullYear();
                        const parts = d_in.split(' ');
                        const months = monthNumber[parts[1]];
                        const days = parts[0];
                        const date_res = year.toString() + "-" + months + "-" + days.padStart(2, '0');
                        const [time, period] = time_in.split(' ');
                        let [hours, minutes] = time.split(':');
                        hours = parseInt(hours, 10);
                        const time_res = `${hours.toString().padStart(2, '0')}:${minutes}`;
                        const date = new Date(year, months, days, hours, minutes);
                        const timestamp = date.getTime();
                        //console.log(">>out:", date_res + " " + time_res)
                        return {
                            date: date_res + " " + time_res,
                            stamp: timestamp
                        }
                    }
                }
            } catch (e) {
                // console.log(">>")
            }
        } else {

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
        return year + "-" + month + "-" + day + " " + hours + ":" + minutes;
    }

    isNowTime() {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
                    'model': 'gpt-4o',
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
        // const lastMsgCreatedAt = lastMessage.createdAt;
        if (linked_in_chat.follow_up_count == 0 && this.isNowAfter(1, linked_in_chat.updated_at)) { //1 
            return true;
        }
        if (linked_in_chat.follow_up_count == 1 && this.isNowAfter(24, linked_in_chat.updated_at)) { //25
            return true;
        }
        if (linked_in_chat.follow_up_count == 2 && this.isNowAfter(24, linked_in_chat.updated_at)) { //49
            return true;
        }
        if (linked_in_chat.follow_up_count == 3 && this.isNowAfter(24, linked_in_chat.updated_at)) { //73
            return true;
        }
        return false;
    }

    async detectOnHoldStatus(messages: MessageType[], calendar_link: string, ext_calendar_link: string) {
        var newChatStatus = ''
        messages.forEach((m: MessageType) => {
            if (m.content.includes(calendar_link) || m.content.includes(ext_calendar_link)) {
                newChatStatus = ChatStatus.ONHOLD
            }
        })
        return newChatStatus;
    }

    isNowAfter(hour: number, times: string) {
        //const times = "01/23/23 05:23";
        const parts = times.split(/[ \-:]+/); // Split using space, hyphen, or colon
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const hours = parseInt(parts[3], 10);
        const minutes = parseInt(parts[4], 10);
        const msg_stamp = new Date(year, month, day, hours, minutes).getTime();

        const now_stamp = Date.now();
        const milli_diff = now_stamp - msg_stamp;
        const hour_diff = milli_diff / (1000 * 60 * 60);

        if (hour_diff >= hour) {
            return true;
        } else {
            return false;
        }
    }

    async delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    isOver() {
        const now_time = Date.now();
        if ((now_time - this.start_time) > 28.5 * 60 * 1000) {
            return true
        } else {
            return false
        }
    }

    isLoginOn() {
        if (this.cached_linked_browser.page) {
            const url = this.cached_linked_browser.page.url()
            if (url.includes('/feed/') || url.includes('/in/') || url.includes('/search/') || url.includes('/mynetwork/')) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

}