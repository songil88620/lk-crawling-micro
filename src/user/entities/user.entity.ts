import { Entity, Column, PrimaryColumn, BeforeInsert, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

export enum UserRole {
    ADMIN = 'admin',
    SUPER_ADMIN = 'superadmin',
    USER = 'user'
}

@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    email: string;

    @Column()
    email_verified_at: string;

    @Column()
    password: string;

    @Column()
    remember_token: string;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole  

    @Column({ default: false })
    activated: boolean;

    @Column()
    last_name: string;

    @Column()
    phone: string;

    @Column({ default: 0 })
    lang: number;

    @Column()
    country: string;

    @Column()
    city: string;

    @Column()
    address: string;

    @Column()
    avatar: string;   

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)" })
    created_at: Date;

    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(20)", onUpdate: "CURRENT_TIMESTAMP(20)" })
    updated_at: Date;
}
