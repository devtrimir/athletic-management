import { Head, Link, setLayoutProps, useForm } from '@inertiajs/react';
import { index as teamsIndex, show as showTeam, update as updateTeam } from '@/actions/App/Http/Controllers/TeamController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';

type Sport = { id: number; name: string };
type Session = { id: number; name: string };
type Unit = { id: number; name: string };

type Team = {
    id: number;
    name: string;
    in_charge: string | null;
    sport: { id: number; name: string } | null;
    session: { id: number; name: string } | null;
    unit: { id: number; name: string } | null;
};

type FormData = {
    sport_id: string;
    session_id: string;
    unit_id: string;
    name: string;
    in_charge: string;
};

export default function TeamsEdit({
    team,
    sessions,
    sports,
    units,
}: {
    team: Team;
    sessions: Session[];
    sports: Sport[];
    units: Unit[];
}) {
    const { t } = useTranslation();

    setLayoutProps({
        breadcrumbs: [
            { title: t('Teams'), href: teamsIndex.url() },
            { title: team.name, href: showTeam.url(team) },
            { title: t('Edit team') },
        ],
    });

    const { data, setData, patch, errors, processing } = useForm<FormData>({
        sport_id: team.sport ? String(team.sport.id) : '',
        session_id: team.session ? String(team.session.id) : '',
        unit_id: team.unit ? String(team.unit.id) : '',
        name: team.name,
        in_charge: team.in_charge ?? '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch(updateTeam.url(team));
    }

    return (
        <>
            <Head title={t('Edit team')} />
            <h1 className="sr-only">{t('Edit team')}</h1>

            <div className="space-y-6">
                <Heading variant="small" title={t('Edit team')} description={team.name} />

                <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
                    <div className="rounded-xl border bg-card p-6 space-y-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="sport_id">
                                    {t('Sport')} <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.sport_id}
                                    onValueChange={(v) => setData('sport_id', v)}
                                >
                                    <SelectTrigger id="sport_id" className="w-full">
                                        <SelectValue placeholder={t('Select sport')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sports.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.sport_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="session_id">
                                    {t('Session')} <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={data.session_id}
                                    onValueChange={(v) => setData('session_id', v)}
                                >
                                    <SelectTrigger id="session_id" className="w-full">
                                        <SelectValue placeholder={t('Select session')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sessions.map((s) => (
                                            <SelectItem key={s.id} value={String(s.id)}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.session_id} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="unit_id">
                                {t('Unit')} <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={data.unit_id}
                                onValueChange={(v) => setData('unit_id', v)}
                            >
                                <SelectTrigger id="unit_id" className="w-full">
                                    <SelectValue placeholder={t('Select unit')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((u) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.unit_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="name">
                                {t('Team name')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                maxLength={100}
                                required
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="in_charge">{t('In-charge')}</Label>
                            <Input
                                id="in_charge"
                                value={data.in_charge}
                                onChange={(e) => setData('in_charge', e.target.value)}
                                maxLength={100}
                            />
                            <InputError message={errors.in_charge} />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button disabled={processing}>{t('Save team')}</Button>
                        <Button variant="outline" asChild>
                            <Link href={showTeam.url(team)}>{t('Cancel')}</Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
