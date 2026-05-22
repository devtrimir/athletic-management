import { Form, Head, Link } from '@inertiajs/react';
import TournamentTierController from '@/actions/App/Http/Controllers/Settings/TournamentTierController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';

type Tier = {
    id: number;
    code: string;
    label_hi: string;
    label_en: string;
    weight: number;
};

export default function Index({ tiers }: { tiers: Tier[] }) {
    return (
        <>
            <Head title="Tournament Tiers" />

            <h1 className="sr-only">Tournament Tiers</h1>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Tournament Tiers"
                        description="Manage reference tournament tiers"
                    />
                    <Button asChild>
                        <Link href={TournamentTierController.create.url()}>New tier</Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Code</th>
                                <th className="px-4 py-3 text-left font-medium">Label (Hindi)</th>
                                <th className="px-4 py-3 text-left font-medium">Label (English)</th>
                                <th className="px-4 py-3 text-left font-medium">Weight</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {tiers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                        No tournament tiers yet.
                                    </td>
                                </tr>
                            )}
                            {tiers.map((tier) => (
                                <tr key={tier.id}>
                                    <td className="px-4 py-3 font-mono text-muted-foreground">{tier.code}</td>
                                    <td className="px-4 py-3 font-medium">{tier.label_hi}</td>
                                    <td className="px-4 py-3">{tier.label_en}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{tier.weight}</td>
                                    <td className="flex items-center gap-2 px-4 py-3">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={TournamentTierController.edit.url(tier.id)}>
                                                Edit
                                            </Link>
                                        </Button>
                                        <Form {...TournamentTierController.destroy.form(tier.id)}>
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
            title: 'Tournament Tiers',
            href: TournamentTierController.index.url(),
        },
    ],
};
