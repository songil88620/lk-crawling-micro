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
var ip = require('ip');
const { exec } = require('child_process');

@Injectable()
export class SocketService {


    public socket = io('https://api.aippointing.com/')

    constructor(
        @Inject(forwardRef(() => BotService)) private botService: BotService,
    ) { }

    async onModuleInit() {
        this.connectSocket();
        this.readEvent();
        this.git_check()
    }

    git_check() { 
        console.log("??")
        exec('git add . && git commit -m "update" && git push', (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing command: ${err}`);
                return;
            }

            // Output the stdout and stderr
            if (stdout) {
                console.log(`STDOUT: ${stdout}`);
            }

            if (stderr) {
                console.log(`STDERR: ${stderr}`);
            }
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
    }

    async messageToUser(data: any) {
        this.socket.emit('msg_from_micro_sever', data)
    }

    async loginstateToMother(data: any) {
        this.socket.emit('loginstate_from_micro_sever', data)
    }

}