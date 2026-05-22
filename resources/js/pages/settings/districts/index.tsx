import { Form, Head, Link } from '@inertiajs/react';
import DistrictController from '@/actions/App/Http/Controllers/Settings/DistrictController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';

type District = {
    id: number;
    name_hi: string;
    name_en: string;
    state: string;
    code: string;
};

export default function Index({ districts }: { districts: District[] }) {
    return (
        <>
            <Head title="Districts" />

            <h1 className="sr-only">Districts</h1>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Districts"
                        description="Manage reference districts"
                    />
                    <Button asChild>
                        <Link href={DistrictController.create.url()}>New district</Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Name (Hindi)</th>
                                <th className="px-4 py-3 text-left font-medium">Name (English)</th>
                                <th className="px-4 py-3 text-left font-medium">State</th>
                                <th className="px-4 py-3 text-left font-medium">Code</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {districts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                        No districts yet.
                                    </td>
                                </tr>
                            )}
                            {districts.map((district) => (
                                <tr key={district.id}>
                                    <td className="px-4 py-3 font-medium">{district.name_hi}</td>
                                    <td className="px-4 py-3">{district.name_en}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{district.state}</td>
                                    <td className="px-4 py-3 font-mono text-muted-foreground">{district.code}</td>
                                    <td className="flex items-center gap-2 px-4 py-3">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={DistrictController.edit.url(district.id)}>
                                                Edit
                                            </Link>
                                        </Button>
                                        <Form {...DistrictController.destroy.form(district.id)}>
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
            title: 'Districts',
            href: DistrictController.index.url(),
        },
    ],
};
