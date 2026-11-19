import { useEcho } from '@laravel/echo-react';

export type TournamentScoringFinished = {
    tournament_id: number;
    name: string;
    results_scored: number;
};

/**
 * Listens for the background job that rescores a tournament (it can take a while for
 * thousands of players) and tells the page when it is done. Renders nothing.
 */
export function PointsUpdatesListener({
    organizationId,
    onFinished,
}: {
    organizationId: number;
    onFinished: (event: TournamentScoringFinished) => void;
}) {
    useEcho<TournamentScoringFinished>(
        `organization.${organizationId}`,
        '.TournamentScoringFinished',
        onFinished,
    );

    return null;
}
