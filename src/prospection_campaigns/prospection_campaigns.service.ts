import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProspectionCampaignsEntity, Status } from './entities/prospection_campaign.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProspectionCampaignsService {
  constructor(
    @InjectRepository(ProspectionCampaignsEntity)
    private campaignRepository: Repository<ProspectionCampaignsEntity>
  ) { }

  // this provides actived campaigns
  async findActiveCampaigns() {
    return await this.campaignRepository.find({ where: { status: Status.ACTIVE } })
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
