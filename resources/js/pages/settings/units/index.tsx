import { Form, Head, Link } from '@inertiajs/react';
import UnitController from '@/actions/App/Http/Controllers/Settings/UnitController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';

type District = {
    id: number;
    name_en: string;
};

type Unit = {
    id: number;
    name_hi: string;
    name_en: string;
    unit_type: string;
    commandant: string | null;
    district: District | null;
};

export default function Index({ units }: { units: Unit[] }) {
    return (
        <>
            <Head title="Units" />

            <h1 className="sr-only">Units</h1>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Units"
                        description="Manage reference police units"
                    />
                    <Button asChild>
                        <Link href={UnitController.create.url()}>New unit</Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Name (Hindi)</th>
                                <th className="px-4 py-3 text-left font-medium">Name (English)</th>
                                <th className="px-4 py-3 text-left font-medium">Type</th>
                                <th className="px-4 py-3 text-left font-medium">Commandant</th>
                                <th className="px-4 py-3 text-left font-medium">District</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {units.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                        No units yet.
                                    </td>
                                </tr>
                            )}
                            {units.map((unit) => (
                                <tr key={unit.id}>
                                    <td className="px-4 py-3 font-medium">{unit.name_hi}</td>
                                    <td className="px-4 py-3">{unit.name_en}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{unit.unit_type}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {unit.commandant ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {unit.district?.name_en ?? '—'}
                                    </td>
                                    <td className="flex items-center gap-2 px-4 py-3">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={UnitController.edit.url(unit.id)}>Edit</Link>
                                        </Button>
                                        <Form {...UnitController.destroy.form(unit.id)}>
                                            {({ processing }) => (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    disabled={processing}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </Form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Units',
            href: UnitController.index.url(),
        },
    ],
};
