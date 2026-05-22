import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import UnitController from '@/actions/App/Http/Controllers/Settings/UnitController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UNIT_TYPES = [
    { value: 'PAC', label: 'PAC' },
    { value: 'GRP', label: 'GRP' },
    { value: 'DISTRICT', label: 'District' },
    { value: 'HQ', label: 'HQ' },
    { value: 'OTHER', label: 'Other' },
] as const;

type District = {
    id: number;
    name_hi: string;
    name_en: string;
};

type Unit = {
    id: number;
    name_hi: string;
    name_en: string;
    unit_type: string;
    commandant: string | null;
    district_id: number | null;
};

export default function Edit({ unit, districts }: { unit: Unit; districts: District[] }) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Units',
                href: UnitController.index.url(),
            },
            {
                title: unit.name_en,
                href: UnitController.edit.url(unit.id),
            },
        ],
    });

    return (
        <>
            <Head title={`Edit ${unit.name_en}`} />

            <h1 className="sr-only">Edit {unit.name_en}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={`Edit ${unit.name_en}`}
                    description="Update unit details"
                />

                <Form {...UnitController.update.form(unit.id)} className="max-w-xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name_hi">Name (Hindi)</Label>
                                        <Input
                                            id="name_hi"
                                            name="name_hi"
                                            defaultValue={unit.name_hi}
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name_hi} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="name_en">Name (English)</Label>
                                        <Input
                                            id="name_en"
                                            name="name_en"
                                            defaultValue={unit.name_en}
                                            maxLength={100}
                                            required
                                        />
                                        <InputError message={errors.name_en} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="unit_type">Unit type</Label>
                                    <Select name="unit_type" defaultValue={unit.unit_type} required>
                                        <SelectTrigger id="unit_type" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {UNIT_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.unit_type} />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="commandant">Commandant <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        <Input
                                            id="commandant"
                                            name="commandant"
                                            defaultValue={unit.commandant ?? ''}
                                            maxLength={100}
                                        />
                                        <InputError message={errors.commandant} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="district_id">District <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        <Select
                                            name="district_id"
                                            defaultValue={unit.district_id ? String(unit.district_id) : undefined}
                                        >
                                            <SelectTrigger id="district_id" className="w-full">
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {districts.map((d) => (
                                                    <SelectItem key={d.id} value={String(d.id)}>
                                                        {d.name_en}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.district_id} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>Save changes</Button>
                                <Button variant="outline" asChild>
                                    <Link href={UnitController.index.url()}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
