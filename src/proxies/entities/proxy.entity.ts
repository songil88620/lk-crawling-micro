import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";


@Entity('proxies')
export class ProxyEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    proxy: string;

    @Column()
    userid: string;

    @Column()
    ip: string;

    @Column()
    country: string;

    @Column()
    country_ip: string;

    @Column()
    status: string;

    @Column()
    date_start: string;

    @Column()
    date_end: string;

    @Column()
    used: number; 

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)", onUpdate: "CURRENT_TIMESTAMP(20)" })
    updated_at: Date;
}
