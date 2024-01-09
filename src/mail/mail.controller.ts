import { Controller } from '@nestjs/common';
import { Post, Query } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer'; 
import { ENVS } from 'src/env';


@Controller('mail')
export class MailController {
    constructor(
        private mailerService: MailerService, 
    ) { }

    // @Public()
    //@Post('test')
    async sendTestEmail() {
        await this.mailerService.sendMail({
            to: 'songil88620@gmail.com', 
            from: ENVS.EMAIL_USER,
            subject: "Welcome to xxx! Confirm your Email",
            template: './advertise',
            context: {
                email: 'email',
                token: 'token', 
            }
        }) 
        return 'success'
    }
}
