import { MailerService } from '@nestjs-modules/mailer/dist';
import { Injectable } from '@nestjs/common'; 
import { ENVS } from 'src/env';

@Injectable()
export class MailService {
    constructor(
        private mailerService: MailerService, 
    ) { }

    async sendEmailConfirm(email: string, token: number) {
        await this.mailerService.sendMail({
            to: email,
            from: ENVS.EMAIL_USER,
            subject: "Welcome to xxx! Confirm your token",
            template: './confirmation',
            context: {
                email: email,
                token: token
            }
        })
        return 'success';
    }

    async sendPasswordRest(email: string) {   
        // const u = {
        //     email:email,
        //     _id:"",
        //     role:"customer"
        // }
        // const res = await this.authService.login(u);
        // const token = res.access_token;
        // const link = ENVS.SERVER_URL + '/resetpw?token='+token;
        // await this.mailerService.sendMail({
        //     to: email,
        //     from: ENVS.EMAIL_USER,
        //     subject: "Reset Password.",
        //     template: './passwordreset',
        //     context: {
        //         email: email,
        //         link: link
        //     }
        // })
        // return 'success';  
    }

    async sendAdEmail(to: string) { 
        await this.mailerService.sendMail({
            to: to, 
            from: ENVS.EMAIL_USER,
            subject: "Welcome to xxx!",
            template: './advertise',
            context: {
                email: 'email',
                token: 'token', 
            }
        })  
    }

}
