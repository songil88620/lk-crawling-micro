import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProspectionCampaignsEntity, Status } from './entities/prospection_campaign.entity';
import { Repository } from 'typeorm';
import { LinkedInAccountsService } from 'src/linked_in_accounts/linked_in_accounts.service';

@Injectable()
export class ProspectionCampaignsService {
  constructor(
    @InjectRepository(ProspectionCampaignsEntity)
    private campaignRepository: Repository<ProspectionCampaignsEntity>,
    @Inject(forwardRef(() => LinkedInAccountsService)) private linkedinAccountService: LinkedInAccountsService,
  ) { }

  // this provides actived campaigns
  async findActiveCampaigns() {
    return await this.campaignRepository.find({ where: { status: Status.ACTIVE } })
  }


  async findMyCampaign(ip: string) {
    try {
      const lk_ac = await this.linkedinAccountService.findOneLinkdinAccountByIP(ip);
      const lk_id = lk_ac.id;
      return await this.campaignRepository.find({ where: { status: Status.ACTIVE, linked_in_account_id: lk_id } })
    } catch (e) {

    } 
  }




  async create(c: any) {
    const campaign = this.campaignRepository.create(c);
    await this.campaignRepository.save(campaign);
    return campaign;
  }

  async findAll() {
    return await this.campaignRepository.find()
  }

  async findOne(c: any) {
    return await this.campaignRepository.findOne({
      where: c
    });
  }

  async update(c: any) {
    await this.campaignRepository.update(c['c'], c['i']);
    return await this.campaignRepository.findOne({ where: c['c'] })
  }

  async remove(c: any) {
    await this.campaignRepository.delete(c)
    return { deleted: true };
  }

}
