export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko';

export type UserRole = 'admin' | 'company_admin' | 'content_creator' | 'student';

export type MediaType = 'video' | 'image';

export interface BaseModel {
    id: string;
    created_at: string;
    updated_at: string;
} 