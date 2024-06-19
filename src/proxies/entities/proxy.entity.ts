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
    droplet_id: string;

    @Column()
    country: string;

    @Column()
    country_ip: string;  

    @Column()
    date_start: string;

    @Column()
    date_end: string;

    @Column()
    used: number; 

    @Column()
    order: boolean;

    @Column()
    tool_end: number; 

    @Column()
    run: boolean; 
    
}
