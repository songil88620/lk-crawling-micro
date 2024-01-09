import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service'; 

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/test')
  test(){
    return this.userService.getTest();
  }

  @Post()
  create(@Body() c: any) {
    return this.userService.create(c);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post('/update')
  update(@Body() c: any) { 
    return this.userService.update(c);
  }

  @Post('/delete')
  remove(@Body() c: any) {
    return this.userService.remove(c);
  }
}
