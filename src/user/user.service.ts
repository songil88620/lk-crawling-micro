import { Injectable } from '@nestjs/common'; 
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity, UserRole } from './entities/user.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) { }

  async create(u: any) {
    const user = this.userRepository.create(u);
    await this.userRepository.save(user);
    return user;
  }

  async findAll() {
    return await this.userRepository.find()
  }

  async findOne(c: any) {
    return await this.userRepository.findOne({
      where: c
    });
  }

  async update(c: any) {
    await this.userRepository.update(c['c'], c['i']);
    return await this.userRepository.findOne({ where: c['c'] })
  }

  async remove(c: any) {
    await this.userRepository.delete(c)
    return { deleted: true };
  }

  async getTest(){
    return await this.userRepository.find({
      where: {
        role: In([UserRole.USER, UserRole.ADMIN])
      }
    })
  }
  
}
