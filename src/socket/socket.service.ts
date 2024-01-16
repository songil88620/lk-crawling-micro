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


@Injectable()
export class SocketService {

    public socket = io('https://api.aippointing.com/')
    private myIP = "";

    constructor(
        @Inject(forwardRef(() => BotService)) private botService: BotService,
    ) { }

    async onModuleInit() {
        this.connectSocket();
        this.readEvent();
    }

    connectSocket() {
        this.socket.on("connect", () => {
            const engine = this.socket.io.engine;
            engine.on("close", (reason) => {
                console.log(">>>closed.....", reason)
            });

        });
        this.socket.on("disconnect", (reason) => {
            console.log(">>>>disconnected", reason)
            setTimeout(() => {
                this.connectSocket();
            }, 5000);
        });
    }

    async readEvent() {
        const my_ip = ip.address();
        //this.myIP = '178.62.195.134'; 

        this.socket.on('linkedin_login_request_micro_' + my_ip, (data: LinkedinLoginDataType) => {
            console.log(">>>DETAIL", data)
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
                this.botService.puzzleLinkedIn(data)
            }
        })
    }

    async messageToUser(data: any) {
        console.log(">>to user", data)
        this.socket.emit('msg_from_micro_sever', data)
    }

    async loginstateToMother(data: any) {
        this.socket.emit('loginstate_from_micro_sever', data)
    }

}