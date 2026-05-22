import { Form, Head, Link } from '@inertiajs/react';
import SportSessionController from '@/actions/App/Http/Controllers/Settings/SportSessionController';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';

type SportSession = {
    id: number;
    name: string;
    start_year: number;
    end_year: number;
    is_current: boolean;
};

export default function Index({ sessions }: { sessions: SportSession[] }) {
    return (
        <>
            <Head title="Sport sessions" />

            <h1 className="sr-only">Sport sessions</h1>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Sport sessions"
                        description="Manage reference sport session years"
                    />
                    <Button asChild>
                        <Link href={SportSessionController.create.url()}>New session</Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Name</th>
                                <th className="px-4 py-3 text-left font-medium">Years</th>
                                <th className="px-4 py-3 text-left font-medium">Current</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sessions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                                        No sessions yet.
                                    </td>
                                </tr>
                            )}
                            {sessions.map((session) => (
                                <tr key={session.id}>
                                    <td className="px-4 py-3 font-medium">{session.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {session.start_year}–{session.end_year}
                                    </td>
                                    <td className="px-4 py-3">
                                        {session.is_current ? (
                                            <span className="font-medium text-green-600">Yes</span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="flex items-center gap-2 px-4 py-3">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={SportSessionController.edit.url(session.id)}>
                                                Edit
                                            </Link>
                                        </Button>
                                        <Form {...SportSessionController.destroy.form(session.id)}>
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
            title: 'Sport sessions',
            href: SportSessionController.index.url(),
        },
    ],
};
