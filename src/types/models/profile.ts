import { BaseModel } from '../common';

export interface Profile extends BaseModel {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
} 