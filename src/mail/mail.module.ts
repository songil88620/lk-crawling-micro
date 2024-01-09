import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { MailController } from './mail.controller'; 
import { ENVS } from 'src/env';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: ENVS.EMAIL_HOST,
        secure: true,
        port: 465,
        auth: {
          user: ENVS.EMAIL_USER,
          pass: ENVS.EMAIL_PASS
        }
      },
      template: {
        dir: join(__dirname, 'templates'),
        adapter: new HandlebarsAdapter(),
        // options: {
        //   strict: true
        // }
      }
    }), 
  ],
  providers: [MailService],
  exports: [MailService],
  controllers: [MailController],
})
export class MailModule { }
