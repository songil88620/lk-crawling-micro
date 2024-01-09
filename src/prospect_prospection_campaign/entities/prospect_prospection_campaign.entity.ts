import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";



@Entity('prospect_prospection_campaign')
export class ProspectProspectionCampaignEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint' })
    prospection_campaign_id: number;

    @Column({ type: 'bigint' })
    prospect_id: number;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)", onUpdate: "CURRENT_TIMESTAMP(20)" })
    updated_at: Date;
}
