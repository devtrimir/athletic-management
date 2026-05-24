import { Head, setLayoutProps, useForm } from '@inertiajs/react';
import { index as tournamentsIndex, store as storeTournament } from '@/actions/App/Http/Controllers/TournamentController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

type Session = { id: number; name: string };
type Sport = { id: number; name: string };
type Tier = { id: number; code: string; label_hi: string };

type FormData = {
    name_hi: string;
    session_id: string;
    tier_id: string;
    sport_id: string;
    date_from: string;
    date_to: string;
    venue: string;
    raw_date_text: string;
};

export default function TournamentsCreate({
    sessions,
    sports,
    tiers,
}: {
    sessions: Session[];
    sports: Sport[];
    tiers: Tier[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Tournaments'), href: tournamentsIndex.url() },
            { title: t('New tournament') },
        ],
    });

    const { data, setData, post, errors, processing } = useForm<FormData>({
        name_hi: '',
        session_id: '',
        tier_id: '',
        sport_id: '',
        date_from: '',
        date_to: '',
        venue: '',
        raw_date_text: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(storeTournament.url());
    }

    return (
        <>
            <Head title={t('New tournament')} />

            <div className="space-y-6">
                <Heading variant="small" title={t('New tournament')} description={t('Create tournament')} />

                <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
                    <div className="rounded-xl border bg-card p-6 space-y-5">
                        {/* Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name_hi">
                                {t('Name (Hindi)')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name_hi"
                                value={data.name_hi}
                                onChange={(e) => setData('name_hi', e.target.value)}
                                maxLength={255}
                                required
                            />
                            <InputError message={errors.name_hi} />
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {/* Session */}
                            <div className="grid gap-2">
                                <Label htmlFor="session_id">
                                    {t('Session')} <span className="text-destructive">*</span>
                                </Label>
                                <Select value={data.session_id} onValueChange={(v) => setData('session_id', v)}>
                                    <SelectTrigger id="session_id">
                                        <SelectValue placeholder={t('Select session')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.session_id} />
                            </div>

                            {/* Tier */}
                            <div className="grid gap-2">
                                <Label htmlFor="tier_id">
                                    {t('Tier')} <span className="text-destructive">*</span>
                                </Label>
                                <Select value={data.tier_id} onValueChange={(v) => setData('tier_id', v)}>
                                    <SelectTrigger id="tier_id">
                                        <SelectValue placeholder={t('Select tier')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiers.map((tier) => (
                                            <SelectItem key={tier.id} value={String(tier.id)}>{tier.label_hi}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.tier_id} />
                            </div>

                            {/* Sport */}
                            <div className="grid gap-2">
                                <Label htmlFor="sport_id">{t('Sport')}</Label>
                                <Select value={data.sport_id || 'none'} onValueChange={(v) => setData('sport_id', v === 'none' ? '' : v)}>
                                    <SelectTrigger id="sport_id">
                                        <SelectValue placeholder={t('All sports')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('All sports')}</SelectItem>
                                        {sports.map((sp) => (
                                            <SelectItem key={sp.id} value={String(sp.id)}>{sp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.sport_id} />
                            </div>

                            {/* Venue */}
                            <div className="grid gap-2">
                                <Label htmlFor="venue">{t('Venue')}</Label>
                                <Input
                                    id="venue"
                                    value={data.venue}
                                    onChange={(e) => setData('venue', e.target.value)}
                                    maxLength={255}
                                />
                                <InputError message={errors.venue} />
                            </div>

                            {/* Date from */}
                            <div className="grid gap-2">
                                <Label htmlFor="date_from">{t('Date from')}</Label>
                                <Input
                                    id="date_from"
                                    type="date"
                                    value={data.date_from}
                                    onChange={(e) => setData('date_from', e.target.value)}
                                />
                                <InputError message={errors.date_from} />
                            </div>

                            {/* Date to */}
                            <div className="grid gap-2">
                                <Label htmlFor="date_to">{t('Date to')}</Label>
                                <Input
                                    id="date_to"
                                    type="date"
                                    value={data.date_to}
                                    onChange={(e) => setData('date_to', e.target.value)}
                                />
                                <InputError message={errors.date_to} />
                            </div>
                        </div>

                        {/* Raw date text */}
                        <div className="grid gap-2">
                            <Label htmlFor="raw_date_text">{t('Raw date text')}</Label>
                            <Textarea
                                id="raw_date_text"
                                value={data.raw_date_text}
                                onChange={(e) => setData('raw_date_text', e.target.value)}
                                maxLength={500}
                                rows={2}
                            />
                            <InputError message={errors.raw_date_text} />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="submit" disabled={processing}>
                            {processing ? t('Saving…') : t('Create tournament')}
                        </Button>
                        <Button variant="outline" type="button" asChild>
                            <a href={tournamentsIndex.url()}>{t('Cancel')}</a>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

