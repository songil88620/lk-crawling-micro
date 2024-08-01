import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity('linked_in_accounts')
export class LinkedInAccountEntity {
    @PrimaryColumn({ type: 'bigint' })
    id: number;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({ type: 'bigint' })
    user_id: number;

    @Column({ nullable: true })
    jsession_id: string;

    @Column({ nullable: true })
    li_at: string;

    @Column({ nullable: true })
    proxy: string;

    @Column({ nullable: true })
    country_ip: string;

    @Column()
    timezone: string;

    @Column()
    apikey: string;

    @Column()
    country: string;

    @Column()
    location_id: string;

    @Column()
    is_ghl: boolean;

    @Column()
    is_deleted: boolean;

    @Column()
    type: string;

    @Column()
    warn: boolean;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    public created_at: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
    public updated_at: Date;
}
