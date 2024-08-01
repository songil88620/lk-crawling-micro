import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

export enum Status {
    ACTIVE = 'active',
    UNACTIVE = 'unactive',
    OTHER = 'other'
}


@Entity('prospection_campaigns')
export class ProspectionCampaignsEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({
        type: "enum",
        enum: Status,
        default: Status.UNACTIVE,
    })
    status: Status  

    @Column({type:'bigint'})
    linked_in_account_id: number;

    @Column()
    first_message: string;

    @Column()
    base_calendar: string;

    @Column()
    extended_calendar: string;  

    @Column()
    uid: string;  

    @Column()
    is_ghl: boolean;  

    @Column()
    type: string;

    @Column()
    warn: boolean;  

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)", onUpdate: "CURRENT_TIMESTAMP(20)" })
    updated_at: Date;
}
