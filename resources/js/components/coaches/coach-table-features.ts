import {
    cellSpanningFeature,
    columnVisibilityFeature,
    rowSelectionFeature,
    rowSortingFeature,
    tableFeatures,
} from '@tanstack/react-table';

export const coachTableFeatures = tableFeatures({
    cellSpanningFeature,
    columnVisibilityFeature,
    rowSelectionFeature,
    rowSortingFeature,
});

export type CoachTableFeatures = typeof coachTableFeatures;
