import { BaseModel } from '../common';

export interface Profile extends BaseModel {
    full_name?: string;
    avatar_url?: string;
} 