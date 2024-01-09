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

@Injectable()
export class SocketService {


    public socket = io('https://api.aippointing.com/')
    constructor(
        @Inject(forwardRef(() => BotService)) private botService: BotService,
    ) { } 
    

    async onModuleInit() {

        this.socket.on("connect", () => {
            // const engine = this.socket.io.engine;  
            // engine.on("close", (reason) => { });  

            this.socket.on('linkedin_login_request_micro', (data: LinkedinLoginDataType) => {
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
            })
        });
    }

    async messageToUser(data: any) {
        this.socket.emit('msg_from_micro_sever', data)
    }

}