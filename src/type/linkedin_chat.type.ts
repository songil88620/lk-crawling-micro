import { ChatStatus } from "./chat_status.type";


export interface LinkedInChatType {
    id: number,
    chat_history: string,
    prospect_id: number,
    prospection_campaign_id: number,
    created_at?: string,
    updated_at: string,
    chat_status: ChatStatus,
    linked_in_chat_urn: string,
    first_message_urn: string,
    automatic_answer: boolean,
    requires_human_intervention: boolean,
    follow_up_count: number,
    hi_chats: string,
    hi_get: number,
    err_msg: string,
    follow_up_state: number,
    contact_count?: number
}