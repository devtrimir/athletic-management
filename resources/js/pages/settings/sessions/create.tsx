import { Form, Head, Link } from '@inertiajs/react';
import SportSessionController from '@/actions/App/Http/Controllers/Settings/SportSessionController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Create() {
    return (
        <>
            <Head title="New sport session" />

            <h1 className="sr-only">New sport session</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="New sport session"
                    description="Add a new sport session year"
                />

                <Form {...SportSessionController.store.form()} className="max-w-xl space-y-6">
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-xl border bg-card p-6 space-y-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        name="name"
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
                                            min={2000}
                                            max={2100}
                                            required
                                        />
                                        <InputError message={errors.end_year} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                                    <Checkbox id="is_current" name="is_current" />
                                    <div>
                                        <Label htmlFor="is_current" className="cursor-pointer">Mark as current session</Label>
                                        <p className="text-xs text-muted-foreground">Only one session can be current at a time.</p>
                                    </div>
                                    <InputError message={errors.is_current} />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button disabled={processing}>Create session</Button>
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

Create.layout = {
    breadcrumbs: [
        {
            title: 'Sport sessions',
            href: SportSessionController.index.url(),
        },
        {
            title: 'New session',
        },
    ],
};
