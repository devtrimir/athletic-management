export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Coach = {
    id: number;
    full_name: string;
    pno: string | null;
    blood_group?: string | null;
    gender?: string | null;
    mobile: string | null;
    email: string | null;
    photo_path?: string | null;
    coach_status: string | null;
    member_id?: number | null;
    member?: {
        id: number;
        full_name: string;
        pno: string | null;
    } | null;
    rank_master?: {
        id: number;
        code: string | null;
        name: string | null;
        short_name: string | null;
    } | null;
    nis_master?: {
        id: number;
        kind: string | null;
        code: string | null;
        name: string | null;
        short_name: string | null;
    } | null;
    district?: { id: number; name: string } | null;
    unit?: { id: number; name: string } | null;
    sports?: {
        id: number;
        name: string;
        is_primary?: boolean;
        level_master_id?: number | null;
        level?: string | null;
        sport_event?: string | null;
        effective_from?: string | null;
        effective_to?: string | null;
        notes?: string | null;
        pivot?: {
            is_primary?: boolean;
            level_master_id?: number | null;
            level?: string | null;
            sport_event?: string | null;
            effective_from?: string | null;
            effective_to?: string | null;
            notes?: string | null;
        };
    }[];
    current_assignments?: {
        id: number;
        role: string | null;
        assigned_at: string | null;
        session?: {
            id: number;
            name: string;
        } | null;
        team?: {
            id: number;
            name: string;
            sport_id: number | null;
            location_label?: string | null;
            sport?: {
                id: number;
                name: string;
            } | null;
            session?: {
                id: number;
                name: string;
            } | null;
        } | null;
    }[];
};

export type TeamCoach = {
    id: number;
    rank: string | null;
    pno: string | null;
    full_name: string;
    mobile: string | null;
    posting: string;
    role: string;
    team: string;
    nis_master_name: string | null;
    photo_path?: string | null;
    member_id?: number | null;
    member?: {
        id: number;
        full_name: string;
        pno: string | null;
    } | null;
};

export type SportTeamGroupRow = {
    sport: string;
    team: string;
    coaches: TeamCoach[];
};

export type PaginatedCoaches = {
    data: Coach[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type SportOption = {
    id: number;
    name: string;
};
