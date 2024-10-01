import {
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { Server } from 'socket.io';
import { io, Socket } from 'socket.io-client';
import { BotService } from 'src/bot/bot.service';
import { LinkedinLoginDataType } from 'src/type/linkedlogin.type';
import { LinkedInAccountsService } from 'src/linked_in_accounts/linked_in_accounts.service';
var ip = require('ip');
const { exec } = require('child_process');

@Injectable()
export class SocketService {


    public socket = io('https://api.aippointing.com/')

    constructor(
        @Inject(forwardRef(() => BotService)) private botService: BotService,
        @Inject(forwardRef(() => LinkedInAccountsService)) private lkService: LinkedInAccountsService,
    ) { }

    async onModuleInit() {
        this.connectSocket();
        this.readEvent();
    }

    git_check() {
        exec('cd /var/lk-crawling-micro/ && git pull && npm run build && pm2 restart 0', (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing command: ${err}`);
                return;
            }
            if (stdout) {
                console.log(`STDOUT: ${stdout}`);
            }
            if (stderr) {
                console.log(`STDERR: ${stderr}`);
            }
            const v = this.getTimestamp() + '__v';
            this.lkService.update_version(ip.address(), v)
        });
    }

    connectSocket() {
        this.socket.on("connect", () => {
            const engine = this.socket.io.engine;
            engine.on("close", (reason) => {
                console.log(">>>closed.....", reason)
                
            });

        });
        this.socket.on("disconnect", (reason) => {
            setTimeout(() => {
                this.connectSocket();
            }, 5000);
        });
    }

    async readEvent() {
        const my_ip = ip.address();
        this.socket.on('linkedin_login_request_micro_' + my_ip, (data: LinkedinLoginDataType) => {
            if (data.mode == 'login') {
                this.botService.loginLinkedIn(data)
            }
            if (data.mode == 'vcode') {
                this.botService.vcodeLinkedIn(data)
            }
            if (data.mode == 'logout') {
                this.botService.logout(data)
            }
            if (data.mode == 'puzzle') {

            }
        })
        this.socket.on('leadgen_collect_request_micro_' + my_ip, (data: any) => {
            console.log(">>dadta", data)
            this.botService.handleCollect()
        })

        this.socket.on('update_source_', (data: any) => {
            console.log(">>update cmd", data)
            this.git_check()
        })
    }

    async messageToUser(data: any) {
        this.socket.emit('msg_from_micro_sever', data)
    }

    async loginstateToMother(data: any) {
        this.socket.emit('loginstate_from_micro_sever', data)
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