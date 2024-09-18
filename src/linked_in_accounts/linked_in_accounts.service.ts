import { Injectable } from '@nestjs/common';
import { LinkedInAccountEntity } from './entities/linked_in_account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class LinkedInAccountsService {
  constructor(
    @InjectRepository(LinkedInAccountEntity)
    private linkedinAccountRepository: Repository<LinkedInAccountEntity>
  ) { }

  // this provides linkedin account by id
  async findOneLinkdinAccountById(id: number) {
    return await this.linkedinAccountRepository.findOne({ where: { id: id } });
  }

  async findOneLinkdinAccountByIP(ip: string) {
    return await this.linkedinAccountRepository.findOne({ where: { proxy: ip } });
  }

  async findLinkedinIds(user_id: any) {
    const res = await this.linkedinAccountRepository.find({ where: { user_id: user_id } });
    var ids = [];
    res.forEach((r: any) => {
      ids.push(r.id)
    })
    return ids;
  }

  async updateLinkedCookies(account_id: any, li_at: any, session_id: any) {
    const jsession_id = session_id.replaceAll(/"/g, '');
    await this.linkedinAccountRepository.update({ id: account_id }, { li_at: li_at, jsession_id: jsession_id })
  }

  async updateLinkedWarn(account_id: any, warn: any) {
    await this.linkedinAccountRepository.update({ id: account_id }, { warn: warn })
  }

  async update_version(proxy: string, v: string) {
    await this.linkedinAccountRepository.update({ proxy }, { i_ver: v })
  }

}
