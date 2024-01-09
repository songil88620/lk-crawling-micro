import { ChatStatus } from "./chat_status.type";


export interface LinkedInChatType {
    id: number,
    chat_history: string,
    prospect_id: number,
    prospection_campaign_id: number,
    created_at?: any,
    updated_at?: any,
    chat_status: ChatStatus,
    linked_in_chat_urn: string,
    first_message_urn: string,
    automatic_answer: boolean,
    requires_human_intervention: boolean,
    follow_up_count: number
}