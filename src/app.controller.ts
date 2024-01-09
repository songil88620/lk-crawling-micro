import { Controller, Get, Post, UseGuards, Request, Body } from '@nestjs/common'; 
 

@Controller()
export class AppController {
  constructor(
    
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
 

}
