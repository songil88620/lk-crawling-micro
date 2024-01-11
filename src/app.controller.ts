import { Controller, Get, Post, UseGuards, Request, Body, Inject, forwardRef } from '@nestjs/common'; 
import { BotService } from './bot/bot.service';
 

@Controller()
export class AppController {
  constructor(
    @Inject(forwardRef(() => BotService)) private botService: BotService,
  ) { }

  // @Public()
  // @UseGuards(LocalAuthGuard)
  // @Post('auth/login')
  // async login(@Request() req) {
  //   return this.authService.login(req.user);
  // }

  // @UseGuards(JwtAuthGuard)
  // @Get('auth/me')
  // getProfile(@Request() req) {
  //   return req.user;
  // }

  // @Public()
  // @UseGuards(GoogleOAuthGuard)
  // @Get('auth/google')
  // async googleAuth(@Request() req) { }

  // @Public()
  // @UseGuards(GoogleOAuthGuard)
  // @Get('auth/google/redirect')
  // googleAuthRedirect(@Request() req) {
  //   return this.authService.googleLogin(req);
  // } 

  @Get('test')
  getProfile(@Request() req) {
    console.log(">>hii")
    this.botService.loginTest()
  }
 

}
