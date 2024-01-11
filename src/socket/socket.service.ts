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
        this.myIP = ip.address();
        console.log(">>My ip", this.myIP)
        this.socket.on("connect", () => {
            // const engine = this.socket.io.engine;  
            // engine.on("close", (reason) => { });  

            this.socket.on('linkedin_login_request_micro_' + this.myIP, (data: LinkedinLoginDataType) => {
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
        });
    }

    async messageToUser(data: any) {
        console.log(">>to user", data)
        this.socket.emit('msg_from_micro_sever', data)
    }

    async loginstateToMother(data: any) { 
        this.socket.emit('loginstate_from_micro_sever', data)
    }

}