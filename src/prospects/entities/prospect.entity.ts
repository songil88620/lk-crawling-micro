import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity('prospects')
export class ProspectsEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    linked_in_member_id: string;

    @Column()
    linked_in_email: string;

    @Column()
    first_name: string;

    @Column()
    last_name: string;

    @Column()
    linked_in_profile_url: string;

    @Column()
    linked_in_headline: string;

    @Column()
    linked_in_current_company: string;

    @Column()
    linked_in_user_urn: string;  

    @Column()
    used: boolean; 

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)", onUpdate: "CURRENT_TIMESTAMP(20)" })
    updated_at: Date;
}
