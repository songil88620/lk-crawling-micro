import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { FirstmsgEntity } from './firstmsg.entity';
import { ProspectionCampaignsService } from 'src/prospection_campaigns/prospection_campaigns.service';
import { Cron, CronExpression } from '@nestjs/schedule';
const { convert } = require('html-to-text');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

@Injectable()
export class FirstmsgService {

    constructor(
        @InjectRepository(FirstmsgEntity) private model: Repository<FirstmsgEntity>,
        @Inject(forwardRef(() => ProspectionCampaignsService)) private campaignService: ProspectionCampaignsService,
    ) { }

    async onModuleInit() {
        this.sync_first_msg()
    }

    @Cron(CronExpression.EVERY_10_MINUTES, { name: 'first_msg_bot' })
    async run_bot() {
        this.sync_first_msg();
    }

    async sync_first_msg() {
        const campaigns = await this.campaignService.findAll();
        const first_msgs = await this.model.find();
        var msgs = [];
        first_msgs.forEach((m: any) => {
            msgs.push(m.msg)
        })
        for (var c of campaigns) {
            if (!msgs.includes(c.first_message)) {
                const data = {
                    cid: c.id,
                    msg: c.first_message,
                    created_at: this.getTimestamp()
                }
                const p = this.model.create(data);
                await this.model.save(p);
            }
        }
    }

    async get_first_msg(cid: number) {
        const msgs = await this.model.find({ where: { cid } })
        var messages = [];
        msgs.forEach((m) => {
            messages.push(m.msg)
        })
        return messages;
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









}
