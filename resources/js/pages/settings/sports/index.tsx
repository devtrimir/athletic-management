import { Form, Head, Link } from '@inertiajs/react';
import SportController from '@/actions/App/Http/Controllers/Settings/SportController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';

type Sport = {
    id: number;
    name_hi: string;
    name_en: string;
    category: string;
    slug: string;
};

export default function Index({ sports }: { sports: Sport[] }) {
    return (
        <>
            <Head title="Sports" />

            <h1 className="sr-only">Sports</h1>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Sports"
                        description="Manage reference sports disciplines"
                    />
                    <Button asChild>
                        <Link href={SportController.create.url()}>New sport</Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Name (Hindi)</th>
                                <th className="px-4 py-3 text-left font-medium">Name (English)</th>
                                <th className="px-4 py-3 text-left font-medium">Category</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sports.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                                        No sports yet.
                                    </td>
                                </tr>
                            )}
                            {sports.map((sport) => (
                                <tr key={sport.id}>
                                    <td className="px-4 py-3 font-medium">{sport.name_hi}</td>
                                    <td className="px-4 py-3">{sport.name_en}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{sport.category}</td>
                                    <td className="flex items-center gap-2 px-4 py-3">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={SportController.edit.url(sport.id)}>Edit</Link>
                                        </Button>
                                        <Form {...SportController.destroy.form(sport.id)}>
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
            title: 'Sports',
            href: SportController.index.url(),
        },
    ],
};
