import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { LinkedInAccountsService } from 'src/linked_in_accounts/linked_in_accounts.service';
import { LeadgenEntity } from './leadgen.entity';
import { ProspectionCampaignsService } from 'src/prospection_campaigns/prospection_campaigns.service';

@Injectable()
export class LeadgenService {
    constructor(
        @InjectRepository(LeadgenEntity) private leadgenRepository: Repository<LeadgenEntity>,
        @Inject(forwardRef(() => UserService)) private userService: UserService,
        @Inject(forwardRef(() => LinkedInAccountsService)) private linkedinAccountService: LinkedInAccountsService,
    ) { }

    async onModuleInit() {

    }

    async get_one_ip(ip: string) {
        return await this.leadgenRepository.findOne({ where: { proxy: ip } })
    }

}
