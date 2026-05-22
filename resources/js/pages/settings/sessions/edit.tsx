import { Form, Head, Link, setLayoutProps } from '@inertiajs/react';
import SportSessionController from '@/actions/App/Http/Controllers/Settings/SportSessionController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SportSession = {
    id: number;
    name: string;
    start_year: number;
    end_year: number;
    is_current: boolean;
};

export default function Edit({ session }: { session: SportSession }) {
    setLayoutProps({
        breadcrumbs: [
            {
                title: 'Sport sessions',
                href: SportSessionController.index.url(),
            },
            {
                title: session.name,
                href: SportSessionController.edit.url(session.id),
            },
        ],
    });

    return (
        <>
            <Head title={`Edit ${session.name}`} />

            <h1 className="sr-only">Edit {session.name}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={`Edit ${session.name}`}
                    description="Update sport session details"
                />

                <Form {...SportSessionController.update.form(session.id)} className="max-w-xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        defaultValue={session.name}
                                        placeholder="e.g. 2024-2025"
                                        maxLength={10}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="start_year">Start year</Label>
                                        <Input
                                            id="start_year"
                                            name="start_year"
                                            type="number"
                                            defaultValue={session.start_year}
                                            min={2000}
                                            max={2100}
                                            required
                                        />
                                        <InputError message={errors.start_year} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="end_year">End year</Label>
                                        <Input
                                            id="end_year"
                                            name="end_year"
                                            type="number"
                                            defaultValue={session.end_year}
                                            min={2000}
                                            max={2100}
                                            required
                                        />
                                        <InputError message={errors.end_year} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                                    <Checkbox
                                        id="is_current"
                                        name="is_current"
                                        defaultChecked={session.is_current}
                                    />
                                    <div>
                                        <Label htmlFor="is_current" className="cursor-pointer">Mark as current session</Label>
                                        <p className="text-xs text-muted-foreground">Only one session can be current at a time.</p>
                                    </div>
                                    <InputError message={errors.is_current} />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>Save changes</Button>
                                <Button variant="outline" asChild>
                                    <Link href={SportSessionController.index.url()}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}
