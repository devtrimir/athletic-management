import { X } from 'lucide-react';
import { useState } from 'react';
import { Combobox } from '@/components/combobox';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';

type District = { id: number; name: string };

/**
 * Optional district picker for a unit: searchable, and it can be detached again
 * (an empty value is submitted, which the server stores as no district).
 */
export function OptionalDistrictField({
    districts,
    initialValue,
    error,
}: {
    districts: District[];
    initialValue: number | null;
    error?: string;
}) {
    const { t } = useTranslation();
    const [value, setValue] = useState(
        initialValue ? String(initialValue) : '',
    );

    return (
        <div className="grid gap-2">
            <Label htmlFor="district_id">
                {t('District')}{' '}
                <span className="font-normal text-muted-foreground">
                    {t('(optional)')}
                </span>
            </Label>
            <input type="hidden" name="district_id" value={value} />
            <div className="flex items-center gap-2">
                <Combobox
                    id="district_id"
                    value={value}
                    onValueChange={setValue}
                    items={districts.map((district) => ({
                        value: String(district.id),
                        label: district.name,
                    }))}
                    placeholder={t('None')}
                    searchPlaceholder={t('Search districts…')}
                    emptyMessage={t('No districts found.')}
                    className="w-full"
                />
                {value !== '' && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title={t('Detach district')}
                        aria-label={t('Detach district')}
                        onClick={() => setValue('')}
                    >
                        <X className="size-4" />
                    </Button>
                )}
            </div>
            <InputError message={error} />
        </div>
    );
}
